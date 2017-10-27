
export function overrideDateCurrentTimestamp<TGlobal extends { Date: DateConstructor }>(
	root: TGlobal,
	getCurrentTimestamp: () => number, // in milliseconds
): DateConstructor {
	const OriginalDate = root.Date;
	const OverridenDate: DateConstructor = function Date(this: any) {
		const args: any[] = Array.prototype.slice.call(arguments);
		if (args.length === 0) {
			// asking for current date of system
			const currentTimestamp = getCurrentTimestamp();
			const currentDate = new OverridenDate(currentTimestamp);
			if (this instanceof Date) {
				return currentDate;
			} else {
				return currentDate.toString();
			}
		} else {
			args.unshift(root);
			if (this instanceof Date) {
				return new (Function.prototype.bind.apply(OriginalDate, args));
			} else {
				return OriginalDate.apply(root, args);
			}
		}
	} as any;

	OverridenDate.now = () => getCurrentTimestamp();

	OverridenDate.parse = OriginalDate.parse;
	OverridenDate.UTC = OriginalDate.UTC;
	(OverridenDate as Function).prototype = OriginalDate.prototype;
	root.Date = OverridenDate;

	return OriginalDate;
}

export function overrideDateCurrentTimestampByAsync<TGlobal extends { Date: DateConstructor }>(
	root: TGlobal,
	getCurrentTimestamp: () => Promise<number>, // in milliseconds
	updatingInterval: number = 2e3 // in milliseconds
) {
	let lastCurrentTimestamp: number;
	let updatedAt: number = 0;
	const OriginalDate: DateConstructor = overrideDateCurrentTimestamp(
		root,
		() => lastCurrentTimestamp
			+ (OriginalDate.now() - updatedAt), // ms since last update
	);
	const updateCurrentTimestamp = async () => {
		lastCurrentTimestamp = await getCurrentTimestamp();
		updatedAt = OriginalDate.now();
	};
	setInterval(updateCurrentTimestamp, updatingInterval);
	updateCurrentTimestamp();
	return OriginalDate;
}

export function overrideDateCurrentTimestampInSecondsByAsync<TGlobal extends { Date: DateConstructor }>(
	root: TGlobal,
	getCurrentTimestampSeconds: () => Promise<number>, // in seconds
	updatingInterval: number = 2e3 // in milliseconds
) {
	let lastCurrentTimestamp: number;
	let updatedAt: number = 0;
	let incremented: number = 0;
	const OriginalDate: DateConstructor = overrideDateCurrentTimestamp(
		root,
		() => {
			const millisecondsSinceLastUpdate = OriginalDate.now() - updatedAt;
			return lastCurrentTimestamp
				- incremented
				+ millisecondsSinceLastUpdate;
		}
	);
	const updateCurrentTimestamp = async () => {
		const newCurrentTimestamp = await getCurrentTimestampSeconds() * 1e3;
		const secondsDifference = newCurrentTimestamp - lastCurrentTimestamp;

		if (secondsDifference > 0) {
			incremented = incremented + secondsDifference;
		}

		const millisecondsSinceLastUpdate = OriginalDate.now() - updatedAt;
		if (incremented > 0 && millisecondsSinceLastUpdate >= incremented * 1e3) {
			updatedAt = updatedAt - incremented * 1e3;
			incremented = 0;
		}

		if (secondsDifference < 0) {
			incremented = 0;
			updatedAt = OriginalDate.now();
		}

		lastCurrentTimestamp = newCurrentTimestamp;
	};
	setInterval(updateCurrentTimestamp, updatingInterval);
	updateCurrentTimestamp();
	return OriginalDate;
}

export function overrideDateCurrentTimestampInMinutesByAsync<TGlobal extends { Date: DateConstructor }>(
	root: TGlobal,
	getCurrentTimestampMinutes: () => Promise<number>, // in minutes
	updatingInterval: number = 10e3 // in milliseconds
) {
	let lastCurrentTimestamp: number;
	let updatedAt: number = 0;
	let incremented: boolean = false;
	const OriginalDate: DateConstructor = overrideDateCurrentTimestamp(
		root,
		() => {
			const millisecondsSinceLastUpdate = OriginalDate.now() - updatedAt;
			return lastCurrentTimestamp
				+ (incremented ? -1 : 0)
				+ millisecondsSinceLastUpdate;
		}
	);
	const updateCurrentTimestamp = async () => {
		const newCurrentTimestamp = await getCurrentTimestampMinutes() * 60e3;
		const minutesDifference = newCurrentTimestamp - lastCurrentTimestamp;

		if (minutesDifference === 1) {
			incremented = true;
		}

		const millisecondsSinceLastUpdate = OriginalDate.now() - updatedAt;
		if (incremented && millisecondsSinceLastUpdate >= 60e3) {
			incremented = false;
			updatedAt = updatedAt - 60e3;
		}

		if (minutesDifference < 0 || minutesDifference > 1) {
			incremented = false;
			updatedAt = OriginalDate.now();
		}

		lastCurrentTimestamp = newCurrentTimestamp;
	};
	setInterval(updateCurrentTimestamp, updatingInterval);
	updateCurrentTimestamp();
	return OriginalDate;
}
