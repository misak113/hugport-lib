
import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import INackOptions from '../INackOptions';
import IEvent, { IEventPayload } from './IEvent';

const QUEUE_NAME_PREFIX = 'events.';
const OPTIONS = {
	persistent: true,
	confirmable: true,
};

export async function enqueue(amqpConnection: IAMQPConnection, event: IEvent<IEventPayload>) {
	const queueName = QUEUE_NAME_PREFIX + event.type;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, event, OPTIONS);
}

export async function fetchNext<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string
): Promise<IEvent<TPayload> | null> {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	return await fetchNextMessage<IEvent<TPayload> | null>(amqpConnection, queueName);
}

export async function bindMore<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventTypes: string[],
	onEvent: (event: IEvent<TPayload>) => Promise<void>
) {
	for (let eventType of eventTypes) {
		await bindOne(amqpConnection, eventType, onEvent);
	}
}

export async function bindOne<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	onEvent: (event: IEvent<TPayload>) => Promise<void>
) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onEvent, OPTIONS);
}

export async function bindOneExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>
) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(queueName, onEvent, OPTIONS);
}
