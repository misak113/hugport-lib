
import * as moment from 'moment-timezone';

export function getPosixStringForCurrentYear(timezone: string) {
	const jan = moment.tz({month: 0, day: 1}, timezone);
	const jun = moment.tz({month: 5, day: 1}, timezone);
	const janOffset = jan.utcOffset();
	const junOffset = jun.utcOffset();
	const stdOffset = Math.min(janOffset, junOffset);
	const dltOffset = Math.max(janOffset, junOffset);
	const std = stdOffset === janOffset ? jan : jun;
	const dlt = dltOffset === janOffset ? jan : jun;

	let s = formatAbbreviationForPosix(std).concat(formatOffsetForPosix(stdOffset));

	if (stdOffset !== dltOffset) {
		s = s.concat(formatAbbreviationForPosix(dlt));
		if (dltOffset !== stdOffset + 60) {
			s = s.concat(formatOffsetForPosix(dltOffset));
		}

		s = s.concat(',').concat(formatTransitionForPosix(timezone, std));
		s = s.concat(',').concat(formatTransitionForPosix(timezone, dlt));
	}

	return s;
}

function formatAbbreviationForPosix(dateMoment: moment.Moment) {
	const a = dateMoment.format('z');
	return /^[\+\-\d]+$/.test(a) ? '<'.concat(a).concat('>') : a;
}

function formatOffsetForPosix(offset: number) {
	// tslint:disable-next-line
	const h = -offset / 60 | 0;
	const m = Math.abs(offset % 60);
	return h + (m === 0 ? '' : ':'.concat(m < 10 ? '0' : '').concat(m.toString()));
}

function formatTransitionForPosix(timezone: string, dateMoment: moment.Moment) {
	const zone = moment.tz.zone(timezone);
	const ts = zone.untils[(zone as any)._index(dateMoment)];
	if (!isFinite(ts)) {
		return "J365/25";
	}
	const transition = moment(ts).utcOffset(-zone.offset(ts - 1));
	// tslint:disable-next-line
	const n = transition.date() / 7 | 0 + 1;
	let s = transition.format('[M]M.[n].d').replace('n', n.toString());
	const time = transition.format('[/]H:mm:ss').replace(/\:00$/, '').replace(/\:00$/, '');
	if (time !== '/2') {
		s = s.concat(time);
	}
	return s;
}
