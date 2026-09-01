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

// OSM tags the street(s)/landmarks an exit surfaces onto as `destination`
// (semicolon-separated); that's the closest thing to a human-readable label
// an entrance node has, so it doubles as our exit description.
function parseStreets(tags: Record<string, string>): string[] {
	const raw = tags.destination ?? tags['addr:street'] ?? '';
	return raw
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 3);
}

// Real, attributable data only: OpenStreetMap entrance nodes for the exits
// themselves, and OSM police amenities to flag exits within sight of a
// station. We deliberately do NOT fabricate lighting or foot-traffic data —
// neither is available from a public source, so claiming it would be a lie
// dressed up as a safety feature.
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
			// Overpass's Apache front-end 406s requests with no Accept header
			// (which fetch sends none of by default) — curl gets a free pass
			// because it sets one implicitly, but this needs it explicit.
			headers: { 'Content-Type': 'text/plain', Accept: 'application/json', 'User-Agent': 'navi-app (navi-worker)' },
			body: query,
			// The public Overpass instance is noticeably slower than VBB's API —
			// give it real room past its own internal [timeout:15] before we
			// give up and fall back to "no exit data" client-side.
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
			// Multi-level stations sometimes map the same physical exit as
			// several nodes sharing one `ref` letter — keep the first.
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
