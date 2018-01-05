
import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import INackOptions from '../INackOptions';
import IEvent, { IEventPayload } from './IEvent';

const OPTIONS = {
	persistent: true,
	confirmable: true,
	prefetchCount: 1,
};

export async function enqueue(amqpConnection: IAMQPConnection, event: IEvent<IEventPayload>, destination: string) {
	await amqpConnection.queuePublisher.enqueueRepeatable(event, event.type, destination, OPTIONS);
}

export async function fetchNext<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	destination: string,
	consumerType: string,
): Promise<IEvent<TPayload> | null> {
	const queueName = getQueueName(consumerType, eventType);
	return await fetchNextMessage<IEvent<TPayload> | null>(amqpConnection, queueName, eventType, destination);
}

export async function bindMore<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventTypes: string[],
	destination: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>) => Promise<void>,
) {
	for (let eventType of eventTypes) {
		await bindOne(amqpConnection, eventType, destination, consumerType, onEvent);
	}
}

export async function bindOne<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	destination: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>) => Promise<void>,
) {
	const queueName = getQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onEvent, eventType, destination, OPTIONS);
}

export async function bindOneExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	destination: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>,
) {
	const queueName = getQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		onEvent,
		eventType,
		destination,
		OPTIONS,
	);
}

export async function purgeMore(
	amqpConnection: IAMQPConnection,
	eventTypes: string[],
	destination: string,
	consumerType: string,
) {
	for (let eventType of eventTypes) {
		/* tslint:disable-next-line */
		while (await fetchNext(amqpConnection, eventType, destination, consumerType)) ;
	}
}

function getQueueName(consumerType: string, eventType: string) {
	return consumerType + '_' + eventType;
}
