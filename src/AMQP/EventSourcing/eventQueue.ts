
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
		event.type,
		getBasicEventRoutingKey(event.type),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS);
}

export async function enqueueForDevice(amqpConnection: IAMQPConnection, event: IEvent<IEventPayload>, deviceUid: string) {
	await amqpConnection.queuePublisher.enqueueRepeatable(
		event,
		event.type,
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
	exclusive: boolean = false,
) {
	for (let eventType of eventTypes) {
		await bindOne(amqpConnection, eventType, consumerType, onEvent, persistent, exclusive);
	}
}

export async function bindOne<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>) => Promise<void>,
	persistent: boolean = true,
	exclusive: boolean = false,
) {
	const queueName = getQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeRepeatable(
		queueName,
		onEvent,
		eventType,
		getBasicEventRoutingKey(eventType),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS,
		{
			persistent,
			exclusive,
		},
	);
}

export async function bindOneExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>,
	persistent: boolean = true,
	exclusive: boolean = false,
) {
	const queueName = getQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		onEvent,
		eventType,
		getBasicEventRoutingKey(eventType),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS,
		{
			persistent,
			exclusive,
		},
	);
}

export async function bindOneForDeviceExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	deviceUid: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>,
	persistent: boolean = true,
	exclusive: boolean = false,
) {
	const queueName = getDeviceQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		onEvent,
		getDeviceNamespace(deviceUid),
		getDeviceEventRoutingKey(eventType, deviceUid),
		EXCHANGE_NAME,
		FAILED_EXCHANGE_NAME,
		OPTIONS,
		{
			persistent,
			exclusive,
		},
	);
}

export async function bindOneFailedForDeviceExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>,
	persistent: boolean = true,
	exclusive: boolean = false,
) {
	const queueName = getFailedDeviceQueueName(consumerType, eventType);
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		onEvent,
		getDeviceNamespace("*"),
		getDeviceEventRoutingKey(eventType, "*"), // bind all devices
		FAILED_EXCHANGE_NAME,
		undefined,
		OPTIONS,
		{
			persistent,
			exclusive,
		},
	);
}

export async function purgeOne(
	amqpConnection: IAMQPConnection,
	eventType: string,
	consumerType: string,
) {
	const queueName = getQueueName(consumerType, eventType);
	const channel = await amqpConnection.channelProvider.getChannel(eventType, getBasicEventRoutingKey(eventType));
	try {
		await channel.purge(queueName);
	} finally {
		await channel.close();
	}
}

export async function deleteMore(
	amqpConnection: IAMQPConnection,
	eventTypes: string[],
	consumerType: string,
) {
	for (let eventType of eventTypes) {
		const queueName = getQueueName(consumerType, eventType);
		const channel = await amqpConnection.channelProvider.getChannel(eventType, getBasicEventRoutingKey(eventType));
		try {
			await channel.delete(queueName);
		} finally {
			await channel.close();
		}

		const deviceQueueName = getDeviceQueueName(consumerType, eventType);
		const deviceChannel = await amqpConnection.channelProvider.getChannel(
			getDeviceNamespace("*"),
			eventType,
			getDeviceEventRoutingKey(eventType, '*'),
		);
		try {
			await deviceChannel.delete(deviceQueueName);
		} finally {
			await deviceChannel.close();
		}

		const failedDeviceQueueName = getFailedDeviceQueueName(consumerType, eventType);
		const failedDeviceChannel = await amqpConnection.channelProvider.getChannel(
			getDeviceNamespace("*"),
			getDeviceEventRoutingKey(eventType, '*')
		);
		try {
			await failedDeviceChannel.delete(failedDeviceQueueName);
		} finally {
			await failedDeviceChannel.close();
		}
	}
}

export async function prepareMore(amqpConnection: IAMQPConnection, events: string[], consumerType: string) {
	for (const event of events) {
		// Hack to create event queue for exchange
		await fetchNext(amqpConnection, event, consumerType);
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

function getDeviceNamespace(deviceUid: string) {
	return "device_" + deviceUid;
}
