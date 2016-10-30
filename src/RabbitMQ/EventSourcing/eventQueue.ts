
import { Connection, Message } from 'amqplib';
import IEvent from './IEvent';

const QUEUE_NAME = 'events';

export function* enqueueList(this: any, events: IEvent[]) {
	for (let event of events) {
		yield enqueue.call(this, event);
	}
}

export function* enqueue(this: Connection, event: IEvent) {
	const channel = yield this.createChannel();
	yield channel.assertQueue(QUEUE_NAME);
	channel.sendToQueue(QUEUE_NAME, new Buffer(JSON.stringify(event)));
}

export function* fetchNext(this: Connection) {
	const channel = yield this.createChannel();
	yield channel.assertQueue(QUEUE_NAME);
	const message: Message = yield channel.get(QUEUE_NAME, { noAck: true });
	const event = JSON.parse(message.content.toString());
	return event;
}

export function* bind(this: Connection, onEvent: (event: IEvent, onProcessed: () => void) => void) {
	const channel = yield this.createChannel();
	yield channel.assertQueue(QUEUE_NAME);
	yield channel.consume(QUEUE_NAME, (message: Message) => {
		try {
			const event = JSON.parse(message.content.toString());
			onEvent(event, () => channel.ack(message));
		} catch (error) {
			console.error(error);
		}
	});
}
