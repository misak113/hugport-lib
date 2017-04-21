
import IQueueOptions from './IQueueOptions';

export default IUnqueuedMessage;
interface IUnqueuedMessage {
	queueName: string;
	message: any;
	options?: IQueueOptions;
	resolve: (response?: any) => void;
	responseWaiting: boolean;
}
