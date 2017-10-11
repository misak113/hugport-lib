
import * as assert from 'assert';
import * as moment from 'moment';
import TimerSettings from '../../../../src/Timer/Power/PowerTimerSettings';
import {
	shouldBeOnByTimers,
	orderTimerEventsByChronology,
	getTimerEvents,
	ITimerEvent,
} from '../../../../src/Timer/Power/powerTimerComputer';
import TimerWeekday from '../../../../src/Timer/Power/PowerTimerWeekday';

describe('Timer.Power.powerTimerComputer', function () {

	describe('orderTimerEventsByChronology', function () {

		const timerEvent1: ITimerEvent = {
			weekDayNumber: 0,
			type: 'ON',
			time: '00:30:00',
		};
		const timerEvent2: ITimerEvent = {
			weekDayNumber: 0,
			type: 'OFF',
			time: '12:01:00',
		};
		const timerEvent3: ITimerEvent = {
			weekDayNumber: 2,
			type: 'ON',
			time: '23:59:00',
		};
		const timerEvent4: ITimerEvent = {
			weekDayNumber: 3,
			type: 'OFF',
			time: '00:00:00',
		};
		const timerEvent5: ITimerEvent = {
			weekDayNumber: 5,
			type: 'ON',
			time: '12:00:00',
		};
		const timerEvent6: ITimerEvent = {
			weekDayNumber: 6,
			type: 'OFF',
			time: '12:00:00',
		};

		it('should return sorted list of timer events', function () {
			const timerEvents: ITimerEvent[] = [
				timerEvent3,
				timerEvent4,
				timerEvent2,
				timerEvent6,
				timerEvent5,
				timerEvent1,
			];
			assert.deepStrictEqual(orderTimerEventsByChronology(timerEvents), [
				timerEvent1,
				timerEvent2,
				timerEvent3,
				timerEvent4,
				timerEvent5,
				timerEvent6,
			]);
		});
	});

	const dummyTimerSettings = {
		level: 'PROPRIETARY',
		volume: 0,
		onAtHoliday: false,
		offAtHoliday: false,
	};

	const timerSettings: { [type: string]: TimerSettings } = {
		TIMER_1: {
			...dummyTimerSettings,
			type: 'TIMER_1',
			timeOn: '07:30:00',
			timeOff: '17:30:00',
			sun: false,
			mon: true,
			tue: true,
			wed: true,
			thu: true,
			fri: false,
			sat: false,
		} as TimerSettings,
		TIMER_2: {
			...dummyTimerSettings,
			type: 'TIMER_2',
			timeOn: '09:00:00',
			timeOff: '16:00:00',
			sun: false,
			mon: false,
			tue: false,
			wed: false,
			thu: false,
			fri: true,
			sat: false,
		} as TimerSettings,
		TIMER_3: {
			...dummyTimerSettings,
			type: 'TIMER_3',
			timeOn: '12:00:00',
			timeOff: '15:00:00',
			sun: true,
			mon: false,
			tue: false,
			wed: false,
			thu: false,
			fri: false,
			sat: true,
		} as TimerSettings,
		TIMER_6: {
			...dummyTimerSettings,
			type: 'TIMER_6',
			timeOn: '08:00:00',
			timeOff: null as any as string, // By design it disable timer off
			sun: true,
			mon: true,
			tue: true,
			wed: true,
			thu: true,
			fri: true,
			sat: true,
		} as TimerSettings,
		TIMER_7: {
			...dummyTimerSettings,
			type: 'TIMER_7',
			timeOn: '01:12:31',
			timeOff: '01:14:59',
			sun: true,
			mon: true,
			tue: true,
			wed: true,
			thu: true,
			fri: true,
			sat: true,
		} as TimerSettings,
	};

	describe('getTimerEvents', function () {

		it('should return timer events based on timer settings', function () {
			const timerEvents = getTimerEvents(timerSettings);
			assert.deepEqual(timerEvents, [
				{
					weekDayNumber: TimerWeekday.mon,
					type: 'ON',
					time: '07:30:00',
				},
				{
					weekDayNumber: TimerWeekday.mon,
					type: 'OFF',
					time: '17:30:00',
				},
				{
					weekDayNumber: TimerWeekday.tue,
					type: 'ON',
					time: '07:30:00',
				},
				{
					weekDayNumber: TimerWeekday.tue,
					type: 'OFF',
					time: '17:30:00',
				},
				{
					weekDayNumber: TimerWeekday.wed,
					type: 'ON',
					time: '07:30:00',
				},
				{
					weekDayNumber: TimerWeekday.wed,
					type: 'OFF',
					time: '17:30:00',
				},
				{
					weekDayNumber: TimerWeekday.thu,
					type: 'ON',
					time: '07:30:00',
				},
				{
					weekDayNumber: TimerWeekday.thu,
					type: 'OFF',
					time: '17:30:00',
				},
				{
					weekDayNumber: TimerWeekday.fri,
					type: 'ON',
					time: '09:00:00',
				},
				{
					weekDayNumber: TimerWeekday.fri,
					type: 'OFF',
					time: '16:00:00',
				},
				{
					weekDayNumber: TimerWeekday.sun,
					type: 'ON',
					time: '12:00:00',
				},
				{
					weekDayNumber: TimerWeekday.sun,
					type: 'OFF',
					time: '15:00:00',
				},
				{
					weekDayNumber: TimerWeekday.sat,
					type: 'ON',
					time: '12:00:00',
				},
				{
					weekDayNumber: TimerWeekday.sat,
					type: 'OFF',
					time: '15:00:00',
				},
				{
					weekDayNumber: TimerWeekday.sun,
					type: 'ON',
					time: '08:00:00',
				},
				{
					weekDayNumber: TimerWeekday.mon,
					type: 'ON',
					time: '08:00:00',
				},
				{
					weekDayNumber: TimerWeekday.tue,
					type: 'ON',
					time: '08:00:00',
				},
				{
					weekDayNumber: TimerWeekday.wed,
					type: 'ON',
					time: '08:00:00',
				},
				{
					weekDayNumber: TimerWeekday.thu,
					type: 'ON',
					time: '08:00:00',
				},
				{
					weekDayNumber: TimerWeekday.fri,
					type: 'ON',
					time: '08:00:00',
				},
				{
					weekDayNumber: TimerWeekday.sat,
					type: 'ON',
					time: '08:00:00',
				},
				{
					weekDayNumber: TimerWeekday.sun,
					type: 'ON',
					time: '01:12:31',
				},
				{
					weekDayNumber: TimerWeekday.sun,
					type: 'OFF',
					time: '01:14:59',
				},
				{
					weekDayNumber: TimerWeekday.mon,
					type: 'ON',
					time: '01:12:31',
				},
				{
					weekDayNumber: TimerWeekday.mon,
					type: 'OFF',
					time: '01:14:59',
				},
				{
					weekDayNumber: TimerWeekday.tue,
					type: 'ON',
					time: '01:12:31',
				},
				{
					weekDayNumber: TimerWeekday.tue,
					type: 'OFF',
					time: '01:14:59',
				},
				{
					weekDayNumber: TimerWeekday.wed,
					type: 'ON',
					time: '01:12:31',
				},
				{
					weekDayNumber: TimerWeekday.wed,
					type: 'OFF',
					time: '01:14:59',
				},
				{
					weekDayNumber: TimerWeekday.thu,
					type: 'ON',
					time: '01:12:31',
				},
				{
					weekDayNumber: TimerWeekday.thu,
					type: 'OFF',
					time: '01:14:59',
				},
				{
					weekDayNumber: TimerWeekday.fri,
					type: 'ON',
					time: '01:12:31',
				},
				{
					weekDayNumber: TimerWeekday.fri,
					type: 'OFF',
					time: '01:14:59',
				},
				{
					weekDayNumber: TimerWeekday.sat,
					type: 'ON',
					time: '01:12:31',
				},
				{
					weekDayNumber: TimerWeekday.sat,
					type: 'OFF',
					time: '01:14:59',
				},
			] as ITimerEvent[]);
		});
	});

	describe('shouldBeOnByTimers', function () {

		const mon = '2017-06-05';
		const tue = '2017-06-06';
		const wed = '2017-06-07';
		const thu = '2017-06-08';
		const fri = '2017-06-09';
		const sat = '2017-06-10';
		const sun = '2017-06-11';

		it('should return true if based on timer settings should be display on', function () {
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(mon + 'T00:00:00').toDate()));

			assert.ok(shouldBeOnByTimers(timerSettings, moment(mon + 'T01:13:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(mon + 'T02:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(mon + 'T07:29:59').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(mon + 'T07:30:00').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(mon + 'T07:30:01').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(mon + 'T17:29:59').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(mon + 'T17:30:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(mon + 'T17:30:01').toDate()));

			assert.ok(shouldBeOnByTimers(timerSettings, moment(tue + 'T01:13:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(tue + 'T02:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(tue + 'T07:29:59').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(tue + 'T07:30:00').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(tue + 'T07:30:01').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(tue + 'T17:29:59').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(tue + 'T17:30:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(tue + 'T17:30:01').toDate()));

			assert.ok(shouldBeOnByTimers(timerSettings, moment(wed + 'T01:13:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(wed + 'T02:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(wed + 'T07:29:59').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(wed + 'T07:30:00').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(wed + 'T07:30:01').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(wed + 'T17:29:59').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(wed + 'T17:30:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(wed + 'T17:30:01').toDate()));

			assert.ok(shouldBeOnByTimers(timerSettings, moment(thu + 'T01:13:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(thu + 'T02:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(thu + 'T07:29:59').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(thu + 'T07:30:00').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(thu + 'T07:30:01').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(thu + 'T17:29:59').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(thu + 'T17:30:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(thu + 'T17:30:01').toDate()));

			assert.ok(shouldBeOnByTimers(timerSettings, moment(fri + 'T01:13:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(fri + 'T02:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(fri + 'T07:59:59').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(fri + 'T08:00:00').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(fri + 'T08:00:01').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(fri + 'T15:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(fri + 'T16:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(fri + 'T16:00:01').toDate()));

			assert.ok(shouldBeOnByTimers(timerSettings, moment(sat + 'T01:13:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sat + 'T02:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sat + 'T07:59:59').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(sat + 'T08:00:00').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(sat + 'T08:00:01').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(sat + 'T14:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sat + 'T15:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sat + 'T15:00:01').toDate()));

			assert.ok(shouldBeOnByTimers(timerSettings, moment(sun + 'T01:13:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sun + 'T02:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sun + 'T07:59:59').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(sun + 'T08:00:00').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(sun + 'T08:00:01').toDate()));
			assert.ok(shouldBeOnByTimers(timerSettings, moment(sun + 'T14:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sun + 'T15:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sun + 'T15:00:01').toDate()));

			assert.ok(!shouldBeOnByTimers(timerSettings, moment(sun + 'T23:59:59').toDate()));
		});

		it('should works when timer is over one or more days', function () {
			const skipDayTimerSettings: { [type: string]: TimerSettings } = {
				TIMER_1: {
					...dummyTimerSettings,
					type: 'TIMER_1',
					timeOn: '08:00:00',
					timeOff: '18:00:00',
					sun: true,
					mon: false,
					tue: true,
					wed: false,
					thu: true,
					fri: false,
					sat: false,
				} as TimerSettings,
			};

			// OFF from sat
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sun + 'T00:00:00').toDate()));
			assert.ok(shouldBeOnByTimers(skipDayTimerSettings, moment(sun + 'T08:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sun + 'T18:00:00').toDate()));

			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(mon + 'T07:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(mon + 'T08:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(mon + 'T08:00:01').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(mon + 'T17:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(mon + 'T18:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(mon + 'T18:00:01').toDate()));

			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(tue + 'T07:59:59').toDate()));
			assert.ok(shouldBeOnByTimers(skipDayTimerSettings, moment(tue + 'T08:00:00').toDate()));
			assert.ok(shouldBeOnByTimers(skipDayTimerSettings, moment(tue + 'T08:00:01').toDate()));
			assert.ok(shouldBeOnByTimers(skipDayTimerSettings, moment(tue + 'T17:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(tue + 'T18:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(tue + 'T18:00:01').toDate()));

			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(wed + 'T07:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(wed + 'T08:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(wed + 'T08:00:01').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(wed + 'T17:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(wed + 'T18:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(wed + 'T18:00:01').toDate()));

			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(thu + 'T07:59:59').toDate()));
			assert.ok(shouldBeOnByTimers(skipDayTimerSettings, moment(thu + 'T08:00:00').toDate()));
			assert.ok(shouldBeOnByTimers(skipDayTimerSettings, moment(thu + 'T08:00:01').toDate()));
			assert.ok(shouldBeOnByTimers(skipDayTimerSettings, moment(thu + 'T17:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(thu + 'T18:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(thu + 'T18:00:01').toDate()));

			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(fri + 'T07:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(fri + 'T08:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(fri + 'T08:00:01').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(fri + 'T17:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(fri + 'T18:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(fri + 'T18:00:01').toDate()));

			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sat + 'T07:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sat + 'T08:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sat + 'T08:00:01').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sat + 'T17:59:59').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sat + 'T18:00:00').toDate()));
			assert.ok(!shouldBeOnByTimers(skipDayTimerSettings, moment(sat + 'T18:00:01').toDate()));
		});

	});

});
