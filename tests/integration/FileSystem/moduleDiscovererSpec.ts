
import * as should from 'should';
import { getStringValuesRecursive, getModuleExportsRecursive } from '../../../src/FileSystem/moduleDiscoverer';

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

	describe('getModuleExportsRecursive', () => {
		it('should return all module exports with relative paths & values from js modules in directory recursive', () => {

			const values = getModuleExportsRecursive(__dirname + '/mock-data');
			should.deepEqual(
				values,
				[
					{ export: 'a', value: 'a', relativePath: './a' },
					{ export: 'c', value: undefined, relativePath: './a' },
					{ export: 'd', value: null, relativePath: './a' },
					{ export: 'e', value: {}, relativePath: './a' },
					{ export: 'f', value: { x: 1 }, relativePath: './a' },
					{ export: 'a', value: 'a', relativePath: './b' },
					{ export: 'b', value: 'b', relativePath: './b' },
					{ export: 'r', value: 'r', relativePath: './z/z' },
					{ export: 's', value: 's', relativePath: './z/z' },
				],
			);
		});
	});
});
