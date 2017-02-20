
import { Connection, Message } from 'amqplib';
import IEvent from './IEvent';

const QUEUE_NAME_PREFIX = 'events.';

export async function enqueueList(conn: Connection, events: IEvent[]) {
	for (let event of events) {
		await enqueue(conn, event);
	}
}

export async function enqueue(conn: Connection, event: IEvent) {
	const queueName = QUEUE_NAME_PREFIX + event.type;
	const channel = await conn.createChannel();
	await channel.assertQueue(queueName);
	channel.sendToQueue(queueName, new Buffer(JSON.stringify(event)), { persistent: true });
}

export async function fetchNext(conn: Connection, eventType: string) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = await conn.createChannel();
	await channel.assertQueue(queueName);
	const message: Message | boolean = await channel.get(queueName, { noAck: true });
	if (message && typeof message !== 'boolean') {
		return message.content ? JSON.parse(message.content.toString()) : null;
	} else {
		return null;
	}
}

export async function bindMore(conn: Connection, eventTypes: string[], onEvent: (event: IEvent, onProcessed: () => void) => void) {
	for (let eventType of eventTypes) {
		await bindOne(conn, eventType, onEvent);
	}
}

export async function bindOne(conn: Connection, eventType: string, onEvent: (event: IEvent, onProcessed: () => void) => void) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = await conn.createChannel();
	await channel.assertQueue(queueName);
	await channel.consume(queueName, (message: Message) => {
		try {
			const event = JSON.parse(message.content.toString());
			onEvent(event, () => channel.ack(message));
		} catch (error) {
			console.error(error);
		}
	});
}
