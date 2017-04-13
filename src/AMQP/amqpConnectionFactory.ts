
import * as amqp from 'amqplib';
import wait from '../Timer/wait';
const genericPool = require('../../node_modules/generic-pool');

export interface IDestroyable {
	_destroying: boolean;
}

export interface IAMQPPool {
	acquire(priority?: number): Promise<amqp.Connection & IDestroyable>;
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
				const connection = await amqp.connect(dsn) as amqp.Connection & IDestroyable;
				connection.on('error', (error: Error) => {
					if (!connection._destroying) {
						/* tslint:disable-next-line */
						pool.destroy(connection);
					}
					throw error;
				});
				connection.on('close', () => {
					console.info('AMQP closed connection');
					if (!connection._destroying) {
						/* tslint:disable-next-line */
						pool.destroy(connection);
					}
				});
				return connection;
			} catch (error) {
				console.log(`Connect AMQP failed. Retry after ${retryConnectTimeout} ms`);
				await wait(retryConnectTimeout);
				return factory.create();
			}
		},
		async destroy(connection: amqp.Connection) {
			(connection as any as IDestroyable)._destroying = true;
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
