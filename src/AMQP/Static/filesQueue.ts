
import * as fs from 'fs';
import { IAMQPConnection } from '../amqpConnectionFactory';
import { deserializeJSON } from '../../JSON/jsonHelper';
import { Message } from 'amqplib';
import * as Debug from 'debug';
const debug = Debug('@signageos/lib:AMQP:Static:filesQueue');

export interface IFileFilter {
	startsWith?: string;
	createdAtBefore?: Date;
}

export async function saveFile(amqpConnection: IAMQPConnection, fileName: string, filePath: string) {
	const fileBuffer = await new Promise((resolve: (fileBuffer: Buffer) => void, reject: (error: Error) => void) => fs.readFile(
		filePath,
		(error: Error, data: Buffer) => error ? reject(error) : resolve(data)),
	);
	await saveFileBuffer(amqpConnection, fileName, fileBuffer);
}

export async function saveFileBuffer(amqpConnection: IAMQPConnection, fileName: string, fileBuffer: Buffer) {
	const connection = await amqpConnection.pool.acquire();
	try {
		const channel = await connection.createChannel();
		channel.sendToQueue('static.files.upload', fileBuffer, { headers: { fileName } });
		await channel.close();
	} finally {
		await amqpConnection.pool.release(connection);
	}
}

export async function deleteByFilter(amqpConnection: IAMQPConnection, filter: IFileFilter) {
	const connection = await amqpConnection.pool.acquire();
	try {
		const channel = await connection.createChannel();
		channel.sendToQueue('static.files.delete_more', new Buffer(JSON.stringify(filter)));
		await channel.close();
	} finally {
		await amqpConnection.pool.release(connection);
	}
}

export async function bindDeleteByFilter(
	amqpConnection: IAMQPConnection,
	onDelete: (filter: IFileFilter, ack: () => void, nack: () => void) => void,
) {
	const queueName = 'static.files.delete_more';
	const connection = await amqpConnection.pool.acquire();
	const channel = await connection.createChannel();
	try {
		const { queue, messageCount, consumerCount } = await channel.assertQueue(queueName, {
			maxPriority: 10,
			durable: true,
		});
		debug('asserted queue', { queue, messageCount, consumerCount });

		const { consumerTag } = await channel.consume(
			queueName,
			(message: Message) => {
				const filter = JSON.parse(message.content.toString(), deserializeJSON);
				onDelete(filter, () => channel.ack(message), () => channel.nack(message));
			},
		);
		return async () => {
			await channel.cancel(consumerTag);
			await channel.close();
			await amqpConnection.pool.release(connection);
		};
	} catch (error) {
		await channel.close();
		await amqpConnection.pool.release(connection);
		throw error;
	}
}
