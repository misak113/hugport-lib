import * as should from 'should';
import * as sinon from 'sinon';
import {
	setIncreasingInterval,
	clearIncreasingInterval,
} from '../../../src/Timer/increasingInterval';

async function waitForCallCount(callback: sinon.SinonSpy, callCount: number) {
	while (callback.callCount !== callCount) {
		// enforce concurrency with other threads
		await new Promise((resolve: () => void) => resolve());
	}
}

describe('Timer.increasingInterval', function () {

	describe('#setIncreasingInterval()', function () {

		it('should call callback at expected times with statically increasing interval', async function () {
			const clock = sinon.useFakeTimers();
			const callback = sinon.spy();

			const id = setIncreasingInterval(2000, 500, 5000, callback);
			id.should.equal(1);
			callback.should.not.be.called();

			clock.tick(2000);
			await waitForCallCount(callback, 1);

			clock.tick(2500);
			await waitForCallCount(callback, 2);

			clock.tick(3000);
			await waitForCallCount(callback, 3);

			clock.tick(3500);
			await waitForCallCount(callback, 4);

			clock.tick(4000);
			await waitForCallCount(callback, 5);

			clock.tick(4500);
			await waitForCallCount(callback, 6);

			clock.tick(5000);
			await waitForCallCount(callback, 7);

			clock.tick(5000);
			await waitForCallCount(callback, 8);

			clock.tick(5000);
			await waitForCallCount(callback, 9);

			clock.restore();
		});

		it('should call callback at expected times with dynamically increasing interval', async function () {
			const clock = sinon.useFakeTimers();
			const callback = sinon.spy();

			setIncreasingInterval(2000, (previous: number) => previous * 2, 30000, callback);
			callback.should.not.be.called();

			clock.tick(2000);
			await waitForCallCount(callback, 1);

			clock.tick(4000);
			await waitForCallCount(callback, 2);

			clock.tick(8000);
			await waitForCallCount(callback, 3);

			clock.tick(16000);
			await waitForCallCount(callback, 4);

			clock.tick(30000);
			await waitForCallCount(callback, 5);

			clock.tick(30000);
			await waitForCallCount(callback, 6);

			clock.tick(30000);
			await waitForCallCount(callback, 7);

			clock.restore();
		});

		it('should call callback at expected times with effectively non-changing interval', async function () {
			const clock = sinon.useFakeTimers();
			const callback = sinon.spy();

			setIncreasingInterval(2000, 100, 2000, callback);
			callback.should.not.be.called();

			clock.tick(2000);
			await waitForCallCount(callback, 1);

			clock.tick(2000);
			await waitForCallCount(callback, 2);

			clock.tick(2000);
			await waitForCallCount(callback, 3);

			clock.tick(2000);
			await waitForCallCount(callback, 4);

			clock.tick(2000);
			await waitForCallCount(callback, 5);

			clock.restore();
		});

		it('should throw an exception when the starting interval is non-positive number', function () {
			should(() => setIncreasingInterval(0, 100, 2000, sinon.spy())).throwError();
			should(() => setIncreasingInterval(-500, 100, 2000, sinon.spy())).throwError();
		});

		it('should throw an exception when the max interval is lower than starting interval', function () {
			should(() => setIncreasingInterval(2000, 100, 1000, sinon.spy())).throwError();
		});

		it('should throw an exception when the increase is a negative number', function () {
			should(() => setIncreasingInterval(2000, -100, 5000, sinon.spy())).throwError();
		});

		it('should stop if next interval in the sequence is lower than the previous one', async function () {
			const clock = sinon.useFakeTimers();
			const callback = sinon.spy();

			setIncreasingInterval(2000, (previous: number) => previous - 1, 4000, callback);
			callback.should.not.be.called();

			clock.tick(2000);
			await waitForCallCount(callback, 1);

			clock.tick(2000);
			await waitForCallCount(callback, 1);

			clock.tick(2000);
			await waitForCallCount(callback, 1);

			clock.tick(2000);
			await waitForCallCount(callback, 1);
		});
	});

	describe('#clearIncreasingInterval()', function () {

		it('should stop interval once the function is called', async function () {
			const clock = sinon.useFakeTimers();
			const callback1 = sinon.spy();
			const callback2 = sinon.spy();

			const id1 = setIncreasingInterval(2000, 500, 5000, callback1);
			const id2 = setIncreasingInterval(2000, 500, 5000, callback2);

			callback1.should.not.be.called();
			callback2.should.not.be.called();

			clock.tick(2000);
			await waitForCallCount(callback1, 1);
			await waitForCallCount(callback2, 1);

			clearIncreasingInterval(id1);

			clock.tick(2500);
			await waitForCallCount(callback1, 1);
			await waitForCallCount(callback2, 2);

			clock.tick(3000);
			await waitForCallCount(callback1, 1);
			await waitForCallCount(callback2, 3);

			clearIncreasingInterval(id2);

			clock.tick(3500);
			await waitForCallCount(callback1, 1);
			await waitForCallCount(callback2, 3);

			clock.tick(4000);
			await waitForCallCount(callback1, 1);
			await waitForCallCount(callback2, 3);

			clock.restore();
		});
	});
});
