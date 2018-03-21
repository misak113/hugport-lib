import { Channel } from 'amqplib';
import * as should from 'should';
import * as sinon from 'sinon';
import { amqpConnection } from '../../connections';
import {
	enqueue,
	enqueueForDevice,
	fetchNext,
	bindOne,
	bindOneExpectingConfirmation,
	bindOneForDeviceExpectingConfirmation,
	bindOneFailedForDeviceExpectingConfirmation,
	purgeOne,
	deleteMore,
} from '../../../../src/AMQP/EventSourcing/eventQueue';
import waitUntil from '../../../../src/DateTime/waitUntil';
import wait from '../../../../src/Timer/wait';
import { generateUniqueHash } from '../../../../src/Hash/generator';

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
			await channel.deleteExchange('events_failed');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('consumer3_event2');
			await channel.assertExchange('events_failed', "topic");
			await channel.assertExchange('events', "topic", { alternateExchange: "events_failed" });
			await channel.assertQueue('consumer1_event1');
			await channel.assertQueue('consumer1_event2');
			await channel.assertQueue('consumer2_event1');
			await channel.assertQueue('consumer3_event2');
			await channel.bindQueue('consumer1_event1', 'events', 'event.event1');
			await channel.bindQueue('consumer1_event2', 'events', 'event.event2');
			await channel.bindQueue('consumer2_event1', 'events', 'event.event1');
			await channel.bindQueue('consumer3_event2', 'events', 'event.event2');

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

	describe("enqueueForDevice", function () {

		it("should send event to an exchange defined by destination with a given routing key", async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange("events");
			await channel.deleteExchange("events_failed");
			await channel.deleteQueue("consumer1_event1");
			await channel.deleteQueue("consumer1_event2");
			await channel.deleteQueue("consumer2_event1");
			await channel.deleteQueue("consumer3_event2");
			await channel.assertExchange("events_failed", "topic");
			await channel.assertExchange("events", "topic", { alternateExchange: "events_failed" });
			await channel.assertQueue("consumer1_event1");
			await channel.assertQueue("consumer1_event2");
			await channel.assertQueue("consumer2_event1");
			await channel.assertQueue("consumer3_event2");
			await channel.bindQueue("consumer1_event1", "events", "device.event1.1");
			await channel.bindQueue("consumer1_event1", "events", "device.event1.2");
			await channel.bindQueue("consumer1_event2", "events", "device.event2.1");
			await channel.bindQueue("consumer2_event1", "events", "device.event1.3");
			await channel.bindQueue("consumer3_event2", "events", "device.event2.2");
			await channel.bindQueue("consumer3_event2", "events", "device.event2.3");

			await enqueueForDevice(amqpConnection, createEvent("event1", 11), "1");
			await enqueueForDevice(amqpConnection, createEvent("event1", 12), "2");
			await enqueueForDevice(amqpConnection, createEvent("event1", 13), "3");
			await enqueueForDevice(amqpConnection, createEvent("event2", 21), "1");
			await enqueueForDevice(amqpConnection, createEvent("event2", 22), "2");
			await enqueueForDevice(amqpConnection, createEvent("event2", 23), "3");

			const result11 = await channel.get("consumer1_event1");
			JSON.parse(result11!.content.toString()).should.deepEqual({
				...createEvent("event1", 11),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result12 = await channel.get("consumer1_event1");
			JSON.parse(result12!.content.toString()).should.deepEqual({
				...createEvent("event1", 12),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result13 = await channel.get("consumer2_event1");
			JSON.parse(result13!.content.toString()).should.deepEqual({
				...createEvent("event1", 13),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result21 = await channel.get("consumer1_event2");
			JSON.parse(result21!.content.toString()).should.deepEqual({
				...createEvent("event2", 21),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result22 = await channel.get("consumer3_event2");
			JSON.parse(result22!.content.toString()).should.deepEqual({
				...createEvent("event2", 22),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result23 = await channel.get("consumer3_event2");
			JSON.parse(result23!.content.toString()).should.deepEqual({
				...createEvent("event2", 23),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});
		});

		it("should send event to an alternate exchange", async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange("events_failed");
			await channel.deleteExchange("events");
			await channel.assertExchange("events_failed", "topic");
			await channel.assertExchange("events", "topic", { alternateExchange: "events_failed" });
			await channel.assertQueue("consumer1_event1");
			await channel.assertQueue("consumer1_event2");
			await channel.bindQueue("consumer1_event1", "events_failed", "device.event1.*");
			await channel.bindQueue("consumer1_event2", "events_failed", "device.event2.*");

			await enqueueForDevice(amqpConnection, createEvent("event1", 1), "1");
			await enqueueForDevice(amqpConnection, createEvent("event2", 2), "2");

			const result1 = await channel.get("consumer1_event1");
			JSON.parse(result1!.content.toString()).should.deepEqual({
				...createEvent("event1", 1),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});

			const result2 = await channel.get("consumer1_event2");
			JSON.parse(result2!.content.toString()).should.deepEqual({
				...createEvent("event2", 2),
				dispatchedAt: new Date(2018, 0, 1).toISOString(),
				receivedAt: new Date(2018, 0, 1).toISOString(),
			});
		});
	});

	describe('fetchNext', function () {

		it('should fetch next enqueued event', async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteExchange('events_failed');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('consumer3_event2');
			await channel.assertExchange('events_failed', "topic");
			await channel.assertExchange('events', "topic", { alternateExchange: "events_failed" });
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
			await channel.bindQueue('consumer1_event1', 'events', 'event.event1');
			await channel.bindQueue('consumer1_event2', 'events', 'event.event2');
			await channel.bindQueue('consumer2_event1', 'events', 'event.event1');
			await channel.bindQueue('consumer3_event2', 'events', 'event.event2');

			channel.publish('events', 'event.event1', new Buffer(JSON.stringify(createEvent('event1', 1))));
			channel.publish('events', 'event.event2', new Buffer(JSON.stringify(createEvent('event2', 2))));
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
			await channel.deleteExchange('events_failed');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('consumer3_event2');
			await channel.assertExchange('events_failed', "topic");
			await channel.assertExchange('events', "topic", { alternateExchange: "events_failed" });

			const callbackD1C1E1 = sinon.spy();
			const callbackD1C1E2 = sinon.spy();
			const callbackD2C2E1 = sinon.spy();
			const callbackD3C3E2 = sinon.spy();

			const cancel1 = await bindOne(amqpConnection, 'event1', 'consumer1', callbackD1C1E1);
			const cancel2 = await bindOne(amqpConnection, 'event2', 'consumer1', callbackD1C1E2);
			const cancel3 = await bindOne(amqpConnection, 'event1', 'consumer2', callbackD2C2E1);
			const cancel4 = await bindOne(amqpConnection, 'event2', 'consumer3', callbackD3C3E2);

			channel.publish('events', 'event.event1', new Buffer(JSON.stringify(createEvent('event1', 1))));
			channel.publish('events', 'event.event2', new Buffer(JSON.stringify(createEvent('event2', 2))));

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
			await channel.deleteExchange('events_failed');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer1_event2');
			await channel.deleteQueue('consumer2_event1');
			await channel.deleteQueue('replyQueue1');
			await channel.deleteQueue('replyQueue2');
			await channel.deleteQueue('replyQueue3');
			await channel.assertExchange('events_failed', "topic");
			await channel.assertExchange('events', "topic", { alternateExchange: "events_failed" });

			const callback1 = sinon.stub().callsArg(1).resolves();
			const callback2 = sinon.stub().callsArg(1).resolves();
			const callback3 = sinon.stub().callsArg(1).resolves();

			const cancel1 = await bindOneExpectingConfirmation(amqpConnection, 'event1', 'consumer1', callback1);
			const cancel2 = await bindOneExpectingConfirmation(amqpConnection, 'event2', 'consumer1', callback2);
			const cancel3 = await bindOneExpectingConfirmation(amqpConnection, 'event3', 'consumer2', callback3);

			channel.publish(
				'events',
				'event.event1',
				new Buffer(JSON.stringify({ a: 1 })),
				{ replyTo: 'replyQueue1', correlationId: 'test1' },
			);
			await waitUntil(async () => callback1.calledOnce);
			const response1 = await channel.get('replyQueue1');
			should(response1).not.be.false();
			response1!.properties.correlationId.should.equal('test1');

			channel.publish(
				'events',
				'event.event2',
				new Buffer(JSON.stringify({ a: 2 })),
				{ replyTo: 'replyQueue2', correlationId: 'test2' },
			);
			await waitUntil(async () => callback2.calledOnce);
			const response2 = await channel.get('replyQueue2');
			should(response2).not.be.false();
			response2!.properties.correlationId.should.equal('test2');

			channel.publish(
				'events',
				'event.event3',
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

	describe("bindOneForDeviceExpectingConfirmation", function () {

		it("should call given callback on specified event enqueued and send response message, returned by the callback", async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange("events");
			await channel.deleteExchange("events_failed");
			await channel.deleteQueue("consumer1_event1_device");
			await channel.deleteQueue("consumer1_event2_device");
			await channel.deleteQueue("consumer2_event1_device");
			await channel.deleteQueue("consumer2_event2_device");
			await channel.deleteQueue("replyQueue11");
			await channel.deleteQueue("replyQueue12");
			await channel.deleteQueue("replyQueue13");
			await channel.deleteQueue("replyQueue21");
			await channel.deleteQueue("replyQueue22");
			await channel.deleteQueue("replyQueue23");
			await channel.assertExchange('events_failed', "topic");
			await channel.assertExchange("events", "topic", { alternateExchange: "events_failed" });

			const callback11 = sinon.stub().callsArg(1).resolves();
			const callback12 = sinon.stub().callsArg(1).resolves();
			const callback13 = sinon.stub().callsArg(1).resolves();
			const callback21 = sinon.stub().callsArg(1).resolves();
			const callback22 = sinon.stub().callsArg(1).resolves();
			const callback23 = sinon.stub().callsArg(1).resolves();

			const cancel11 = await bindOneForDeviceExpectingConfirmation(amqpConnection, "event1", "consumer1", "1", callback11);
			const cancel12 = await bindOneForDeviceExpectingConfirmation(amqpConnection, "event1", "consumer1", "2", callback12);
			const cancel13 = await bindOneForDeviceExpectingConfirmation(amqpConnection, "event1", "consumer2", "3", callback13);
			const cancel21 = await bindOneForDeviceExpectingConfirmation(amqpConnection, "event2", "consumer1", "1", callback21);
			const cancel22 = await bindOneForDeviceExpectingConfirmation(amqpConnection, "event2", "consumer2", "2", callback22);
			const cancel23 = await bindOneForDeviceExpectingConfirmation(amqpConnection, "event2", "consumer2", "3", callback23);

			channel.publish(
				"events",
				"device.event1.1",
				new Buffer(JSON.stringify({ a: 11 })),
				{ replyTo: "replyQueue11", correlationId: "test11" },
			);
			await waitUntil(async () => callback11.calledOnce);
			const response11 = await channel.get("replyQueue11");
			should(response11).not.be.false();
			response11!.properties.correlationId.should.equal("test11");

			channel.publish(
				"events",
				"device.event1.2",
				new Buffer(JSON.stringify({ a: 12 })),
				{ replyTo: "replyQueue12", correlationId: "test12" },
			);
			await waitUntil(async () => callback12.calledOnce);
			const response12 = await channel.get("replyQueue12");
			should(response12).not.be.false();
			response12!.properties.correlationId.should.equal("test12");

			channel.publish(
				"events",
				"device.event1.3",
				new Buffer(JSON.stringify({ a: 13 })),
				{ replyTo: "replyQueue13", correlationId: "test13" },
			);
			await waitUntil(async () => callback13.calledOnce);
			const response13 = await channel.get("replyQueue13");
			should(response13).not.be.false();
			response13!.properties.correlationId.should.equal("test13");

			channel.publish(
				"events",
				"device.event2.1",
				new Buffer(JSON.stringify({ a: 21 })),
				{ replyTo: "replyQueue21", correlationId: "test21" },
			);
			await waitUntil(async () => callback21.calledOnce);
			const response21 = await channel.get("replyQueue21");
			should(response21).not.be.false();
			response21!.properties.correlationId.should.equal("test21");

			channel.publish(
				"events",
				"device.event2.2",
				new Buffer(JSON.stringify({ a: 22 })),
				{ replyTo: "replyQueue22", correlationId: "test22" },
			);
			await waitUntil(async () => callback22.calledOnce);
			const response22 = await channel.get("replyQueue22");
			should(response22).not.be.false();
			response22!.properties.correlationId.should.equal("test22");

			channel.publish(
				"events",
				"device.event2.3",
				new Buffer(JSON.stringify({ a: 23 })),
				{ replyTo: "replyQueue23", correlationId: "test23" },
			);
			await waitUntil(async () => callback23.calledOnce);
			const response23 = await channel.get("replyQueue23");
			should(response23).not.be.false();
			response23!.properties.correlationId.should.equal("test23");

			await cancel11();
			await cancel12();
			await cancel13();
			await cancel21();
			await cancel22();
			await cancel23();
		});
	});

	describe("bindOneFailedForDeviceExpectingConfirmation", function () {

		it("should call given callback on specified event enqueued and send response message, returned by the callback", async function () {
			const channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange("events");
			await channel.deleteExchange("events_failed");
			await channel.deleteQueue("consumer1_event1_device_failed");
			await channel.deleteQueue("consumer1_event2_device_failed");
			await channel.deleteQueue("replyQueue1");
			await channel.deleteQueue("replyQueue2");
			await channel.assertExchange("events_failed", "topic");
			await channel.assertExchange("events", "topic", { alternateExchange: "events_failed" });

			const callback1 = sinon.stub().callsArg(1).resolves();
			const callback2 = sinon.stub().callsArg(1).resolves();

			const cancel1 = await bindOneFailedForDeviceExpectingConfirmation(amqpConnection, "event1", "consumer1", callback1);
			const cancel2 = await bindOneFailedForDeviceExpectingConfirmation(amqpConnection, "event2", "consumer1", callback2);

			channel.publish(
				"events",
				"device.event1.1",
				new Buffer(JSON.stringify({ a: 1 })),
				{ replyTo: "replyQueue1", correlationId: "test1" },
			);
			await waitUntil(async () => callback1.calledOnce);
			const response1 = await channel.get("replyQueue1");
			should(response1).not.be.false();
			response1!.properties.correlationId.should.equal("test1");

			channel.publish(
				"events",
				"device.event2.2",
				new Buffer(JSON.stringify({ a: 2 })),
				{ replyTo: "replyQueue2", correlationId: "test2" },
			);
			await waitUntil(async () => callback2.calledOnce);
			const response2 = await channel.get("replyQueue2");
			should(response2).not.be.false();
			response2!.properties.correlationId.should.equal("test2");

			await cancel1();
			await cancel2();
		});
	});

	describe('purgeOne', function () {

		it('should purge all events of given type from given destination for a given consumer type', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteExchange('events_failed');
			await channel.deleteQueue('consumer1_event1');
			await channel.assertExchange('events_failed', "topic");
			await channel.assertExchange('events', "topic", { alternateExchange: "events_failed" });
			await channel.assertQueue('consumer1_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer1_event1',
			});
			await channel.bindQueue('consumer1_event1', 'events', 'event.event1');

			channel.publish('events', 'event1', new Buffer(JSON.stringify(createEvent('event1', 1))));
			await purgeOne(amqpConnection, 'event1', 'consumer1');
			await channel.assertQueue('consumer1_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer1_event1',
			});
			const message1 = await channel.get('consumer1_event1');
			should(message1).false();
		});
	});

	describe('deleteMore', function () {

		it('should delete all events queues of given types from given destination for a given consumer type', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteExchange('events');
			await channel.deleteExchange('events_failed');
			await channel.deleteQueue('consumer1_event1');
			await channel.deleteQueue('consumer2_event1');
			await channel.assertExchange('events_failed', "topic");
			await channel.assertExchange('events', "topic", { alternateExchange: "events_failed" });
			await channel.assertQueue('consumer1_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer1_event1',
			});
			await channel.assertQueue('consumer2_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer2_event1',
			});
			await channel.bindQueue('consumer1_event1', 'events', 'event.event1');
			await channel.bindQueue('consumer2_event1', 'events', 'event.event1');

			channel.publish('events', 'event1', new Buffer(JSON.stringify(createEvent('event1', 1))));
			await deleteMore(amqpConnection, ['event1'], 'consumer1');
			await channel.assertQueue('consumer1_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer1_event1',
			});
			const message1 = await channel.get('consumer1_event1');
			should(message1).false();

			channel.publish('events', 'event1', new Buffer(JSON.stringify(createEvent('event1', 2))));
			await deleteMore(amqpConnection, ['event1'], 'consumer2');
			await channel.assertQueue('consumer2_event1', {
				deadLetterExchange: '',
				deadLetterRoutingKey: '__rejected.consumer2_event1',
			});
			const message2 = await channel.get('consumer2_event1');
			should(message2).false();

			const randomValue = generateUniqueHash();
			await deleteMore(amqpConnection, ['event1'], `consumerNotExisting${randomValue}`);
			await deleteMore(amqpConnection, ['event1'], `consumerNotExisting${randomValue}`);
			await channel.assertQueue(`consumerNotExisting${randomValue}_event1`, {
				deadLetterExchange: '',
				deadLetterRoutingKey: `__rejected.consumerNotExisting${randomValue}_event1`,
			});
			const message3 = await channel.get(`consumerNotExisting${randomValue}_event1`);
			should(message3).false();
		});
	});
});
