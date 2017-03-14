
import { Client, Message } from 'amqp10';
import { Rejected } from 'amqp10/lib/types/delivery_state';
import ICommand from './ICommand';

const QUEUE_NAME = 'commands';

export async function enqueue(client: Client, command: ICommand) {
	const queueName = QUEUE_NAME;
	const sender = await client.createSender(queueName);
	const state = await sender.send(command);
	await sender.detach({ closed: false });
	if (state instanceof Rejected) {
		throw new Error(state.inspect());
	}
}

export async function bindAll(client: Client, onCommand: (command: ICommand) => Promise<void>) {
	const queueName = QUEUE_NAME;
	const receiver = await client.createReceiver(queueName);
	receiver.on('message', async (message: Message) => {
		try {
			const command = message.body;
			await onCommand(command);
			receiver.accept(message);
		} catch (error) {
			console.error(error);
			receiver.reject(message);
		}
	});
	receiver.on('errorReceived', (error: Error) => console.error(error));
	receiver.attach();
}
