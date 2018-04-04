
import IArrayStorage from '../Storage/IArrayStorage';
import IUnqueuedMessage from './IUnqueuedMessage';
import IQueueOptions from './IQueueOptions';
import IMessageOptions from './IMessageOptions';
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
		message: TMessage,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options?: IQueueOptions,
		messageOptions: IMessageOptions = {},
	) {
		const channel = await this.channelProvider.getChannel(namespace, routingKey, exchangeName, options, alternateExchangeName);
		try {
			await channel.send(message, messageOptions);
			debug('Message enqueued: %s', exchangeName, alternateExchangeName, routingKey, message);
		} finally {
			// it's ineffective to open/close channel all the time if sending messages often
			// TODO : do something about this
			// await channel.close();
		}
	}

	public async enqueueRepeatable<TMessage>(
		message: TMessage,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options?: IQueueOptions,
		messageOptions: IMessageOptions = {},
	) {
		try {
			await this.enqueue(message, namespace, routingKey, exchangeName, alternateExchangeName, options, messageOptions);
		} catch (error) {
			debug('Error during enqueue repeatable: %s', routingKey, exchangeName, alternateExchangeName, message, error);
			await new Promise((resolve: () => void) => {
				this.unqueuedMessageStorage.push({
					message, namespace, routingKey, exchangeName, alternateExchangeName, options, messageOptions, resolve, responseWaiting: false,
				});
				this.tryReenqueueAfterTimeout();
			});
		}
	}

	public async enqueueExpectingResponse<TMessage, TResponseMessage>(
		message: TMessage,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options?: IQueueOptions,
		messageOptions: IMessageOptions = {},
	): Promise<TResponseMessage> {
		const channel = await this.channelProvider.getChannel(namespace, routingKey, exchangeName, options, alternateExchangeName);
		try {
			const response = await channel.sendExpectingResponse<TResponseMessage>(message, messageOptions);
			debug('Message enqueued: %s', routingKey, exchangeName, alternateExchangeName, message);
			return response;
		} finally {
			// it's ineffective to open/close channel all the time if sending messages often
			// TODO : do something about this
			// await channel.close();
		}
	}

	public async enqueueExpectingResponseRepeatable<TMessage, TResponseMessage>(
		message: TMessage,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options?: IQueueOptions,
		messageOptions: IMessageOptions = {},
	): Promise<TResponseMessage> {
		try {
			return await this.enqueueExpectingResponse<TMessage, TResponseMessage>(
				message, namespace, routingKey, exchangeName, alternateExchangeName, options, messageOptions
			);
		} catch (error) {
			debug('Error during enqueue repeatable: %s', exchangeName, alternateExchangeName, routingKey, message, error);
			return await new Promise((resolve: (response: TResponseMessage) => void) => {
				this.unqueuedMessageStorage.push({
					message,
					namespace,
					routingKey,
					exchangeName,
					options,
					messageOptions,
					resolve,
					responseWaiting: true,
				});
				this.tryReenqueueAfterTimeout();
			});
		}
	}

	private async enqueueAllFromStorage() {
		while (true) {
			const unqueuedMessage = this.unqueuedMessageStorage.shift();
			if (unqueuedMessage) {
				const {
					message, namespace, routingKey, exchangeName, alternateExchangeName, options, messageOptions, resolve, responseWaiting,
				} = unqueuedMessage;
				try {
					if (responseWaiting) {
						const response = await this.enqueueExpectingResponse(
							message, namespace, routingKey, exchangeName, alternateExchangeName, options, messageOptions,
						);
						resolve(response);
					} else {
						await this.enqueue(message, namespace, routingKey, exchangeName, alternateExchangeName, options, messageOptions);
						resolve();
					}
				} catch (error) {
					debug('Error during enqueue from storage: %s', routingKey, exchangeName, alternateExchangeName, message, error);
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
