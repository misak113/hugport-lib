
import { overrideDateCurrentTimestamp } from '../../../src/DateTime/dateMonkeyPatch';
import * as should from 'should';

describe('DateTime.dateMonkeyPatch', function () {

	describe('overrideDateCurrentTimestamp', function () {

		let OriginalDate: DateConstructor;

		before(function () {
			OriginalDate = Date;
		});

		afterEach(function () {
			global.Date = OriginalDate;
		});

		it('should return overriden current timestamp by now static method', function () {
			let currentTimestamp: number;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);

			currentTimestamp = 113;
			should(Date.now()).equal(113);

			currentTimestamp = 0;
			should(Date.now()).equal(0);

			currentTimestamp = 1333065600000;
			should(Date.now()).equal(1333065600000);
		});

		it('should return overriden current Date by new instantiating construction', function () {
			const date113 = new Date(113);
			const date0 = new Date(0);
			const dateAnytime = new Date(1333065600000);

			let currentTimestamp: number;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);

			currentTimestamp = 113;
			should(new Date()).eql(date113);
			should(new Date().valueOf()).equal(113);

			currentTimestamp = 0;
			should(new Date()).eql(date0);
			should(new Date().valueOf()).equal(0);

			currentTimestamp = 1333065600000;
			should(new Date()).eql(dateAnytime);
			should(new Date().valueOf()).equal(1333065600000);
		});

		it('should return overriden current Date string by static call function', function () {
			let currentTimestamp: number;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);

			currentTimestamp = 113000;
			should(new OriginalDate(Date()).valueOf()).equal(113000); // "Thu Jan 01 1970 01:01:53 GMT+0100 (CET)"

			currentTimestamp = 0;
			should(new OriginalDate(Date()).valueOf()).equal(0); // "Thu Jan 01 1970 01:00:00 GMT+0100 (CET)"

			currentTimestamp = 1333065600000;
			should(new OriginalDate(Date()).valueOf()).equal(1333065600000); // "Fri Mar 30 2012 02:00:00 GMT+0200 (CEST)"
		});

		it('should keep instantiating construction with arguments same', function () {
			const oldDateTimestampReal = new OriginalDate('Fri Mar 30 2012 02:00:00 GMT+0200 (CEST)').valueOf();
			let currentTimestamp: number = 113000;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);
			should(new Date(999000).valueOf()).equal(999000);
			should(new Date(2017, 5, 6).valueOf()).equal(new OriginalDate(2017, 5, 6).valueOf());
			should(new Date('Fri Mar 30 2012 02:00:00 GMT+0200 (CEST)').valueOf()).equal(oldDateTimestampReal);
			should(new Date('Fri Mar 30 2012 02:00:00 GMT+0200 (CEST)').valueOf()).equal(1333065600000);
		});

		it('should keep static name property of Date', function () {
			let currentTimestamp: number;
			const originalName = Date.name;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);
			should(Date.name).equal(originalName);
		});

		xit('should keep length property of Date', function () {
			// Not works because cannot be overriden
			let currentTimestamp: number;
			const originalLength = Date.length;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);
			should(Date.length).equal(originalLength);
		});

		it('should keep parse static function of Date', function () {
			let currentTimestamp: number;
			const originalParse = Date.parse;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);
			should(Date.parse).equal(originalParse);
		});

		it('should keep UTC static function of Date', function () {
			let currentTimestamp: number;
			const originalUTC = Date.UTC;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);
			should(Date.UTC).equal(originalUTC);
		});

		it('should keep prototype of Date', function () {
			let currentTimestamp: number;
			const originalPrototype = Date.prototype;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);
			should(Date.prototype).equal(originalPrototype);
		});

		it('should keep instanceof closure of Date', function () {
			let currentTimestamp: number;
			overrideDateCurrentTimestamp(global, () => currentTimestamp);
			should(new Date instanceof Date).equal(true);
			should(new Date instanceof OriginalDate).equal(true);
		});
	});
});
