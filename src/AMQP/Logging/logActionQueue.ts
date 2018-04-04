
import { IAMQPConnection } from '../amqpConnectionFactory';
import IActionLog from './IActionLog';

const QUEUE_NAME = 'action_logs';
const OPTIONS = {
	persistent: true,
	confirmable: true,
};

export async function enqueue(amqpConnection: IAMQPConnection, actionLog: IActionLog) {
	await amqpConnection.queuePublisher.enqueueRepeatable(actionLog, QUEUE_NAME, QUEUE_NAME, undefined, undefined, OPTIONS);
}

export async function bindAll(amqpConnection: IAMQPConnection, onActionLog: (actionLog: IActionLog) => Promise<void>) {
	return await amqpConnection.queueSubscriber.subscribeRepeatable(
		QUEUE_NAME, onActionLog, QUEUE_NAME, QUEUE_NAME, undefined, undefined, OPTIONS,
	);
}
