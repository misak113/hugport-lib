
export function timeToSeconds(time: string) {
	const timeParts = time.split(':');
	if (timeParts.length !== 3) {
		throw new Error('Invalid time format. Must be HH:mm:ss');
	}
	return timeParts
		.reduce(
			(num: number, timePart: string, index: number) => num + parseInt(timePart) * Math.pow(60, 2 - index),
			0,
		);
}
