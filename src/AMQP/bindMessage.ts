
import * as _ from 'lodash';
import wait from '../Timer/wait';
import { deserializeJSON } from '../JSON/jsonHelper';
import { Message } from 'amqplib';
import { IAMQPConnection } from './amqpConnectionFactory';
import { assertRejectableQueue } from './queueConfigurator';
import INackOptions from './INackOptions';
import IQueueOptions from './IQueueOptions';

export async function bindMessageRetryable<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	onMessage: (message: TMessage) => Promise<void>,
	options: {
		priority?: number;
	} = {},
	delayBeforeRetry: number = 1000,
) {
	while (true) {
		await new Promise(async (resolve: () => void) => {
			try {
				await bindMessage(
					amqpConnection,
					queueName,
					onMessage,
					options,
					() => resolve(),
				);
			} catch (error) {
				resolve();
			}
		});
		await wait(delayBeforeRetry);
	}
}

export async function bindMessage<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	onMessage: (message: TMessage) => Promise<void>,
	options: {
		priority?: number;
		maxPriority?: number;
	} = {},
	onEnded?: () => void,
) {
	const connection = await amqpConnection.pool.acquire(options.priority);
	const channel = await connection.createConfirmChannel();
	channel.once('error', (error:  Error) => {
		if (onEnded) {
			onEnded();
			onEnded = undefined;
		}
		throw error;
	});
	channel.once('close', () => {
		if (onEnded) {
			onEnded();
			onEnded = undefined;
		}
	});
	await assertRejectableQueue(channel, queueName, options.maxPriority);
	await channel.consume(queueName, async (amqpMessage: Message) => {
		try {
			const message = JSON.parse(amqpMessage.content.toString(), deserializeJSON);
			await onMessage(message);
			channel.ack(amqpMessage);
		} catch (error) {
			channel.nack(amqpMessage);
			throw error;
		}
	});
}

interface IMessageConsumption<TMessage> {
	message: TMessage;
	ack: () => void;
	nack: (options?: INackOptions) => void;
}

export async function bindMessagePrefetchedExpectingConfirmationRepeatable<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	prefetchCount: number,
	debounceTimeoutMs: number,
	onMessages: (
		messages: TMessage[],
		ack: (message: TMessage) => void,
		nack: (message: TMessage, options?: INackOptions) => void,
	) => Promise<void>,
	options: IQueueOptions,
) {
	const unconsumedConsumptions: IMessageConsumption<TMessage>[] = [];
	const consumedConsumptions: IMessageConsumption<TMessage>[] = [];
	const resolveConsumption = (ackOrNack: 'ack' | 'nack') => (message: TMessage) => {
		const indexOfMessage = consumedConsumptions.findIndex((consumption: IMessageConsumption<TMessage>) => consumption.message === message);
		const consumption = consumedConsumptions[indexOfMessage];
		consumedConsumptions.splice(indexOfMessage, 1);
		consumption[ackOrNack]();
	};
	const debouncedOnMessages = _.debounce(
		() => {
			let consumption: IMessageConsumption<TMessage> | undefined;
			const messages = [];
			while (consumption = unconsumedConsumptions.shift()) {
				messages.push(consumption.message);
				consumedConsumptions.push(consumption);
			}
			onMessages(messages, resolveConsumption('ack'), resolveConsumption('nack'));
		},
		debounceTimeoutMs,
	);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		async (message: TMessage, ack: () => void, nack: (nackOptions?: INackOptions) => void) => {
			unconsumedConsumptions.push({ message, ack, nack });
			debouncedOnMessages();
		},
		{ ...options, prefetchCount },
	);
}
