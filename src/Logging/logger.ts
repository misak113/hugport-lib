/// <reference path="../../libs/raven/raven-node.d.ts" />

import * as Raven from 'raven';

export function useRollbarLogging(rollbar: any) {
	// override default console logging
	const consoleWarn = console.warn;
	const consoleError = console.error;
	console.warn = (message?: any, ...optionalParams: any[]) => {
		consoleWarn.call(console, message, ...optionalParams);
		rollbar.reportMessageWithPayloadData(
			typeof message === 'string' ? message : (typeof message === 'object' && (message.message || message.name || 'unknown')),
			{ level: 'warning', custom: { message, optionalParams } }
		);
	};
	console.error = (message?: any, ...optionalParams: any[]) => {
		consoleError.call(console, message, ...optionalParams);
		rollbar.reportMessageWithPayloadData(
			typeof message === 'string' ? message : (typeof message === 'object' && (message.message || message.name || 'unknown')),
			{ level: 'error', custom: { message, optionalParams } }
		);
	};
}

export function useRavenLogging() {
	// override default console logging
	const consoleWarn = console.warn;
	const consoleError = console.error;
	console.warn = (message?: any, ...optionalParams: any[]) => {
		consoleWarn.call(console, message, ...optionalParams);
		captureRaven('warning', 'warn', message, ...optionalParams);
	};
	console.error = (message?: any, ...optionalParams: any[]) => {
		consoleError.call(console, message, ...optionalParams);
		captureRaven('error', 'error', message, ...optionalParams);
	};
}

function captureRaven(level: string, source: string, message: any, ...optionalParams: any[]) {
	const options = {
		level,
		tags: {
			source,
		},
		extra: optionalParams,
	};
	if (message instanceof Error) {
		Raven.captureException(message, options);
	} else {
		if (typeof message === 'string') {
			message = message;
		} else {
			message = JSON.stringify(message);
		}
		Raven.captureMessage(message, options);
	}
}
