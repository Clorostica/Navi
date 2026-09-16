export type ReportCategory =
	| 'foundItem'
	| 'lostProperty'
	| 'delay'
	| 'theft'
	| 'suspiciousActivity'
	| 'harassment'
	| 'medical'
	| 'damage'
	| 'fight'
	| 'aggressivePerson'
	| 'smoke'
	| 'brokenDoor'
	| 'abandonedObject'
	| 'other';

export type Severity = 'low' | 'medium' | 'high';
export type ReportStatus = 'submitted' | 'confirmed' | 'escalated' | 'staffNotified' | 'resolved';
export type ReportVisibility = 'community' | 'authority' | 'both';

export interface Report {
	id: string;
	authorId: string;
	category: ReportCategory;
	station: string;
	description: string;
	additionalDetails?: string;
	severity: Severity;
	status: ReportStatus;
	visibility: ReportVisibility;
	commentsCount: number;
	viewsCount: number;
	createdAt: string;
}

interface ReportRow {
	id: string;
	user_id: string;
	category: string;
	station_name: string | null;
	description: string;
	additional_details: string | null;
	severity: string;
	status: string;
	visibility: string;
	comments_count: number;
	views_count: number;
	created_at: string | null;
}

export interface ReportUpdate {
	id: string;
	reportId: string;
	status: ReportStatus;
	message: string | null;
	createdAt: string;
}

interface ReportUpdateRow {
	id: string;
	report_id: string;
	status: string;
	message: string | null;
	created_at: string | null;
}

function rowToReportUpdate(row: ReportUpdateRow): ReportUpdate {
	return {
		id: row.id,
		reportId: row.report_id,
		status: row.status as ReportStatus,
		message: row.message,
		createdAt: row.created_at ?? new Date().toISOString(),
	};
}

function generateRef(): string {
	const random = Math.random().toString(36).slice(2, 7).toUpperCase();
	return `NV-${random}`;
}

function rowToReport(row: ReportRow): Report {
	return {
		id: row.id,
		authorId: row.user_id,
		category: row.category as ReportCategory,
		station: row.station_name ?? 'Unknown station',
		description: row.description,
		additionalDetails: row.additional_details ?? undefined,
		severity: row.severity as Severity,
		status: row.status as ReportStatus,
		visibility: row.visibility as ReportVisibility,
		commentsCount: row.comments_count ?? 0,
		viewsCount: row.views_count ?? 0,
		createdAt: row.created_at ?? new Date().toISOString(),
	};
}

const REPORT_SELECT = `SELECT reports.*,
	(SELECT COUNT(*) FROM report_comments rcm WHERE rcm.report_id = reports.id) AS comments_count,
	(SELECT COUNT(*) FROM report_views rv WHERE rv.report_id = reports.id) AS views_count
	FROM reports`;

// Records that a rider opened a report's detail view (one view per rider per report, not
// per page load). Called from the GET /reports/:id route before the report is fetched, so
// the returned viewsCount already reflects this open.
export async function recordReportView(env: Env, { reportId, userId }: { reportId: string; userId: string }): Promise<void> {
	await env.DB.prepare('INSERT INTO report_views (id, report_id, user_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(report_id, user_id) DO NOTHING')
		.bind(crypto.randomUUID(), reportId, userId, new Date().toISOString())
		.run();
}

export async function upsertProfile(env: Env, { id, fullName }: { id: string; fullName: string }): Promise<void> {
	await env.DB.prepare(
		'INSERT INTO profiles (id, full_name, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name',
	)
		.bind(id, fullName, new Date().toISOString())
		.run();
}

export async function getProfileFullName(env: Env, userId: string): Promise<string | null> {
	const row = await env.DB.prepare('SELECT full_name FROM profiles WHERE id = ?').bind(userId).first<{ full_name: string }>();
	return row?.full_name ?? null;
}

export type ProfileStatus = 'active' | 'restricted';

const STRIKE_RESTRICTION_THRESHOLD = 3;
const FLAG_STRIKE_THRESHOLD = 3;

export async function getProfileStatus(env: Env, userId: string): Promise<ProfileStatus> {
	const row = await env.DB.prepare('SELECT status FROM profiles WHERE id = ?').bind(userId).first<{ status: string }>();
	return row?.status === 'restricted' ? 'restricted' : 'active';
}

// Records a strike against a user (from posting blocked content, or authoring a report that
// enough distinct riders flagged as false/spam). Once strikes reach the threshold the account
// is switched to 'restricted': it can keep reading/using the app, but can't post new reports or
// comments. This is a soft, reversible state, not a delete/ban — nothing here unsets it, that's
// left to a manual admin action outside this app.
export async function addStrike(env: Env, userId: string): Promise<{ strikes: number; status: ProfileStatus }> {
	await env.DB.prepare('UPDATE profiles SET strikes = strikes + 1 WHERE id = ?').bind(userId).run();
	const row = await env.DB.prepare('SELECT strikes, status FROM profiles WHERE id = ?').bind(userId).first<{ strikes: number; status: string }>();
	const strikes = row?.strikes ?? 0;
	let status: ProfileStatus = row?.status === 'restricted' ? 'restricted' : 'active';

	if (strikes >= STRIKE_RESTRICTION_THRESHOLD && status === 'active') {
		await env.DB.prepare("UPDATE profiles SET status = 'restricted' WHERE id = ?").bind(userId).run();
		status = 'restricted';
	}

	return { strikes, status };
}

// Flags a report as false/spam on behalf of a rider (one flag per rider per report). Once a
// report accumulates flags from FLAG_STRIKE_THRESHOLD distinct riders, its author takes a
// strike — this fires exactly once per report, the moment the count first crosses the threshold.
export async function flagReport(env: Env, { reportId, userId }: { reportId: string; userId: string }): Promise<{ flaggedCount: number }> {
	const inserted = await env.DB.prepare(
		'INSERT INTO report_flags (id, report_id, user_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(report_id, user_id) DO NOTHING',
	)
		.bind(crypto.randomUUID(), reportId, userId, new Date().toISOString())
		.run();

	const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM report_flags WHERE report_id = ?').bind(reportId).first<{ count: number }>();
	const flaggedCount = countRow?.count ?? 0;

	if (inserted.meta.changes > 0 && flaggedCount === FLAG_STRIKE_THRESHOLD) {
		const authorRow = await env.DB.prepare('SELECT user_id FROM reports WHERE id = ?').bind(reportId).first<{ user_id: string }>();
		if (authorRow) await addStrike(env, authorRow.user_id);
	}

	return { flaggedCount };
}

export async function insertReport(
	env: Env,
	input: {
		userId: string;
		category: ReportCategory;
		station: string;
		description: string;
		additionalDetails?: string;
		severity: Severity;
		visibility: ReportVisibility;
	},
): Promise<Report> {
	const id = generateRef();
	const now = new Date().toISOString();

	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO reports (id, user_id, category, severity, description, station_name, status, visibility, created_at, updated_at, additional_details)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).bind(
			id,
			input.userId,
			input.category,
			input.severity,
			input.description,
			input.station,
			'submitted',
			input.visibility,
			now,
			now,
			input.additionalDetails ?? null,
		),
		env.DB.prepare('INSERT INTO report_updates (id, report_id, status, message, created_at) VALUES (?, ?, ?, ?, ?)').bind(
			crypto.randomUUID(),
			id,
			'submitted',
			null,
			now,
		),
	]);

	return {
		id,
		authorId: input.userId,
		category: input.category,
		station: input.station,
		description: input.description,
		additionalDetails: input.additionalDetails,
		severity: input.severity,
		status: 'submitted',
		visibility: input.visibility,
		commentsCount: 0,
		viewsCount: 0,
		createdAt: now,
	};
}

export async function listReportsForUser(env: Env, userId: string): Promise<Report[]> {
	const { results } = await env.DB.prepare(`${REPORT_SELECT} WHERE user_id = ? ORDER BY created_at DESC`).bind(userId).all<ReportRow>();
	return results.map(rowToReport);
}

export async function listReportsForStation(env: Env, station: string): Promise<Report[]> {
	const { results } = await env.DB.prepare(`${REPORT_SELECT} WHERE station_name = ? AND visibility != 'authority' ORDER BY created_at DESC`)
		.bind(station)
		.all<ReportRow>();
	return results.map(rowToReport);
}

export async function getReportById(env: Env, id: string): Promise<Report | null> {
	const row = await env.DB.prepare(`${REPORT_SELECT} WHERE reports.id = ?`).bind(id).first<ReportRow>();
	return row ? rowToReport(row) : null;
}

async function addReportUpdate(env: Env, { reportId, status, message }: { reportId: string; status: ReportStatus; message?: string | null }): Promise<void> {
	await env.DB.batch([
		env.DB.prepare('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?').bind(status, new Date().toISOString(), reportId),
		env.DB.prepare('INSERT INTO report_updates (id, report_id, status, message, created_at) VALUES (?, ?, ?, ?, ?)').bind(
			crypto.randomUUID(),
			reportId,
			status,
			message ?? null,
			new Date().toISOString(),
		),
	]);
}

export async function escalateReport(env: Env, reportId: string): Promise<Report | null> {
	const report = await getReportById(env, reportId);
	if (!report) return null;
	if (report.status === 'escalated' || report.status === 'staffNotified' || report.status === 'resolved') return report;

	await addReportUpdate(env, { reportId, status: 'escalated' });
	return { ...report, status: 'escalated' };
}

export async function resolveReport(env: Env, reportId: string): Promise<Report | null> {
	const report = await getReportById(env, reportId);
	if (!report) return null;
	if (report.status === 'resolved') return report;

	await addReportUpdate(env, { reportId, status: 'resolved' });
	return { ...report, status: 'resolved' };
}

export async function listUpdatesForReport(env: Env, reportId: string): Promise<ReportUpdate[]> {
	const { results } = await env.DB.prepare('SELECT * FROM report_updates WHERE report_id = ? ORDER BY created_at ASC')
		.bind(reportId)
		.all<ReportUpdateRow>();
	return results.map(rowToReportUpdate);
}

const SAFETY_CATEGORIES = ['theft', 'harassment', 'suspiciousActivity', 'medical', 'fight', 'aggressivePerson', 'smoke'];

const FEED_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

export async function listFeedReports(env: Env, { limit, before }: { limit: number; before?: string }): Promise<Report[]> {
	const sinceIso = new Date(Date.now() - FEED_RETENTION_MS).toISOString();
	const { results } = before
		? await env.DB.prepare(`${REPORT_SELECT} WHERE created_at < ? AND created_at > ? AND visibility != 'authority' ORDER BY created_at DESC LIMIT ?`)
				.bind(before, sinceIso, limit)
				.all<ReportRow>()
		: await env.DB.prepare(`${REPORT_SELECT} WHERE created_at > ? AND visibility != 'authority' ORDER BY created_at DESC LIMIT ?`)
				.bind(sinceIso, limit)
				.all<ReportRow>();
	return results.map(rowToReport);
}

export async function listRecentReports(env: Env, sinceIso: string): Promise<Report[]> {
	const placeholders = SAFETY_CATEGORIES.map(() => '?').join(', ');
	const { results } = await env.DB.prepare(
		`${REPORT_SELECT} WHERE category IN (${placeholders}) AND created_at > ? AND visibility != 'authority' ORDER BY created_at ASC`,
	)
		.bind(...SAFETY_CATEGORIES, sinceIso)
		.all<ReportRow>();
	return results.map(rowToReport);
}

interface SafetyReportRow {
	station_name: string;
	category: string;
	severity: string;
	created_at: string | null;
}

export async function listRecentSafetyReports(env: Env, sinceIso: string): Promise<{ station: string; category: string; severity: string; createdAt: string }[]> {
	const placeholders = SAFETY_CATEGORIES.map(() => '?').join(', ');
	const { results } = await env.DB.prepare(
		`SELECT station_name, category, severity, created_at FROM reports
		 WHERE station_name IS NOT NULL AND category IN (${placeholders}) AND created_at >= ?`,
	)
		.bind(...SAFETY_CATEGORIES, sinceIso)
		.all<SafetyReportRow>();

	return results.map((row) => ({
		station: row.station_name,
		category: row.category,
		severity: row.severity,
		createdAt: row.created_at ?? sinceIso,
	}));
}

export interface ReportComment {
	id: string;
	reportId: string;
	authorName: string;
	body: string;
	createdAt: string;
}

interface ReportCommentRow {
	id: string;
	report_id: string;
	author_name: string;
	body: string;
	created_at: string | null;
}

function rowToReportComment(row: ReportCommentRow): ReportComment {
	return {
		id: row.id,
		reportId: row.report_id,
		authorName: row.author_name,
		body: row.body,
		createdAt: row.created_at ?? new Date().toISOString(),
	};
}

export async function listCommentsForReport(env: Env, reportId: string): Promise<ReportComment[]> {
	const { results } = await env.DB.prepare('SELECT * FROM report_comments WHERE report_id = ? ORDER BY created_at ASC')
		.bind(reportId)
		.all<ReportCommentRow>();
	return results.map(rowToReportComment);
}

export async function insertComment(
	env: Env,
	{ reportId, userId, authorName, body }: { reportId: string; userId: string; authorName: string; body: string },
): Promise<ReportComment> {
	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	await env.DB.prepare('INSERT INTO report_comments (id, report_id, user_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(id, reportId, userId, authorName, body, createdAt)
		.run();
	return { id, reportId, authorName, body, createdAt };
}

export interface TrustedContact {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	createdAt: string;
}

interface TrustedContactRow {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	created_at: string | null;
}

function rowToTrustedContact(row: TrustedContactRow): TrustedContact {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		phone: row.phone ?? null,
		createdAt: row.created_at ?? new Date().toISOString(),
	};
}

export async function insertTrustedContact(
	env: Env,
	{ userId, name, email, phone }: { userId: string; name: string; email: string; phone?: string | null },
): Promise<TrustedContact> {
	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	await env.DB.prepare('INSERT INTO trusted_contacts (id, user_id, name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(id, userId, name, email, phone ?? null, createdAt)
		.run();
	return { id, name, email, phone: phone ?? null, createdAt };
}

export async function listTrustedContacts(env: Env, userId: string): Promise<TrustedContact[]> {
	const { results } = await env.DB.prepare(
		'SELECT id, name, email, phone, created_at FROM trusted_contacts WHERE user_id = ? ORDER BY created_at ASC',
	)
		.bind(userId)
		.all<TrustedContactRow>();
	return results.map(rowToTrustedContact);
}

export async function deleteTrustedContact(env: Env, { userId, id }: { userId: string; id: string }): Promise<boolean> {
	const result = await env.DB.prepare('DELETE FROM trusted_contacts WHERE id = ? AND user_id = ?').bind(id, userId).run();
	return result.meta.changes > 0;
}

export type CompanionStatus = 'active' | 'checked_in' | 'alerted' | 'cancelled';

export interface CompanionSession {
	id: string;
	userId: string;
	destinationLabel: string | null;
	startedAt: string;
	expiresAt: string;
	status: CompanionStatus;
	lastLat: number | null;
	lastLon: number | null;
	lastLocationAt: string | null;
}

interface CompanionSessionRow {
	id: string;
	user_id: string;
	destination_label: string | null;
	started_at: string;
	expires_at: string;
	status: string;
	last_lat: number | null;
	last_lon: number | null;
	last_location_at: string | null;
}

function rowToCompanionSession(row: CompanionSessionRow): CompanionSession {
	return {
		id: row.id,
		userId: row.user_id,
		destinationLabel: row.destination_label,
		startedAt: row.started_at,
		expiresAt: row.expires_at,
		status: row.status as CompanionStatus,
		lastLat: row.last_lat,
		lastLon: row.last_lon,
		lastLocationAt: row.last_location_at,
	};
}

export async function createCompanionSession(
	env: Env,
	{ userId, destinationLabel, durationMinutes }: { userId: string; destinationLabel: string | null; durationMinutes: number },
): Promise<CompanionSession> {
	const id = crypto.randomUUID();
	const startedAt = new Date().toISOString();
	const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString();

	await env.DB.prepare(
		`INSERT INTO companion_sessions (id, user_id, destination_label, started_at, expires_at, status)
		 VALUES (?, ?, ?, ?, ?, 'active')`,
	)
		.bind(id, userId, destinationLabel, startedAt, expiresAt)
		.run();

	return {
		id,
		userId,
		destinationLabel,
		startedAt,
		expiresAt,
		status: 'active',
		lastLat: null,
		lastLon: null,
		lastLocationAt: null,
	};
}

export async function getActiveCompanionSession(env: Env, userId: string): Promise<CompanionSession | null> {
	const row = await env.DB.prepare(
		"SELECT * FROM companion_sessions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
	)
		.bind(userId)
		.first<CompanionSessionRow>();
	return row ? rowToCompanionSession(row) : null;
}

export async function getCompanionSessionForUser(env: Env, { id, userId }: { id: string; userId: string }): Promise<CompanionSession | null> {
	const row = await env.DB.prepare('SELECT * FROM companion_sessions WHERE id = ? AND user_id = ?').bind(id, userId).first<CompanionSessionRow>();
	return row ? rowToCompanionSession(row) : null;
}

export async function checkInCompanionSession(env: Env, id: string): Promise<CompanionSession> {
	await env.DB.prepare("UPDATE companion_sessions SET status = 'checked_in' WHERE id = ?").bind(id).run();
	const row = await env.DB.prepare('SELECT * FROM companion_sessions WHERE id = ?').bind(id).first<CompanionSessionRow>();
	return rowToCompanionSession(row!);
}

export async function extendCompanionSession(env: Env, { id, additionalMinutes }: { id: string; additionalMinutes: number }): Promise<CompanionSession> {
	const current = await env.DB.prepare('SELECT * FROM companion_sessions WHERE id = ?').bind(id).first<CompanionSessionRow>();
	const newExpiresAt = new Date(new Date(current!.expires_at).getTime() + additionalMinutes * 60_000).toISOString();
	await env.DB.prepare('UPDATE companion_sessions SET expires_at = ? WHERE id = ?').bind(newExpiresAt, id).run();
	return rowToCompanionSession({ ...current!, expires_at: newExpiresAt });
}

export async function updateCompanionHeartbeat(env: Env, { id, lat, lon }: { id: string; lat: number; lon: number }): Promise<void> {
	await env.DB.prepare(
		"UPDATE companion_sessions SET last_lat = ?, last_lon = ?, last_location_at = ? WHERE id = ? AND status = 'active'",
	)
		.bind(lat, lon, new Date().toISOString(), id)
		.run();
}

export async function listOverdueActiveSessions(env: Env, nowIso: string): Promise<CompanionSession[]> {
	const { results } = await env.DB.prepare("SELECT * FROM companion_sessions WHERE status = 'active' AND expires_at < ?")
		.bind(nowIso)
		.all<CompanionSessionRow>();
	return results.map(rowToCompanionSession);
}

export async function markCompanionSessionAlerted(env: Env, id: string): Promise<void> {
	await env.DB.prepare("UPDATE companion_sessions SET status = 'alerted' WHERE id = ?").bind(id).run();
}
