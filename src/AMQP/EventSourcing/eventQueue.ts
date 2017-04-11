
import { Connection, Message, Channel } from 'amqplib';
import IEvent, { IEventPayload } from './IEvent';

const QUEUE_NAME_PREFIX = 'events.';

export async function enqueue(connection: Connection, event: IEvent<IEventPayload>) {
	const queueName = QUEUE_NAME_PREFIX + event.type;
	const channel = await connection.createChannel();
	await assertQueue(channel, queueName);
	channel.sendToQueue(
		queueName,
		new Buffer(JSON.stringify(event)),
		{ persistent: true },
	);
}

export async function fetchNext<TPayload extends IEventPayload>(connection: Connection, eventType: string): Promise<IEvent<TPayload> | null> {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = await connection.createChannel();
	await assertQueue(channel, queueName);
	const message: Message | boolean = await channel.get(queueName, { noAck: true });
	if (message && typeof message !== 'boolean') {
		return message.content ? JSON.parse(message.content.toString()) : null;
	} else {
		return null;
	}
}

export async function bindMore<TPayload extends IEventPayload>(
	connection: Connection,
	eventTypes: string[],
	onEvent: (event: IEvent<TPayload>) => Promise<void>
) {
	for (let eventType of eventTypes) {
		await bindOne(connection, eventType, onEvent);
	}
}

export async function bindOne<TPayload extends IEventPayload>(
	connection: Connection,
	eventType: string,
	onEvent: (event: IEvent<TPayload>) => Promise<void>
) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = await connection.createChannel();
	await assertQueue(channel, queueName);
	await channel.consume(queueName, async (message: Message) => {
		try {
			const event = JSON.parse(message.content.toString());
			await onEvent(event);
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
