
import { Connection, Message } from 'amqplib';
import IEvent from './IEvent';

const QUEUE_NAME_PREFIX = 'events.';

export function* enqueueList(this: any, events: IEvent[]) {
	for (let event of events) {
		yield enqueue.call(this, event);
	}
}

export function* enqueue(this: Connection, event: IEvent) {
	const queueName = QUEUE_NAME_PREFIX + event.type;
	const channel = yield this.createChannel();
	yield channel.assertQueue(queueName);
	channel.sendToQueue(queueName, new Buffer(JSON.stringify(event)), { parsistent: true });
}

export function* fetchNext(this: Connection, eventType: string) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = yield this.createChannel();
	yield channel.assertQueue(queueName);
	const message: Message = yield channel.get(queueName, { noAck: true });
	const event = JSON.parse(message.content.toString());
	return event;
}

export function* bindMore(this: Connection, eventTypes: string[], onEvent: (event: IEvent, onProcessed: () => void) => void) {
	yield eventTypes.map((eventType: string) => bindOne.call(this, eventType, onEvent));
}

export function* bindOne(this: Connection, eventType: string, onEvent: (event: IEvent, onProcessed: () => void) => void) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const channel = yield this.createChannel();
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
