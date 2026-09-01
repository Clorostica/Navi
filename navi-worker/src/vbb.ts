export interface LiveTrain {
	id: string;
	line: string;
	product: 'suburban' | 'subway';
	lat: number;
	lon: number;
	direction: string | null;
}

interface RadarBbox {
	north: number;
	west: number;
	south: number;
	east: number;
}

interface RadarMovement {
	location?: { latitude?: number; longitude?: number };
	line?: { name?: string; product?: string };
	direction?: string | null;
	trip?: string | number;
}

interface RadarResponse {
	movements?: RadarMovement[];
}

const LIVE_PRODUCTS = new Set(['suburban', 'subway']);

export async function fetchLiveTrains(bbox: RadarBbox): Promise<LiveTrain[]> {
	const { north, west, south, east } = bbox;
	if (![north, west, south, east].every(Number.isFinite)) {
		return [];
	}

	try {
		const url = new URL('https://v6.vbb.transport.rest/radar');
		url.searchParams.set('north', String(north));
		url.searchParams.set('west', String(west));
		url.searchParams.set('south', String(south));
		url.searchParams.set('east', String(east));
		url.searchParams.set('results', '256');
		url.searchParams.set('duration', '30');
		url.searchParams.set('frames', '1');
		url.searchParams.set('polylines', 'false');

		// The upstream radar endpoint is inconsistently slow — the same query
		// has been observed responding in under 2s and timing out past 15s at
		// different moments. 5s was cutting off a large share of otherwise-
		// successful responses; the frontend already polls every 15s and treats
		// an empty result as "no live trains right now" rather than an error,
		// so it's safe to wait longer before giving up.
		const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
		if (!response.ok) {
			console.error('vbb radar failed', response.status);
			return [];
		}

		const body = (await response.json()) as RadarResponse;
		const movements = body.movements ?? [];

		const seenIds = new Set<string>();
		const trains: LiveTrain[] = [];
		for (const movement of movements) {
			const product = movement.line?.product;
			const line = movement.line?.name;
			const lat = movement.location?.latitude;
			const lon = movement.location?.longitude;
			if (!product || !LIVE_PRODUCTS.has(product) || !line || lat === undefined || lon === undefined) {
				continue;
			}
			// `movement.trip` is frequently absent from the radar feed, so the
			// fallback id (line+coords) is our only option — but two distinct
			// vehicles can't occupy the exact same coordinate, so a repeat id
			// means the API reported the same movement twice. Drop it rather
			// than emit a duplicate React key downstream.
			const id = String(movement.trip ?? `${line}-${lat}-${lon}`);
			if (seenIds.has(id)) continue;
			seenIds.add(id);
			trains.push({
				id,
				line,
				product: product as 'suburban' | 'subway',
				lat,
				lon,
				direction: movement.direction ?? null,
			});
		}
		return trains;
	} catch (err) {
		console.error('vbb radar error', err);
		return [];
	}
}
