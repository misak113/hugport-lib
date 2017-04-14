
import IQueueOptions from './IQueueOptions';

export default IUnsubscribedMessage;
interface IUnsubscribedMessage {
	queueName: string;
	onMessage: (message: any) => Promise<void>;
	options: IQueueOptions;
	resolve: () => void;
}
