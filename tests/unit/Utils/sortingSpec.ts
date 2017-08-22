import { mergeSorted } from '../../../src/Utils/sorting';

describe('Utils.Sorting', function () {

	describe('mergeSorted', function () {

		it('should merge 2 sorted arrays of numbers into one sorted array', function () {
			const array1 = [1, 4, 6, 7, 8, 12, 13, 19, 24, 25, 49];
			const array2 = [4, 8, 15, 16, 23, 42];

			mergeSorted(array1, array2).should.deepEqual([1, 4, 4, 6, 7, 8, 8, 12, 13, 15, 16, 19, 23, 24, 25, 42, 49]);
		});

		it('should merge 2 sorted arrays of strings into one sorted array, given strings comparator', function () {
			const array1 = ['no', 'protection', 'sales', 'Zanzibar'];
			const array2 = ['back', 'bring', 'Hodor', 'or', 'please', 'Trabants', 'Wednesday'];

			const comparator = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());

			mergeSorted(array1, array2, comparator).should.deepEqual([
				'back', 'bring', 'Hodor', 'no', 'or', 'please', 'protection', 'sales', 'Trabants', 'Wednesday', 'Zanzibar',
			]);
		});

		it('should merge to arrays of arbitrary type into one sorted array, given a comparator function', function () {
			const array1 = [
				{ a: 4, b: 3 },
				{ a: 7, b: 3 },
				{ a: 9, b: 4 },
				{ a: 10, b: 4 },
				{ a: 12, b: 999 },
			];

			const array2 = [
				{ a: 1, b: 1 },
				{ a: 5, b: 8 },
				{ a: 6, b: 9 },
				{ a: 11, b: 14 },
				{ a: 15, b: 15 },
			];

			const comparator1 = (a: { a: number, b: number }, b: { a: number, b: number }) => a.a < b.a ? -1 : 1;
			const comparator2 = (a: { a: number, b: number }, b: { a: number, b: number }) => a.b < b.b ? -1 : 1;

			mergeSorted(array1, array2, comparator1).should.deepEqual([
				{ a: 1, b: 1 },
				{ a: 4, b: 3 },
				{ a: 5, b: 8 },
				{ a: 6, b: 9 },
				{ a: 7, b: 3 },
				{ a: 9, b: 4 },
				{ a: 10, b: 4 },
				{ a: 11, b: 14 },
				{ a: 12, b: 999 },
				{ a: 15, b: 15 },
			]);

			mergeSorted(array1, array2, comparator2).should.deepEqual([
				{ a: 1, b: 1 },
				{ a: 4, b: 3 },
				{ a: 7, b: 3 },
				{ a: 9, b: 4 },
				{ a: 10, b: 4 },
				{ a: 5, b: 8 },
				{ a: 6, b: 9 },
				{ a: 11, b: 14 },
				{ a: 15, b: 15 },
				{ a: 12, b: 999 },
			]);
		});
	});
});
