import { describe, it, expect } from 'vitest';
import { containsProfanity, containsSpamOrDrugContent } from '../src/profanity';

describe('containsProfanity', () => {
	it('flags a known slur', () => {
		expect(containsProfanity('this guy is an asshole')).toBe(true);
	});

	it('flags leetspeak evasion', () => {
		expect(containsProfanity('sch31ße everywhere')).toBe(true);
	});

	it('leaves clean reports alone', () => {
		expect(containsProfanity('Train delayed at Alexanderplatz, no announcement.')).toBe(false);
	});
});

describe('containsSpamOrDrugContent', () => {
	it('flags drug-sale slang', () => {
		expect(containsSpamOrDrugContent('selling cocaine near the platform, dm me')).toBe(true);
	});

	it('flags a bare URL', () => {
		expect(containsSpamOrDrugContent('check out https://totally-legit-deals.example for cheap stuff')).toBe(true);
	});

	it('flags a messaging handle link', () => {
		expect(containsSpamOrDrugContent('hit me up at wa.me/491234567')).toBe(true);
	});

	it('flags a phone-number-shaped sequence', () => {
		expect(containsSpamOrDrugContent('call me at 0176 1234567 for a deal')).toBe(true);
	});

	it('leaves a normal incident description alone', () => {
		expect(containsSpamOrDrugContent('Man arguing loudly with another passenger near the doors.')).toBe(false);
	});

	it('does not false-positive on a station name with digits', () => {
		expect(containsSpamOrDrugContent('Delay reported on the U7 platform 2.')).toBe(false);
	});
});
