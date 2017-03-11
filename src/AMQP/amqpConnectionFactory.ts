
import { Client, Policy } from 'amqp10';

export interface IAMQPConnection {
	client: Client;
	connect: () => Promise<void>;
	close: () => Promise<void>;
}

export function createAmqpConnection(dsn: string): IAMQPConnection {
	const client = new Client(
		Policy.Utils.RenewOnSettle(1, 1, Policy.ServiceBusQueue)
	);
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
