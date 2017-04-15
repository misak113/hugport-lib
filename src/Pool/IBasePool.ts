
export default IBasePool;
interface IBasePool<TResource> {
	acquire(priority?: number): Promise<TResource>;
	release(connection: TResource): Promise<void>;
	destroy(connection: TResource): Promise<void>;
}
