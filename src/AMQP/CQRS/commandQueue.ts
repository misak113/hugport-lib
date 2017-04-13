
import { IAMQPConnection } from '../amqpConnectionFactory';
import { enqueueMessageRetryable } from '../enqueueMessage';
import bindMessage from '../bindMessage';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';
const PRIORITY = 1;

export async function enqueue(amqpConnection: IAMQPConnection, command: ICommand) {
	const queueName = QUEUE_NAME;
	await enqueueMessageRetryable(amqpConnection, queueName, command, { priority: PRIORITY });
}

export async function bindAll(amqpConnection: IAMQPConnection, onCommand: (command: ICommand) => Promise<void>) {
	const queueName = QUEUE_NAME;
	await bindMessage(amqpConnection, queueName, onCommand, { priority: PRIORITY });
}
