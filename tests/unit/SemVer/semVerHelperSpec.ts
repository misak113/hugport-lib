
import * as should from 'should';
import {
	getUpgradedVersion,
	sortFunction,
	normalize,
	numerize,
	normalizeString,
	isGreaterThan,
} from '../../../src/SemVer/semVerHelper';
import SemVerLevel from '../../../src/SemVer/SemVerLevel';

describe('SemVer.semVerHelper', () => {

	describe('getUpgradedVersion', () => {

		it('should upgrade patch', () => {
			should(getUpgradedVersion('0.0.1', SemVerLevel.PATCH)).equal('0.0.2');
			should(getUpgradedVersion('0.0.9', SemVerLevel.PATCH)).equal('0.0.10');
			should(getUpgradedVersion('0.2.9', SemVerLevel.PATCH)).equal('0.2.10');
			should(getUpgradedVersion('3.2.9', SemVerLevel.PATCH)).equal('3.2.10');
		});

		it('should upgrade minor', () => {
			should(getUpgradedVersion('0.0.1', SemVerLevel.MINOR)).equal('0.1.0');
			should(getUpgradedVersion('0.0.9', SemVerLevel.MINOR)).equal('0.1.0');
			should(getUpgradedVersion('0.9.9', SemVerLevel.MINOR)).equal('0.10.0');
			should(getUpgradedVersion('0.9.9', SemVerLevel.MINOR)).equal('0.10.0');
			should(getUpgradedVersion('1.9.9', SemVerLevel.MINOR)).equal('1.10.0');
		});

		it('should upgrade major', () => {
			should(getUpgradedVersion('0.0.1', SemVerLevel.MAJOR)).equal('1.0.0');
			should(getUpgradedVersion('0.9.1', SemVerLevel.MAJOR)).equal('1.0.0');
			should(getUpgradedVersion('1.9.1', SemVerLevel.MAJOR)).equal('2.0.0');
			should(getUpgradedVersion('9.9.1', SemVerLevel.MAJOR)).equal('10.0.0');
		});
	});

	describe('numerize', () => {

		it('should create numeric representation of version', () => {
			should(numerize('0.0.1')).equal(1);
			should(numerize('0.1.1')).equal(100001);
			should(numerize('1.1.1')).equal(10000100001);
			should(numerize('23.45.33')).equal(230004500033);
		});
	});

	describe('normalizeString', () => {

		it('should create normalized representation of version useful for indexing', () => {
			should(normalizeString('0.0.1')).equal('000000000000001');
			should(normalizeString('0.1.1')).equal('000000000100001');
			should(normalizeString('1.1.1')).equal('000010000100001');
			should(normalizeString('23.45.33')).equal('000230004500033');
		});
	});

	describe('normalize', () => {

		it('should normalize by adding 0 prefixes', () => {
			should(normalize('1')).equal('0.0.1');
			should(normalize(1 as any)).equal('0.0.1');
			should(normalize('23')).equal('0.0.23');
			should(normalize('1.23')).equal('0.1.23');
			should(normalize('10.23')).equal('0.10.23');
			should(normalize('10.23-xxx.1')).equal('0.10.23-xxx.1');
		});

		it('should normalize by removing additional postfixes', () => {
			should(normalize('1.1.1.1')).equal('1.1.1');
			should(normalize('1.2.3.4.5')).equal('1.2.3');
			should(normalize('1.2.3.4.5-xxx.1')).equal('1.2.3-xxx.1');
		});

		it('should keep version when is valid', () => {
			should(normalize('1.2.3')).equal('1.2.3');
			should(normalize('0.2.1')).equal('0.2.1');
			should(normalize('1.2.3-xxx.1')).equal('1.2.3-xxx.1');
		});

		it('should numerize any version parts', () => {
			should(normalize('1.x.3')).equal('1.0.3');
			should(normalize('1.2x.3')).equal('1.2.3');
			should(normalize('x.1')).equal('0.0.1');
			should(normalize('1.x')).equal('0.1.0');
			should(normalize('1.x.y.z')).equal('1.0.0');
			should(normalize('1.x.y.z-xxx.1')).equal('1.0.0-xxx.1');
		});
	});

	describe('sortFunction', () => {

		it('should sort versions', () => {
			const unsorted = [
				'1.0.3',
				'2.0.0',
				'1.1.0-xxx.2',
				'1.1.0-aaa.3',
				'1.1.0',
				'1.1.0-xxx.1',
				'2.1.4',
				'2.0.4-aaa.0',
				'2.0.4',
				'1.1.4',
				'1.0.2',
			];
			should(unsorted.sort(sortFunction)).deepEqual([
				'1.0.2',
				'1.0.3',
				'1.1.0-aaa.3',
				'1.1.0-xxx.1',
				'1.1.0-xxx.2',
				'1.1.0',
				'1.1.4',
				'2.0.0',
				'2.0.4-aaa.0',
				'2.0.4',
				'2.1.4',
			]);
		});

		it('should sort invalid versions', () => {
			const unsorted = [
				'1.0.3.10',
				'2.0.0',
				'10',
				23,
				'2.1.4',
				'2.4',
				'1.1.4',
				'1.2',
			];
			should(unsorted.sort(sortFunction)).deepEqual([
				'10',
				23,
				'1.2',
				'2.4',
				'1.0.3.10',
				'1.1.4',
				'2.0.0',
				'2.1.4',
			]);
		});
	});

	describe('isGreaterThan', () => {

		it('should return subject greater than compare with other', () => {
			should(isGreaterThan('1.0.0', '0.1.0')).true();
			should(isGreaterThan('1.0.0', '0.9.0')).true();
			should(isGreaterThan('1.0.0', '0.9.9')).true();
			should(isGreaterThan('1.0.0', '0.9.9-x.1')).true();
			should(isGreaterThan('1.0.0-x.1', '0.9.9')).true();
			should(isGreaterThan('1.0.0-x.0', '0.9.9-x.1')).true();
			should(isGreaterThan('1.0.0', '0.99.99')).true();
			should(isGreaterThan('0.99.99', '0.99.98')).true();
			should(isGreaterThan('1.0.1', '1.0.1-a.1')).true();
			should(isGreaterThan('1.0.1', '1.0.1')).false();
			should(isGreaterThan('1.0.1', '1.0.2')).false();
			should(isGreaterThan('1.0.1', '1.0.2-x.1')).false();
			should(isGreaterThan('1.0.1', '2.0.0')).false();
			should(isGreaterThan('1.0.1-dev.113', '1.0.1')).false();
		});
	});
});
