
import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import INackOptions from '../INackOptions';
import IEvent, { IEventPayload } from './IEvent';

const EXCHANGE_NAME = 'events';
const FAILED_EXCHANGE_NAME = "events_failed";
const OPTIONS = {
	persistent: true,
	confirmable: true,
	prefetchCount: 1,
};

export async function enqueue(amqpConnection: IAMQPConnection, event: IEvent<IEventPayload>) {
	await amqpConnection.queuePublisher.enqueueRepeatable(
		event,
		getBasicEventRoutingKey(event.type),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS);
}

export async function enqueueForDevice(amqpConnection: IAMQPConnection, event: IEvent<IEventPayload>, deviceUid: string) {
	await amqpConnection.queuePublisher.enqueueRepeatable(
		event,
		getDeviceEventRoutingKey(event.type, deviceUid),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS,
	);
}

export async function fetchNext<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
): Promise<IEvent<TPayload> | null> {
	const queueName = getQueueName(consumerType, eventType);
	return await fetchNextMessage<IEvent<TPayload> | null>(
		amqpConnection,
		queueName,
		getBasicEventRoutingKey(eventType),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
	);
}

export async function fetchNextForDevice<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	deviceUid: string,
): Promise<IEvent<TPayload> | null> {
	const queueName = getDeviceQueueName(consumerType, eventType);
	return await fetchNextMessage<IEvent<TPayload> | null>(
		amqpConnection,
		queueName,
		getDeviceEventRoutingKey(eventType, deviceUid),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
	);
}

export async function fetchNextFailedForDevice<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
): Promise<IEvent<TPayload> | null> {
	const queueName = getFailedDeviceQueueName(consumerType, eventType);
	return await fetchNextMessage<IEvent<TPayload> | null>(
		amqpConnection,
		queueName,
		getDeviceEventRoutingKey(eventType, "*"),
		FAILED_EXCHANGE_NAME,
	);
}

export async function bindMore<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventTypes: string[],
	consumerType: string,
	onEvent: (event: IEvent<TPayload>) => Promise<void>,
	persistent: boolean = true,
) {
	for (let eventType of eventTypes) {
		await bindOne(amqpConnection, eventType, consumerType, onEvent, persistent);
	}
}

export async function bindOne<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>) => Promise<void>,
	persistent: boolean = true,
) {
	const queueName = getQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeRepeatable(
		queueName,
		onEvent,
		getBasicEventRoutingKey(eventType),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS,
		{ persistent },
	);
}

export async function bindOneExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>,
	persistent: boolean = true,
) {
	const queueName = getQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		onEvent,
		getBasicEventRoutingKey(eventType),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS,
		{ persistent },
	);
}

export async function bindOneForDeviceExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	deviceUid: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>,
	persistent: boolean = true,
) {
	const queueName = getDeviceQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		onEvent,
		getDeviceEventRoutingKey(eventType, deviceUid),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS,
		{ persistent },
	);
}

export async function bindOneFailedForDeviceExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>,
	persistent: boolean = true,
) {
	const queueName = getFailedDeviceQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		onEvent,
		getDeviceEventRoutingKey(eventType, "*"), // bind all devices
		FAILED_EXCHANGE_NAME,
		undefined,
		OPTIONS,
		{ persistent },
	);
}

export async function purgeMore(
	amqpConnection: IAMQPConnection,
	eventTypes: string[],
	consumerType: string,
) {
	for (let eventType of eventTypes) {
		/* tslint:disable-next-line */
		while (await fetchNext(amqpConnection, eventType, consumerType)) ;
		/* tslint:disable-next-line */
		while (await fetchNextForDevice(amqpConnection, eventType, consumerType, "*")) ;
		/* tslint:disable-next-line */
		while (await fetchNextFailedForDevice(amqpConnection, eventType, consumerType)) ;
	}
}

function getQueueName(consumerType: string, eventType: string) {
	return consumerType + '_' + eventType;
}

function getDeviceQueueName(consumerType: string, eventType: string) {
	return getQueueName(consumerType, eventType) + "_device";
}

function getFailedDeviceQueueName(consumerType: string, eventType: string) {
	return getDeviceQueueName(consumerType, eventType) + "_failed";
}

function escapeEventTypeForRoutingKey(eventType: string) {
	return eventType.replace(/\./g, "_");
}

function getBasicEventRoutingKey(eventType: string) {
	return "event." + escapeEventTypeForRoutingKey(eventType);
}

function getDeviceEventRoutingKey(eventType: string, deviceUid: string) {
	return "device." + escapeEventTypeForRoutingKey(eventType) + "." + deviceUid;
}
