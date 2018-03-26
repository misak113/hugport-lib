
import {
	Connection as AmqplibConnection,
	Channel as AmqplibChannel,
	ConfirmChannel as AmqplibConfirmChannel,
	Message as AmqplibMessage,
	Options as AmqplibOptions,
} from 'amqplib';
import { generateUniqueHash } from '../Hash/generator';
import { deserializeJSON } from '../JSON/jsonHelper';
import IChannel from './IChannel';
import IAMQPPool from './IAMQPPool';
import IQueueOptions from './IQueueOptions';
import IMessageOptions from './IMessageOptions';
import IConsumeOptions from './IConsumeOptions';
import INackOptions from './INackOptions';
import * as Debug from 'debug';
import {
	ExchangeType,
} from './Exchange';
const debug = Debug('@signageos/lib:AMQP:ChannelProvider');

const DEFAULT_PREFETCH_COUNT = 100;
export const REJECTED_QUEUE_PREFIX = '__rejected.';
export const RESPONSE_QUEUE_PREFIX = '__response.';

export default class ChannelProvider {

	private amqplibConnection: AmqplibConnection | undefined;
	private amqplibChannnelMap: {
		[queueIdentifier: string]: {
			channel: AmqplibChannel;
			clientCount: number;
		}
	};

	constructor(
		private amqpPool: IAMQPPool,
	) {
		this.amqplibChannnelMap = {};
	}

	public async getChannel(
		namespace: string,
		routingKey: string,
		exchangeName: string = '',
		options: IQueueOptions = {},
		alternateExchangeName?: string,
	): Promise<IChannel<any>> {
		const amqplibConnection = await this.getAmqplibConnection();
		let amqplibChannel: AmqplibChannel;

		if (options.confirmable) {
			amqplibChannel = await this.getAmqplibConfirmChannel(amqplibConnection, namespace);
		} else {
			amqplibChannel = await this.getAmqplibChannel(amqplibConnection, namespace);
		}

		const channel = {
			send: async (message: any, messageOptions: IMessageOptions = {}) => {
				const encodedMessageBuffer = this.encodeMessageIntoBuffer(message);
				const amqplibSendOptions = this.createAmqplibSendOptions(options, messageOptions);
				await this.publish(
					amqplibChannel, exchangeName, routingKey, encodedMessageBuffer, amqplibSendOptions, options, alternateExchangeName,
				);
			},
			sendExpectingResponse: async <TResponseMessage>(message: any, messageOptions: IMessageOptions = {}) => {
				const encodedMessageBuffer = this.encodeMessageIntoBuffer(message);
				const responseQueueName =
					RESPONSE_QUEUE_PREFIX +
					this.getExchangeChannelIdentifier(exchangeName, routingKey) +
					'_' + generateUniqueHash(8);
				const amqplibResponseChannel = await this.getAmqplibResponseChannel(amqplibConnection, responseQueueName);
				const correlationId = generateUniqueHash();
				const amqplibSendOptions: AmqplibOptions.Publish = {
					...this.createAmqplibSendOptions(options, messageOptions),
					correlationId,
					replyTo: responseQueueName,
				};
				const sentPromise = this.publish(
					amqplibChannel, exchangeName, routingKey, encodedMessageBuffer, amqplibSendOptions, options, alternateExchangeName,
				);
				const responsePromise = new Promise(
					async (resolve: (responseMessage: TResponseMessage) => void) => {
						await amqplibResponseChannel.prefetch(1);
						const { consumerTag } = await amqplibResponseChannel.consume(
							responseQueueName,
							async (amqplibResponseMessage: AmqplibMessage) => {
								if (amqplibResponseMessage.properties.correlationId === correlationId) {
									amqplibResponseChannel.ack(amqplibResponseMessage);
									try {
										await amqplibResponseChannel.cancel(consumerTag);
									} catch (error) {
										console.error(
											"Error while canceling response queue consumer; consumer tag: " + consumerTag +
											", exchange: " + exchangeName + ", routing key: " + routingKey,
											error,
										);
									}
									resolve(this.decodeMessageBuffer(amqplibResponseMessage.content));
								} else {
									amqplibResponseChannel.nack(amqplibResponseMessage);
								}
							},
						);
					}
				);
				await sentPromise;
				const response = await responsePromise;
				try {
					await amqplibResponseChannel.close();
				} catch (error) {
					// nothing
				}
				return response;
			},
			consumeSimple: async (
				queueName: string,
				onMessage: (message: any) => Promise<any>,
				consumeOptions: IConsumeOptions = {},
				onEnded?: () => void,
			) => {
				return await channel.consume(
					queueName,
					async (message: any, ack: () => void, nack: (options?: INackOptions) => void) => {
						try {
							const response = await onMessage(message);
							ack();
							return response;
						} catch (error) {
							nack({ requeue: true });
							throw error;
						}
					},
					false,
					consumeOptions,
					onEnded,
				);
			},
			consume: async (
				queueName: string,
				onMessage: (
					message: any,
					ack: () => void,
					nack: (options?: INackOptions) => void
				) => Promise<any>,
				respond: boolean,
				consumeOptions: IConsumeOptions = {},
				onEnded?: () => void
			) => {
				if (exchangeName === '' && queueName !== routingKey) {
					throw new Error('If default exchange is used, queue name must match the routing key');
				}

				amqplibChannel.once('error', (error:  Error) => {
					if (onEnded) {
						onEnded();
						onEnded = undefined;
					}
					throw error;
				});
				amqplibChannel.once('close', () => {
					if (onEnded) {
						onEnded();
						onEnded = undefined;
					}
				});
				await amqplibChannel.prefetch(options.prefetchCount || DEFAULT_PREFETCH_COUNT);
				await this.assertExchange(amqplibChannel, exchangeName, "topic", alternateExchangeName);
				await this.assertRejectableQueue(
					amqplibChannel,
					queueName,
					options.maxPriority,
					consumeOptions.persistent,
					consumeOptions.exclusive,
				);
				await this.bindQueue(amqplibChannel, queueName, exchangeName, routingKey);
				const { consumerTag } = await amqplibChannel.consume(queueName, async (amqplibMessage: AmqplibMessage) => {
					const message = this.decodeMessageBuffer(amqplibMessage.content);
					const response = await onMessage(
						message,
						() => amqplibChannel.ack(amqplibMessage),
						(nackOptions?: INackOptions) => amqplibChannel.nack(
							amqplibMessage,
							undefined,
							nackOptions ? nackOptions.requeue : undefined // default refers to true
						),
					);
					if (respond && amqplibMessage.properties.replyTo) {
						await this.assertResponseQueue(amqplibChannel, amqplibMessage.properties.replyTo);
						amqplibChannel.sendToQueue(
							amqplibMessage.properties.replyTo,
							this.encodeMessageIntoBuffer(response),
							{ correlationId: amqplibMessage.properties.correlationId },
						);
					}
				});
				return async () => {
					if (!consumeOptions.persistent) {
						await this.unbindQueue(amqplibChannel, queueName, exchangeName, routingKey);
					}
					await amqplibChannel.cancel(consumerTag);
				};
			},
			purge: async (queueName: string) => {
				await amqplibChannel.purgeQueue(queueName);
			},
			delete: async (queueName: string) => {
				await amqplibChannel.deleteQueue(queueName);
			},
			close: async () => {
				if (options.confirmable) {
					await this.closeAmqplibConfirmChannel(namespace);
				} else {
					await this.closeAmqplibChannel(namespace);
				}
			},
		};
		return channel;
	}

	public decodeMessageBuffer(encodedMessageBuffer?: Buffer) {
		return encodedMessageBuffer ? JSON.parse(encodedMessageBuffer.toString(), deserializeJSON) : null;
	}

	public encodeMessageIntoBuffer(message: any) {
		return new Buffer(typeof message !== 'undefined' ? JSON.stringify(message) : '');
	}

	public async getAmqplibResponseChannel(
		amqplibConnection: AmqplibConnection,
		queueName: string,
	): Promise<AmqplibChannel> {
		const amqplibChannel = await amqplibConnection.createChannel();
		await this.assertResponseQueue(amqplibChannel, queueName);
		return amqplibChannel;
	}

	public async assertResponseQueue(amqplibChannel: AmqplibChannel, queueName: string) {
		await amqplibChannel.assertQueue(queueName, {
			durable: false,
			autoDelete: true,
		});
	}

	public async getAmqplibConnection() {
		if (this.amqplibConnection) {
			return this.amqplibConnection;
		} else {
			debug('Create connection');
			const amqplibConnection = await this.amqpPool.acquire();
			if (this.amqplibConnection) {
				// if more connections are created in same time then use the first created
				debug('Release useless connection');
				this.amqpPool.release(amqplibConnection);
				return this.amqplibConnection;
			} else {
				debug('Created connection');
				this.amqplibConnection = amqplibConnection;
				amqplibConnection.on('close', () => {
					debug('Closed connection');
					this.amqplibConnection = undefined;
					this.amqplibChannnelMap = {};
					this.amqpPool.destroy(amqplibConnection);
				});
				return amqplibConnection;
			}
		}
	}

	private createAmqplibSendOptions(options: IQueueOptions, messageOptions: IMessageOptions) {
		return {
			persistent: options.persistent,
			priority: messageOptions.priority,
		};
	}

	private async publish(
		amqplibChannel: AmqplibChannel | AmqplibConfirmChannel,
		exchangeName: string,
		routingKey: string,
		encodedMessageBuffer: Buffer,
		sendOptions: AmqplibOptions.Publish,
		options: IQueueOptions,
		alternateExchangeName?: string,
	) {
		if (options.confirmable) {
			await this.assertExchange(amqplibChannel, exchangeName, "topic", alternateExchangeName);
			await new Promise((resolve: () => void, reject: (error: Error) => void) => (<AmqplibConfirmChannel> amqplibChannel).publish(
				exchangeName,
				routingKey,
				encodedMessageBuffer,
				sendOptions,
				(error: Error) => error !== null ? reject(error) : resolve(),
			));
		} else {
			await this.assertExchange(amqplibChannel, exchangeName, "topic", alternateExchangeName);
			amqplibChannel.publish(
				exchangeName,
				routingKey,
				encodedMessageBuffer,
				sendOptions,
			);
		}
	}

	private async getAmqplibChannel(
		amqplibConnection: AmqplibConnection,
		identifier: string,
	): Promise<AmqplibChannel> {
		return await this.getOrCreateAmqplibChannel('not_confirm-' + identifier, async () => {
			return await amqplibConnection.createChannel();
		});
	}

	private async getAmqplibConfirmChannel(
		amqplibConnection: AmqplibConnection,
		identifier: string,
	): Promise<AmqplibConfirmChannel> {
		return await this.getOrCreateAmqplibChannel('confirm-' + identifier, async () => {
			return await amqplibConnection.createConfirmChannel();
		});
	}

	private async closeAmqplibChannel(identifier: string) {
		await this.releaseAmqplibChannel("not_confirm-" + identifier);
	}

	private async closeAmqplibConfirmChannel(identifier: string) {
		await this.releaseAmqplibChannel("confirm-" + identifier);
	}

	private async getOrCreateAmqplibChannel<TAmqplibChannel extends AmqplibChannel>(
		identifier: string,
		createChannel: () => Promise<TAmqplibChannel>,
	): Promise<TAmqplibChannel> {
		if (typeof this.amqplibChannnelMap[identifier] !== 'undefined') {
			this.amqplibChannnelMap[identifier].clientCount++;
			return this.amqplibChannnelMap[identifier].channel as TAmqplibChannel;
		} else {
			debug('Create channel %s', identifier);
			const amqplibChannel = await createChannel();
			amqplibChannel.setMaxListeners(100);
			if (typeof this.amqplibChannnelMap[identifier] !== 'undefined') {
				// if more channels are created in same time then use the first created
				debug('Close useless channel %s', identifier);
				amqplibChannel.close();
				this.amqplibChannnelMap[identifier].clientCount++;
				return this.amqplibChannnelMap[identifier].channel as TAmqplibChannel;
			} else {
				debug('Created channel %s', identifier);
				this.amqplibChannnelMap[identifier] = {
					channel: amqplibChannel,
					clientCount: 1,
				};
				return amqplibChannel;
			}
		}
	}

	private async releaseAmqplibChannel(identifier: string) {
		if (typeof this.amqplibChannnelMap[identifier] !== "undefined") {
			if (this.amqplibChannnelMap[identifier].clientCount <= 1) {
				const channel = this.amqplibChannnelMap[identifier].channel;
				delete this.amqplibChannnelMap[identifier];
				await channel.close();
			} else {
				this.amqplibChannnelMap[identifier].clientCount--;
			}
		} else {
			console.log("Unexpected close channel to non-existent channel " + identifier);
		}
	}

	private getExchangeChannelIdentifier(exchangeName: string, routingKey: string) {
		return exchangeName + '_' + routingKey;
	}

	private async assertExchange(amqplibChannel: AmqplibChannel, exchangeName: string, type: ExchangeType, alternateExchangeName?: string) {
		if (exchangeName !== '') {
			if (typeof alternateExchangeName !== "undefined" && alternateExchangeName !== "") {
				await amqplibChannel.assertExchange(alternateExchangeName, type);
				await amqplibChannel.assertExchange(exchangeName, type, {
					alternateExchange: alternateExchangeName,
				});
			} else {
				await amqplibChannel.assertExchange(exchangeName, type);
			}
		}
	}

	private async assertRejectableQueue(
		amqplibChannel: AmqplibChannel,
		queueName: string,
		maxPriority: number | undefined,
		persistent: boolean = true,
		exclusive: boolean = false,
	) {
		return await amqplibChannel.assertQueue(queueName, {
			deadLetterExchange: '',
			deadLetterRoutingKey: REJECTED_QUEUE_PREFIX + queueName,
			maxPriority,
			autoDelete: !persistent,
			exclusive,
		});
	}

	private async bindQueue(amqplibChannel: AmqplibChannel, queueName: string, exchangeName: string, routingKey: string) {
		if (exchangeName !== '') {
			await amqplibChannel.bindQueue(queueName, exchangeName, routingKey);
		}
	}

	private async unbindQueue(amqplibChannel: AmqplibChannel, queueName: string, exchangeName: string, routingKey: string) {
		if (exchangeName !== "") {
			await amqplibChannel.unbindQueue(queueName, exchangeName, routingKey);
		}
	}
}
