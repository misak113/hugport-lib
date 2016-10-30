
import * as amqp from 'amqplib';

export interface IRabbitMQConnection {
	connection: amqp.Connection;
	connect: () => void;
	close: () => void;
}

export function createRabbitMQConnection(rabbitMQDsn: string): IRabbitMQConnection {
	const rabbitConnection: IRabbitMQConnection = {
		connection: null,
		connect: () => {
			amqp.connect(rabbitMQDsn)
				.then((connection: amqp.Connection) => rabbitConnection.connection = connection)
				.catch((error: Error) => {
					throw error;
				});
		},
		close: () => {
			rabbitConnection.connection.close();
		}
	};
	return rabbitConnection;
}
