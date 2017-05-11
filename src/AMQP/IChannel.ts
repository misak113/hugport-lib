
export type ICancelConsumption = () => Promise<void>;

export default IChannel;
interface IChannel<TMessage> {
	send(message: TMessage): Promise<void>;
	sendExpectingResponse<TResponseMessage>(message: TMessage): Promise<TResponseMessage>;
	consume<TResponseMessage>(onMessage: (message: any) => Promise<TResponseMessage>, onEnded?: () => void): Promise<ICancelConsumption>;
	consumeExpectingConfirmation<TResponseMessage>(
		onMessage: (
			message: any,
			ack: () => void,
			nack: () => void
		) => Promise<TResponseMessage>,
		onEnded?: () => void
	): Promise<ICancelConsumption>;
}
