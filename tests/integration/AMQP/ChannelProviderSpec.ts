import * as should from 'should';
import { Channel, Message } from 'amqplib';
import ChannelProvider from '../../../src/AMQP/ChannelProvider';
import { deserializeJSON } from '../../../src/JSON/jsonHelper';
import waitUntil from '../../../src/DateTime/waitUntil';
import wait from '../../../src/Timer/wait';
import {
	amqpConnection,
} from '../connections';

function decodeMessage(message: Message | boolean) {
	return message ? JSON.parse((<Message> message).content.toString(), deserializeJSON) : message;
}

describe('AMQP.ChannelProvider', function () {

	before(async function () {
		this.channelProvider = new ChannelProvider(amqpConnection.pool);
		this.amqplibConnection = await amqpConnection.pool.acquire();
	});

	after(async function () {
		await amqpConnection.pool.release(this.amqplibConnection);
	});

	describe('send', function () {

		it('should send message to specified exchange with a specified routing key', async function () {
			const rawTestChannel = await this.amqplibConnection.createChannel();
			await rawTestChannel.deleteExchange('exchange1');
			await rawTestChannel.deleteExchange('exchange2');
			await rawTestChannel.deleteQueue('queue1');
			await rawTestChannel.deleteQueue('queue2');
			await rawTestChannel.deleteQueue('queue3');
			await rawTestChannel.deleteQueue('queue4');
			await rawTestChannel.deleteQueue('queue5');
			await rawTestChannel.assertExchange('exchange1', 'topic');
			await rawTestChannel.assertExchange('exchange2', 'topic');
			await rawTestChannel.assertQueue('queue1');
			await rawTestChannel.assertQueue('queue2');
			await rawTestChannel.assertQueue('queue3');
			await rawTestChannel.assertQueue('queue4');
			await rawTestChannel.assertQueue('queue5'); // no binding
			await rawTestChannel.bindQueue('queue1', 'exchange1', 'route1');
			await rawTestChannel.bindQueue('queue2', 'exchange1', 'route1');
			await rawTestChannel.bindQueue('queue3', 'exchange1', 'route2');
			await rawTestChannel.bindQueue('queue4', 'exchange2', 'route1');

			const channelInstance = await this.channelProvider.getChannel('test', 'route1', 'exchange1');
			await channelInstance.send({ a: 1, b: 2 });
			await wait(500);

			const message1 = await rawTestChannel.get('queue1', { noAck: true });
			const message2 = await rawTestChannel.get('queue2', { noAck: true });
			const message3 = await rawTestChannel.get('queue3', { noAck: true });
			const message4 = await rawTestChannel.get('queue4', { noAck: true });
			const message5 = await rawTestChannel.get('queue5', { noAck: true });

			decodeMessage(message1).should.deepEqual({ a: 1, b: 2 });
			decodeMessage(message2).should.deepEqual({ a: 1, b: 2 });
			should(message3).be.false();
			should(message4).be.false();
			should(message5).be.false();

			await channelInstance.close();
		});
	});

	describe('sendExpectingResponse', function () {

		it('should send message and get response from a correct consumer', async function () {
			const createConsumeAndRespondCallback = (channel: Channel, response: any) => {
				return async (message: any) => {
					channel.ack(message);
					if (message.properties.replyTo) {
						const responseChannel = await this.amqplibConnection.createChannel();
						await responseChannel.sendToQueue(
							message.properties.replyTo,
							new Buffer(JSON.stringify(response)),
							{ correlationId: message.properties.correlationId },
						);
					}
				};
			};

			const rawTestChannel = await this.amqplibConnection.createChannel();
			await rawTestChannel.deleteExchange('exchange1');
			await rawTestChannel.deleteExchange('exchange2');
			await rawTestChannel.deleteQueue('queue1');
			await rawTestChannel.deleteQueue('queue2');
			await rawTestChannel.deleteQueue('queue3');
			await rawTestChannel.deleteQueue('queue4');
			await rawTestChannel.assertExchange('exchange1', 'topic');
			await rawTestChannel.assertExchange('exchange2', 'topic');
			await rawTestChannel.assertQueue('queue1');
			await rawTestChannel.assertQueue('queue2');
			await rawTestChannel.assertQueue('queue3');
			await rawTestChannel.assertQueue('queue4'); // no binding
			await rawTestChannel.bindQueue('queue1', 'exchange1', 'route1');
			await rawTestChannel.bindQueue('queue2', 'exchange1', 'route2');
			await rawTestChannel.bindQueue('queue3', 'exchange2', 'route1');
			await rawTestChannel.consume('queue1', createConsumeAndRespondCallback(rawTestChannel, { response: 1 }));
			await rawTestChannel.consume('queue2', createConsumeAndRespondCallback(rawTestChannel, { response: 2 }));
			await rawTestChannel.consume('queue3', createConsumeAndRespondCallback(rawTestChannel, { response: 3 }));
			await rawTestChannel.consume('queue4', createConsumeAndRespondCallback(rawTestChannel, { response: 4 }));

			const channelInstance = await this.channelProvider.getChannel('test', 'route1', 'exchange1');
			const response = await channelInstance.sendExpectingResponse({ c: 3, d: 4 });
			response.should.deepEqual({ response: 1 });
			await channelInstance.close();
		});
	});

	describe('consume', function () {

		it('should consume message from a queue bound to a specific exchange and routing key', async function () {
			const channelInstance = await this.channelProvider.getChannel('test', 'route1', 'exchange1');
			const consumeCallback = async (queueName: string, result: object, done: () => void) => await channelInstance.consume(
				queueName,
				async (message: any, ack: () => void) => {
					ack();
					if (JSON.stringify(message) === JSON.stringify(result)) {
						done();
					}
				},
				false,
			);

			const rawTestChannel: Channel = await this.amqplibConnection.createChannel();
			await rawTestChannel.deleteExchange('exchange1');
			await rawTestChannel.deleteExchange('exchange2');
			await rawTestChannel.deleteQueue('queue1');
			await rawTestChannel.deleteQueue('queue2');

			let done1 = false;
			let done2 = false;
			await consumeCallback('queue1', { message: 1 }, () => done1 = true);
			await consumeCallback('queue2', { message: 1 }, () => done2 = true);

			await rawTestChannel.assertExchange('exchange1', 'topic');
			await rawTestChannel.assertExchange('exchange2', 'topic');
			rawTestChannel.publish('exchange2', 'route1', new Buffer(JSON.stringify({ message: 3 })));
			rawTestChannel.publish('exchange1', 'route2', new Buffer(JSON.stringify({ message: 2 })));
			rawTestChannel.publish('exchange1', 'route1', new Buffer(JSON.stringify({ message: 1 })));

			await waitUntil(async () => done1 && done2, 100);
			await channelInstance.close();
		});

		it(
			'should consume message from a queue bound to a specific exchange and routing key ' +
			'and send response message to a queue specified in the consumed message as "replyTo" parameter',
			async function () {
				const rawTestChannel: Channel = await this.amqplibConnection.createChannel();
				await rawTestChannel.deleteExchange('exchange1');
				await rawTestChannel.deleteExchange('exchange2');
				await rawTestChannel.deleteQueue('queue1');
				await rawTestChannel.deleteQueue('replyQueue1');
				await rawTestChannel.deleteQueue('replyQueue2');
				await rawTestChannel.deleteQueue('replyQueue3');
				await rawTestChannel.deleteQueue('replyQueue4');
				await rawTestChannel.assertQueue('replyQueue1', { durable: false, autoDelete: true });
				await rawTestChannel.assertQueue('replyQueue2', { durable: false, autoDelete: true });
				await rawTestChannel.assertQueue('replyQueue3', { durable: false, autoDelete: true });
				await rawTestChannel.assertQueue('replyQueue4', { durable: false, autoDelete: true });

				const channelInstance = await this.channelProvider.getChannel('test', 'route1', 'exchange1');
				await channelInstance.consume(
					'queue1',
					async (message: any, ack: () => void) => {
						ack();
						return { response: message };
					},
					true,
				);

				await rawTestChannel.assertExchange('exchange1', 'topic');
				await rawTestChannel.assertExchange('exchange2', 'topic');
				rawTestChannel.publish(
					'exchange2',
					'route1',
					new Buffer(JSON.stringify({ message: 4 })),
					{
						correlationId: 'message4',
						replyTo: 'replyQueue4',
					},
				);
				rawTestChannel.publish(
					'exchange1',
					'route2',
					new Buffer(JSON.stringify({ message: 3 })),
					{
						correlationId: 'message3',
						replyTo: 'replyQueue3',
					},
				);
				rawTestChannel.publish(
					'exchange1',
					'route1',
					new Buffer(JSON.stringify({ message: 2 })),
					{
						correlationId: 'message2',
						replyTo: 'replyQueue2',
					},
				);
				rawTestChannel.publish(
					'exchange1',
					'route1',
					new Buffer(JSON.stringify({ message: 1 })),
					{
						correlationId: 'message1',
						replyTo: 'replyQueue1',
					},
				);

				let message1: any;
				let message2: any;
				await waitUntil(async () => message1 = await rawTestChannel.get('replyQueue1', { noAck: true }), 100);
				await waitUntil(async () => message2 = await rawTestChannel.get('replyQueue2', { noAck: true }), 100);

				message1!.content.toString().should.deepEqual(JSON.stringify({ response: { message: 1 } }));
				message2!.content.toString().should.deepEqual(JSON.stringify({ response: { message: 2 } }));

				await channelInstance.close();
			},
		);
	});
});
