export interface ICommandPayload<TCommandType extends string> {
	type: TCommandType;
}

interface ICommand<
	TCommandType extends string = string,
	TPayload extends ICommandPayload<TCommandType> = ICommandPayload<TCommandType>,
/* tslint:disable-next-line */
> {
	id: string | null;
	type: TCommandType;
	sourceUid: string;
	receivedAt: Date;
	payload: TPayload;
}

export default ICommand;
