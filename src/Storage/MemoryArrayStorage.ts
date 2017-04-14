
import IArrayStorage from './IArrayStorage';

export default class MemoryArrayStorage<TItem> implements IArrayStorage<TItem> {

	private array: TItem[];

	constructor() {
		this.array = [];
	}

	public push(item: TItem) {
		this.array.push(item);
	}

	public pop() {
		return this.array.pop();
	}

	public unshift(item: TItem) {
		this.array.unshift(item);
	}

	public shift() {
		return this.array.shift();
	}
}
