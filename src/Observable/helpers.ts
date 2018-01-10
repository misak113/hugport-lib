
export function mergeObservables<TValue, TError extends Error>(
	...observables: Observable<TValue, TError>[]
): Observable<TValue, TError> {
	type IObserving = {
		subscription: Subscription;
		completePromise: Promise<void>;
	};
	return new Observable((observer: SubscriptionObserver<TValue, TError>) => {
		const observings = observables.map((observable: Observable<TValue, TError>) => {
			let resolved = false;
			let resolve: () => void;
			const completePromise = new Promise<void>((doResolve: () => void) => {
				if (resolved) {
					doResolve();
				} else {
					resolve = doResolve;
				}
			});
			const subscription = observable.subscribe(
				(value: TValue) => observer.next(value),
				(error: TError) => observer.error(error),
				() => resolve ? resolve() : resolved = true,
			);

			return {
				subscription,
				completePromise,
			};
		});
		Promise.all(observings.map((observing: IObserving) => observing.completePromise)).then(() => observer.complete());
		return () => {
			observings.forEach(
				(observing: IObserving) => observing.subscription.unsubscribe()
			);
		};
	});
}
