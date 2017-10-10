
import * as assert from 'assert';
import { timeToSeconds } from '../../../src/DateTime/timeConverter';

describe('DateTime.timerConverter', function () {

	describe('timeToSeconds', function () {

		it('should return full time of day in seconds', function () {
			assert.strictEqual(timeToSeconds('00:00:00'), 0);
			assert.strictEqual(timeToSeconds('00:00:59'), 59);
			assert.strictEqual(timeToSeconds('00:59:59'), 59 * 60 + 59);
			assert.strictEqual(timeToSeconds('23:59:59'), 23 * 60 * 60 + 59 * 60 + 59);
		});

		it('should throw error for not full time', function () {
			try {
				timeToSeconds('14:30');
				assert.ok(false);
			} catch (e) {
				assert.equal(e.message, 'Invalid time format. Must be HH:mm:ss');
			}
		});
	});
});
