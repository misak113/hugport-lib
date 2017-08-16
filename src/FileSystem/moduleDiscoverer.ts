
import * as fs from 'fs';

export function getStringValuesRecursive(path: string): string[] {
	const dirs = fs.readdirSync(path);
	let values: string[] = [];
	for (let dir of dirs) {
		const filePath = path + '/' + dir;
		const stats = fs.statSync(filePath);
		if (stats.isDirectory()) {
			values = [...values, ...getStringValuesRecursive(filePath)];
		} else if (dir.substr(dir.lastIndexOf('.')) === '.js') {
			const module = require(filePath);
			for (let name in module) {
				if (typeof module[name] === 'string') {
					values = [...values, module[name]];
				}
			}
		}
	}
	return values;
}

export interface IModuleExport {
	relativePath: string;
	export: string;
	value: any;
}

export function getModuleExportsRecursive(path: string, relativeBasePath: string = '.'): IModuleExport[] {
	const dirs = fs.readdirSync(path);
	let moduleExports: IModuleExport[] = [];
	for (let dir of dirs) {
		const filePath = path + '/' + dir;
		const stats = fs.statSync(filePath);
		if (stats.isDirectory()) {
			moduleExports = [...moduleExports, ...getModuleExportsRecursive(filePath, relativeBasePath + '/' + dir)];
		} else if (dir.substr(dir.lastIndexOf('.')) === '.js') {
			const relativePath = relativeBasePath + '/' + dir.substr(0, dir.lastIndexOf('.'));
			const module = require(filePath);
			for (let name in module) {
				moduleExports = [...moduleExports, {
					relativePath,
					export: name,
					value: module[name],
				}];
			}
		}
	}
	return moduleExports;
}
