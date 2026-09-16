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
