
import { IAMQPConnection } from '../amqpConnectionFactory';
import { bindMessageRetryable } from '../bindMessage';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';
const PRIORITY = 1;

export async function enqueue(amqpConnection: IAMQPConnection, command: ICommand) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, command, {
		persistent: true,
		confirmable: true,
	});
}

export async function bindAll(amqpConnection: IAMQPConnection, onCommand: (command: ICommand) => Promise<void>) {
	const queueName = QUEUE_NAME;
	await bindMessageRetryable(amqpConnection, queueName, onCommand, { priority: PRIORITY });
}
