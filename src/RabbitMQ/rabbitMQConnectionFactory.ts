
import * as amqp from 'amqplib';
const co = require('co');

export interface IRabbitMQConnection {
	connection: amqp.Connection;
	connect: () => Promise<void>;
	close: () => void;
}

export function createRabbitMQConnection(rabbitMQDsn: string): IRabbitMQConnection {
	const rabbitConnection: IRabbitMQConnection = {
		connection: null,
		connect: () => {
			return co(function* () {
				const connection: amqp.Connection = yield amqp.connect(rabbitMQDsn);
				rabbitConnection.connection = connection;
			});
		},
		close: () => {
			rabbitConnection.connection.close();
		}
	};
	return rabbitConnection;
}
