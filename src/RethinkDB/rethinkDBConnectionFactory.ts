
import * as rethinkdb from 'rethinkdb';
import { parse } from 'url';
import IRethinkDBPool from './IRethinkDBPool';
import * as Debug from 'debug';
const genericPool = require('generic-pool');
const debug = Debug('@signageos/lib:RethinkDB:rethinkDBConnectionFactory');

export interface IRethinkDBConnection {
	pool: IRethinkDBPool;
	connect: () => Promise<void>;
	close: () => void;
}

export function createRethinkDBConnection(rethinkDsn: string): IRethinkDBConnection {
	const url = parse(rethinkDsn);
	const credentials = url.auth && url.auth.split(':');
	const connectionOptions: rethinkdb.ConnectionOptions = {
		host: url.hostname,
		port: url.port ? parseInt(url.port) : undefined,
		db: url.pathname ? url.pathname.substr(1) : undefined,
		user: credentials && credentials[0],
		password: credentials && credentials[1],
	};
	const factory = {
		async create(): Promise<rethinkdb.Connection> {
			debug('Create connection');
			const connection = await rethinkdb.connect(connectionOptions);
			connection.on('error', (error: Error) => {
				throw error;
			});
			connection.on('close', () => {
				debug('Closed connection');
			});
			return connection;
		},
		async destroy(connection: rethinkdb.Connection) {
			debug('Destroy connection');
			await connection.close();
		},
		async validate(connection: rethinkdb.Connection) {
			return connection.open;
		},
	};
	const options = {
		priorityRange: 3,
		min: 1,
		max: 10e3,
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
		connect: async function (){
			debug('connect');
			const initialConnection = await pool.acquire();
			await pool.release(initialConnection);
		},
		close: async () => {
			debug('close');
			await pool.drain();
			pool.clear();
		},
	};
}
