
import { Connection, Message, Channel } from 'amqplib';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';

export async function enqueue(connection: Connection, command: ICommand) {
	const queueName = QUEUE_NAME;
	const channel = await connection.createChannel();
	await assertQueue(channel, queueName);
	channel.sendToQueue(
		queueName,
		new Buffer(JSON.stringify(command)),
		{ persistent: true },
	);
}

export async function bindAll(connection: Connection, onCommand: (command: ICommand) => Promise<void>) {
	const queueName = QUEUE_NAME;
	const channel = await connection.createChannel();
	await assertQueue(channel, queueName);
	await channel.consume(queueName, async (message: Message) => {
		try {
			const command = JSON.parse(message.content.toString());
			await onCommand(command);
			channel.ack(message);
		} catch (error) {
			console.error(error);
			channel.nack(message);
		}
	});
}

async function assertQueue(channel: Channel, queueName: string) {
	await channel.assertQueue(queueName, {
		deadLetterExchange: 'rejected'
	});
}
