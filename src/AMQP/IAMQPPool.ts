
import { Connection } from 'amqplib';
import IBasePool from '../Pool/IBasePool';

export default IAMQPPool;
interface IAMQPPool extends IBasePool<Connection> {}
