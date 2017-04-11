
import { Connection, Message, Channel } from 'amqplib';
import IActionLog from './IActionLog';

const QUEUE_NAME = 'action_logs';

export async function enqueue(connection: Connection, actionLog: IActionLog) {
	const queueName = QUEUE_NAME;
	const channel = await connection.createChannel();
	await assertQueue(channel, queueName);
	channel.sendToQueue(
		queueName,
		new Buffer(JSON.stringify(actionLog)),
		{ persistent: true }
	);
}

export async function bindAll(connection: Connection, onActionLog: (actionLog: IActionLog) => Promise<void>) {
	const queueName = QUEUE_NAME;
	const channel = await connection.createChannel();
	await assertQueue(channel, queueName);
	await channel.consume(queueName, async (message: Message) => {
		try {
			const actionLog = JSON.parse(message.content.toString());
			await onActionLog(actionLog);
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
