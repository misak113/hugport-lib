
import * as amqp from 'amqplib';
import MemoryArrayStorage from '../Storage/MemoryArrayStorage';
import IUnqueuedMessage from './IUnqueuedMessage';
import IUnsubscribedMessage from './IUnsubscribedMessage';
import ChannelProvider from './ChannelProvider';
import QueuePublisher from './QueuePublisher';
import QueueSubscriber from './QueueSubscriber';
import IAMQPPool from './IAMQPPool';
import * as Debug from 'debug';
const genericPool = require('generic-pool');
const debug = Debug('@signageos/lib:AMQP:amqpConnectionFactory');

export interface IAMQPConnection {
	pool: IAMQPPool;
	channelProvider: ChannelProvider;
	queuePublisher: QueuePublisher;
	queueSubscriber: QueueSubscriber;
	connect: () => Promise<void>;
	close: () => Promise<void>;
}

declare module 'amqplib' {
	class Connection {
		public isClosed: boolean;
	}
}

export function createAmqpConnection(dsn: string): IAMQPConnection {
	const factory = {
		async create(): Promise<amqp.Connection> {
			debug('Create connection');
			const connection = await amqp.connect(dsn);
			connection.isClosed = false;
			connection.on('error', (error: Error) => {
				throw error;
			});
			connection.on('close', () => {
				debug('Closed connection');
				connection.isClosed = true;
			});
			return connection;
		},
		async destroy(connection: amqp.Connection) {
			debug('Destroy connection');
			if (!connection.isClosed) {
				await connection.close();
			}
		},
		async validate(connection: amqp.Connection) {
			return !connection.isClosed;
		},
	};
	const options = {
		priorityRange: 3,
		min: 1,
		max: 10,
		autostart: false,
		testOnBorrow: true,
		acquireTimeoutMillis: 1e3,
	};
	const pool = genericPool.createPool(factory, options);
	pool.on('factoryCreateError', (error: Error) => {
		throw error;
	});
	pool.on('factoryDestroyError', (error: Error) => {
		throw error;
	});
	const unqueuedMessageStorage = new MemoryArrayStorage<IUnqueuedMessage>();
	const unsubscribedMessageStorage = new MemoryArrayStorage<IUnsubscribedMessage>();
	const channelProvider = new ChannelProvider(pool);
	return {
		pool,
		channelProvider,
		queuePublisher: new QueuePublisher(channelProvider, unqueuedMessageStorage),
		queueSubscriber: new QueueSubscriber(channelProvider, unsubscribedMessageStorage),
		connect: async function () {
			debug('connect');
			const initialConnection = await pool.acquire();
			await pool.release(initialConnection);
		},
		close: async function () {
			debug('close');
			await pool.drain(() => pool.destroyAllNow());
			pool.clear();
		},
	};
}
