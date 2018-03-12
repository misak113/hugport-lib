
import IQueueOptions from './IQueueOptions';
import IConsumeOptions from './IConsumeOptions';
import INackOptions from './INackOptions';
import { ICancelConsumption } from './IChannel';

export default IUnsubscribedMessage;
interface IUnsubscribedMessage {
	queueName: string;
	onMessage: (message: any, ack?: () => void, nack?: (options?: INackOptions) => void) => Promise<any>;
	routingKey: string;
	exchangeName?: string;
	alternateExchangeName?: string;
	options: IQueueOptions;
	consumeOptions: IConsumeOptions;
	resolve: (cancelConsumption: ICancelConsumption) => void;
	confirmationWaiting: boolean;
}
