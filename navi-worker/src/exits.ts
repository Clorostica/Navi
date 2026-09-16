export interface StationExit {
	ref: string;
	streets: string[];
	lat: number;
	lon: number;
	nearPolice: boolean;
}

interface OverpassElement {
	type: string;
	id: number;
	lat: number;
	lon: number;
	tags?: Record<string, string>;
}

interface OverpassResponse {
	elements: OverpassElement[];
}

const ENTRANCE_RADIUS_METERS = 250;
const POLICE_RADIUS_METERS = 200;
const ENTRANCE_RAILWAY_TAGS = new Set(['subway_entrance', 'train_station_entrance']);

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371000;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseStreets(tags: Record<string, string>): string[] {
	const raw = tags.destination ?? tags['addr:street'] ?? '';
	return raw
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 3);
}

export async function fetchStationExits(lat: number, lon: number): Promise<StationExit[]> {
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

	const policeRadius = ENTRANCE_RADIUS_METERS + POLICE_RADIUS_METERS;
	const query = `[out:json][timeout:15];
(
  node["railway"="subway_entrance"](around:${ENTRANCE_RADIUS_METERS},${lat},${lon});
  node["railway"="train_station_entrance"](around:${ENTRANCE_RADIUS_METERS},${lat},${lon});
  node["amenity"="police"](around:${policeRadius},${lat},${lon});
);
out body;`;

	try {
		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: { 'Content-Type': 'text/plain', Accept: 'application/json', 'User-Agent': 'navi-app (navi-worker)' },
			body: query,
			signal: AbortSignal.timeout(18000),
		});
		if (!response.ok) return [];

		const body = (await response.json()) as OverpassResponse;
		const elements = body.elements ?? [];
		const entrances = elements.filter((el) => el.tags?.railway && ENTRANCE_RAILWAY_TAGS.has(el.tags.railway));
		const policeStations = elements.filter((el) => el.tags?.amenity === 'police');

		const seenRefs = new Set<string>();
		const exits: StationExit[] = [];
		for (const el of entrances) {
			const ref = el.tags?.ref ?? el.tags?.name;
			if (!ref || seenRefs.has(ref)) continue;
			seenRefs.add(ref);

			const nearPolice = policeStations.some((p) => distanceMeters(el.lat, el.lon, p.lat, p.lon) <= POLICE_RADIUS_METERS);

			exits.push({ ref, streets: parseStreets(el.tags ?? {}), lat: el.lat, lon: el.lon, nearPolice });
		}

		return exits.sort((a, b) => a.ref.localeCompare(b.ref));
	} catch (err) {
		console.error('overpass exits error', err);
		return [];
	}
}
