
export default IChannel;
interface IChannel<TMessage> {
	send(message: TMessage): Promise<void>;
	consume(onMessage: (message: any) => Promise<void>, onEnded?: () => void): Promise<void>;
}
