import * as should from 'should';
import * as sinon from 'sinon';
import { Channel } from 'amqplib';
import {
	enqueue,
	process,
	bindAll,
	fetchNext,
	purgeAll,
	deleteAll,
	fetchNextAutoSnapshot,
} from '../../../../src/AMQP/CQRS/commandQueue';
import waitUntil from '../../../../src/DateTime/waitUntil';
import wait from '../../../../src/Timer/wait';
import {
	amqpConnection,
} from '../../connections';

describe('AMQP.CQRS.commandQueue', function () {

	before(async function () {
		this.amqplibConnection = await amqpConnection.pool.acquire();
	});

	after(async function () {
		await amqpConnection.pool.release(this.amqplibConnection);
	});

	describe('enqueue', function () {

		it('should publish command to commands exchange and routing key commands', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('commands');
			await channel.assertExchange('commands', 'topic');
			await fetchNext(amqpConnection);

			let resultMessage: any;
			const { consumerTag } = await channel.consume('commands', (message: any) => {
				channel.ack(message);
				resultMessage = message;
			});

			const command = {
				id: null,
				type: 'test',
				sourceUid: 'test',
				receivedAt: new Date(),
				payload: {
					type: 'test',
					a: 1,
				},
			};

			await enqueue(amqpConnection, command);
			await waitUntil(async () => resultMessage);

			JSON.parse(resultMessage.content.toString()).should.deepEqual({
				...command,
				receivedAt: command.receivedAt.toISOString(),
			});

			await channel.cancel(consumerTag);
		});
	});

	describe('process', function () {

		it('should enqueue command and receive a correct response', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('commands');
			await channel.assertExchange('commands', 'topic');
			await fetchNext(amqpConnection);

			const { consumerTag } = await channel.consume('commands', (message: any) => {
				channel.ack(message);
				if (message.properties.replyTo) {
					const content = JSON.parse(message.content.toString());
					channel.sendToQueue(
						message.properties.replyTo,
						new Buffer(JSON.stringify({ response: content })),
						{ correlationId: message.properties.correlationId },
					);
				}
			});

			const command = {
				id: null,
				type: 'test',
				sourceUid: 'test',
				receivedAt: new Date(),
				payload: {
					type: 'test',
					b: 2,
				},
			};

			const response = await process(amqpConnection, command);
			response.should.deepEqual({ response: command });
			await channel.cancel(consumerTag);
		});
	});

	describe('bindAll', function () {

		it('should call a given callback everytime with an enqueued command', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('commands');
			await channel.assertExchange('commands', 'topic');
			await fetchNext(amqpConnection);

			const bindCallback = sinon.spy();
			const cancelBindAll = await bindAll(amqpConnection, bindCallback);

			const createCommand = (receivedAt: Date, payload: object) => ({
				id: null,
				type: 'test',
				sourceUid: 'test',
				receivedAt,
				payload: {
					type: 'test',
					...payload,
				},
			});

			const command1 = createCommand(new Date(2018, 0, 1), { a: 1 });
			const command2 = createCommand(new Date(2018, 0, 2), { b: 2 });
			const command3 = createCommand(new Date(2018, 0, 3), { c: 3 });

			channel.sendToQueue('commands', new Buffer(JSON.stringify(command1)));
			await waitUntil(async () => bindCallback.withArgs(command1).calledOnce);
			channel.sendToQueue('commands', new Buffer(JSON.stringify(command2)));
			await waitUntil(async () => bindCallback.withArgs(command2).calledOnce);
			channel.sendToQueue('commands', new Buffer(JSON.stringify(command3)));
			await waitUntil(async () => bindCallback.withArgs(command3).calledOnce);
			bindCallback.callCount.should.equal(3);
			await cancelBindAll();
		});
	});

	describe('fetchNext', function () {

		it('should fetch next command', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('commands');
			await channel.assertExchange('commands', 'topic');
			await fetchNext(amqpConnection);

			const command = {
				id: null,
				type: 'test',
				sourceUid: 'test',
				receivedAt: new Date(),
				payload: {
					type: 'test',
					c: 3,
				},
			};

			channel.sendToQueue('commands', new Buffer(JSON.stringify(command)));

			let result: any;
			await waitUntil(async () => {
				result = await fetchNext(amqpConnection);
				return result;
			});

			result.should.deepEqual(command);
		});
	});

	describe('purgeAll', function () {

		it('should purge all commands from the queue', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('commands');
			await channel.deleteQueue('auto_snapshots');
			await channel.assertExchange('commands', 'topic');
			await fetchNext(amqpConnection);
			await fetchNextAutoSnapshot(amqpConnection);

			const createCommand = (payload: object) => ({
				id: null,
				type: 'test',
				sourceUid: 'test',
				receivedAt: new Date(),
				payload: {
					type: 'test',
					...payload,
				},
			});

			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 1 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 2 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 3 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 4 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 5 }))));

			await wait(500);
			await purgeAll(amqpConnection);
			const command = await fetchNext(amqpConnection);
			should(command).be.null();

			const nextCommand = await channel.get('commands');
			if (nextCommand) {
				console.log(JSON.parse((nextCommand as any).content.toString()));
			}
			should(nextCommand).be.false();
		});
	});

	describe('deleteAll', function () {

		it('should delete all commands queues', async function () {
			const channel: Channel = await this.amqplibConnection.createChannel();
			await channel.deleteQueue('commands');
			await channel.deleteQueue('auto_snapshots');
			await channel.assertExchange('commands', 'topic');
			await fetchNext(amqpConnection);
			await fetchNextAutoSnapshot(amqpConnection);

			const createCommand = (payload: object) => ({
				id: null,
				type: 'test',
				sourceUid: 'test',
				receivedAt: new Date(),
				payload: {
					type: 'test',
					...payload,
				},
			});

			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 1 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 2 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 3 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 4 }))));
			channel.sendToQueue('commands', new Buffer(JSON.stringify(createCommand({ a: 5 }))));

			await wait(500);
			await deleteAll(amqpConnection);
			const command = await fetchNext(amqpConnection);
			should(command).be.null();

			const nextCommand = await channel.get('commands');
			if (nextCommand) {
				console.log(JSON.parse((nextCommand as any).content.toString()));
			}
			should(nextCommand).be.false();
		});
	});
});
