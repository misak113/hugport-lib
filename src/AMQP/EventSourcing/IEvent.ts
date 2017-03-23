
export interface IEventPayload {
	type: string;
}

interface IEvent<TPayload extends IEventPayload> {
	id: string | null;
	commandId: string;
	type: string;
	sourceUid: string;
	receivedAt: Date;
	payload: TPayload;
}
export default IEvent;
