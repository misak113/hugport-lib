
import IArrayStorage from '../Storage/IArrayStorage';
import IUnqueuedMessage from './IUnqueuedMessage';
import IEnqueueOptions from './IEnqueueOptions';
import ChannelProvider from './ChannelProvider';
import * as Debug from 'debug';
const debug = Debug('@signageos/lib:AMQP:QueuePublisher');

const RETRY_ENQUEUE_AFTER_TIMEOUT = 1e3;

export default class QueuePublisher {

	private reenqueueTimeout: NodeJS.Timer | undefined;

	constructor(
		private channelProvider: ChannelProvider,
		private unqueuedMessageStorage: IArrayStorage<IUnqueuedMessage>,
	) {}

	public async enqueue<TMessage>(
		queueName: string,
		message: TMessage,
		options: IEnqueueOptions = {},
	) {
		const channel = await this.channelProvider.getChannel(queueName, options);
		await channel.send(message);
		debug('Message enqueued: %s', queueName, message);
	}

	public async enqueueRepeatable<TMessage>(
		queueName: string,
		message: TMessage,
		options: IEnqueueOptions = {},
	) {
		try {
			await this.enqueue(queueName, message, options);
		} catch (error) {
			debug('Error during enqueue repeatable: %s', queueName, message, error);
			await new Promise((resolve: () => void) => {
				this.unqueuedMessageStorage.push({ queueName, message, options, resolve });
				this.tryReenqueueAfterTimeout();
			});
		}
	}

	private async enqueueAllFromStorage() {
		while (true) {
			const unqueuedMessage = this.unqueuedMessageStorage.shift();
			if (unqueuedMessage) {
				const { queueName, message, options, resolve } = unqueuedMessage;
				try {
					await this.enqueue(queueName, message, options);
					resolve();
				} catch (error) {
					debug('Error during enqueue from storage: %s', queueName, message, error);
					this.unqueuedMessageStorage.unshift(unqueuedMessage);
					throw error;
				}
			} else {
				break;
			}
		}
	}

	private tryReenqueueAfterTimeout() {
		if (!this.reenqueueTimeout) {
			this.reenqueueTimeout = setTimeout(
				async () => {
					debug('Timeout reenqueue');
					try {
						await this.enqueueAllFromStorage();
						this.reenqueueTimeout = undefined;
					} catch (error) {
						this.reenqueueTimeout = undefined;
						this.tryReenqueueAfterTimeout();
					}
				},
				RETRY_ENQUEUE_AFTER_TIMEOUT
			);
		}
	}
}
