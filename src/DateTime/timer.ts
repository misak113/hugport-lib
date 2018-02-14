
export type HandlableFunction = (handler: (...args: any[]) => void, timeout: number) => number;

export function wait(window: { setTimeout: HandlableFunction }, timeout: number) {
	return new Promise((resolve: () => void) => window.setTimeout(resolve, timeout));
}

export function observeInterval(window: { setInterval: HandlableFunction, clearInterval: (handle: number) => void }, interval: number) {
	return new Observable((observer: SubscriptionObserver<void, Error>) => {
		const runningInterval = window.setInterval(() => observer.next(undefined), interval);
		return () => window.clearInterval(runningInterval);
	});
}
