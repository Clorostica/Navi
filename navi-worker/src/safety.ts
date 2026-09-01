export type SafetyBand = 'green' | 'yellow' | 'red';

export interface SafetyScore {
	score: number;
	band: SafetyBand;
}

export interface SafetyReportInput {
	station: string;
	category: string;
	severity: string;
	createdAt: string;
}

// Only these categories signal personal safety — found/lost items, delays,
// damage, and "other" don't move the score at all.
const CATEGORY_WEIGHT: Record<string, number> = {
	theft: 12,
	harassment: 14,
	suspiciousActivity: 8,
	medical: 6,
};

const SEVERITY_MULTIPLIER: Record<string, number> = {
	low: 0.6,
	medium: 1.0,
	high: 1.6,
};

// Exponential half-life: a report today counts fully, 30 days old counts
// half, ~180 days old is negligible — recent incidents dominate the score
// without a hard cutoff.
const RECENCY_HALF_LIFE_DAYS = 30;

const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;
const NIGHT_MULTIPLIER = 1.3;
const CURRENT_NIGHT_PENALTY = 5;

const BAND_THRESHOLDS = { green: 75, yellow: 45 };

const berlinHourFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Berlin',
	hour: '2-digit',
	hourCycle: 'h23',
});

// Berlin alternates CET/CEST across the year — Intl.DateTimeFormat handles
// that DST math, a raw UTC offset would drift an hour half the year.
function berlinHour(date: Date): number {
	return Number(berlinHourFormatter.format(date));
}

function isNightHour(hour: number): boolean {
	return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

function recencyDecay(ageDays: number): number {
	return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function bandForScore(score: number): SafetyBand {
	if (score >= BAND_THRESHOLDS.green) return 'green';
	if (score >= BAND_THRESHOLDS.yellow) return 'yellow';
	return 'red';
}

export function computeSafetyScores(reports: SafetyReportInput[], now: Date): Record<string, SafetyScore> {
	const deductions = new Map<string, number>();
	const hasNightIncident = new Set<string>();

	for (const report of reports) {
		const categoryWeight = CATEGORY_WEIGHT[report.category];
		if (!categoryWeight) continue;

		const severityMultiplier = SEVERITY_MULTIPLIER[report.severity] ?? SEVERITY_MULTIPLIER.medium;
		const createdAt = new Date(report.createdAt);
		const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
		const night = isNightHour(berlinHour(createdAt));

		const deduction = categoryWeight * severityMultiplier * recencyDecay(ageDays) * (night ? NIGHT_MULTIPLIER : 1);
		deductions.set(report.station, (deductions.get(report.station) ?? 0) + deduction);

		if (night) hasNightIncident.add(report.station);
	}

	const isCurrentlyNight = isNightHour(berlinHour(now));

	const scores: Record<string, SafetyScore> = {};
	for (const [station, deduction] of deductions) {
		let score = Math.min(100, Math.max(0, 100 - deduction));
		if (isCurrentlyNight && hasNightIncident.has(station)) {
			score = Math.max(0, score - CURRENT_NIGHT_PENALTY);
		}
		scores[station] = { score: Math.round(score), band: bandForScore(score) };
	}

	return scores;
}
