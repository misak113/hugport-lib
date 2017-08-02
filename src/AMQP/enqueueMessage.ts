
import wait from '../Timer/wait';
import { IAMQPConnection } from './amqpConnectionFactory';
import { assertRejectableQueue } from './queueConfigurator';
import * as Debug from 'debug';
const debug = Debug('@signageos/lib:AMQP:enqueueMessage');

export async function enqueueMessageRetryable<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	message: TMessage,
	options: {
		priority?: number;
	} = {},
	numberOfRetrying: number = -1,
	delayBeforeRetry: number = 500,
) {
	try {
		await enqueueMessage(amqpConnection, queueName, message, options);
	} catch (error) {
		if (numberOfRetrying !== 0) {
			debug(`Enqueue message failed. Retry after ${delayBeforeRetry} ms`);
			await wait(delayBeforeRetry);
			await enqueueMessageRetryable(amqpConnection, queueName, message, options, numberOfRetrying - 1, delayBeforeRetry * 2);
		} else {
			throw error;
		}
	}
}

export async function enqueueMessage<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	message: TMessage,
	options: {
		priority?: number;
		maxPriority?: number;
	} = {},
) {
	const connection = await amqpConnection.pool.acquire(options.priority);
	try {
		const channel = await connection.createConfirmChannel();
		await assertRejectableQueue(channel, queueName, options.maxPriority);
		await new Promise((resolve: () => void, reject: (error: Error) => void) => channel.sendToQueue(
			queueName,
			new Buffer(JSON.stringify(message)),
			{ persistent: true },
			(error: Error) => error !== null ? reject(error) : resolve(),
		));
		await amqpConnection.pool.release(connection);
	} catch (error) {
		await amqpConnection.pool.destroy(connection);
		throw error;
	}
}
