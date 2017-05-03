
const child_process = require('child_process');
const packagePath = __dirname + '/../package.json';
const package = require(packagePath);

const branch = process.argv[2];
if (!branch) {
	throw new Error('No branch name specified');
}

function run(cmd, callback) {
	const command = child_process.exec(cmd);
	let result = '';
	command.stdout.on('data', (data) => result += data.toString());
	command.on('close', (code) => callback(result));
}

run('yarn info "' + package.name + '" dist-tags --json', (info) => {
	const jsonInfo = JSON.parse(info) || {};
	const lastVersion = jsonInfo.type === 'inspect' ? jsonInfo.data.latest : '0.0.0';
	const versionParts = lastVersion.split('.');
	// always patch only
	versionParts[2]++;
	const nextVersion = versionParts.join('.');

	if (branch === 'master') {
		process.stdout.write(nextVersion);
	} else {
		const postfix = process.argv[3];
		if (!postfix) {
			throw new Error('No postfix specified for non master branch');
		}
		process.stdout.write(nextVersion + '-' + branch + '.' + postfix);
	}
});
