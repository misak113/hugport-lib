import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import ICommand, { ICommandPayload } from './ICommand';
import ICommandError from './ICommandError';

const QUEUE_NAME = 'commands';
const OPTIONS = {
	persistent: true,
	confirmable: true,
};

export type IResponse<TType extends string, TCommandError extends ICommandError<string>> =
	IProcessSucceed<TType> | IProcessFailed<TType, TCommandError> | IError;

export interface IProcessSucceed<TType extends string> {
	status: 'process_succeed';
	command: ICommand<TType>;
}

export interface IProcessFailed<TType extends string, TCommandError extends ICommandError<string>> {
	status: 'process_failed';
	command: ICommand<TType>;
	message: string;
	error: TCommandError;
}

export interface IError {
	status: 'error';
	error: any;
}

export async function enqueue<TType extends string>(amqpConnection: IAMQPConnection, command: ICommand<TType>) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, command, OPTIONS);
}

export async function process<TType extends string, TCommandError extends ICommandError<string>>(
	amqpConnection: IAMQPConnection,
	command: ICommand<TType>,
) {
	const queueName = QUEUE_NAME;
	return await amqpConnection.queuePublisher.enqueueExpectingResponseRepeatable<ICommand<TType>, IResponse<TType, TCommandError>>(
		queueName,
		command,
		OPTIONS,
	);
}

export async function bindAll<TType extends string>(
	amqpConnection: IAMQPConnection,
	onCommand: (command: ICommand<TType>) => Promise<IResponse<TType, ICommandError<string>> | undefined>,
) {
	const queueName = QUEUE_NAME;
	return await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onCommand, OPTIONS);
}

export async function fetchNext<TType extends string, TPayload extends ICommandPayload<TType>>(
	amqpConnection: IAMQPConnection,
): Promise<ICommand<TType, TPayload> | null> {
	const queueName = QUEUE_NAME;
	return await fetchNextMessage<ICommand<TType, TPayload> | null>(amqpConnection, queueName);
}

export async function purgeAll(amqpConnection: IAMQPConnection) {
	/* tslint:disable-next-line */
	while (await fetchNext(amqpConnection));
}
