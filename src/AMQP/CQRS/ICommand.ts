export interface ICommandPayload<TType extends string> {
	type: TType;
}

interface ICommand<TType extends string, TPayload extends ICommandPayload<TType> = ICommandPayload<TType>> {
	id: string | null;
	type: TType;
	sourceUid: string;
	receivedAt: Date;
	payload: TPayload;
}

export default ICommand;
