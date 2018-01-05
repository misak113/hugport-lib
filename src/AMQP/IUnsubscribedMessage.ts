
import IQueueOptions from './IQueueOptions';
import INackOptions from './INackOptions';
import { ICancelConsumption } from './IChannel';

export default IUnsubscribedMessage;
interface IUnsubscribedMessage {
	queueName: string;
	onMessage: (message: any, ack?: () => void, nack?: (options?: INackOptions) => void) => Promise<any>;
	routingKey: string;
	exchangeName?: string;
	options: IQueueOptions;
	resolve: (cancelConsumption: ICancelConsumption) => void;
	confirmationWaiting: boolean;
}
