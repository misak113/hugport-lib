export function mergeSorted<T>(
	a: T[],
	b: T[],
	comparator: (first: T, second: T) => number = ((first: T, second: T) => first < second ? -1 : 1),
) {
	const answer = new Array(a.length + b.length);
	let i = 0;
	let j = 0;
	let k = 0;

	while (i < a.length && j < b.length) {
		if (comparator(a[i], b[j]) < 0) {
			answer[k] = a[i];
			i++;
		} else {
			answer[k] = b[j];
			j++;
		}
		k++;
	}
	while (i < a.length) {
		answer[k] = a[i];
		i++;
		k++;
	}
	while (j < b.length) {
		answer[k] = b[j];
		j++;
		k++;
	}
	return answer;
}
