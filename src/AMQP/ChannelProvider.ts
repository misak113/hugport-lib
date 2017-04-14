
import {
	Connection as AmqplibConnection,
	Channel as AmqplibChannel,
	ConfirmChannel as AmqplibConfirmChannel,
} from 'amqplib';
import IChannel from './IChannel';
import IAMQPPool from './IAMQPPool';
import IQueueOptions from './IQueueOptions';
import * as Debug from 'debug';
const debug = Debug('@signageos/lib:AMQP:ChannelProvider');

export default class ChannelProvider {

	private amqplibConnection: AmqplibConnection | undefined;
	private amqplibChannnelMap: { [queueName: string]: AmqplibChannel };
	private amqplibConfirmChannnelMap: { [queueName: string]: AmqplibConfirmChannel };

	constructor(
		private amqpPool: IAMQPPool,
	) {
		this.amqplibChannnelMap = {};
		this.amqplibConfirmChannnelMap = {};
	}

	public async getChannel(queueName: string, options: IQueueOptions): Promise<IChannel<any>> {
		const amqplibConnection = await this.getAmqplibConnection();
		return {
			send: async (message: any) => {
				const encodedMessageBuffer = new Buffer(JSON.stringify(message));
				const sendOptions = {
					persistent: options.persistent,
				};
				if (options.confirmable) {
					const amqplibChannel = await this.getAmqplibConfirmChannel(amqplibConnection, queueName);
					await new Promise((resolve: () => void, reject: (error: Error) => void) => amqplibChannel.sendToQueue(
						queueName,
						encodedMessageBuffer,
						sendOptions,
						(error: Error) => error !== null ? reject(error) : resolve(),
					));
				} else {
					const amqplibChannel = await this.getAmqplibChannel(amqplibConnection, queueName);
					amqplibChannel.sendToQueue(
						queueName,
						encodedMessageBuffer,
						sendOptions,
					);
				}
			},
		};
	}

	private async getAmqplibChannel(amqplibConnection: AmqplibConnection, queueName: string) {
		if (typeof this.amqplibChannnelMap[queueName] !== 'undefined') {
			return this.amqplibChannnelMap[queueName];
		} else {
			debug('Create channel %s', queueName);
			const amqplibChannel = await amqplibConnection.createChannel();
			await this.assertRejectableQueue(amqplibChannel, queueName);
			if (typeof this.amqplibChannnelMap[queueName] !== 'undefined') {
				// if more channels are created in same time then use the first created
				debug('Close useless channel %s', queueName);
				amqplibChannel.close();
				return this.amqplibChannnelMap[queueName];
			} else {
				debug('Created channel %s', queueName);
				this.amqplibChannnelMap[queueName] = amqplibChannel;
				return amqplibChannel;
			}
		}
	}

	private async getAmqplibConfirmChannel(amqplibConnection: AmqplibConnection, queueName: string) {
		if (typeof this.amqplibConfirmChannnelMap[queueName] !== 'undefined') {
			return this.amqplibConfirmChannnelMap[queueName];
		} else {
			debug('Create confirm channel %s', queueName);
			const amqplibChannel = await amqplibConnection.createConfirmChannel();
			await this.assertRejectableQueue(amqplibChannel, queueName);
			if (typeof this.amqplibConfirmChannnelMap[queueName] !== 'undefined') {
				// if more channels are created in same time then use the first created
				debug('Close useless confirm channel %s', queueName);
				amqplibChannel.close();
				return this.amqplibConfirmChannnelMap[queueName];
			} else {
				debug('Created confirm channel %s', queueName);
				this.amqplibConfirmChannnelMap[queueName] = amqplibChannel;
				return amqplibChannel;
			}
		}
	}

	private async assertRejectableQueue(amqplibChannel: AmqplibChannel, queueName: string) {
		await amqplibChannel.assertQueue(queueName, {
			deadLetterExchange: 'rejected'
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
					this.amqplibConfirmChannnelMap = {};
					this.amqpPool.destroy(amqplibConnection);
				});
				return amqplibConnection;
			}
		}
	}
}
