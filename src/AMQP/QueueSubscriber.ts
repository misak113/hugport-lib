
import IArrayStorage from '../Storage/IArrayStorage';
import IUnsubscribedMessage from './IUnsubscribedMessage';
import IQueueOptions from './IQueueOptions';
import ChannelProvider from './ChannelProvider';
import { ICancelConsumption } from './IChannel';
import INackOptions from './INackOptions';
import * as Debug from 'debug';
const debug = Debug('@signageos/lib:AMQP:QueueSubscriber');

const RETRY_SUBSCRIBE_AFTER_TIMEOUT = 1e3;

export default class QueuePublisher {

	private resubscribeTimeout: NodeJS.Timer | undefined;

	constructor(
		private channelProvider: ChannelProvider,
		private unsubscribedMessageStorage: IArrayStorage<IUnsubscribedMessage>,
	) {}

	public async subscribe<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage) => Promise<TResponseMessage>,
		options: IQueueOptions = {},
		onEnded?: () => void
	): Promise<ICancelConsumption> {
		const channel = await this.channelProvider.getChannel(queueName, options);
		const cancelConsumption = await channel.consume(onMessage, onEnded);
		debug('Messages subscribed: %s', queueName);
		return cancelConsumption;
	}

	public async subscribeRepeatable<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage) => Promise<TResponseMessage>,
		options: IQueueOptions = {},
	): Promise<ICancelConsumption> {
		try {
			let cancelConsumption = await this.subscribe(queueName, onMessage, options, async () => {
				// TODO it does not cancel consumption during repeating
				cancelConsumption = await this.repeateSubscription(queueName, onMessage, options, false);
			});
			debug('Messages subscribed: %s', queueName);
			return () => cancelConsumption();
		} catch (error) {
			debug('Error during subscribe repeatable: %s', queueName, error);
			return await this.repeateSubscription(queueName, onMessage, options, false);
		}
	}

	public async subscribeExpectingConfirmation<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack: () => void, nack: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		options: IQueueOptions = {},
		onEnded?: () => void
	): Promise<ICancelConsumption> {
		const channel = await this.channelProvider.getChannel(queueName, options);
		const cancelConsumption = await channel.consumeExpectingConfirmation(onMessage, onEnded);
		debug('Messages subscribed expecting confirmation: %s', queueName);
		return cancelConsumption;
	}

	public async subscribeExpectingConfirmationRepeatable<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack: () => void, nack: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		options: IQueueOptions = {},
	): Promise<ICancelConsumption> {
		try {
			let cancelConsumption = await this.subscribeExpectingConfirmation(queueName, onMessage, options, async () => {
				// TODO it does not cancel consumption during repeating
				cancelConsumption = await this.repeateSubscription(queueName, onMessage, options, true);
			});
			debug('Messages subscribed expecting confirmation: %s', queueName);
			return () => cancelConsumption();
		} catch (error) {
			debug('Error during subscribe expecting confirmation repeatable: %s', queueName, error);
			return await this.repeateSubscription(queueName, onMessage, options, true);
		}
	}

	private repeateSubscription<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack?: () => void, nack?: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		options: IQueueOptions,
		confirmationWaiting: boolean,
	) {
		return new Promise((resolve: (cancelConsumption: ICancelConsumption) => void) => {
			this.unsubscribedMessageStorage.push({ queueName, onMessage, options, resolve, confirmationWaiting });
			this.tryResubscribeAfterTimeout();
		});
	}

	private async subscribeAllFromStorage() {
		while (true) {
			const unqueuedMessage = this.unsubscribedMessageStorage.shift();
			if (unqueuedMessage) {
				const { queueName, onMessage, options, resolve, confirmationWaiting } = unqueuedMessage;
				try {
					let cancelConsumption: ICancelConsumption;
					if (!confirmationWaiting) {
						cancelConsumption = await this.subscribe(queueName, onMessage, options, async () => {
							await this.repeateSubscription(queueName, onMessage, options, confirmationWaiting);
						});
					} else {
						cancelConsumption = await this.subscribeExpectingConfirmation(queueName, onMessage, options, async () => {
							await this.repeateSubscription(queueName, onMessage, options, confirmationWaiting);
						});
					}
					resolve(cancelConsumption);
				} catch (error) {
					debug('Error during subscribe from storage: %s', queueName, error);
					this.unsubscribedMessageStorage.unshift(unqueuedMessage);
					throw error;
				}
			} else {
				break;
			}
		}
	}

	private tryResubscribeAfterTimeout() {
		if (!this.resubscribeTimeout) {
			this.resubscribeTimeout = setTimeout(
				async () => {
					debug('Timeout resubscribe');
					try {
						await this.subscribeAllFromStorage();
						this.resubscribeTimeout = undefined;
					} catch (error) {
						this.resubscribeTimeout = undefined;
						this.tryResubscribeAfterTimeout();
					}
				},
				RETRY_SUBSCRIBE_AFTER_TIMEOUT
			);
		}
	}
}
