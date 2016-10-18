
const fs = require('fs');

function getNodeModulesExternals(rootDir) {
	const nodeModules = {};
	fs.readdirSync(rootDir + '/node_modules')
		.filter(function(dirName) {
			return ['.bin'].indexOf(dirName) === -1;
		})
		.forEach(function(moduleName) {
			nodeModules[moduleName] = 'commonjs ' + moduleName;
		});
	return nodeModules;
}

function getNodeModulesNames() {
	return Object.keys(getNodeModulesExternals());
}

exports = module.exports = {
	getNodeModulesExternals,
	getNodeModulesNames
};
