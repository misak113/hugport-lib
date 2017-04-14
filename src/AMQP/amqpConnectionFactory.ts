
import * as amqp from 'amqplib';
import IAMQPPool from './IAMQPPool';
const genericPool = require('generic-pool');

export interface IAMQPConnection {
	pool: IAMQPPool;
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
			const connection = await amqp.connect(dsn);
			connection.isClosed = false;
			connection.on('error', (error: Error) => {
				console.error('AMQP error connection', error);
			});
			connection.on('close', () => {
				console.info('AMQP closed connection');
				connection.isClosed = true;
			});
			return connection;
		},
		async destroy(connection: amqp.Connection) {
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
	return {
		pool,
		connect: async function () {
			const initialConnection = await pool.acquire();
			await pool.release(initialConnection);
		},
		close: async function () {
			await pool.drain();
			pool.clear();
		},
	};
}
