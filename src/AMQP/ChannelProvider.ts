
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
	private amqplibChannnelMap: { [queueIdentifier: string]: AmqplibChannel };

	constructor(
		private amqpPool: IAMQPPool,
	) {
		this.amqplibChannnelMap = {};
	}

	public async getChannel(
		routingKey: string,
		exchangeName: string = '',
		options: IQueueOptions = {},
	): Promise<IChannel<any>> {
		const amqplibConnection = await this.getAmqplibConnection();
		const channel = {
			send: async (message: any, messageOptions: IMessageOptions = {}) => {
				const encodedMessageBuffer = this.encodeMessageIntoBuffer(message);
				const amqplibSendOptions = this.createAmqplibSendOptions(options, messageOptions);
				await this.publish(amqplibConnection, exchangeName, routingKey, encodedMessageBuffer, amqplibSendOptions, options);
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
				const sentPromise = this.publish(amqplibConnection, exchangeName, routingKey, encodedMessageBuffer, amqplibSendOptions, options);
				const responsePromise = new Promise(
					async (resolve: (responseMessage: TResponseMessage) => void) => {
						await amqplibResponseChannel.prefetch(1);
						const { consumerTag } = await amqplibResponseChannel.consume(
							responseQueueName,
							(amqplibResponseMessage: AmqplibMessage) => {
								if (amqplibResponseMessage.properties.correlationId === correlationId) {
									resolve(this.decodeMessageBuffer(amqplibResponseMessage.content));
									amqplibResponseChannel.ack(amqplibResponseMessage);
									amqplibResponseChannel.cancel(consumerTag);
								} else {
									amqplibResponseChannel.nack(amqplibResponseMessage);
								}
							},
						);
					}
				);
				await sentPromise;
				return await responsePromise;
			},
			consumeSimple: async (queueName: string, onMessage: (message: any) => Promise<any>, onEnded?: () => void) => {
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
				onEnded?: () => void
			) => {
				if (exchangeName === '' && queueName !== routingKey) {
					throw new Error('If default exchange is used, queue name must match the routing key');
				}

				const channelIdentifier = this.getExchangeChannelIdentifier(exchangeName, routingKey);
				const amqplibChannel = options.confirmable
					? await this.getAmqplibConfirmChannel(amqplibConnection, channelIdentifier)
					: await this.getAmqplibChannel(amqplibConnection, channelIdentifier);
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
				await this.assertExchange(amqplibChannel, exchangeName, 'direct');
				await this.assertRejectableQueue(amqplibChannel, queueName, options.maxPriority);
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
						const amqplibResponseChannel = await this.getAmqplibResponseChannel(
							amqplibConnection,
							amqplibMessage.properties.replyTo
						);
						amqplibResponseChannel.sendToQueue(
							amqplibMessage.properties.replyTo,
							this.encodeMessageIntoBuffer(response),
							{ correlationId: amqplibMessage.properties.correlationId },
						);
					}
				});
				return async () => {
					await amqplibChannel.cancel(consumerTag);
				};
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
		return await this.getOrCreateAmqplibChannel('response-' + queueName, async () => {
			const amqplibChannel = await amqplibConnection.createChannel();
			await amqplibChannel.assertQueue(queueName, {
				durable: false,
				autoDelete: true,
			});
			return amqplibChannel;
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
		amqplibConnection: AmqplibConnection,
		exchangeName: string,
		routingKey: string,
		encodedMessageBuffer: Buffer,
		sendOptions: AmqplibOptions.Publish,
		options: IQueueOptions,
	) {
		const channelIdentificator = this.getExchangeChannelIdentifier(exchangeName, routingKey);

		if (options.confirmable) {
			const amqplibChannel = await this.getAmqplibConfirmChannel(amqplibConnection, channelIdentificator);
			await this.assertExchange(amqplibChannel, exchangeName, 'direct');
			await new Promise((resolve: () => void, reject: (error: Error) => void) => amqplibChannel.publish(
				exchangeName,
				routingKey,
				encodedMessageBuffer,
				sendOptions,
				(error: Error) => error !== null ? reject(error) : resolve(),
			));
		} else {
			const amqplibChannel = await this.getAmqplibChannel(amqplibConnection, channelIdentificator);
			await this.assertExchange(amqplibChannel, exchangeName, 'direct');
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

	private async getOrCreateAmqplibChannel<TAmqplibChannel extends AmqplibChannel>(
		identifier: string,
		createChannel: () => Promise<TAmqplibChannel>,
	): Promise<TAmqplibChannel> {
		if (typeof this.amqplibChannnelMap[identifier] !== 'undefined') {
			return this.amqplibChannnelMap[identifier] as TAmqplibChannel;
		} else {
			debug('Create channel %s', identifier);
			const amqplibChannel = await createChannel();
			if (typeof this.amqplibChannnelMap[identifier] !== 'undefined') {
				// if more channels are created in same time then use the first created
				debug('Close useless channel %s', identifier);
				amqplibChannel.close();
				return this.amqplibChannnelMap[identifier] as TAmqplibChannel;
			} else {
				debug('Created channel %s', identifier);
				this.amqplibChannnelMap[identifier] = amqplibChannel;
				return amqplibChannel;
			}
		}
	}

	private getExchangeChannelIdentifier(exchangeName: string, routingKey: string) {
		return exchangeName + '_' + routingKey;
	}

	private async assertExchange(amqplibChannel: AmqplibChannel, exchangeName: string, type: ExchangeType) {
		if (exchangeName !== '') {
			await amqplibChannel.assertExchange(exchangeName, type);
		}
	}

	private async assertRejectableQueue(amqplibChannel: AmqplibChannel, queueName: string, maxPriority: number | undefined) {
		return await amqplibChannel.assertQueue(queueName, {
			deadLetterExchange: '',
			deadLetterRoutingKey: REJECTED_QUEUE_PREFIX + queueName,
			maxPriority,
		});
	}

	private async bindQueue(amqplibChannel: AmqplibChannel, queueName: string, exchangeName: string, routingKey: string) {
		if (exchangeName !== '') {
			await amqplibChannel.bindQueue(queueName, exchangeName, routingKey);
		}
	}
}
