
import wait from '../Timer/wait';
import { IAMQPConnection } from './amqpConnectionFactory';
import { assertRejectableQueue } from './queueConfigurator';

export async function enqueueMessageRetryable<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	message: TMessage,
	options: {
		priority?: number;
	} = {},
	numberOfRetrying: number = 3,
	delayBeforeRetry: number = 500,
) {
	try {
		await enqueueMessage(amqpConnection, queueName, message, options);
	} catch (error) {
		if (numberOfRetrying > 0) {
			console.log(`Enqueue message failed. Retry after ${delayBeforeRetry} ms`);
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
	} = {},
) {
	const connection = await amqpConnection.pool.acquire(options.priority);
	const channel = await connection.createConfirmChannel();
	await assertRejectableQueue(channel, queueName);
	await new Promise((resolve: () => void, reject: (error: Error) => void) => channel.sendToQueue(
		queueName,
		new Buffer(JSON.stringify(message)),
		{ persistent: true },
		async (error: Error) => {
			if (error !== null) {
				if (!connection._destroying) {
					await amqpConnection.pool.destroy(connection);
				}
				reject(error);
			} else {
				await amqpConnection.pool.release(connection);
				resolve();
			}
		},
	));
}
