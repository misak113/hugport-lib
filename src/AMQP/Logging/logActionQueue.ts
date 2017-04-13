
import { IAMQPConnection } from '../amqpConnectionFactory';
import { enqueueMessageRetryable } from '../enqueueMessage';
import { bindMessageRetryable } from '../bindMessage';
import IActionLog from './IActionLog';

const QUEUE_NAME = 'action_logs';
const PRIORITY = 2;

export async function enqueue(amqpConnection: IAMQPConnection, actionLog: IActionLog) {
	const queueName = QUEUE_NAME;
	await enqueueMessageRetryable(amqpConnection, queueName, actionLog, { priority: PRIORITY });
}

export async function bindAll(amqpConnection: IAMQPConnection, onActionLog: (actionLog: IActionLog) => Promise<void>) {
	const queueName = QUEUE_NAME;
	await bindMessageRetryable(amqpConnection, queueName, onActionLog, { priority: PRIORITY });
}
