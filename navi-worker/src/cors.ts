export function corsHeaders(request: Request): HeadersInit {
	const origin = request.headers.get('Origin') ?? '*';
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		Vary: 'Origin',
	};
}

export function withCors(response: Response, request: Request): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders(request))) {
		headers.set(key, value);
	}
	return new Response(response.body, { status: response.status, headers });
}

export function jsonResponse(data: unknown, request: Request, status = 200): Response {
	return withCors(
		new Response(JSON.stringify(data), {
			status,
			headers: { 'Content-Type': 'application/json' },
		}),
		request,
	);
}

export function preflightResponse(request: Request): Response {
	return new Response(null, { status: 204, headers: corsHeaders(request) });
}
