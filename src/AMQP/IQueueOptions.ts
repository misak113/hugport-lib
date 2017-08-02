
export default IQueueOptions;
interface IQueueOptions {
	confirmable?: boolean;
	persistent?: boolean;
	prefetchCount?: number;
	maxPriority?: number;
}
