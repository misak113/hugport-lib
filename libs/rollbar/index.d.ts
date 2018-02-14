
declare module 'rollbar' {

	export type TLevels = 'critical' | 'error' | 'warning' | 'info' | 'debug';

	export interface IConfig {
		branch?: string;
		codeVersion?: string;
		endpoint?: string;
		environment?: string;
		host?: string;
		root?: string;
		scrubFields?: string[];
		scrubHeaders?: string[];
		minimumLevel?: TLevels;
		enabled?: boolean;
	}

	export function init(postServerItemToken: string, config?: IConfig): any;
	export function handleUncaughtExceptions(postServerItemToken: string, config?: IConfig): any;
	export function handleError(error: any, request: any, callback: (error: Error) => void): any;
	export function handleError(error: any, callback: (error: Error) => void): any;
	export function handleError(error: any, request: any): any;
	export function handleErrorWithPayloadData(error: any, data: any, request: any, callback: (error: Error) => void): any;
	export function handleErrorWithPayloadData(error: any, data: any, request: any): any;
	export function handleErrorWithPayloadData(error: any, data: any, callback: (error: Error) => void): any;
	export function handleErrorWithPayloadData(error: any, data: any): any;
	export function handleError(error: any): any;
	export function reportMessage(message: string, level: string): any;
	export function reportMessage(
		message: string,
		level: TLevels,
		request?: any,
		callback?: (error: Error) => void
	): any;
	export function reportMessageWithPayloadData(
		message: string,
		data: {
			level?: TLevels,
			custom?: any
		},
		request?: any,
		callback?: (error: Error) => void
	): any;
}
