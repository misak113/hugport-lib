
const co = require('co');
const Mocha = require('mocha');
require('../libs/mocha/es6-mocha')(Mocha, co);

if ([undefined, 'dev', 'production'].indexOf(process.env.NODE_ENV) !== -1) {
	throw new Error('Could not run tests in dev & production NODE_ENV');
}

const testPath = process.env.TEST_PATH;
if (!testPath) {
	throw new Error('Not specified env variable TEST_PATH');
}
const testType = process.env.TEST_TYPE;
const testPostfix = testType ? '-' + testType : '';

const mocha = new Mocha({
	fullTrace: true,
	reporter: "mocha-jenkins-reporter",
	reporterOptions: {
		"junit_report_name": "tests",
		"junit_report_path": "dist/test" + testPostfix + "-report.xml",
		"junit_report_stack": 1
	}
});
mocha.addFile(testPath + '/test' + testPostfix + '.js');
mocha.run((failures) => {
	process.on('exit', () => {
		process.exit(failures);
	});
});
