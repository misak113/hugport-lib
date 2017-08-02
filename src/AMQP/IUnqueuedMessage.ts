
import IQueueOptions from './IQueueOptions';
import IMessageOptions from './IMessageOptions';

export default IUnqueuedMessage;
interface IUnqueuedMessage {
	queueName: string;
	message: any;
	options?: IQueueOptions;
	messageOptions?: IMessageOptions;
	resolve: (response?: any) => void;
	responseWaiting: boolean;
}
