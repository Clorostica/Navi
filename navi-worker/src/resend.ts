function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => {
		switch (char) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '"':
				return '&quot;';
			default:
				return '&#39;';
		}
	});
}

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

export async function sendEscalationEmail(
	env: Env,
	{
		reportId,
		category,
		station,
		severity,
		description,
	}: {
		reportId: string;
		category: string;
		station: string;
		severity: string;
		description: string;
	},
): Promise<boolean> {
	if (!env.OPERATOR_EMAIL) return false;

	const safeStation = escapeHtml(station);
	const safeCategory = escapeHtml(category);
	const safeSeverity = escapeHtml(severity);
	const safeDescription = escapeHtml(description);

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: env.RESEND_FROM,
			to: [env.OPERATOR_EMAIL],
			subject: `Navi report ${reportId} escalated — ${safeStation}`,
			html: `<p>A Navi rider escalated report <strong>${reportId}</strong> for operator attention.</p><p><strong>Station:</strong> ${safeStation}<br/><strong>Category:</strong> ${safeCategory}<br/><strong>Severity:</strong> ${safeSeverity}</p><p>${safeDescription}</p>`,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		console.error('sendEscalationEmail failed', response.status, body);
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
