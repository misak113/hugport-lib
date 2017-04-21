
import { createHash } from 'crypto';

export function generateUniqueHash(length: number = 50) {
	const hash = createHash('sha256');
	hash.update('' + new Date().valueOf() + Math.random());
	return hash.digest('hex').substring(0, length);
}
