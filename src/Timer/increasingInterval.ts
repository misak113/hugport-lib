import wait from './wait';

let lastId = 0;
let intervals: number[] = [];

export function setIncreasingInterval(
	startInterval: number,
	increase: number | ((previousInterval: number) => number),
	maxInterval: number | undefined | null,
	callback: () => void,
) {
	if (startInterval <= 0) {
		throw new Error('Starting interval must be a positive number');
	}

	if (typeof maxInterval === 'number' && maxInterval < startInterval) {
		throw new Error('Max interval must be higher than or equal to start interval');
	}

	if (typeof increase === 'number' && increase < 0) {
		throw new Error('Increase must be a non-negative number');
	}

	const id = ++lastId;
	intervals.push(id);
	handler(id, startInterval, increase, maxInterval, callback).catch(() => clearIncreasingInterval(id));

	return id;
}

export function clearIncreasingInterval(clearId: number) {
	intervals = intervals.filter((id: number) => id !== clearId);
}

async function handler(
	id: number,
	startInterval: number,
	increase: number | ((previousInterval: number) => number),
	maxInterval: number | undefined | null,
	callback: () => void,
) {
	let interval = startInterval;

	while (true) {
		await wait(interval);

		if (intervals.indexOf(id) < 0) {
			break;
		}

		callback();
		interval = increaseInterval(interval, increase, maxInterval);
	}
}

function increaseInterval(
	previousInterval: number,
	increase: number | ((previousInterval: number) => number),
	maxInterval: number | undefined | null,
) {
	let newInterval: number;

	if (typeof increase === 'number') {
		newInterval = previousInterval + increase;
	} else if (typeof increase === 'function') {
		newInterval = increase(previousInterval);
	} else {
		throw new Error('Invalid increase value - must be either number or a function');
	}

	if (newInterval < previousInterval) {
		throw new Error('Unexpected value: interval decreased');
	}

	if (typeof maxInterval === 'number') {
		return Math.min(newInterval, maxInterval);
	}

	return newInterval;
}
