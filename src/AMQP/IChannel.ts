
import IMessageOptions from './IMessageOptions';

export type ICancelConsumption = () => Promise<void>;

export default IChannel;
interface IChannel<TMessage> {
	send(message: TMessage, messageOptions?: IMessageOptions): Promise<void>;
	sendExpectingResponse<TResponseMessage>(message: TMessage, messageOptions?: IMessageOptions): Promise<TResponseMessage>;
	consumeSimple(
		queueName: string,
		onMessage: (message: any) => Promise<void>,
		onEnded?: () => void,
	): Promise<ICancelConsumption>;
	consume<TResponseMessage>(
		queueName: string,
		onMessage: (
			message: any,
			ack: () => void,
			nack: () => void
		) => Promise<TResponseMessage>,
		respond: boolean,
		onEnded?: () => void
	): Promise<ICancelConsumption>;
}
