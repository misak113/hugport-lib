import * as should from 'should';
import * as sinon from 'sinon';
import { amqpConnection } from '../../connections';
import {
	enqueue,
	fetchNext,
	bindOne,
	bindOneExpectingConfirmation,
	purgeMore,
} from '../../../../src/AMQP/EventSourcing/eventQueue';
import waitUntil from '../../../../src/DateTime/waitUntil';
import wait from '../../../../src/Timer/wait';

describe('AMQP.EventSourcing.eventQueue', function () {

	before(async function () {
		this.amqplibConnection = await amqpConnection.pool.acquire();
	});

	after(async function () {
		await amqpConnection.pool.release(this.amqplibConnection);
	});

	const createEvent = (type: string, value: any) => ({
		id: null,
		commandId: 'test',
		type,
		sourceUid: 'test',
		dispatchedAt: new Date(2018, 0, 1),
		receivedAt: new Date(2018, 0, 1),
		payload: {
			type,
			value,
		},
	});

	describe('enqueue', function () {

		it('should send event to an exchange defined by destination with a given routing key', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('consumer3_event2');
			await channel.assertExchange('events', 'direct');
			await channel.assertQueue('consumer1_event1');
			await channel.assertQueue('consumer1_event2');
			await channel.assertQueue('consumer2_event1');
			await channel.assertQueue('consumer3_event2');
			await channel.bindQueue('consumer1_event1', 'events', 'event1');
			await channel.bindQueue('consumer1_event2', 'events', 'event2');
			await channel.bindQueue('consumer2_event1', 'events', 'event1');
			await channel.bindQueue('consumer3_event2', 'events', 'event2');

			await enqueue(amqpConnection, createEvent('event1', 1));
			await enqueue(amqpConnection, createEvent('event2', 2));

			const result1 = await channel.get('consumer1_event1');
			JSON.parse(result1!.content.toString()).should.deepEqual({
				...createEvent('event1', 1),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result2 = await channel.get('consumer1_event2');
			JSON.parse(result2!.content.toString()).should.deepEqual({
				...createEvent('event2', 2),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result3 = await channel.get('consumer2_event1');
			JSON.parse(result3!.content.toString()).should.deepEqual({
				...createEvent('event1', 1),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result4 = await channel.get('consumer3_event2');
			JSON.parse(result4!.content.toString()).should.deepEqual({
				...createEvent('event2', 2),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});
		});
	});

	describe('fetchNext', function () {

		it('should fetch next enqueued event', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('consumer3_event2');
			await channel.assertExchange('events', 'direct');
			await channel.assertQueue('consumer1_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer1_event1',
			});
			await channel.assertQueue('consumer1_event2', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer1_event2',
			});
			await channel.assertQueue('consumer2_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer2_event1',
			});
			await channel.assertQueue('consumer3_event2', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer3_event2',
			});
			await channel.bindQueue('consumer1_event1', 'events', 'event1');
			await channel.bindQueue('consumer1_event2', 'events', 'event2');
			await channel.bindQueue('consumer2_event1', 'events', 'event1');
			await channel.bindQueue('consumer3_event2', 'events', 'event2');

			channel.publish('events', 'event1', new Buffer(JSON.stringify(createEvent('event1', 1))));
			channel.publish('events', 'event2', new Buffer(JSON.stringify(createEvent('event2', 2))));
			await wait(200);

			const event1 = await fetchNext(amqpConnection, 'event1', 'consumer1');
			event1!.should.deepEqual(createEvent('event1', 1));

			const event2 = await fetchNext(amqpConnection, 'event2', 'consumer1');
			event2!.should.deepEqual(createEvent('event2', 2));

			const event3 = await fetchNext(amqpConnection, 'event1', 'consumer2');
			event3!.should.deepEqual(createEvent('event1', 1));

			const event4 = await fetchNext(amqpConnection, 'event2', 'consumer3');
			event4!.should.deepEqual(createEvent('event2', 2));
		});
	});

	describe('bindOne', function () {

		it('should call given callback everytime a specified event is enqueued for a specified destination', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('consumer3_event2');
			await channel.assertExchange('events', 'direct');

			const callbackD1C1E1 = sinon.spy();
			const callbackD1C1E2 = sinon.spy();
			const callbackD2C2E1 = sinon.spy();
			const callbackD3C3E2 = sinon.spy();

			const cancel1 = await bindOne(amqpConnection, 'event1', 'consumer1', callbackD1C1E1);
			const cancel2 = await bindOne(amqpConnection, 'event2', 'consumer1', callbackD1C1E2);
			const cancel3 = await bindOne(amqpConnection, 'event1', 'consumer2', callbackD2C2E1);
			const cancel4 = await bindOne(amqpConnection, 'event2', 'consumer3', callbackD3C3E2);

			channel.publish('events', 'event1', new Buffer(JSON.stringify(createEvent('event1', 1))));
			channel.publish('events', 'event2', new Buffer(JSON.stringify(createEvent('event2', 2))));

			await waitUntil(async () => callbackD1C1E1.withArgs(createEvent('event1', 1)).calledOnce);
			await waitUntil(async () => callbackD1C1E2.withArgs(createEvent('event2', 2)).calledOnce);
			await waitUntil(async () => callbackD2C2E1.withArgs(createEvent('event1', 1)).calledOnce);
			await waitUntil(async () => callbackD3C3E2.withArgs(createEvent('event2', 2)).calledOnce);

			callbackD1C1E1.callCount.should.equal(1);
			callbackD1C1E2.callCount.should.equal(1);
			callbackD2C2E1.callCount.should.equal(1);
			callbackD3C3E2.callCount.should.equal(1);

			await cancel1();
			await cancel2();
			await cancel3();
			await cancel4();
		});
	});

	describe('bindOneExpectingConfirmation', function () {

		it('should call given callback on specified event enqueued and send response message, returned by the callback', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('replyQueue1');
			await channel.deleteQueue('replyQueue2');
			await channel.deleteQueue('replyQueue3');
			await channel.assertExchange('events', 'direct');

			const callback1 = sinon.stub().callsArg(1).resolves();
			const callback2 = sinon.stub().callsArg(1).resolves();
			const callback3 = sinon.stub().callsArg(1).resolves();

			const cancel1 = await bindOneExpectingConfirmation(amqpConnection, 'event1', 'consumer1', callback1);
			const cancel2 = await bindOneExpectingConfirmation(amqpConnection, 'event2', 'consumer1', callback2);
			const cancel3 = await bindOneExpectingConfirmation(amqpConnection, 'event3', 'consumer2', callback3);

			channel.publish(
				'events',
				'event1',
				new Buffer(JSON.stringify({ a: 1 })),
				{ replyTo: 'replyQueue1', correlationId: 'test1' },
			);
			await waitUntil(async () => callback1.calledOnce);
			const response1 = await channel.get('replyQueue1');
			should(response1).not.be.false();
			response1!.properties.correlationId.should.equal('test1');

			channel.publish(
				'events',
				'event2',
				new Buffer(JSON.stringify({ a: 2 })),
				{ replyTo: 'replyQueue2', correlationId: 'test2' },
			);
			await waitUntil(async () => callback2.calledOnce);
			const response2 = await channel.get('replyQueue2');
			should(response2).not.be.false();
			response2!.properties.correlationId.should.equal('test2');

			channel.publish(
				'events',
				'event3',
				new Buffer(JSON.stringify({ a: 3 })),
				{ replyTo: 'replyQueue3', correlationId: 'test3' },
			);
			await waitUntil(async () => callback3.calledOnce);
			const response3 = await channel.get('replyQueue3');
			should(response3).not.be.false();
			response3!.properties.correlationId.should.equal('test3');

			await cancel1();
			await cancel2();
			await cancel3();
		});
	});

	describe('purgeMore', function () {

		it('should purge all events of given types from given destination for a given consumer type', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer2_event1');
			await channel.assertExchange('events', 'direct');
			await channel.assertQueue('consumer1_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer1_event1',
			});
			await channel.assertQueue('consumer2_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer2_event1',
			});
			await channel.bindQueue('consumer1_event1', 'events', 'event1');
			await channel.bindQueue('consumer2_event1', 'events', 'event1');

			channel.publish('events', 'event1', new Buffer(JSON.stringify(createEvent('event1', 1))));
			await purgeMore(amqpConnection, ['event1'], 'consumer1');
			(await channel.get('consumer1_event1')).should.be.false();

			channel.publish('events', 'event1', new Buffer(JSON.stringify(createEvent('event1', 2))));
			await purgeMore(amqpConnection, ['event1'], 'consumer2');
			(await channel.get('consumer2_event1')).should.be.false();
		});
	});
});
