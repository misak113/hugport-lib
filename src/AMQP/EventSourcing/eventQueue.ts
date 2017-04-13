
import { IAMQPConnection } from '../amqpConnectionFactory';
import { enqueueMessageRetryable } from '../enqueueMessage';
import { bindMessageRetryable } from '../bindMessage';
import fetchNextMessage from '../fetchNextMessage';
import IEvent, { IEventPayload } from './IEvent';

const QUEUE_NAME_PREFIX = 'events.';
const PRIORITY = 0;

export async function enqueue(amqpConnection: IAMQPConnection, event: IEvent<IEventPayload>) {
	const queueName = QUEUE_NAME_PREFIX + event.type;
	await enqueueMessageRetryable(amqpConnection, queueName, event, { priority: PRIORITY });
}

export async function fetchNext<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string
): Promise<IEvent<TPayload> | null> {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	return await fetchNextMessage<IEvent<TPayload> | null>(amqpConnection, queueName, { priority: PRIORITY });
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
	await bindMessageRetryable(amqpConnection, queueName, onEvent, { priority: PRIORITY });
}
