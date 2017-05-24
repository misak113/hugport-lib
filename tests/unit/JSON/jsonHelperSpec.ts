
import * as should from 'should';
import { deserializeJSON } from '../../../src/JSON/jsonHelper';

describe('JSON.jsonHelper', () => {

	describe('deserializeJSON', () => {

		it('should return Date value if value match ISO-8601', () => {
			const value = deserializeJSON('any', '2017-04-01T01:02:03.406Z');
			should(value).instanceOf(Date);
			should(value.toISOString()).equal('2017-04-01T01:02:03.406Z');
		});

		it('should return original value if value does not match ISO-8601', () => {
			const value = deserializeJSON('any', '2017-04-01T01:02:03.40Z');
			should(value).not.instanceOf(Date);
			should(value).equal('2017-04-01T01:02:03.40Z');
		});

		it('should parse JSON when some value match ISO-8601 as Date object', () => {
			const object = {
				str: 'xxx',
				dt: new Date('2017-04-01T01:02:03.40Z'),
				sub: {
					dt: new Date('2016-04-01T01:02:03.40Z'),
				},
			};
			const json = JSON.stringify(object);
			const value = JSON.parse(json, deserializeJSON);
			should(value.str).equal('xxx');
			should(value.dt).instanceOf(Date);
			should(value.dt.toISOString()).equal('2017-04-01T01:02:03.400Z');
			should(value.sub.dt).instanceOf(Date);
			should(value.sub.dt.toISOString()).equal('2016-04-01T01:02:03.400Z');
		});
	});
});
