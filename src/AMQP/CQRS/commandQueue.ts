import { IAMQPConnection } from '../amqpConnectionFactory';
import fetchNextMessage from '../fetchNextMessage';
import ICommand, { ICommandPayload } from './ICommand';
import ICommandError from './ICommandError';

export const QUEUE_NAME = 'commands';
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
	dispatchedAt: Date;
	command: ICommand<TCommandType>;
}

export interface IProcessFailed<
	TCommandType extends string,
	TCommandError extends ICommandError<string>,
/* tslint:disable-next-line */
> {
	status: 'process_failed';
	dispatchedAt: Date;
	command: ICommand<TCommandType>;
	message: string;
	error: TCommandError;
}

export interface IError {
	status: 'error';
	dispatchedAt: Date;
	error: any;
}

export async function enqueue<TCommandType extends string>(
	amqpConnection: IAMQPConnection,
	command: ICommand<TCommandType>,
	messageOptions: IMessageOptions = { priority: 5 },
) {
	await amqpConnection.queuePublisher.enqueueRepeatable(command, QUEUE_NAME, undefined, OPTIONS, messageOptions);
}

export async function process<TType extends string, TCommandError extends ICommandError<string>>(
	amqpConnection: IAMQPConnection,
	command: ICommand<TType>,
	messageOptions: IMessageOptions = { priority: 6 },
) {
	return await amqpConnection.queuePublisher.enqueueExpectingResponseRepeatable<ICommand<TType>, IResponse<TType, TCommandError>>(
		command,
		QUEUE_NAME,
		undefined,
		OPTIONS,
		messageOptions,
	);
}

export async function bindAll<TCommandType extends string>(
	amqpConnection: IAMQPConnection,
	onCommand: (command: ICommand<TCommandType>) => Promise<IResponse<TCommandType, ICommandError<string>> | undefined>,
) {
	return await amqpConnection.queueSubscriber.subscribeExpectingConfirmationRepeatable(
		QUEUE_NAME,
		async (command: ICommand<TCommandType>, ack: () => void) => {
			const response = await onCommand(command);
			ack();
			return response;
		},
		QUEUE_NAME,
		undefined,
		OPTIONS,
	);
}

export async function fetchNext<TCommandType extends string, TPayload extends ICommandPayload<TCommandType>>(
	amqpConnection: IAMQPConnection,
): Promise<ICommand<TCommandType, TPayload> | null> {
	return await fetchNextMessage<ICommand<TCommandType, TPayload> | null>(
		amqpConnection,
		QUEUE_NAME,
		QUEUE_NAME,
		undefined,
		{ maxPriority: OPTIONS.maxPriority }
		);
}

export async function purgeAll(amqpConnection: IAMQPConnection) {
	/* tslint:disable-next-line */
	while (await fetchNext(amqpConnection));
}
