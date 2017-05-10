
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
