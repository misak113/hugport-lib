
import SemVerLevel from './SemVerLevel';
import { padLeft } from '../String/pad';

export function getUpgradedVersion(version: string, level: SemVerLevel) {
	const versionParts = version.split('.');
	versionParts[2 - level] = (parseInt(versionParts[2 - level]) + 1).toString();
	for (let index = versionParts.length - 1 ; index > 2 - level ; index--) {
		versionParts[index] = '0';
	}
	return versionParts.join('.');
}

export function sortFunction(a: string, b: string) {
	return numerize(normalize(a)) - numerize(normalize(b));
}

export function isGreaterThan(subject: string, compareWith: string) {
	return sortFunction(subject, compareWith) > 0;
}

export function normalize(version: string) {
	const versionParts = (version + '').split('.');
	do {
		if (versionParts.length > 3) {
			versionParts.pop();
		} else
		if (versionParts.length < 3) {
			versionParts.unshift('0');
		}
	} while (versionParts.length !== 3);
	for (let index in versionParts) {
		versionParts[index] = isNaN(parseInt(versionParts[index])) ? '0' : parseInt(versionParts[index]).toString();
	}
	return versionParts.join('.');
}

export function normalizeString(version: string) {
	return padLeft(numerize(version).toString(), 5 * 3, '0');
}

export function numerize(version: string) {
	const versionParts = version.split('.');
	return versionParts.reduce(
		(numerized: number, versionPart: string, index: number) =>
			numerized + parseInt(versionPart) * Math.pow(1e5, versionParts.length - index - 1),
		0,
	);
}
