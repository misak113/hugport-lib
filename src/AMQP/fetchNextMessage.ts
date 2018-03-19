
import { Message } from 'amqplib';
import { IAMQPConnection } from './amqpConnectionFactory';
import { assertRejectableQueue } from './queueConfigurator';
import { deserializeJSON } from '../JSON/jsonHelper';
import {
	ExchangeType,
} from './Exchange';

export default async function fetchNextMessage<TMessage>(
	amqpConnection: IAMQPConnection,
	queueName: string,
	routingKey: string,
	exchangeName: string = '',
	alternateExchangeName: string = "",
	options: {
		priority?: number;
		maxPriority?: number;
	} = {},
): Promise<TMessage | null> {
	if (exchangeName === '' && queueName !== routingKey) {
		throw new Error('If default exchange is used, queue name must match the routing key');
	}

	const connection = await amqpConnection.pool.acquire(options.priority);
	try {
		const channel = await connection.createConfirmChannel();
		if (exchangeName !== '') {
			if (alternateExchangeName !== "") {
				await channel.assertExchange(alternateExchangeName, "topic" as ExchangeType);
				await channel.assertExchange(exchangeName, "topic" as ExchangeType, {
					alternateExchange: alternateExchangeName,
				});
			} else {
				await channel.assertExchange(exchangeName, "topic" as ExchangeType);
			}
		}
		await assertRejectableQueue(channel, queueName, options.maxPriority);
		if (exchangeName !== '') {
			await channel.bindQueue(queueName, exchangeName, routingKey);
		}
		const message: Message | boolean = await channel.get(queueName, { noAck: true });
		await channel.close();
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
