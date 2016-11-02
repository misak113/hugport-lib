
import * as pgPromise from 'pg-promise';

export interface IPostgreSqlConnection {
	connection: pgPromise.IDatabase<any>;
	connect: () => Promise<void>;
	close: () => void;
}

export function createPostgreSqlConnection(postgreDsn: string): IPostgreSqlConnection {
	const pgp = pgPromise({});
	const connection = pgp(postgreDsn);
	return {
		connection,
		connect: () => {
			return Promise.resolve();
		},
		close: () => {
			pgp.end();
		}
	} as IPostgreSqlConnection;
}
