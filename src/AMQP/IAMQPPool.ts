
import { Connection } from 'amqplib';

export default IAMQPPool;
interface IAMQPPool {
	acquire(priority?: number): Promise<Connection>;
	release(connection: Connection): Promise<void>;
	destroy(connection: Connection): Promise<void>;
}
