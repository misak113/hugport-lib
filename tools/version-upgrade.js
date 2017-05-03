
const fs = require('fs');

const packagePath = __dirname + '/../package.json';
const package = require(packagePath);

const nextVersion = process.argv[2];
if (!nextVersion) {
	throw new Error('No version specified');
}
package.version = nextVersion;

fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + "\n");
