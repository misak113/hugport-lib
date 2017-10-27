
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
	let updatedAtSeconds: number = 0;
	const OriginalDate: DateConstructor = overrideDateCurrentTimestamp(
		root,
		() => lastCurrentTimestamp
			+ (Math.floor(OriginalDate.now() / 1e3) - updatedAtSeconds) * 1e3 // last update based on seconds
			+ OriginalDate.now() % 1e3, // keep ms from internal clock
	);
	const updateCurrentTimestamp = async () => {
		lastCurrentTimestamp = await getCurrentTimestampSeconds() * 1e3;
		updatedAtSeconds = Math.floor(OriginalDate.now() / 1e3);
	};
	setInterval(updateCurrentTimestamp, updatingInterval);
	updateCurrentTimestamp();
	return OriginalDate;
}
