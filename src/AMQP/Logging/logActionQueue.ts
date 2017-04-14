
import { IAMQPConnection } from '../amqpConnectionFactory';
import IActionLog from './IActionLog';

const QUEUE_NAME = 'action_logs';
const OPTIONS = {
	persistent: true,
	confirmable: true,
};

export async function enqueue(amqpConnection: IAMQPConnection, actionLog: IActionLog) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, actionLog, OPTIONS);
}

export async function bindAll(amqpConnection: IAMQPConnection, onActionLog: (actionLog: IActionLog) => Promise<void>) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onActionLog, OPTIONS);
}
