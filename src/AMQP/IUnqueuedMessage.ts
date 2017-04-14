
import IEnqueueOptions from './IEnqueueOptions';

export default IUnqueuedMessage;
interface IUnqueuedMessage {
	queueName: string;
	message: any;
	options: IEnqueueOptions;
	resolve: () => void;
}
