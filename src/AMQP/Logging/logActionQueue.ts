
import { Client, Message } from 'amqp10';
import { Rejected } from 'amqp10/lib/types/delivery_state';
import IActionLog from './IActionLog';

const QUEUE_NAME = 'action_logs';

export async function enqueue(client: Client, actionLog: IActionLog) {
	const queueName = QUEUE_NAME;
	const sender = await client.createSender(queueName);
	const state = await sender.send(actionLog);
	await sender.detach({ closed: false });
	if (state instanceof Rejected) {
		throw new Error(state.inspect());
	}
}

export async function bindAll(client: Client, onActionLog: (actionLog: IActionLog) => Promise<void>) {
	const queueName = QUEUE_NAME;
	const receiver = await client.createReceiver(queueName);
	receiver.on('message', async (message: Message) => {
		try {
			const actionLog = message.body;
			await onActionLog(actionLog);
			receiver.accept(message);
		} catch (error) {
			console.error(error);
			receiver.reject(message);
		}
	});
	receiver.on('errorReceived', (error: Error) => console.error(error));
	receiver.attach();
}
