export async function sendSms(env: Env, { to, body }: { to: string; body: string }): Promise<boolean> {
	const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
	const credentials = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${credentials}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({ From: env.TWILIO_FROM_NUMBER, To: to, Body: body }),
	});

	if (!response.ok) {
		const responseBody = await response.text();
		console.error('sendSms failed', response.status, responseBody);
		return false;
	}

	return true;
}

export function companionAlertSmsBody({
	userName,
	destinationLabel,
	overdueMinutes,
	mapsUrl,
	reason,
}: {
	userName: string;
	destinationLabel: string | null;
	overdueMinutes: number;
	mapsUrl: string | null;
	reason: 'timeout' | 'sos';
}): string {
	const destinationText = destinationLabel ? ` heading to ${destinationLabel}` : '';
	const situation =
		reason === 'sos'
			? `${userName} is in danger and just sent an SOS from Navi${destinationText}.`
			: `${userName} is in danger — they haven't checked in on Navi${destinationText} and were expected ${overdueMinutes} minute${overdueMinutes === 1 ? '' : 's'} ago.`;
	const locationText = mapsUrl ? ` Last known location: ${mapsUrl}` : ' No location is available yet.';
	return `Navi alert: ${situation}${locationText}`;
}
