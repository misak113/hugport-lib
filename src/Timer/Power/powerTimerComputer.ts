
import * as moment from 'moment-timezone';
import PowerTimerSettings from './PowerTimerSettings';
import PowerTimerType from './PowerTimerType';
import PowerTimerWeekday from './PowerTimerWeekday';
import { timeToSeconds } from '../../DateTime/timeConverter';

export interface ITimerEvent {
	weekDayNumber: number;
	type: 'ON' | 'OFF';
	time: string;
}

export function shouldBeOnByTimers(allSettings: { [type: string]: PowerTimerSettings }, now: Date) {
	const timerEvents = getTimerEvents(allSettings);
	if (timerEvents.length === 0) {
		return null;
	}
	const sortedTimerEvents = orderTimerEventsByChronology(timerEvents);
	const lastTimerEvent = [...sortedTimerEvents].reverse().find(
		(timerEvent: ITimerEvent) => {
			const inNextDay = timerEvent.weekDayNumber < now.getDay();
			const isThisDay = timerEvent.weekDayNumber === now.getDay();
			const isOnTime = timeToSeconds(timerEvent.time) <= timeToSeconds(moment(now).format('HH:mm:ss'));
			return inNextDay || (isThisDay && isOnTime);
		}
	);
	return lastTimerEvent ? lastTimerEvent.type === 'ON' : [...sortedTimerEvents].reverse()[0].type === 'ON';
}

export function orderTimerEventsByChronology(timerEvents: ITimerEvent[]) {
	return timerEvents.sort(
		(a: ITimerEvent, b: ITimerEvent) =>
			(a.weekDayNumber - b.weekDayNumber) * (24 * 60 * 60) // whole day in seconds
			+ timeToSeconds(a.time)
			- timeToSeconds(b.time)
	);
}

export function getTimerEvents(allSettings: { [type: string]: PowerTimerSettings }) {
	return Object.keys(allSettings).reduce(
		(timerEvents: ITimerEvent[], type: PowerTimerType) => {
			const settings: { [key: string]: any } = allSettings[type];
			const newTimerEventsForTimer: ITimerEvent[] = Object
				.keys(PowerTimerWeekday)
				.map((index: string) => PowerTimerWeekday[index as any])
				.reduce(
				(newTimerEvents: ITimerEvent[], weekDay: keyof typeof PowerTimerWeekday, weekDayNumber: number) => {
					if (settings[weekDay]) {
						const newTimerEventsInDay: ITimerEvent[] = [];
						if (settings.timeOn) {
							newTimerEventsInDay.push({
								weekDayNumber,
								type: 'ON',
								time: settings.timeOn,
							});
						}
						if (settings.timeOff) {
							newTimerEventsInDay.push({
								weekDayNumber,
								type: 'OFF',
								time: settings.timeOff,
							});
						}
						return [
							...newTimerEvents,
							...newTimerEventsInDay,
						];
					} else {
						return newTimerEvents;
					}
				},
				[]
			);
			return [...timerEvents, ...newTimerEventsForTimer];
		},
		[],
	);
}
