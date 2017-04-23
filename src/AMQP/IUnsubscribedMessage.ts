
import IQueueOptions from './IQueueOptions';

export default IUnsubscribedMessage;
interface IUnsubscribedMessage {
	queueName: string;
	onMessage: (message: any, ack?: () => void, nack?: () => void) => Promise<any>;
	options: IQueueOptions;
	resolve: () => void;
	confirmationWaiting: boolean;
}
