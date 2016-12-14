
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
