
import { Connection, Message } from 'amqplib';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';

export async function enqueue(conn: Connection, command: ICommand) {
	const queueName = QUEUE_NAME;
	const channel = await conn.createChannel();
	await channel.assertQueue(queueName);
	channel.sendToQueue(queueName, new Buffer(JSON.stringify(command)), { persistent: true });
}

export async function bindAll(conn: Connection, onCommand: (command: ICommand, onProcessed: () => void) => void) {
	const queueName = QUEUE_NAME;
	const channel = await conn.createChannel();
	await channel.assertQueue(queueName);
	await channel.consume(queueName, (message: Message) => {
		try {
			const command = JSON.parse(message.content.toString());
			onCommand(command, () => channel.ack(message));
		} catch (error) {
			console.error(error);
		}
	});
}
