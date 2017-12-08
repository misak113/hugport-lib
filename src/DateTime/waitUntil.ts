import timeout from 'timeout-ts';

export default async (predicate: () => Promise<any>, interval: number = 100) => {
	while (true) {
		if (await predicate()) {
			break;
		}

		await timeout(interval);
	}
};
