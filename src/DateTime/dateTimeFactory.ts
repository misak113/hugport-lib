
import * as moment from 'moment';

export function now(timezone?: number) {
	if (!timezone) {
		timezone = getCurrentTimezone();
	}
	return moment().subtract(getCurrentTimezone(), 'hour').add(timezone, 'hour');
}

export function getCurrentTimezone() {
	return - (new Date().getTimezoneOffset() / 60);
}
