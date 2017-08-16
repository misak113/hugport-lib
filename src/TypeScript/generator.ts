
import { checksumString } from '../Hash/checksum';
import { getModuleExportsRecursive, IModuleExport } from '../FileSystem/moduleDiscoverer';

export function generateUnionTypeRecursive(path: string, typeName: string = 'IUnionType') {
	const moduleExports = getModuleExportsRecursive(path);
	const stringModuleExports = moduleExports.filter((moduleExport: IModuleExport) => typeof moduleExport.value === 'string');
	const imports = stringModuleExports.reduce(
		(reduction: string, moduleExport: IModuleExport) => {
			const hash = checksumModuleExport(moduleExport);
			return reduction + `\nimport { ${moduleExport.export} as ${hash} } from '${moduleExport.relativePath}';`;
		},
		'',
	);
	const unionTypes = stringModuleExports
		.map((moduleExport: IModuleExport) => checksumModuleExport(moduleExport))
		.join(' | ');
	return `${imports}
type ${typeName} = ${unionTypes.length ? unionTypes : 'void'};
export default ${typeName};
`;
}

function checksumModuleExport(moduleExport: IModuleExport) {
	return moduleExport.export + '_' + checksumString(moduleExport.relativePath, 5);
}
