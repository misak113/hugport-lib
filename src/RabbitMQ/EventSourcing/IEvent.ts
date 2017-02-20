
interface IEvent {
	id: string | null;
	commandId: string;
	type: string;
	sourceUid: string;
	receivedAt: Date;
	payload: {
		type: string;
	};
}
export default IEvent;
