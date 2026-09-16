import { jsonResponse, preflightResponse, withCors } from './cors';
import {
	addStrike,
	checkInCompanionSession,
	createCompanionSession,
	deleteTrustedContact,
	escalateReport,
	extendCompanionSession,
	flagReport,
	getActiveCompanionSession,
	getCompanionSessionForUser,
	getProfileFullName,
	getProfileStatus,
	getReportById,
	insertComment,
	insertReport,
	insertTrustedContact,
	listCommentsForReport,
	listFeedReports,
	listOverdueActiveSessions,
	listRecentReports,
	listRecentSafetyReports,
	listReportsForStation,
	listReportsForUser,
	listTrustedContacts,
	listUpdatesForReport,
	markCompanionSessionAlerted,
	recordReportView,
	resolveReport,
	updateCompanionHeartbeat,
	upsertProfile,
} from './db';
import { fetchStationExits } from './exits';
import { containsProfanity, containsSpamOrDrugContent } from './profanity';
export { ReportPresenceDO } from './presence';
import { sendCompanionAlertEmail, sendEscalationEmail, sendPasswordResetEmail } from './resend';
import { computeSafetyScores } from './safety';
import { companionAlertSmsBody, sendSms } from './twilio';
import { fetchLiveTrains } from './vbb';
import {
	authenticateWithCode,
	authenticateWithEmailVerificationCode,
	authenticateWithPassword,
	authenticateWithRefreshToken,
	createPasswordResetToken,
	createUser,
	getGoogleAuthorizationUrl,
	resetPassword,
	updateUserName,
	verifyAccessToken,
	type AuthOutcome,
	type WorkosUser,
} from './workos';

function toNaviUser(user: WorkosUser) {
	const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
	return {
		id: user.id,
		email: user.email,
		name: fullName || user.email.split('@')[0] || 'there',
	};
}

function authOutcomeToResponseBody(outcome: AuthOutcome) {
	if (outcome.ok) {
		return {
			status: 'signedIn' as const,
			error: null,
			accessToken: outcome.accessToken,
			refreshToken: outcome.refreshToken,
			user: toNaviUser(outcome.user),
		};
	}
	if (outcome.status === 'checkEmail') {
		return { status: 'checkEmail' as const, error: null, pendingAuthenticationToken: outcome.pendingAuthenticationToken };
	}
	return { status: 'error' as const, error: outcome.error };
}

async function requireUserId(request: Request, env: Env): Promise<string | null> {
	const header = request.headers.get('Authorization') ?? '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;
	if (!token) return null;
	return verifyAccessToken(env, token);
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;

		if (request.method === 'OPTIONS') {
			return preflightResponse(request);
		}

		if (pathname === '/' && request.method === 'GET') {
			return jsonResponse({ message: 'Navi API is running' }, request);
		}

		if (pathname === '/auth/signup' && request.method === 'POST') {
			const { name, email, password } = (await request.json()) as { name: string; email: string; password: string };

			const created = await createUser(env, { email, password, firstName: name });
			if (!created.ok) {
				const body = authOutcomeToResponseBody(created.outcome);
				return jsonResponse(body, request, body.status === 'error' ? 400 : 200);
			}

			await upsertProfile(env, { id: created.user.id, fullName: name });

			const authResult = await authenticateWithPassword(env, { email, password });
			const body = authOutcomeToResponseBody(authResult);
			return jsonResponse(body, request, body.status === 'error' ? 400 : body.status === 'signedIn' ? 201 : 200);
		}

		if (pathname === '/auth/login' && request.method === 'POST') {
			const { email, password } = (await request.json()) as { email: string; password: string };

			const authResult = await authenticateWithPassword(env, { email, password });
			if (authResult.ok) {
				await upsertProfile(env, { id: authResult.user.id, fullName: toNaviUser(authResult.user).name });
			}

			const body = authOutcomeToResponseBody(authResult);
			return jsonResponse(body, request, body.status === 'error' ? 401 : 200);
		}

		if (pathname === '/auth/google' && request.method === 'GET') {
			return Response.redirect(getGoogleAuthorizationUrl(env), 302);
		}

		if (pathname === '/auth/oauth/callback' && request.method === 'POST') {
			const { code } = (await request.json()) as { code: string };

			const authResult = await authenticateWithCode(env, code);
			if (authResult.ok) {
				await upsertProfile(env, { id: authResult.user.id, fullName: toNaviUser(authResult.user).name });
			}

			const body = authOutcomeToResponseBody(authResult);
			return jsonResponse(body, request, body.status === 'error' ? 400 : 200);
		}

		if (pathname === '/auth/verify-email' && request.method === 'POST') {
			const { pendingAuthenticationToken, code } = (await request.json()) as { pendingAuthenticationToken: string; code: string };

			const authResult = await authenticateWithEmailVerificationCode(env, { pendingAuthenticationToken, code });
			if (authResult.ok) {
				await upsertProfile(env, { id: authResult.user.id, fullName: toNaviUser(authResult.user).name });
			}

			const body = authOutcomeToResponseBody(authResult);
			return jsonResponse(body, request, body.status === 'error' ? 400 : 200);
		}

		if (pathname === '/auth/refresh' && request.method === 'POST') {
			const { refreshToken } = (await request.json()) as { refreshToken: string };

			const authResult = await authenticateWithRefreshToken(env, refreshToken);
			if (!authResult.ok) {
				return jsonResponse({ user: null }, request, 401);
			}

			return jsonResponse(
				{
					user: toNaviUser(authResult.user),
					accessToken: authResult.accessToken,
					refreshToken: authResult.refreshToken,
				},
				request,
			);
		}

		if (pathname === '/auth/forgot-password' && request.method === 'POST') {
			const { email } = (await request.json()) as { email: string };

			const tokenResult = await createPasswordResetToken(env, email);
			if (tokenResult.ok) {
				const resetUrl = `${env.APP_URL}?token=${encodeURIComponent(tokenResult.token)}`;
				await sendPasswordResetEmail(env, { to: email, resetUrl });
			}

			return jsonResponse({ status: 'checkEmail', error: null }, request, 200);
		}

		if (pathname === '/auth/reset-password' && request.method === 'POST') {
			const { token, newPassword } = (await request.json()) as { token: string; newPassword: string };

			const result = await resetPassword(env, { token, newPassword });
			if (!result.ok) {
				return jsonResponse({ status: 'error', error: result.error }, request, 400);
			}

			return jsonResponse({ status: 'reset', error: null }, request, 200);
		}

		if (pathname === '/profile' && request.method === 'PATCH') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const { name } = (await request.json()) as { name: string };
			const trimmed = name.trim();
			if (!trimmed) return jsonResponse({ error: 'Enter your name.' }, request, 400);

			const updated = await updateUserName(env, userId, trimmed);
			if (!updated.ok) return jsonResponse({ error: updated.error }, request, 400);

			await upsertProfile(env, { id: userId, fullName: trimmed });

			return jsonResponse({ user: toNaviUser(updated.user), error: null }, request);
		}

		if (pathname === '/reports/mine' && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const reports = await listReportsForUser(env, userId);
			return jsonResponse({ reports }, request);
		}

		if (pathname === '/reports' && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			if ((await getProfileStatus(env, userId)) === 'restricted') {
				return jsonResponse({ report: null, error: 'Your account is temporarily restricted from posting.' }, request, 403);
			}

			const body = (await request.json()) as {
				category: string;
				station: string;
				description: string;
				additionalDetails?: string;
				severity: string;
				visibility?: string;
			};

			const blockedText =
				containsProfanity(body.description) ||
				containsSpamOrDrugContent(body.description) ||
				(body.additionalDetails && (containsProfanity(body.additionalDetails) || containsSpamOrDrugContent(body.additionalDetails)));

			if (blockedText) {
				await addStrike(env, userId);
				return jsonResponse({ report: null, error: 'Please remove inappropriate language and try again.' }, request, 400);
			}

			const visibility = body.visibility === 'authority' || body.visibility === 'both' ? body.visibility : 'community';

			const report = await insertReport(env, {
				userId,
				category: body.category as never,
				station: body.station,
				description: body.description,
				additionalDetails: body.additionalDetails,
				severity: body.severity as never,
				visibility,
			});

			return jsonResponse({ report, error: null }, request, 201);
		}

		if (pathname.startsWith('/reports/station/') && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const station = decodeURIComponent(pathname.slice('/reports/station/'.length));
			const reports = await listReportsForStation(env, station);
			return jsonResponse({ reports }, request);
		}

		if (pathname === '/reports/recent' && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const since = url.searchParams.get('since');
			if (!since) return jsonResponse({ error: 'Missing since' }, request, 400);

			const reports = await listRecentReports(env, since);
			return jsonResponse({ reports }, request);
		}

		if (pathname === '/reports/feed' && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const limitParam = Number(url.searchParams.get('limit'));
			const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 30;
			const before = url.searchParams.get('before') ?? undefined;

			const reports = await listFeedReports(env, { limit, before });
			return jsonResponse({ reports }, request);
		}

		if (pathname.startsWith('/reports/') && pathname.endsWith('/updates') && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length, -'/updates'.length));
			const updates = await listUpdatesForReport(env, reportId);
			return jsonResponse({ updates }, request);
		}

		if (pathname.startsWith('/reports/') && pathname.endsWith('/comments') && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length, -'/comments'.length));
			const report = await getReportById(env, reportId);
			if (!report) return jsonResponse({ error: 'Not found' }, request, 404);

			await recordReportView(env, { reportId, userId });

			const comments = await listCommentsForReport(env, reportId);
			return jsonResponse({ comments }, request);
		}

		if (pathname.startsWith('/reports/') && pathname.endsWith('/comments') && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			if ((await getProfileStatus(env, userId)) === 'restricted') {
				return jsonResponse({ error: 'Your account is temporarily restricted from posting.' }, request, 403);
			}

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length, -'/comments'.length));
			const report = await getReportById(env, reportId);
			if (!report) return jsonResponse({ error: 'Not found' }, request, 404);

			const { body: text } = (await request.json()) as { body: string };
			const trimmed = text?.trim();
			if (!trimmed) return jsonResponse({ error: 'Comment cannot be empty' }, request, 400);
			if (trimmed.length > 1000) return jsonResponse({ error: 'Comment is too long' }, request, 400);
			if (containsProfanity(trimmed) || containsSpamOrDrugContent(trimmed)) {
				await addStrike(env, userId);
				return jsonResponse({ error: 'Please remove inappropriate language and try again.' }, request, 400);
			}

			const fullName = await getProfileFullName(env, userId);
			const comment = await insertComment(env, { reportId, userId, authorName: fullName ?? 'Rider', body: trimmed });
			return jsonResponse({ comment }, request, 201);
		}

		if (pathname.startsWith('/reports/') && pathname.endsWith('/flag') && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length, -'/flag'.length));
			const existing = await getReportById(env, reportId);
			if (!existing) return jsonResponse({ error: 'Not found' }, request, 404);

			const { flaggedCount } = await flagReport(env, { reportId, userId });
			return jsonResponse({ flaggedCount, error: null }, request);
		}

		if (pathname.startsWith('/reports/') && pathname.endsWith('/escalate') && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length, -'/escalate'.length));
			const existing = await getReportById(env, reportId);
			if (!existing) return jsonResponse({ error: 'Not found' }, request, 404);
			if (existing.visibility === 'community') {
				return jsonResponse({ report: null, error: 'This report was not marked for authority escalation.' }, request, 400);
			}

			const report = await escalateReport(env, reportId);
			if (report && report.status === 'escalated') {
				ctx.waitUntil(
					sendEscalationEmail(env, {
						reportId: report.id,
						category: report.category,
						station: report.station,
						severity: report.severity,
						description: report.description,
					}),
				);
			}
			return jsonResponse({ report, error: null }, request);
		}

		if (pathname.startsWith('/reports/') && pathname.endsWith('/resolve') && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length, -'/resolve'.length));
			const existing = await getReportById(env, reportId);
			if (!existing) return jsonResponse({ error: 'Not found' }, request, 404);
			if (existing.authorId !== userId) {
				return jsonResponse({ report: null, error: 'Only the person who filed this report can mark it resolved.' }, request, 403);
			}

			const report = await resolveReport(env, reportId);
			return jsonResponse({ report, error: null }, request);
		}

		if (pathname.startsWith('/reports/') && pathname.endsWith('/watch') && request.method === 'GET') {
			const userId = await verifyAccessToken(env, url.searchParams.get('token') ?? '');
			if (!userId) return new Response('Unauthorized', { status: 401 });

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length, -'/watch'.length));
			const report = await getReportById(env, reportId);
			if (!report) return new Response('Not found', { status: 404 });

			const id = env.REPORT_PRESENCE.idFromName(reportId);
			const stub = env.REPORT_PRESENCE.get(id);
			return stub.fetch(request);
		}

		if (pathname.startsWith('/reports/') && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const reportId = decodeURIComponent(pathname.slice('/reports/'.length));
			const existing = await getReportById(env, reportId);
			if (!existing) return jsonResponse({ error: 'Not found' }, request, 404);

			await recordReportView(env, { reportId, userId });
			const report = await getReportById(env, reportId);
			return jsonResponse({ report }, request);
		}

		if (pathname === '/stations/safety' && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const cacheKey = new Request(url.toString(), { method: 'GET' });
			const cache = caches.default;
			const cached = await cache.match(cacheKey);
			if (cached) return withCors(cached.clone(), request);

			const sinceIso = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
			const reports = await listRecentSafetyReports(env, sinceIso);
			const scores = computeSafetyScores(reports, new Date());
			const response = jsonResponse({ scores }, request);
			response.headers.set('Cache-Control', 'public, max-age=600');
			ctx.waitUntil(cache.put(cacheKey, response.clone()));
			return response;
		}

		if (pathname === '/stations/exits' && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const lat = Number(url.searchParams.get('lat'));
			const lon = Number(url.searchParams.get('lon'));
			if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
				return jsonResponse({ error: 'Invalid coordinates' }, request, 400);
			}

			const cacheKey = new Request(url.toString(), { method: 'GET' });
			const cache = caches.default;
			const cached = await cache.match(cacheKey);
			if (cached) return withCors(cached.clone(), request);

			const exits = await fetchStationExits(lat, lon);
			const response = jsonResponse({ exits }, request);
			response.headers.set('Cache-Control', 'public, max-age=604800');
			ctx.waitUntil(cache.put(cacheKey, response.clone()));
			return response;
		}

		if (pathname === '/trains/live' && request.method === 'GET') {
			const cacheKey = new Request(url.toString(), { method: 'GET' });
			const cache = caches.default;
			const cached = await cache.match(cacheKey);
			if (cached) return withCors(cached.clone(), request);

			const bbox = {
				north: Number(url.searchParams.get('north')),
				west: Number(url.searchParams.get('west')),
				south: Number(url.searchParams.get('south')),
				east: Number(url.searchParams.get('east')),
			};
			const trains = await fetchLiveTrains(bbox);
			const response = jsonResponse({ trains }, request);
			response.headers.set('Cache-Control', 'public, max-age=15');
			ctx.waitUntil(cache.put(cacheKey, response.clone()));
			return response;
		}

		if (pathname === '/contacts' && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const contacts = await listTrustedContacts(env, userId);
			return jsonResponse({ contacts }, request);
		}

		if (pathname === '/contacts' && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const { name, email, phone } = (await request.json()) as { name: string; email: string; phone?: string };
			if (!name?.trim() || !email?.includes('@')) {
				return jsonResponse({ error: 'Enter a name and a valid email address.' }, request, 400);
			}
			const trimmedPhone = phone?.trim() || null;
			if (trimmedPhone && !/^\+?[0-9\s-]{7,20}$/.test(trimmedPhone)) {
				return jsonResponse({ error: "That phone number doesn't look quite right." }, request, 400);
			}

			const existingContacts = await listTrustedContacts(env, userId);
			if (existingContacts.length >= 3) {
				return jsonResponse({ error: 'You can add up to 3 trusted contacts. Remove one to add another.' }, request, 400);
			}

			const contact = await insertTrustedContact(env, { userId, name: name.trim(), email: email.trim(), phone: trimmedPhone });
			return jsonResponse({ contact }, request, 201);
		}

		if (pathname.startsWith('/contacts/') && request.method === 'DELETE') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const id = decodeURIComponent(pathname.slice('/contacts/'.length));
			const deleted = await deleteTrustedContact(env, { userId, id });
			return jsonResponse({ ok: deleted }, request, deleted ? 200 : 404);
		}

		if (pathname === '/companion/active' && request.method === 'GET') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const session = await getActiveCompanionSession(env, userId);
			return jsonResponse({ session }, request);
		}

		if (pathname === '/companion/sessions' && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const existing = await getActiveCompanionSession(env, userId);
			if (existing) return jsonResponse({ session: existing }, request, 200);

			const contacts = await listTrustedContacts(env, userId);
			if (contacts.length === 0) {
				return jsonResponse({ session: null, error: 'noContacts' }, request, 400);
			}

			const { destinationLabel, durationMinutes } = (await request.json()) as { destinationLabel?: string; durationMinutes: number };
			const session = await createCompanionSession(env, {
				userId,
				destinationLabel: destinationLabel?.trim() || null,
				durationMinutes,
			});
			return jsonResponse({ session }, request, 201);
		}

		const companionMatch = pathname.match(/^\/companion\/sessions\/([^/]+)\/(checkin|extend|heartbeat|sos)$/);
		if (companionMatch && request.method === 'POST') {
			const userId = await requireUserId(request, env);
			if (!userId) return jsonResponse({ error: 'Unauthorized' }, request, 401);

			const [, sessionId, action] = companionMatch;
			const session = await getCompanionSessionForUser(env, { id: sessionId, userId });
			if (!session) return jsonResponse({ error: 'Not found' }, request, 404);
			if (session.status !== 'active') return jsonResponse({ error: 'Session is not active' }, request, 409);

			if (action === 'checkin') {
				const updated = await checkInCompanionSession(env, sessionId);
				return jsonResponse({ session: updated }, request);
			}

			if (action === 'extend') {
				const { additionalMinutes } = (await request.json()) as { additionalMinutes: number };
				const updated = await extendCompanionSession(env, { id: sessionId, additionalMinutes });
				return jsonResponse({ session: updated }, request);
			}

			if (action === 'heartbeat') {
				const { lat, lon } = (await request.json()) as { lat: number; lon: number };
				await updateCompanionHeartbeat(env, { id: sessionId, lat, lon });
				return jsonResponse({ ok: true }, request);
			}

			// action === 'sos'
			const { lat, lon } = (await request.json()) as { lat: number | null; lon: number | null };
			if (lat != null && lon != null) await updateCompanionHeartbeat(env, { id: sessionId, lat, lon });

			const [contacts, userName] = await Promise.all([listTrustedContacts(env, userId), getProfileFullName(env, userId)]);
			const mapsUrl = lat != null && lon != null ? `https://maps.google.com/?q=${lat},${lon}` : null;
			ctx.waitUntil(
				Promise.all(
					contacts.flatMap((c) => {
						const tasks = [
							sendCompanionAlertEmail(env, {
								to: c.email,
								userName: userName ?? 'Your contact',
								destinationLabel: session.destinationLabel,
								overdueMinutes: 0,
								mapsUrl,
								reason: 'sos',
							}),
						];
						if (c.phone) {
							tasks.push(
								sendSms(env, {
									to: c.phone,
									body: companionAlertSmsBody({
										userName: userName ?? 'Your contact',
										destinationLabel: session.destinationLabel,
										overdueMinutes: 0,
										mapsUrl,
										reason: 'sos',
									}),
								}),
							);
						}
						return tasks;
					}),
				),
			);
			return jsonResponse({ ok: true }, request);
		}

		return jsonResponse({ error: 'Not found' }, request, 404);
	},

	async scheduled(_event, env, ctx): Promise<void> {
		const nowIso = new Date().toISOString();
		const overdue = await listOverdueActiveSessions(env, nowIso);

		ctx.waitUntil(
			Promise.all(
				overdue.map(async (session) => {
					await markCompanionSessionAlerted(env, session.id);

					const [contacts, userName] = await Promise.all([
						listTrustedContacts(env, session.userId),
						getProfileFullName(env, session.userId),
					]);
					const overdueMinutes = Math.max(1, Math.round((Date.now() - new Date(session.expiresAt).getTime()) / 60_000));
					const mapsUrl =
						session.lastLat != null && session.lastLon != null ? `https://maps.google.com/?q=${session.lastLat},${session.lastLon}` : null;

					await Promise.all(
						contacts.flatMap((c) => {
							const tasks = [
								sendCompanionAlertEmail(env, {
									to: c.email,
									userName: userName ?? 'Your contact',
									destinationLabel: session.destinationLabel,
									overdueMinutes,
									mapsUrl,
									reason: 'timeout',
								}),
							];
							if (c.phone) {
								tasks.push(
									sendSms(env, {
										to: c.phone,
										body: companionAlertSmsBody({
											userName: userName ?? 'Your contact',
											destinationLabel: session.destinationLabel,
											overdueMinutes,
											mapsUrl,
											reason: 'timeout',
										}),
									}),
								);
							}
							return tasks;
						}),
					);
				}),
			),
		);
	},
} satisfies ExportedHandler<Env>;
