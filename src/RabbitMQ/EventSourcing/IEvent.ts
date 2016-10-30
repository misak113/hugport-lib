
interface IEvent {
	id: string;
	commandId: string;
	type: string;
	sourceUid: string;
	receivedAt: Date;
	payload: {
		type: string;
	};
}
export default IEvent;
