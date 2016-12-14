
declare module 'rollbar-browser' {
	export function init(config: any): IRollbar;

	export interface IRollbar {
		critical(message: string, payload?: any): any;
		error(message: string, payload ?: any): any;
		warning(message: string, payload ?: any): any;
		info(message: string, payload ?: any): any;
		debug(message: string, payload?: any): any;
	}
}
