
import * as should from 'should';
import { generateUnionTypeRecursive } from '../../../src/TypeScript/generator';

describe('TypeScript.generator', () => {

	describe('generateUnionTypeRecursive', () => {

		it('should return generated ts file with exported default union type of all in directory', () => {

			const tsFileContent = generateUnionTypeRecursive(__dirname + '/mock-data', 'IAllTypes');
			should.strictEqual(
				tsFileContent,
				`
import { WeAreFuckedAction as WeAreFuckedAction_6065a } from './We/Are/Fucked/weAreFuckedAction';
import { WeAction as WeAction_91017 } from './We/weActions';
import { MyAction as MyAction_abbcc } from './firstActions';
import { YourAction as YourAction_abbcc } from './firstActions';
type IAllTypes = WeAreFuckedAction_6065a | WeAction_91017 | MyAction_abbcc | YourAction_abbcc;
export default IAllTypes;
`,
			);
		});
	});
});
