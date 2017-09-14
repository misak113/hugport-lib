
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
const debug = Debug('@signageos/lib:AMQP:ChannelProvider');

const DEFAULT_PREFETCH_COUNT = 100;
const REJECTED_QUEUE_PREFIX = '__rejected.';
const RESPONSE_QUEUE_PREFIX = '__response.';

export default class ChannelProvider {

	private amqplibConnection: AmqplibConnection | undefined;
	private amqplibChannnelMap: { [queueIdentifier: string]: AmqplibChannel };

	constructor(
		private amqpPool: IAMQPPool,
	) {
		this.amqplibChannnelMap = {};
	}

	public async getChannel(queueName: string, options: IQueueOptions = {}): Promise<IChannel<any>> {
		const amqplibConnection = await this.getAmqplibConnection();
		const channel = {
			send: async (message: any, messageOptions: IMessageOptions = {}) => {
				const encodedMessageBuffer = this.encodeMessageIntoBuffer(message);
				const amqplibSendOptions = this.createAmqplibSendOptions(options, messageOptions);
				await this.sendToQueue(amqplibConnection, queueName, encodedMessageBuffer, amqplibSendOptions, options);
			},
			sendExpectingResponse: async <TResponseMessage>(message: any, messageOptions: IMessageOptions = {}) => {
				const encodedMessageBuffer = this.encodeMessageIntoBuffer(message);
				const responseQueueName = RESPONSE_QUEUE_PREFIX + queueName;
				const amqplibResponseChannel = await this.getAmqplibResponseChannel(amqplibConnection, responseQueueName);
				const correlationId = generateUniqueHash();
				const amqplibSendOptions: AmqplibOptions.Publish = {
					...this.createAmqplibSendOptions(options, messageOptions),
					correlationId,
					replyTo: responseQueueName,
				};
				const sentPromise = this.sendToQueue(amqplibConnection, queueName, encodedMessageBuffer, amqplibSendOptions, options);
				const responsePromise = new Promise(
					async (resolve: (responseMessage: TResponseMessage) => void) => {
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
			consume: async (onMessage: (message: any) => Promise<any>, onEnded?: () => void) => {
				return await channel.consumeExpectingConfirmation(
					async (message: any, ack: () => void) => {
						const response = await onMessage(message);
						ack();
						return response;
					},
					onEnded,
				);
			},
			consumeExpectingConfirmation: async (
				onMessage: (
					message: any,
					ack: () => void,
					nack: (options?: INackOptions) => void
				) => Promise<any>,
				onEnded?: () => void
			) => {
				const amqplibChannel = options.confirmable
					? await this.getAmqplibConfirmChannel(amqplibConnection, queueName, options.maxPriority)
					: await this.getAmqplibChannel(amqplibConnection, queueName, options.maxPriority);
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
				const { consumerTag } = await amqplibChannel.consume(queueName, async (amqplibMessage: AmqplibMessage) => {
					try {
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
						if (amqplibMessage.properties.replyTo) {
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
					} catch (error) {
						amqplibChannel.nack(amqplibMessage);
						throw error;
					}
				});
				return async () => {
					await amqplibChannel.cancel(consumerTag);
				};
			},
		};
		return channel;
	}

	private createAmqplibSendOptions(options: IQueueOptions, messageOptions: IMessageOptions) {
		return {
			persistent: options.persistent,
			priority: messageOptions.priority,
		};
	}

	private decodeMessageBuffer(encodedMessageBuffer?: Buffer) {
		return encodedMessageBuffer ? JSON.parse(encodedMessageBuffer.toString(), deserializeJSON) : null;
	}

	private encodeMessageIntoBuffer(message: any) {
		return new Buffer(JSON.stringify(message));
	}

	private async sendToQueue(
		amqplibConnection: AmqplibConnection,
		queueName: string,
		encodedMessageBuffer: Buffer,
		sendOptions: AmqplibOptions.Publish,
		options: IQueueOptions,
	) {
		if (options.confirmable) {
			const amqplibChannel = await this.getAmqplibConfirmChannel(amqplibConnection, queueName, options.maxPriority);
			await new Promise((resolve: () => void, reject: (error: Error) => void) => amqplibChannel.sendToQueue(
				queueName,
				encodedMessageBuffer,
				sendOptions,
				(error: Error) => error !== null ? reject(error) : resolve(),
			));
		} else {
			const amqplibChannel = await this.getAmqplibChannel(amqplibConnection, queueName, options.maxPriority);
			amqplibChannel.sendToQueue(
				queueName,
				encodedMessageBuffer,
				sendOptions,
			);
		}
	}

	private async getAmqplibChannel(
		amqplibConnection: AmqplibConnection,
		queueName: string,
		maxPriority: number | undefined,
	): Promise<AmqplibChannel> {
		return await this.getOrCreateAmqplibChannel('not_confirm-' + queueName, async () => {
			const amqplibChannel = await amqplibConnection.createChannel();
			await this.assertRejectableQueue(amqplibChannel, queueName, maxPriority);
			return amqplibChannel;
		});
	}

	private async getAmqplibConfirmChannel(
		amqplibConnection: AmqplibConnection,
		queueName: string,
		maxPriority: number | undefined,
	): Promise<AmqplibConfirmChannel> {
		return await this.getOrCreateAmqplibChannel('confirm-' + queueName, async () => {
			const amqplibChannel = await amqplibConnection.createConfirmChannel();
			await this.assertRejectableQueue(amqplibChannel, queueName, maxPriority);
			return amqplibChannel;
		});
	}

	private async getAmqplibResponseChannel(
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

	private async getOrCreateAmqplibChannel<TAmqplibChannel extends AmqplibChannel>(
		queueIdentifier: string,
		createChannel: () => Promise<TAmqplibChannel>,
	): Promise<TAmqplibChannel> {
		if (typeof this.amqplibChannnelMap[queueIdentifier] !== 'undefined') {
			return this.amqplibChannnelMap[queueIdentifier] as TAmqplibChannel;
		} else {
			debug('Create channel %s', queueIdentifier);
			const amqplibChannel = await createChannel();
			if (typeof this.amqplibChannnelMap[queueIdentifier] !== 'undefined') {
				// if more channels are created in same time then use the first created
				debug('Close useless channel %s', queueIdentifier);
				amqplibChannel.close();
				return this.amqplibChannnelMap[queueIdentifier] as TAmqplibChannel;
			} else {
				debug('Created channel %s', queueIdentifier);
				this.amqplibChannnelMap[queueIdentifier] = amqplibChannel;
				return amqplibChannel;
			}
		}
	}

	private async assertRejectableQueue(amqplibChannel: AmqplibChannel, queueName: string, maxPriority: number | undefined) {
		await amqplibChannel.assertQueue(queueName, {
			deadLetterExchange: '',
			deadLetterRoutingKey: REJECTED_QUEUE_PREFIX + queueName,
			maxPriority,
		});
	}

	private async getAmqplibConnection() {
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
}
