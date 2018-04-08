
import IArrayStorage from '../Storage/IArrayStorage';
import IUnsubscribedMessage from './IUnsubscribedMessage';
import IQueueOptions from './IQueueOptions';
import IConsumeOptions from './IConsumeOptions';
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

	public async subscribe<TMessage>(
		queueName: string,
		onMessage: (message: TMessage) => Promise<void>,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options: IQueueOptions = {},
		consumeOptions: IConsumeOptions = {},
		onEnded?: () => void,
	): Promise<ICancelConsumption> {
		const channel = await this.channelProvider.getChannel(namespace, routingKey, exchangeName, options, alternateExchangeName);
		const cancelConsumption = await channel.consumeSimple(queueName, onMessage, consumeOptions, onEnded);
		debug('Messages subscribed: %s', queueName, routingKey, exchangeName);
		return async () => {
			try {
				await cancelConsumption();
			} finally {
				await channel.close();
			}
		};
	}

	public async subscribeRepeatable<TMessage>(
		queueName: string,
		onMessage: (message: TMessage) => Promise<void>,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options: IQueueOptions = {},
		consumeOptions: IConsumeOptions = {},
	): Promise<ICancelConsumption> {
		try {
			let computionCanceled = false;
			let cancelConsumption = await this.subscribe(
				queueName,
				onMessage,
				namespace,
				routingKey,
				exchangeName,
				alternateExchangeName,
				options,
				consumeOptions,
				async () => {
					if (!computionCanceled) {
						cancelConsumption = await this.repeateSubscription(
							queueName,
							onMessage,
							namespace,
							options,
							consumeOptions,
							false,
							routingKey,
							exchangeName,
							alternateExchangeName,
							false,
						);
					}
				},
			);
			debug('Messages subscribed: %s', queueName, routingKey, exchangeName, alternateExchangeName);
			return async () => {
				computionCanceled = true;
				await cancelConsumption();
			};
		} catch (error) {
			debug('Error during subscribe repeatable: %s', queueName, exchangeName, alternateExchangeName, routingKey, error);
			return await this.repeateSubscription(
				queueName,
				onMessage,
				namespace,
				options,
				consumeOptions,
				false,
				routingKey,
				exchangeName,
				alternateExchangeName,
				false,
			);
		}
	}

	public async subscribeExpectingConfirmation<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack: () => void, nack: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options: IQueueOptions = {},
		consumeOptions: IConsumeOptions = {},
		onEnded?: () => void,
		respond: boolean = false,
	): Promise<ICancelConsumption> {
		const channel = await this.channelProvider.getChannel(namespace, routingKey, exchangeName, options, alternateExchangeName);
		const cancelConsumption = await channel.consume(queueName, onMessage, respond, consumeOptions, onEnded);
		debug('Messages subscribed expecting confirmation: %s', queueName, routingKey, exchangeName);
		return async () => {
			try {
				await cancelConsumption();
			} finally {
				await channel.close();
			}
		};
	}

	public async subscribeExpectingConfirmationRepeatable<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack: () => void, nack: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		namespace: string,
		routingKey: string,
		exchangeName?: string,
		alternateExchangeName?: string,
		options: IQueueOptions = {},
		consumeOptions: IConsumeOptions = {},
		respond: boolean = false,
	): Promise<ICancelConsumption> {
		try {
			let computionCanceled = false;
			let cancelConsumption = await this.subscribeExpectingConfirmation(
				queueName,
				onMessage,
				namespace,
				routingKey,
				exchangeName,
				alternateExchangeName,
				options,
				consumeOptions,
				async () => {
					if (!computionCanceled) {
						cancelConsumption = await this.repeateSubscription(
							queueName,
							onMessage,
							namespace,
							options,
							consumeOptions,
							true,
							routingKey,
							exchangeName,
							alternateExchangeName,
							respond,
						);
					}
				},
				respond,
			);
			debug('Messages subscribed expecting confirmation: %s', queueName, routingKey, exchangeName, alternateExchangeName);
			return async () => {
				computionCanceled = true;
				await cancelConsumption();
			};
		} catch (error) {
			debug('Error during subscribe expecting confirmation repeatable: %s', queueName, routingKey, exchangeName, alternateExchangeName, error);
			return await this.repeateSubscription(
				queueName,
				onMessage,
				namespace,
				options,
				consumeOptions,
				true,
				routingKey,
				exchangeName,
				alternateExchangeName,
				respond,
			);
		}
	}

	private repeateSubscription<TMessage, TResponseMessage>(
		queueName: string,
		onMessage: (message: TMessage, ack?: () => void, nack?: (options?: INackOptions) => void) => Promise<TResponseMessage>,
		namespace: string,
		options: IQueueOptions,
		consumeOptions: IConsumeOptions,
		confirmationWaiting: boolean,
		routingKey: string,
		exchangeName: string | undefined,
		alternateExchangeName: string | undefined,
		respond: boolean,
	) {
		return new Promise((resolve: (cancelConsumption: ICancelConsumption) => void) => {
			this.unsubscribedMessageStorage.push({
				queueName,
				onMessage,
				namespace,
				routingKey,
				exchangeName,
				alternateExchangeName,
				options,
				consumeOptions,
				resolve,
				confirmationWaiting,
				respond,
			});
			this.tryResubscribeAfterTimeout();
		});
	}

	private async subscribeAllFromStorage() {
		while (true) {
			const unqueuedMessage = this.unsubscribedMessageStorage.shift();
			if (unqueuedMessage) {
				const {
					queueName,
					onMessage,
					namespace,
					routingKey,
					exchangeName,
					alternateExchangeName,
					options,
					consumeOptions,
					resolve,
					confirmationWaiting,
					respond,
				} = unqueuedMessage;
				try {
					let cancelConsumption: ICancelConsumption;
					if (!confirmationWaiting) {
						cancelConsumption = await this.subscribe(
							queueName, onMessage, namespace, routingKey, exchangeName, alternateExchangeName, options, consumeOptions, async () => {
								await this.repeateSubscription(
									queueName,
									onMessage,
									namespace,
									options,
									consumeOptions,
									confirmationWaiting,
									routingKey,
									exchangeName,
									alternateExchangeName,
									respond,
								);
							},
						);
					} else {
						cancelConsumption = await this.subscribeExpectingConfirmation(
							queueName,
							onMessage,
							namespace,
							routingKey,
							exchangeName,
							alternateExchangeName,
							options,
							consumeOptions,
							async () => {
								await this.repeateSubscription(
									queueName,
									onMessage,
									namespace,
									options,
									consumeOptions,
									confirmationWaiting,
									routingKey,
									exchangeName,
									alternateExchangeName,
									respond,
								);
							},
							respond,
						);
					}
					resolve(cancelConsumption);
				} catch (error) {
					debug('Error during subscribe from storage: %s', queueName, routingKey, exchangeName, alternateExchangeName, error);
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
