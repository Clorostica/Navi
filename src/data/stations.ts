import { uBahnLines } from './berlinUBahn';
import { sBahnLines } from './berlinSBahn';

export interface Station {
  name: string;
  lat: number;
  lon: number;
  lines: string[];
}

const stationMap = new Map<string, Station>();

for (const line of [...uBahnLines, ...sBahnLines]) {
  for (const stop of line.stations) {
    const existing = stationMap.get(stop.name);
    if (existing) {
      if (!existing.lines.includes(line.id)) existing.lines.push(line.id);
    } else {
      stationMap.set(stop.name, { name: stop.name, lat: stop.lat, lon: stop.lon, lines: [line.id] });
    }
  }
}

export const allStations: Station[] = [...stationMap.values()].sort((a, b) => a.name.localeCompare(b.name));

export function getStationByName(name: string): Station | undefined {
  return stationMap.get(name);
}

export function searchStations(query: string): Station[] {
  const q = query.trim().toLowerCase();
  if (!q) return allStations;
  return allStations.filter((station) => station.name.toLowerCase().includes(q));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestStation(lat: number, lon: number): Station {
  let nearest = allStations[0];
  let nearestDistance = Infinity;
  for (const station of allStations) {
    const d = distanceMeters(lat, lon, station.lat, station.lon);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = station;
    }
  }
  return nearest;
}
