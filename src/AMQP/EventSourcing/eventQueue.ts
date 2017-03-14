
import { Client, Message } from 'amqp10';
import { Rejected } from 'amqp10/lib/types/delivery_state';
import IEvent from './IEvent';

const QUEUE_NAME_PREFIX = 'events.';

export async function enqueue(client: Client, event: IEvent) {
	const queueName = QUEUE_NAME_PREFIX + event.type;
	const sender = await client.createSender(queueName);
	const state = await sender.send(event);
	await sender.detach({ closed: false });
	if (state instanceof Rejected) {
		throw new Error(state.inspect());
	}
}

export async function fetchNext(client: Client, eventType: string) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const receiver = await client.createReceiver(queueName);
	return await new Promise<IEvent>((resolve: (data: IEvent) => void) => {
		receiver.once('message', (message: Message) => {
			receiver.removeAllListeners();
			receiver.accept(message);
			resolve(message.body);
		});
		receiver.once('errorReceived', (error: Error) => {
			receiver.removeAllListeners();
			console.error(error);
		});
		receiver.attach();
	});
}

export async function bindMore(client: Client, eventTypes: string[], onEvent: (event: IEvent) => Promise<void>) {
	for (let eventType of eventTypes) {
		await bindOne(client, eventType, onEvent);
	}
}

export async function bindOne(client: Client, eventType: string, onEvent: (event: IEvent) => Promise<void>) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	const receiver = await client.createReceiver(queueName);
	receiver.on('message', async (message: Message) => {
		try {
			const event = message.body;
			await onEvent(event);
			receiver.accept(message);
		} catch (error) {
			console.error(error);
			receiver.reject(message);
		}
	});
	receiver.on('errorReceived', (error: Error) => console.error(error));
	receiver.attach();
}
