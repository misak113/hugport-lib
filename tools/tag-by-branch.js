
const branch = process.argv[2];
if (!branch) {
	throw new Error('No branch name specified');
}

process.stdout.write(branch === 'master' ? 'latest' : branch);
