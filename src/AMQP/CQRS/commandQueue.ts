import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import ICommand, { ICommandPayload } from './ICommand';
import ICommandError from './ICommandError';

const QUEUE_NAME = 'commands';
const OPTIONS = {
	persistent: true,
	confirmable: true,
	maxPriority: 10,
};

export interface IMessageOptions {
	priority?: number;
}

export type IResponse<
	TCommandType extends string = string,
	TCommandError extends ICommandError<string> = ICommandError<string>,
> = IProcessSucceed<TCommandType>
	| IProcessFailed<TCommandType, TCommandError>
	| IError;

export interface IProcessSucceed<TCommandType extends string> {
	status: 'process_succeed';
	command: ICommand<TCommandType>;
}

export interface IProcessFailed<
	TCommandType extends string,
	TCommandError extends ICommandError<string>,
/* tslint:disable-next-line */
> {
	status: 'process_failed';
	command: ICommand<TCommandType>;
	message: string;
	error: TCommandError;
}

export interface IError {
	status: 'error';
	error: any;
}

export async function enqueue<TCommandType extends string>(
	amqpConnection: IAMQPConnection,
	command: ICommand<TCommandType>,
	messageOptions: IMessageOptions = { priority: 5 },
) {
	const queueName = QUEUE_NAME;
	await amqpConnection.queuePublisher.enqueueRepeatable(queueName, command, OPTIONS, messageOptions);
}

export async function process<TType extends string, TCommandError extends ICommandError<string>>(
	amqpConnection: IAMQPConnection,
	command: ICommand<TType>,
	messageOptions: IMessageOptions = { priority: 6 },
) {
	const queueName = QUEUE_NAME;
	return await amqpConnection.queuePublisher.enqueueExpectingResponseRepeatable<ICommand<TType>, IResponse<TType, TCommandError>>(
		queueName,
		command,
		OPTIONS,
		messageOptions,
	);
}

export async function bindAll<TCommandType extends string>(
	amqpConnection: IAMQPConnection,
	onCommand: (command: ICommand<TCommandType>) => Promise<IResponse<TCommandType, ICommandError<string>> | undefined>,
) {
	const queueName = QUEUE_NAME;
	return await amqpConnection.queueSubscriber.subscribeRepeatable(queueName, onCommand, OPTIONS);
}

export async function fetchNext<TCommandType extends string, TPayload extends ICommandPayload<TCommandType>>(
	amqpConnection: IAMQPConnection,
): Promise<ICommand<TCommandType, TPayload> | null> {
	const queueName = QUEUE_NAME;
	return await fetchNextMessage<ICommand<TCommandType, TPayload> | null>(amqpConnection, queueName);
}

export async function purgeAll(amqpConnection: IAMQPConnection) {
	/* tslint:disable-next-line */
	while (await fetchNext(amqpConnection));
}
