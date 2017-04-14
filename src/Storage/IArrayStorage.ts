
export default IArrayStorage;
interface IArrayStorage<TItem> {

	push(item: TItem): void;
	pop(): TItem | undefined;
	unshift(item: TItem): void;
	shift(): TItem | undefined;
}
