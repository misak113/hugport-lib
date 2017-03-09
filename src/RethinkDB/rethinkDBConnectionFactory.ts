
import * as rethinkdb from 'rethinkdb';
import { parse } from 'url';

export interface IRethinkDBConnection {
	connection: rethinkdb.Connection;
	connect: () => Promise<void>;
	close: () => void;
}

export function createRethinkDBConnection(rethinkDsn: string): IRethinkDBConnection {
	const url = parse(rethinkDsn);
	const credentials = url.auth && url.auth.split(':');
	const options = {
		host: url.hostname,
		port: url.port,
		db: url.pathname.substr(1),
		username: credentials && credentials[0],
		password: credentials && credentials[1],
	};
	const self = {
		connection: null,
		connect: async function (){
			self.connection = await rethinkdb.connect(options);
		},
		close: () => {
			self.connection.close();
		}
	} as IRethinkDBConnection;
	return self;
}
