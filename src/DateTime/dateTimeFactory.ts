
import * as moment from 'moment-timezone';

export function now(timezoneOffsetHours?: number) {
	if (!timezoneOffsetHours) {
		timezoneOffsetHours = getCurrentTimezone();
	}
	return moment().subtract(getCurrentTimezone(), 'hour').add(timezoneOffsetHours, 'hour');
}

export function getCurrentTimezone() {
	return - (new Date().getTimezoneOffset() / 60);
}
