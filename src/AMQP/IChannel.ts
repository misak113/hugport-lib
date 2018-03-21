
import IMessageOptions from './IMessageOptions';
import IConsumeOptions from './IConsumeOptions';

export type ICancelConsumption = () => Promise<void>;

export default IChannel;
interface IChannel<TMessage> {
	send(message: TMessage, messageOptions?: IMessageOptions): Promise<void>;
	sendExpectingResponse<TResponseMessage>(message: TMessage, messageOptions?: IMessageOptions): Promise<TResponseMessage>;
	consumeSimple(
		queueName: string,
		onMessage: (message: any) => Promise<void>,
		consumeOptions?: IConsumeOptions,
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
		consumeOptions?: IConsumeOptions,
		onEnded?: () => void
	): Promise<ICancelConsumption>;
	purge(queueName: string): Promise<void>;
	delete(queueName: string): Promise<void>;
}
