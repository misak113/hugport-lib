import * as redis from 'redis';

export interface IRedisConnection {
	connection: redis.RedisClient;
	connect: () => Promise<void>;
	close: () => void;
}

export function createRedisConnection(redisDsn: string): IRedisConnection {
	const connection = redis.createClient(redisDsn);
	return {
		connection,
		connect: () => {
			connection.on('error', function (error: any) {
				console.error(error);
			});

			return Promise.resolve();
		},
		close: () => {
			connection.quit();
		},
	} as IRedisConnection;
}
