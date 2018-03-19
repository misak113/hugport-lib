
import IQueueOptions from './IQueueOptions';
import IMessageOptions from './IMessageOptions';

export default IUnqueuedMessage;
interface IUnqueuedMessage {
	message: any;
	routingKey: string;
	exchangeName?: string;
	alternateExchangeName?: string;
	options?: IQueueOptions;
	messageOptions?: IMessageOptions;
	resolve: (response?: any) => void;
	responseWaiting: boolean;
}
