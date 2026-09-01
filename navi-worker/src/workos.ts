import { createRemoteJWKSet, jwtVerify } from 'jose';

const WORKOS_API_BASE = 'https://api.workos.com';

export interface WorkosUser {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
}

interface AuthenticateResponse {
	user: WorkosUser;
	access_token: string;
	refresh_token: string;
}

interface WorkosErrorBody {
	code?: string;
	message?: string;
	error?: string;
	error_description?: string;
	errors?: { code?: string; message?: string }[];
}

export type AuthFailure =
	| { ok: false; status: 'checkEmail'; pendingAuthenticationToken: string }
	| { ok: false; status: 'error'; error: string };

export type AuthOutcome = { ok: true; user: WorkosUser; accessToken: string; refreshToken: string } | AuthFailure;

function mapWorkosError(body: WorkosErrorBody & { pending_authentication_token?: string }): AuthFailure {
	if (body.code === 'email_verification_required' && body.pending_authentication_token) {
		return { ok: false, status: 'checkEmail', pendingAuthenticationToken: body.pending_authentication_token };
	}

	if (body.code === 'password_strength_error') {
		const pwned = body.errors?.some((e) => e.code === 'password_pwned');
		if (pwned) {
			return { ok: false, status: 'error', error: 'That password has appeared in known data breaches. Please choose a different one.' };
		}
		return { ok: false, status: 'error', error: 'Please choose a stronger password — avoid common or predictable ones.' };
	}

	if (body.errors?.some((e) => e.code === 'email_not_available')) {
		return { ok: false, status: 'error', error: 'That email’s already registered. Try logging in instead.' };
	}

	const text = `${body.message ?? ''} ${body.error_description ?? ''} ${body.error ?? ''}`.toLowerCase();

	if (text.includes('already exists') || text.includes('already registered')) {
		return { ok: false, status: 'error', error: 'That email’s already registered. Try logging in instead.' };
	}
	if (text.includes('password')) {
		return { ok: false, status: 'error', error: 'Your password needs at least 8 characters and a number.' };
	}
	if (text.includes('invalid') && (text.includes('credentials') || text.includes('email or password'))) {
		return { ok: false, status: 'error', error: 'Email or password doesn’t match. Try again.' };
	}
	return { ok: false, status: 'error', error: 'Something went wrong on our end. Please try again.' };
}

export async function createUser(
	env: Env,
	{ email, password, firstName }: { email: string; password: string; firstName: string },
): Promise<{ ok: true; user: WorkosUser } | { ok: false; outcome: AuthFailure }> {
	const response = await fetch(`${WORKOS_API_BASE}/user_management/users`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.WORKOS_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password, first_name: firstName }),
	});

	const body = (await response.json()) as WorkosUser & WorkosErrorBody;

	if (!response.ok) {
		console.error('createUser failed', response.status, body.code ?? body.error);
		return { ok: false, outcome: mapWorkosError(body) };
	}

	return { ok: true, user: body };
}

export async function authenticateWithPassword(env: Env, { email, password }: { email: string; password: string }): Promise<AuthOutcome> {
	const response = await fetch(`${WORKOS_API_BASE}/user_management/authenticate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: env.WORKOS_CLIENT_ID,
			client_secret: env.WORKOS_API_KEY,
			grant_type: 'password',
			email,
			password,
		}),
	});

	const body = (await response.json()) as AuthenticateResponse & WorkosErrorBody;

	if (!response.ok) {
		console.error('authenticate failed', response.status, body.code ?? body.error);
		return mapWorkosError(body);
	}

	return { ok: true, user: body.user, accessToken: body.access_token, refreshToken: body.refresh_token };
}

export function getGoogleAuthorizationUrl(env: Env): string {
	const params = new URLSearchParams({
		client_id: env.WORKOS_CLIENT_ID,
		provider: 'GoogleOAuth',
		// Must exactly match a redirect URI registered in the WorkOS dashboard
		// (registered as `${APP_URL}/callback`) — WorkOS rejects anything else
		// with a redirect-uri-invalid error before the user even sees Google's
		// consent screen.
		redirect_uri: `${env.APP_URL}/callback`,
		response_type: 'code',
	});
	return `${WORKOS_API_BASE}/user_management/authorize?${params.toString()}`;
}

export async function authenticateWithCode(env: Env, code: string): Promise<AuthOutcome> {
	const response = await fetch(`${WORKOS_API_BASE}/user_management/authenticate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: env.WORKOS_CLIENT_ID,
			client_secret: env.WORKOS_API_KEY,
			grant_type: 'authorization_code',
			code,
		}),
	});

	const body = (await response.json()) as AuthenticateResponse & WorkosErrorBody;

	if (!response.ok) {
		console.error('authenticate with code failed', response.status, body.code ?? body.error);
		return { ok: false, status: 'error', error: 'We couldn’t complete Google sign-in. Please try again.' };
	}

	return { ok: true, user: body.user, accessToken: body.access_token, refreshToken: body.refresh_token };
}

export async function authenticateWithRefreshToken(env: Env, refreshToken: string): Promise<AuthOutcome> {
	const response = await fetch(`${WORKOS_API_BASE}/user_management/authenticate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: env.WORKOS_CLIENT_ID,
			client_secret: env.WORKOS_API_KEY,
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}),
	});

	const body = (await response.json()) as AuthenticateResponse & WorkosErrorBody;

	if (!response.ok) {
		console.error('authenticate failed', response.status, body.code ?? body.error);
		return mapWorkosError(body);
	}

	return { ok: true, user: body.user, accessToken: body.access_token, refreshToken: body.refresh_token };
}

export async function authenticateWithEmailVerificationCode(
	env: Env,
	{ pendingAuthenticationToken, code }: { pendingAuthenticationToken: string; code: string },
): Promise<AuthOutcome> {
	const response = await fetch(`${WORKOS_API_BASE}/user_management/authenticate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: env.WORKOS_CLIENT_ID,
			client_secret: env.WORKOS_API_KEY,
			grant_type: 'urn:workos:oauth:grant-type:email-verification:code',
			pending_authentication_token: pendingAuthenticationToken,
			code,
		}),
	});

	const body = (await response.json()) as AuthenticateResponse & WorkosErrorBody;

	if (!response.ok) {
		console.error('email verification failed', response.status, body.code ?? body.error);
		if (body.code === 'invalid_code' || (body.message ?? '').toLowerCase().includes('code')) {
			return { ok: false, status: 'error', error: 'That code is incorrect or expired. Please try again.' };
		}
		return mapWorkosError(body);
	}

	return { ok: true, user: body.user, accessToken: body.access_token, refreshToken: body.refresh_token };
}

export type PasswordResetTokenResult = { ok: true; token: string } | { ok: false; error: string };

export async function createPasswordResetToken(env: Env, email: string): Promise<PasswordResetTokenResult> {
	const response = await fetch(`${WORKOS_API_BASE}/user_management/password_reset`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.WORKOS_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email }),
	});

	const body = (await response.json()) as { password_reset_token?: string } & WorkosErrorBody;

	if (!response.ok || !body.password_reset_token) {
		console.error('createPasswordResetToken failed', response.status, body.code ?? body.error);
		return { ok: false, error: body.message ?? body.error_description ?? body.error ?? 'unknown_error' };
	}

	return { ok: true, token: body.password_reset_token };
}

export type ResetPasswordResult = { ok: true; user: WorkosUser } | { ok: false; error: string };

export async function resetPassword(env: Env, { token, newPassword }: { token: string; newPassword: string }): Promise<ResetPasswordResult> {
	const response = await fetch(`${WORKOS_API_BASE}/user_management/password_reset/confirm`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.WORKOS_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ token, new_password: newPassword }),
	});

	const body = (await response.json()) as { user?: WorkosUser } & WorkosErrorBody;

	if (!response.ok || !body.user) {
		console.error('resetPassword failed', response.status, body.code ?? body.error);
		const outcome = mapWorkosError(body);
		if (outcome.status === 'error' && (outcome.error.includes('password') || outcome.error.includes('breach'))) {
			return { ok: false, error: outcome.error };
		}
		return { ok: false, error: 'That reset link is invalid or expired. Please request a new one.' };
	}

	return { ok: true, user: body.user };
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function verifyAccessToken(env: Env, token: string): Promise<string | null> {
	try {
		if (!jwks) {
			jwks = createRemoteJWKSet(new URL(`${WORKOS_API_BASE}/sso/jwks/${env.WORKOS_CLIENT_ID}`));
		}
		const { payload } = await jwtVerify(token, jwks);
		return typeof payload.sub === 'string' ? payload.sub : null;
	} catch {
		return null;
	}
}
