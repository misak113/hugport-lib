
import * as should from 'should';
import { detectModuleRootPath } from '../../../src/Path/detector';

describe('Path.detector', () => {

	describe('detectModuleRootPath', () => {

		const mockPath = __dirname + '/mock-data';

		it('should return path to current directory where package.json is', () => {
			const rootPath = detectModuleRootPath('mock-data', 3, mockPath);
			should(rootPath).equal(mockPath);
		});

		it('should return path to parent directory where package.json is', () => {
			const rootPath = detectModuleRootPath('mock-data', 3, mockPath + '/some-subdir');
			should(rootPath).equal(mockPath);
		});

		it('should return path to more parent directory where package.json is', () => {
			const rootPath = detectModuleRootPath('mock-data', 5, mockPath + '/some-subdir/subdir2/subdir3/subdir4');
			should(rootPath).equal(mockPath);
		});

		it('should return path to my-module where package.json is presents with same named package', () => {
			const rootPath = detectModuleRootPath('my-module', 5, mockPath + '/modules/@scoped/module');
			should(rootPath).equal(mockPath + '/modules/my-module');
		});

		it('should return path to @scoped module where package.json is presents with same named package prefixed by scope', () => {
			const rootPath = detectModuleRootPath('@scoped/module', 5, mockPath + '/modules/my-module');
			should(rootPath).equal(mockPath + '/modules/@scoped/module');
		});
	});
});
