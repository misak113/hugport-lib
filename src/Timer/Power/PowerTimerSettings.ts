import TimerType from './PowerTimerType';

interface TimerSettings {
	type: TimerType;
	timeOn: string;
	timeOff: string;
	sun: boolean;
	mon: boolean;
	tue: boolean;
	wed: boolean;
	thu: boolean;
	fri: boolean;
	sat: boolean;
	volume: number;
	onAtHoliday: boolean;
	offAtHoliday: boolean;
}

export default TimerSettings;
