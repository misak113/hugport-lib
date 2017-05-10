
export interface ICommandPayload {
	type: string;
}

interface ICommand<TPayload extends ICommandPayload = ICommandPayload> {
	id: string | null;
	type: string;
	sourceUid: string;
	receivedAt: Date;
	payload: TPayload;
}
export default ICommand;
