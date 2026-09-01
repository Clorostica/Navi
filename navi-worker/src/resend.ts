export async function sendPasswordResetEmail(env: Env, { to, resetUrl }: { to: string; resetUrl: string }): Promise<boolean> {
	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: env.RESEND_FROM,
			to: [to],
			subject: 'Reset your Navi password',
			html: `<p>Someone requested a password reset for your Navi account.</p><p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires soon.</p><p>If you didn't request this, you can ignore this email.</p>`,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		console.error('sendPasswordResetEmail failed', response.status, body);
		return false;
	}

	return true;
}

export async function sendCompanionAlertEmail(
	env: Env,
	{
		to,
		userName,
		destinationLabel,
		overdueMinutes,
		mapsUrl,
		reason,
	}: {
		to: string;
		userName: string;
		destinationLabel: string | null;
		overdueMinutes: number;
		mapsUrl: string | null;
		reason: 'timeout' | 'sos';
	},
): Promise<boolean> {
	const destinationText = destinationLabel ? ` heading to ${destinationLabel}` : '';
	const subject = reason === 'sos' ? `${userName} needs help right now` : `${userName} hasn't checked in — Navi Companion Mode`;

	const intro =
		reason === 'sos'
			? `<p>${userName} just sent an SOS from Navi's Companion Mode${destinationText}.</p>`
			: `<p>${userName} started a Companion Mode session on Navi${destinationText} and was expected to check in ${overdueMinutes} minute${overdueMinutes === 1 ? '' : 's'} ago, but hasn't.</p>`;

	const locationText = mapsUrl
		? `<p>Last known location: <a href="${mapsUrl}">${mapsUrl}</a></p>`
		: '<p>No location is available yet.</p>';

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: env.RESEND_FROM,
			to: [to],
			subject,
			html: `${intro}${locationText}<p>You're receiving this because ${userName} listed you as a trusted contact in Navi.</p>`,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		console.error('sendCompanionAlertEmail failed', response.status, body);
		return false;
	}

	return true;
}
