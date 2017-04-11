
import * as amqp from 'amqplib';

export interface IAMQPConnection {
	client: amqp.Connection;
	connect: () => Promise<void>;
	close: () => Promise<void>;
}

export function createAmqpConnection(dsn: string): IAMQPConnection {
	const amqpConnection: IAMQPConnection = {
		client: null as any,
		connect: async function () {
			const client: amqp.Connection = await amqp.connect(dsn);
			client.on('error', (error: Error) => console.error(error));
			amqpConnection.client = client;
		},
		close: async function () {
			await amqpConnection.client.close();
		},
	};
	return amqpConnection;
}
