import { allStations } from './stations';

const PADDING_DEG = 0.025;
export const PROJECTED_WIDTH = 900;

const lats = allStations.map((s) => s.lat);
const lons = allStations.map((s) => s.lon);

const minLat = Math.min(...lats) - PADDING_DEG;
const maxLat = Math.max(...lats) + PADDING_DEG;
const minLon = Math.min(...lons) - PADDING_DEG;
const maxLon = Math.max(...lons) + PADDING_DEG;

const centerLat = (minLat + maxLat) / 2;
const lonCorrection = Math.cos((centerLat * Math.PI) / 180);

const latSpan = maxLat - minLat;
const lonSpanCorrected = (maxLon - minLon) * lonCorrection;

export const PROJECTED_HEIGHT = Math.round(PROJECTED_WIDTH * (latSpan / lonSpanCorrected));

export function project(lat: number, lon: number): [number, number] {
  const x = (((lon - minLon) * lonCorrection) / lonSpanCorrected) * PROJECTED_WIDTH;
  const y = (1 - (lat - minLat) / latSpan) * PROJECTED_HEIGHT;
  return [x, y];
}
