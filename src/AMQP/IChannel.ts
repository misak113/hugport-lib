
export default IChannel;
interface IChannel<TMessage> {
	send(message: TMessage): Promise<void>;
}
