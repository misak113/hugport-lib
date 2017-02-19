
import { Connection, Message } from 'amqplib';
import IEvent from './IEvent';

const QUEUE_NAME_PREFIX = 'events.';

export function* enqueueList(conn: Connection, events: IEvent[]) {
	for (let event of events) {
		yield enqueue(conn, event);
	}
}

export function* enqueue(conn: Connection, event: IEvent) {
	const queueName = QUEUE_NAME_PREFIX + event.type;
	const channel = yield conn.createChannel();
	yield channel.assertQueue(queueName);
	channel.sendToQueue(queueName, new Buffer(JSON.stringify(event)), { parsistent: true });
}

export function* fetchNext(conn: Connection, eventType: string) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = yield conn.createChannel();
	yield channel.assertQueue(queueName);
	const message: Message = yield channel.get(queueName, { noAck: true });
	return message.content ? JSON.parse(message.content.toString()) : null;
}

export function* bindMore(conn: Connection, eventTypes: string[], onEvent: (event: IEvent, onProcessed: () => void) => void) {
	yield eventTypes.map((eventType: string) => bindOne(conn, eventType, onEvent));
}

export function* bindOne(conn: Connection, eventType: string, onEvent: (event: IEvent, onProcessed: () => void) => void) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = yield conn.createChannel();
	yield channel.assertQueue(queueName);
	yield channel.consume(queueName, (message: Message) => {
		try {
			const event = JSON.parse(message.content.toString());
			onEvent(event, () => channel.ack(message));
		} catch (error) {
			console.error(error);
		}
	});
}
