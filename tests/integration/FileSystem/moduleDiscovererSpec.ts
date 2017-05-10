
import * as should from 'should';
import { getStringValuesRecursive } from '../../../src/FileSystem/moduleDiscoverer';

describe('FileSystem.moduleDiscoverer', () => {

	describe('getStringValuesRecursive', () => {
		it('should return all string values from js modules in directory recursive', () => {

			const values = getStringValuesRecursive(__dirname + '/mock-data');
			should.deepEqual(
				values,
				[
					'a',
					'a',
					'b',
					'r',
					's',
				],
			);
		});
	});
});
