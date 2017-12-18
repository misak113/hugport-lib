
import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import INackOptions from '../INackOptions';
import IEvent, { IEventPayload } from './IEvent';
import * as _ from 'lodash';

const QUEUE_NAME_PREFIX = 'events.';
const OPTIONS = {
	persistent: true,
	confirmable: true,
	prefetchCount: 1,
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
	return await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onEvent, OPTIONS);
}

export async function bindOneExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	onEvent: (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => Promise<void>
) {
	const queueName = QUEUE_NAME_PREFIX + eventType;
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(queueName, onEvent, OPTIONS);
}

export async function bindPrefetchedExpectingConfirmation<TPayload extends IEventPayload>(
	amqpConnection: IAMQPConnection,
	eventType: string,
	prefetchCount: number,
	debounceTimeoutMs: number,
	onEvents: (
		events: IEvent<TPayload>[],
		ack: (event: IEvent<TPayload>) => void,
		nack: (event: IEvent<TPayload>, options?: INackOptions) => void,
	) => Promise<void>,
) {
	interface IEventConsumption {
		event: IEvent<TPayload>;
		ack: () => void;
		nack: (options?: INackOptions) => void;
	}

	const unconsumedConsumptions: IEventConsumption[] = [];
	const consumedConsumptions: IEventConsumption[] = [];
	const ackEvent = (event: IEvent<TPayload>) => {
		const indexOfEvent = consumedConsumptions.findIndex((consumption: IEventConsumption) => consumption.event === event);
		const consumption = consumedConsumptions[indexOfEvent];
		consumedConsumptions.splice(indexOfEvent, 1);
		consumption.ack();
	};
	const nackEvent = (event: IEvent<TPayload>, options?: INackOptions) => {
		const indexOfEvent = consumedConsumptions.findIndex((consumption: IEventConsumption) => consumption.event === event);
		const consumption = consumedConsumptions[indexOfEvent];
		consumedConsumptions.splice(indexOfEvent, 1);
		consumption.nack(options);
	};
	const debouncedOnEvents = _.debounce(
		() => {
			let consumption: IEventConsumption | undefined;
			const events = [];
			while (consumption = unconsumedConsumptions.shift()) {
				events.push(consumption.event);
				consumedConsumptions.push(consumption);
			}
			onEvents(events, ackEvent, nackEvent);
		},
		debounceTimeoutMs,
	);
	const queueName = QUEUE_NAME_PREFIX + eventType;
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		queueName,
		async (event: IEvent<TPayload>, ack: () => void, nack: (options?: INackOptions) => void) => {
			unconsumedConsumptions.push({ event, ack, nack });
			debouncedOnEvents();
		},
		{ ...OPTIONS, prefetchCount },
	);
}

export async function purgeMore(amqpConnection: IAMQPConnection, eventTypes: string[]) {
	for (let eventType of eventTypes) {
		/* tslint:disable-next-line */
		while (await fetchNext(amqpConnection, eventType));
	}
}
