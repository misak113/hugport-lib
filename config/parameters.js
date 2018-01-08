
const { detectModuleRootPath } = require('../src/Path/detector');
const { assign } = require('lodash');
const packageConfig = require('../package.json');
const environment = process.env.NODE_ENV || 'dev';
const rootPath = detectModuleRootPath(packageConfig.name);
const testsPath = rootPath + '/tests';
const distPath = rootPath + '/dist';

try {
	const localEnv = require('./env.' + environment + '.json');
	process.env = assign(process.env, localEnv);
} catch (e) {
	console.info(`Do not use override env.${environment}.json file`);
}

module.exports = {
	environment,
	configPath: __dirname,
	paths: {
		rootPath,
		testsPath,
		distPath,
	},
	amqp: {
		dsn: process.env.amqp_dsn,
	},
};
