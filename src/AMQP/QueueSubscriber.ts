
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
		routingKey: string,
		exchangeName?: string,
		options: IQueueOptions = {},
		onEnded?: () => void,
	): Promise<ICancelConsumption> {
		const channel = await this.channelProvider.getChannel(routingKey, exchangeName, options);
		const cancelConsumption = await channel.consume(queueName, onMessage, onEnded);
		debug('Messages subscribed: %s', queueName, routingKey, exchangeName);
		return cancelConsumption;
	}

	public async subscribeRepeatable<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage) => Promise<TResponseMessage>,
		routingKey: string,
		exchangeName?: string,
		options: IQueueOptions = {},
	): Promise<ICancelConsumption> {
		try {
			let cancelConsumption = await this.subscribe(queueName, onMessage, routingKey, exchangeName, options, async () => {
				// TODO it does not cancel consumption during repeating
				cancelConsumption = await this.repeateSubscription(queueName, onMessage, options, false, routingKey, exchangeName);
			});
			debug('Messages subscribed: %s', queueName, routingKey, exchangeName);
			return () => cancelConsumption();
		} catch (error) {
			debug('Error during subscribe repeatable: %s', queueName, exchangeName, routingKey, error);
			return await this.repeateSubscription(queueName, onMessage, options, false, routingKey, exchangeName);
		}
	}

	public async subscribeExpectingConfirmation<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack: () => void, nack: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		routingKey: string,
		exchangeName?: string,
		options: IQueueOptions = {},
		onEnded?: () => void
	): Promise<ICancelConsumption> {
		const channel = await this.channelProvider.getChannel(routingKey, exchangeName, options);
		const cancelConsumption = await channel.consumeExpectingConfirmation(queueName, onMessage, onEnded);
		debug('Messages subscribed expecting confirmation: %s', queueName, routingKey, exchangeName);
		return cancelConsumption;
	}

	public async subscribeExpectingConfirmationRepeatable<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack: () => void, nack: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		routingKey: string,
		exchangeName?: string,
		options: IQueueOptions = {},
	): Promise<ICancelConsumption> {
		try {
			let cancelConsumption = await this.subscribeExpectingConfirmation(
				queueName,
				onMessage,
				routingKey,
				exchangeName,
				options,
				async () => {
					// TODO it does not cancel consumption during repeating
					cancelConsumption = await this.repeateSubscription(queueName, onMessage, options, true, routingKey, exchangeName);
				},
			);
			debug('Messages subscribed expecting confirmation: %s', queueName, routingKey, exchangeName);
			return () => cancelConsumption();
		} catch (error) {
			debug('Error during subscribe expecting confirmation repeatable: %s', queueName, routingKey, exchangeName, error);
			return await this.repeateSubscription(queueName, onMessage, options, true, routingKey, exchangeName);
		}
	}

	private repeateSubscription<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack?: () => void, nack?: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		options: IQueueOptions,
		confirmationWaiting: boolean,
		routingKey: string,
		exchangeName?: string,
	) {
		return new Promise((resolve: (cancelConsumption: ICancelConsumption) => void) => {
			this.unsubscribedMessageStorage.push({ queueName, onMessage, routingKey, exchangeName, options, resolve, confirmationWaiting });
			this.tryResubscribeAfterTimeout();
		});
	}

	private async subscribeAllFromStorage() {
		while (true) {
			const unqueuedMessage = this.unsubscribedMessageStorage.shift();
			if (unqueuedMessage) {
				const { queueName, onMessage, routingKey, exchangeName, options, resolve, confirmationWaiting } = unqueuedMessage;
				try {
					let cancelConsumption: ICancelConsumption;
					if (!confirmationWaiting) {
						cancelConsumption = await this.subscribe(queueName, onMessage, routingKey, exchangeName, options, async () => {
							await this.repeateSubscription(queueName, onMessage, options, confirmationWaiting, routingKey, exchangeName);
						});
					} else {
						cancelConsumption = await this.subscribeExpectingConfirmation(
							queueName,
							onMessage,
							routingKey,
							exchangeName,
							options,
							async () => {
								await this.repeateSubscription(queueName, onMessage, options, confirmationWaiting, routingKey, exchangeName);
							},
						);
					}
					resolve(cancelConsumption);
				} catch (error) {
					debug('Error during subscribe from storage: %s', queueName, routingKey, exchangeName, error);
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
