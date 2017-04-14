
import { IAMQPConnection } from '../amqpConnectionFactory';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';
const OPTIONS = {
	persistent: true,
	confirmable: true,
};

export async function enqueue(amqpConnection: IAMQPConnection, command: ICommand) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, command, OPTIONS);
}

export async function bindAll(amqpConnection: IAMQPConnection, onCommand: (command: ICommand) => Promise<void>) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onCommand, OPTIONS);
}
