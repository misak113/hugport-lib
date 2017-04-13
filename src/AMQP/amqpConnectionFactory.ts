
import * as amqp from 'amqplib';
import wait from '../Timer/wait';
const genericPool = require('generic-pool');

export interface IAMQPPool {
	acquire(priority?: number): Promise<amqp.Connection>;
	release(connection: amqp.Connection): Promise<void>;
	destroy(connection: amqp.Connection): Promise<void>;
}

export interface IAMQPConnection {
	pool: IAMQPPool;
	connect: () => Promise<void>;
	close: () => Promise<void>;
}

export function createAmqpConnection(dsn: string): IAMQPConnection {
	const retryConnectTimeout = 1000;
	const factory = {
		async create(): Promise<amqp.Connection> {
			try {
				const connection = await amqp.connect(dsn) as amqp.Connection;
				connection.on('error', (error: Error) => {
					console.error('AMQP error connection', error);
				});
				connection.on('close', () => {
					console.info('AMQP closed connection');
				});
				return connection;
			} catch (error) {
				console.log(`Connect AMQP failed. Retry after ${retryConnectTimeout} ms`);
				await wait(retryConnectTimeout);
				return await factory.create();
			}
		},
		async destroy(connection: amqp.Connection) {
			await connection.close();
		},
	};
	const options = {
		priorityRange: 3,
		min: 1,
		max: 10,
		autostart: false,
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
