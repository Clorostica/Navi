import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { getReportById, recordReportView, upsertProfile } from '../src/db';

// See navi-worker/migrations/0001_init.sql, 0004, 0005, 0007 — mirrors just what
// getReportById's REPORT_SELECT and recordReportView touch.
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
	`CREATE TABLE report_comments (
		id TEXT PRIMARY KEY,
		report_id TEXT NOT NULL REFERENCES reports (id),
		user_id TEXT NOT NULL,
		author_name TEXT NOT NULL,
		body TEXT NOT NULL,
		created_at TEXT NOT NULL
	)`,
	`CREATE TABLE report_views (
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

describe('recordReportView', () => {
	it('counts distinct viewers, not page loads', async () => {
		await upsertProfile(env, { id: 'author-views-1', fullName: 'Author' });
		await insertBareReport('report-views-1', 'author-views-1');

		await recordReportView(env, { reportId: 'report-views-1', userId: 'viewer-a' });
		await recordReportView(env, { reportId: 'report-views-1', userId: 'viewer-a' }); // same viewer again
		await recordReportView(env, { reportId: 'report-views-1', userId: 'viewer-b' });

		const report = await getReportById(env, 'report-views-1');
		expect(report?.viewsCount).toBe(2);
	});

	it('starts a fresh report at zero views', async () => {
		await upsertProfile(env, { id: 'author-views-2', fullName: 'Author' });
		await insertBareReport('report-views-2', 'author-views-2');

		const report = await getReportById(env, 'report-views-2');
		expect(report?.viewsCount).toBe(0);
	});
});
