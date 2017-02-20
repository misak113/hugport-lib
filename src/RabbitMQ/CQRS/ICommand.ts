
interface ICommand {
	id: string | null;
	type: string;
	sourceUid: string;
	receivedAt: Date;
	payload: {
		type: string;
	};
}
export default ICommand;
