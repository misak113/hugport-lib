import * as sinon from 'sinon';
import {
	enqueue,
	bindAll,
} from '../../../../src/AMQP/Logging/logActionQueue';
import { amqpConnection } from '../../connections';
import waitUntil from '../../../../src/DateTime/waitUntil';

describe('AMQP.Logging.logActionQueue', function () {

	before(async function () {
		this.amqplibConnection = await amqpConnection.pool.acquire();
	});

	after(async function () {
		await amqpConnection.pool.release(this.amqplibConnection);
	});

	const createActionlog = (type: string) => ({
		id: null,
		type,
		sourceUid: 'test',
		receivedAt: new Date(2018, 0, 1),
		payload: { type },
	});

	describe('enqueue', function () {

		it('should enqueue given action log to action_logs queue', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('action_logs');
			await channel.assertQueue('action_logs', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.action_logs',
			});

			await enqueue(amqpConnection, createActionlog('log1'));
			await enqueue(amqpConnection, createActionlog('log2'));
			await enqueue(amqpConnection, createActionlog('log3'));

			const actionLog1 = await channel.get('action_logs');
			JSON.parse(actionLog1.content.toString()).should.deepEqual({
				...createActionlog('log1'),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const actionLog2 = await channel.get('action_logs');
			JSON.parse(actionLog2.content.toString()).should.deepEqual({
				...createActionlog('log2'),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const actionLog3 = await channel.get('action_logs');
			JSON.parse(actionLog3.content.toString()).should.deepEqual({
				...createActionlog('log3'),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});
		});
	});

	describe('bindAll', function () {

		it('should call a given callback with an enqueued action log', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('action_logs');
			await channel.assertQueue('action_logs', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.action_logs',
			});

			const callback = sinon.spy();
			const cancel = await bindAll(amqpConnection, callback);

			channel.sendToQueue('action_logs', new Buffer(JSON.stringify(createActionlog('log1'))));
			await waitUntil(async () => callback.withArgs(createActionlog('log1')).calledOnce);

			channel.sendToQueue('action_logs', new Buffer(JSON.stringify(createActionlog('log2'))));
			await waitUntil(async () => callback.withArgs(createActionlog('log2')).calledOnce);

			channel.sendToQueue('action_logs', new Buffer(JSON.stringify(createActionlog('log3'))));
			await waitUntil(async () => callback.withArgs(createActionlog('log3')).calledOnce);

			callback.callCount.should.equal(3);
			await cancel();
		});
	});
});
