
import { Channel } from 'amqplib';

export async function assertRejectableQueue(channel: Channel, queueName: string) {
	await channel.assertQueue(queueName, {
		deadLetterExchange: 'rejected'
	});
}
