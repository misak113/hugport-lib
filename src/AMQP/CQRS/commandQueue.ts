
import { IAMQPConnection } from '../amqpConnectionFactory';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';
const OPTIONS = {
	persistent: true,
	confirmable: true,
};

export type IResponseMessage = IProcessSucceedMessage | IProcessFailedMessage | IErrorMessage;

export interface IProcessSucceedMessage {
	status: 'process_succeed';
	command: ICommand;
}

export interface IProcessFailedMessage {
	status: 'process_failed';
	command: ICommand;
	errorType: string;
	errorMessage: string;
}

export interface IErrorMessage {
	status: 'error';
	error: any;
}

export async function enqueue(amqpConnection: IAMQPConnection, command: ICommand) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, command, OPTIONS);
}

export async function process(amqpConnection: IAMQPConnection, command: ICommand) {
	const queueName = QUEUE_NAME;
	return await amqpConnection.queuePublisher.enqueueExpectingResponseRepeatable<ICommand, IResponseMessage>(
		queueName,
		command,
		OPTIONS
	);
}

export async function bindAll(amqpConnection: IAMQPConnection, onCommand: (command: ICommand) => Promise<IResponseMessage | undefined>) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onCommand, OPTIONS);
}
