import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { addStrike, flagReport, getProfileStatus, upsertProfile } from '../src/db';

// The vitest-pool-workers runtime doesn't have nodejs_compat enabled, so the migration
// files on disk aren't readable from here. This mirrors just the tables/columns these
// tests touch (see navi-worker/migrations/0001_init.sql and 0006_moderation.sql).
const SCHEMA_STATEMENTS = [
	`CREATE TABLE profiles (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL,
		created_at TEXT NOT NULL,
		strikes INTEGER NOT NULL DEFAULT 0,
		status TEXT NOT NULL DEFAULT 'active'
	)`,
	`CREATE TABLE reports (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		category TEXT NOT NULL,
		severity TEXT NOT NULL,
		description TEXT NOT NULL,
		station_name TEXT,
		status TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		additional_details TEXT,
		visibility TEXT NOT NULL DEFAULT 'community'
	)`,
	`CREATE TABLE report_flags (
		id TEXT PRIMARY KEY,
		report_id TEXT NOT NULL REFERENCES reports (id),
		user_id TEXT NOT NULL,
		created_at TEXT NOT NULL,
		UNIQUE (report_id, user_id)
	)`,
];

async function applyMigrations() {
	for (const statement of SCHEMA_STATEMENTS) {
		await env.DB.prepare(statement).run();
	}
}

async function insertBareReport(id: string, userId: string) {
	const now = new Date().toISOString();
	await env.DB.prepare(
		`INSERT INTO reports (id, user_id, category, severity, description, station_name, status, visibility, created_at, updated_at)
		 VALUES (?, ?, 'other', 'low', 'test report', 'Alexanderplatz', 'submitted', 'community', ?, ?)`,
	)
		.bind(id, userId, now, now)
		.run();
}

beforeAll(async () => {
	await applyMigrations();
});

describe('addStrike', () => {
	it('restricts the account only once strikes reach the threshold', async () => {
		await upsertProfile(env, { id: 'user-strikes-1', fullName: 'Strike Test' });

		expect((await addStrike(env, 'user-strikes-1')).status).toBe('active');
		expect((await addStrike(env, 'user-strikes-1')).status).toBe('active');
		expect(await getProfileStatus(env, 'user-strikes-1')).toBe('active');

		const third = await addStrike(env, 'user-strikes-1');
		expect(third.strikes).toBe(3);
		expect(third.status).toBe('restricted');
		expect(await getProfileStatus(env, 'user-strikes-1')).toBe('restricted');
	});
});

describe('flagReport', () => {
	it('does not strike the author below the flag threshold', async () => {
		await upsertProfile(env, { id: 'author-1', fullName: 'Author One' });
		await insertBareReport('report-flags-1', 'author-1');

		await flagReport(env, { reportId: 'report-flags-1', userId: 'flagger-a' });
		await flagReport(env, { reportId: 'report-flags-1', userId: 'flagger-b' });

		expect(await getProfileStatus(env, 'author-1')).toBe('active');
	});

	it('ignores a repeat flag from the same rider instead of double-counting', async () => {
		await upsertProfile(env, { id: 'author-2', fullName: 'Author Two' });
		await insertBareReport('report-flags-2', 'author-2');

		await flagReport(env, { reportId: 'report-flags-2', userId: 'flagger-a' });
		const repeat = await flagReport(env, { reportId: 'report-flags-2', userId: 'flagger-a' });

		expect(repeat.flaggedCount).toBe(1);
	});

	it('strikes the author exactly once flags from 3 distinct riders land', async () => {
		await upsertProfile(env, { id: 'author-3', fullName: 'Author Three' });
		await insertBareReport('report-flags-3', 'author-3');

		await flagReport(env, { reportId: 'report-flags-3', userId: 'flagger-a' });
		await flagReport(env, { reportId: 'report-flags-3', userId: 'flagger-b' });
		expect(await getProfileStatus(env, 'author-3')).toBe('active');

		const third = await flagReport(env, { reportId: 'report-flags-3', userId: 'flagger-c' });
		expect(third.flaggedCount).toBe(3);
		expect(await getProfileStatus(env, 'author-3')).toBe('active');

		const authorRow = await env.DB.prepare('SELECT strikes FROM profiles WHERE id = ?').bind('author-3').first<{ strikes: number }>();
		expect(authorRow?.strikes).toBe(1);

		// A 4th distinct flag should not add a second strike for the same report.
		await flagReport(env, { reportId: 'report-flags-3', userId: 'flagger-d' });
		const afterFourth = await env.DB.prepare('SELECT strikes FROM profiles WHERE id = ?').bind('author-3').first<{ strikes: number }>();
		expect(afterFourth?.strikes).toBe(1);
	});
});
