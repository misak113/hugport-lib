
import { getPosixStringForCurrentYear } from '../../../src/DateTime/posixTimezone';

describe('DateTime.posixTimezone.getPosixStringForCurrentYear', function () {

	it('should convert timezone to POSIX format', () => {
		getPosixStringForCurrentYear('America/New_York').should.equal("EST5EDT,M3.1.0,M11.1.0");
		getPosixStringForCurrentYear('Australia/Sydney').should.equal("AEST-10AEDT,M10.1.0,M4.1.0/3");
		getPosixStringForCurrentYear('America/Sao_Paulo').should.equal("<-03>3<-02>,M10.3.0/0,M2.3.0/0");
		getPosixStringForCurrentYear('Europe/London').should.equal("GMT0BST,M3.3.0/1,M10.5.0");
		getPosixStringForCurrentYear('Australia/Lord_Howe').should.equal("<+1030>-10:30<+11>-11,M10.1.0,M4.1.0");
		getPosixStringForCurrentYear('Pacific/Chatham').should.equal("<+1245>-12:45<+1345>,M9.5.0/2:45,M4.1.0/3:45");
		getPosixStringForCurrentYear('Europe/Astrakhan').should.equal("<+04>-4");
	});
});
