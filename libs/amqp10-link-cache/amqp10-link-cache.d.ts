
declare module 'amqp10-link-cache' {
	import { Client } from 'amqp10';

	interface ILinkCacheOptions {
		ttl?: number;
	}

	namespace linkCache {}

	function linkCache(options?: ILinkCacheOptions): (client: typeof Client) => void;

	export = linkCache;
}

declare module 'amqp10' {
	namespace Policy {
		interface SenderLink {
			bypassCache?: boolean;
		}
		interface ReceiverLink {
			bypassCache?: boolean;
		}
	}
}
