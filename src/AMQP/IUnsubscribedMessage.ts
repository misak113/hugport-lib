
import IQueueOptions from './IQueueOptions';
import INackOptions from './INackOptions';
import { ICancelConsumption } from './IChannel';

export default IUnsubscribedMessage;
interface IUnsubscribedMessage {
	queueName: string;
	onMessage: (message: any, ack?: () => void, nack?: (options?: INackOptions) => void) => Promise<any>;
	options: IQueueOptions;
	resolve: (cancelConsumption: ICancelConsumption) => void;
	confirmationWaiting: boolean;
}
