
import { Channel } from 'amqplib';

export async function assertRejectableQueue(channel: Channel, queueName: string, maxPriority: number | undefined) {
	await channel.assertQueue(queueName, {
		deadLetterExchange: '',
		deadLetterRoutingKey: '__rejected.' + queueName,
		maxPriority,
	});
}
