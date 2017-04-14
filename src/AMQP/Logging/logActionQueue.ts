
import { IAMQPConnection } from '../amqpConnectionFactory';
import { bindMessageRetryable } from '../bindMessage';
import IActionLog from './IActionLog';

const QUEUE_NAME = 'action_logs';
const PRIORITY = 2;

export async function enqueue(amqpConnection: IAMQPConnection, actionLog: IActionLog) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, actionLog, {
		persistent: true,
		confirmable: true,
	});
}

export async function bindAll(amqpConnection: IAMQPConnection, onActionLog: (actionLog: IActionLog) => Promise<void>) {
	const queueName = QUEUE_NAME;
	await bindMessageRetryable(amqpConnection, queueName, onActionLog, { priority: PRIORITY });
}
