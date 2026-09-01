import { allStations, type Station } from '../data/stations';
import { allLineDefs } from './lines';
import type { SafetyScore } from '../types';

export interface RouteSegment {
  lineId: string;
  // Ordered stations ridden on this line, including the boundary station
  // shared with the previous/next segment so consecutive segments connect.
  stations: Station[];
}

interface Edge {
  to: string;
  lineId: string;
}

const stationByName = new Map(allStations.map((s) => [s.name, s]));

const graph = new Map<string, Edge[]>();
for (const line of allLineDefs) {
  for (let i = 0; i < line.stations.length - 1; i++) {
    const a = line.stations[i].name;
    const b = line.stations[i + 1].name;
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a)!.push({ to: b, lineId: line.id });
    graph.get(b)!.push({ to: a, lineId: line.id });
  }
}

// Extra "cost" charged when a hop changes line, expressed in equivalent
// stops — biases the shortest path toward fewer transfers rather than the
// fewest stations, which is what a rider actually cares about.
const TRANSFER_PENALTY = 1.5;

// Dijkstra over (station, line-just-ridden) states, not plain stations —
// otherwise the search can't tell whether the next hop is a transfer.
// `stationCost` lets callers bias the search away from specific stations
// (e.g. low-safety ones) without duplicating the search itself.
function runDijkstra(
  originName: string,
  destinationName: string,
  stationCost?: (stationName: string) => number,
): RouteSegment[] | null {
  if (originName === destinationName) return null;
  if (!graph.has(originName) || !graph.has(destinationName)) return null;

  const visited = new Set<string>();
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  const startKey = `${originName}|`;
  dist.set(startKey, 0);
  prev.set(startKey, null);

  const queue: { key: string; station: string; lineId: string | null; cost: number }[] = [
    { key: startKey, station: originName, lineId: null, cost: 0 },
  ];

  let endKey: string | null = null;

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (visited.has(current.key)) continue;
    visited.add(current.key);

    if (current.station === destinationName) {
      endKey = current.key;
      break;
    }

    for (const edge of graph.get(current.station) ?? []) {
      const transferring = current.lineId !== null && current.lineId !== edge.lineId;
      const cost = current.cost + 1 + (transferring ? TRANSFER_PENALTY : 0) + (stationCost?.(edge.to) ?? 0);
      const nextKey = `${edge.to}|${edge.lineId}`;
      if (visited.has(nextKey)) continue;
      const known = dist.get(nextKey);
      if (known === undefined || cost < known) {
        dist.set(nextKey, cost);
        prev.set(nextKey, current.key);
        queue.push({ key: nextKey, station: edge.to, lineId: edge.lineId, cost });
      }
    }
  }

  if (!endKey) return null;

  const path: { station: string; lineId: string }[] = [];
  let key: string | null = endKey;
  while (key) {
    const [station, lineId] = key.split('|');
    if (!lineId) break;
    path.push({ station, lineId });
    key = prev.get(key) ?? null;
  }
  path.reverse();
  if (path.length === 0) return null;

  const segments: RouteSegment[] = [];
  let currentLine = path[0].lineId;
  let currentStations: Station[] = [stationByName.get(originName)!];
  for (const step of path) {
    if (step.lineId !== currentLine) {
      segments.push({ lineId: currentLine, stations: currentStations });
      currentLine = step.lineId;
      currentStations = [currentStations[currentStations.length - 1]];
    }
    currentStations.push(stationByName.get(step.station)!);
  }
  segments.push({ lineId: currentLine, stations: currentStations });

  return segments;
}

export function findRoute(originName: string, destinationName: string): RouteSegment[] | null {
  return runDijkstra(originName, destinationName);
}

// Max "equivalent stops" penalty charged for riding through the least-safe
// station (score 0), scaled down linearly as the score approaches 100 —
// this nudges the search toward safer stations without making it detour
// wildly just to dodge a single low score.
const SAFETY_DETOUR_STOPS = 3;

export function findSafestRoute(
  originName: string,
  destinationName: string,
  safetyScores: Record<string, SafetyScore>,
): RouteSegment[] | null {
  const stationCost = (stationName: string) => {
    const score = safetyScores[stationName]?.score ?? 100;
    return ((100 - score) / 100) * SAFETY_DETOUR_STOPS;
  };
  return runDijkstra(originName, destinationName, stationCost);
}

// Stitches segments into one ordered station list, dropping the duplicate
// boundary station each transfer introduces.
export function flattenRoute(segments: RouteSegment[]): Station[] {
  const stations: Station[] = [];
  segments.forEach((segment, i) => {
    const list = i === 0 ? segment.stations : segment.stations.slice(1);
    stations.push(...list);
  });
  return stations;
}

// Whether two routes ride through the same stations in the same order —
// used to hide the "safest" option when it's identical to the fastest one.
export function routesMatch(a: RouteSegment[], b: RouteSegment[]): boolean {
  const stationsA = flattenRoute(a);
  const stationsB = flattenRoute(b);
  if (stationsA.length !== stationsB.length) return false;
  return stationsA.every((station, i) => station.name === stationsB[i].name);
}

// Worst safety band any station on the route falls into — used to badge a
// route option ("safest" vs "fastest") with an at-a-glance indicator.
export function worstSafetyScore(
  segments: RouteSegment[],
  safetyScores: Record<string, SafetyScore>,
): SafetyScore {
  const stations = flattenRoute(segments);
  let worst: SafetyScore = { score: 100, band: 'green' };
  for (const station of stations) {
    const score = safetyScores[station.name] ?? { score: 100, band: 'green' };
    if (score.score < worst.score) worst = score;
  }
  return worst;
}
