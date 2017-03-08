
import * as amqp from 'amqp10';

export interface IAMQPConnection {
	client: amqp.Client;
	connect: () => Promise<void>;
	close: () => Promise<void>;
}

export function createAmqpConnection(dsn: string): IAMQPConnection {
	const client: amqp.Client = new amqp.Client();
	client.on('error', (error: Error) => console.error(error));
	const amqpConnection: IAMQPConnection = {
		client,
		connect: async function () {
			await client.connect(dsn);
		},
		close: async function () {
			await client.disconnect();
		},
	};
	return amqpConnection;
}
