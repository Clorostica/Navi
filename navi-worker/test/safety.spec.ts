import { describe, it, expect } from 'vitest';
import { computeSafetyScores, type SafetyReportInput } from '../src/safety';

// Noon UTC in mid-July is safely inside Berlin daytime (CEST, UTC+2) —
// avoids the night window and DST edge cases in the fixtures below.
const NOON_BERLIN_SUMMER = new Date('2026-07-15T10:00:00Z');

function reportAt(overrides: Partial<SafetyReportInput> & { station: string }): SafetyReportInput {
  return {
    category: 'theft',
    severity: 'medium',
    createdAt: NOON_BERLIN_SUMMER.toISOString(),
    ...overrides,
  };
}

describe('computeSafetyScores', () => {
  it('gives a station with no reports no entry at all', () => {
    const scores = computeSafetyScores([], NOON_BERLIN_SUMMER);
    expect(scores).toEqual({});
  });

  it('lowers the score for a recent high-severity theft', () => {
    const scores = computeSafetyScores(
      [reportAt({ station: 'Alexanderplatz', category: 'theft', severity: 'high' })],
      NOON_BERLIN_SUMMER,
    );
    expect(scores.Alexanderplatz.score).toBeLessThan(100);
    expect(scores.Alexanderplatz.score).toBeGreaterThan(0);
  });

  it('lets an old report decay to near-baseline', () => {
    const old = new Date(NOON_BERLIN_SUMMER.getTime() - 150 * 24 * 60 * 60 * 1000);
    const scores = computeSafetyScores(
      [reportAt({ station: 'Wedding', category: 'theft', severity: 'high', createdAt: old.toISOString() })],
      NOON_BERLIN_SUMMER,
    );
    expect(scores.Wedding.score).toBeGreaterThan(95);
  });

  it('scores a night-time incident lower than the same incident at noon', () => {
    const midnight = new Date('2026-07-15T23:00:00Z'); // ~01:00 CEST, inside the night window
    const dayScores = computeSafetyScores(
      [reportAt({ station: 'Kottbusser Tor', createdAt: NOON_BERLIN_SUMMER.toISOString() })],
      NOON_BERLIN_SUMMER,
    );
    const nightScores = computeSafetyScores(
      [reportAt({ station: 'Kottbusser Tor', createdAt: midnight.toISOString() })],
      NOON_BERLIN_SUMMER,
    );
    expect(nightScores['Kottbusser Tor'].score).toBeLessThan(dayScores['Kottbusser Tor'].score);
  });

  it('ignores non-safety categories entirely', () => {
    const scores = computeSafetyScores(
      [reportAt({ station: 'Hermannplatz', category: 'delay', severity: 'high' })],
      NOON_BERLIN_SUMMER,
    );
    expect(scores.Hermannplatz).toBeUndefined();
  });

  it('assigns bands consistent with the documented thresholds', () => {
    const scores = computeSafetyScores(
      [
        reportAt({ station: 'Green', category: 'medical', severity: 'low' }),
        reportAt({ station: 'Red', category: 'harassment', severity: 'high' }),
        reportAt({ station: 'Red', category: 'theft', severity: 'high' }),
        reportAt({ station: 'Red', category: 'suspiciousActivity', severity: 'high' }),
        reportAt({ station: 'Red', category: 'medical', severity: 'high' }),
      ],
      NOON_BERLIN_SUMMER,
    );
    expect(scores.Green.band).toBe('green');
    expect(scores.Red.band).toBe('red');
  });
});
