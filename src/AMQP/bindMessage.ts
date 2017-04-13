
import wait from '../Timer/wait';
import { Message } from 'amqplib';
import { IAMQPConnection } from './amqpConnectionFactory';
import { assertRejectableQueue } from './queueConfigurator';

export default async function bindMessage<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	onMessage: (message: TMessage) => Promise<void>,
	options: {
		priority?: number;
	} = {},
	delayBeforeRetry: number = 1000,
) {
	const connection = await amqpConnection.pool.acquire(options.priority);
	const channel = await connection.createConfirmChannel();
	async function handleError() {
		if (!connection._destroying) {
			await amqpConnection.pool.destroy(connection);
		}
		console.log(`Bindings message failed. Retry bind message after ${delayBeforeRetry} ms`);
		await wait(delayBeforeRetry);
		try {
			await bindMessage(amqpConnection, queueName, onMessage, options, delayBeforeRetry);
		} catch (error) {
			handleError();
		}
	}
	channel.on('error', (error:  Error) => {
		handleError();
		throw error;
	});
	channel.on('close', () => handleError());
	await assertRejectableQueue(channel, queueName);
	await channel.consume(queueName, async (amqpMessage: Message) => {
		try {
			const message = JSON.parse(amqpMessage.content.toString());
			await onMessage(message);
			channel.ack(amqpMessage);
		} catch (error) {
			console.error(error);
			channel.nack(amqpMessage);
		}
	});
}
