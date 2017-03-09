
import { Client, Message } from 'amqp10';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';

export async function enqueue(client: Client, command: ICommand) {
	const queueName = QUEUE_NAME;
	const sender = await client.createSender(queueName);
	await sender.send(command);
	await sender.detach();
}

export async function bindAll(client: Client, onCommand: (command: ICommand) => Promise<void>) {
	const queueName = QUEUE_NAME;
	const reciever = await client.createReceiver(queueName);
	reciever.on('message', async (message: Message) => {
		try {
			const command = message.body;
			await onCommand(command);
			reciever.accept(message);
		} catch (error) {
			console.error(error);
			reciever.reject(message);
		}
	});
	reciever.on('errorReceived', (error: Error) => console.error(error));
}
