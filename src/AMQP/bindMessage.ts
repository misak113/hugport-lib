
import wait from '../Timer/wait';
import { deserializeJSON } from '../JSON/jsonHelper';
import { Message } from 'amqplib';
import { IAMQPConnection } from './amqpConnectionFactory';
import { assertRejectableQueue } from './queueConfigurator';

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
