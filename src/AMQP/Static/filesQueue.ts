
import * as fs from 'fs';
import { IAMQPConnection } from '../amqpConnectionFactory';

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
	} finally {
		await amqpConnection.pool.release(connection);
	}
}
