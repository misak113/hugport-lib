
interface IActionLog {
	id: string | null;
	type: string;
	sourceUid: string;
	receivedAt: Date;
	payload: {
		type: string;
	};
}
export default IActionLog;
