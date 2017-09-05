
import * as fs from 'fs';
import * as path from 'path';

export function detectModuleRootPath(moduleName: string, deepLimit: number = 10, basePath: string = __dirname) {
	for (let i = 0; i < deepLimit; i++) {
		const packagePath = path.join(basePath, 'package.json');
		if (fs.existsSync(packagePath) && JSON.parse(fs.readFileSync(packagePath).toString()).name === moduleName) {
			return path.resolve(basePath);
		}
		const packageModulePath = path.join(basePath, moduleName, 'package.json');
		if (fs.existsSync(packageModulePath) && JSON.parse(fs.readFileSync(packageModulePath).toString()).name === moduleName) {
			return path.resolve(path.join(basePath, moduleName));
		}
		basePath = path.join(basePath, '..');
	}
	throw new Error('Root path was not found');
}
