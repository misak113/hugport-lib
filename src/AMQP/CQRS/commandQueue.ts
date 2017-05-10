
import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import ICommand, { ICommandPayload } from './ICommand';
import ICommandError from './ICommandError';

const QUEUE_NAME = 'commands';
const OPTIONS = {
	persistent: true,
	confirmable: true,
};

export type IResponse<TCommandError extends ICommandError<string>> = IProcessSucceed | IProcessFailed<TCommandError> | IError;

export interface IProcessSucceed {
	status: 'process_succeed';
	command: ICommand;
}

export interface IProcessFailed<TCommandError extends ICommandError<string>> {
	status: 'process_failed';
	command: ICommand;
	message: string;
	error: TCommandError;
}

export interface IError {
	status: 'error';
	error: any;
}

export async function enqueue(amqpConnection: IAMQPConnection, command: ICommand) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, command, OPTIONS);
}

export async function process<TCommandError extends ICommandError<string>>(amqpConnection: IAMQPConnection, command: ICommand) {
	const queueName = QUEUE_NAME;
	return await amqpConnection.queuePublisher.enqueueExpectingResponseRepeatable<ICommand, IResponse<TCommandError>>(
		queueName,
		command,
		OPTIONS
	);
}

export async function bindAll(
	amqpConnection: IAMQPConnection,
	onCommand: (command: ICommand) => Promise<IResponse<ICommandError<string>> | undefined>
) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onCommand, OPTIONS);
}

export async function fetchNext<TPayload extends ICommandPayload>(
	amqpConnection: IAMQPConnection,
): Promise<ICommand<TPayload> | null> {
	const queueName = QUEUE_NAME;
	return await fetchNextMessage<ICommand<TPayload> | null>(amqpConnection, queueName);
}

export async function purgeAll(amqpConnection: IAMQPConnection) {
	/* tslint:disable-next-line */
	while (await fetchNext(amqpConnection));
}
