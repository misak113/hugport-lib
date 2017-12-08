
import { Compiler } from 'webpack';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tar from 'tar';
import * as tmp from 'tmp';

export default class NpmPackPlugin {

	constructor(
		private options: {
			name: string;
			environment: string;
			rootPath: string;
			packagesPath: string;
		},
	) {}

	public apply(compiler: Compiler) {
		compiler.plugin('done', () => {
			if (this.options.environment === 'dev') {
				const devVersion = '99.0.0-dev.' + new Date().valueOf();
				const tmpDir = tmp.dirSync().name;

				fs.copySync(path.join(this.options.rootPath, 'dist'), path.join(tmpDir, 'package', 'dist'));
				fs.copySync(path.join(this.options.rootPath, 'README.md'), path.join(tmpDir, 'package', 'README.md'));

				const configPath = path.join(this.options.rootPath, 'package.json');
				const configContents = fs.readJSONSync(configPath);
				configContents.version = devVersion;
				fs.writeJSONSync(path.join(tmpDir, 'package', 'package.json'), configContents);

				const tarballDir = path.join(this.options.packagesPath, this.options.name, devVersion);
				const tarballFileName = this.options.name.replace(/^@/, '').replace(/\//g, '-') + '-' + devVersion + '.tgz';
				fs.ensureDirSync(tarballDir);

				tar.c(
					{
						gzip: true,
						file: path.join(tarballDir, tarballFileName),
						sync: true,
						cwd: tmpDir,
					},
					['package'],
				);

				console.info('Tarball release ' + tarballFileName);
			}
		});
	}
}
