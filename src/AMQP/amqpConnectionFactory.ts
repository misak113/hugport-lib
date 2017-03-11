
import { Client, Policy, Constants } from 'amqp10';

export interface IAMQPConnection {
	client: Client;
	connect: () => Promise<void>;
	close: () => Promise<void>;
}

export function createAmqpConnection(dsn: string): IAMQPConnection {
	const client = new Client({
		receiverLink: {
			attach: {
				receiverSettleMode: Constants.receiverSettleMode.settleOnDisposition,
			},
		},
	});
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
