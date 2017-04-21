
import IQueueOptions from './IQueueOptions';

export default IUnsubscribedMessage;
interface IUnsubscribedMessage {
	queueName: string;
	onMessage: (message: any) => Promise<any>;
	options: IQueueOptions;
	resolve: () => void;
}
