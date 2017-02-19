
import * as rethinkdb from 'rethinkdb';

export interface IRethinkDBConnection {
	connection: rethinkdb.Connection;
	connect: () => Promise<void>;
	close: () => void;
}

export function createRethinkDBConnection(rethinkDsn: string): IRethinkDBConnection {
	const self = {
		connection: null,
		connect: async function (){
			self.connection = await rethinkdb.connect(rethinkDsn);
		},
		close: () => {
			self.connection.close();
		}
	} as IRethinkDBConnection;
	return self;
}
