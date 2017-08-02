
import { Message } from 'amqplib';
import { IAMQPConnection } from './amqpConnectionFactory';
import { assertRejectableQueue } from './queueConfigurator';
import { deserializeJSON } from '../JSON/jsonHelper';

export default async function fetchNextMessage<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	options: {
		priority?: number;
		maxPriority?: number;
	} = {},
): Promise<TMessage | null> {
	const connection = await amqpConnection.pool.acquire(options.priority);
	try {
		const channel = await connection.createConfirmChannel();
		await assertRejectableQueue(channel, queueName, options.maxPriority);
		const message: Message | boolean = await channel.get(queueName, { noAck: true });
		await amqpConnection.pool.release(connection);
		if (message && typeof message !== 'boolean') {
			return message.content ? JSON.parse(message.content.toString(), deserializeJSON) : null;
		} else {
			return null;
		}
	} catch (error) {
		await amqpConnection.pool.destroy(connection);
		throw error;
	}
}
