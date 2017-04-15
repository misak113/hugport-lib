
import { Connection } from 'rethinkdb';
import IBasePool from '../Pool/IBasePool';

export default IRethinkDBPool;
interface IRethinkDBPool extends IBasePool<Connection> {}
