import { useEffect, useRef, useState } from 'react';
import { distanceMeters, getStationByName } from '../data/stations';
import { fetchRecentReports } from '../lib/reports';
import type { Report, ReportCategory } from '../types';
import type { GeoPosition } from './useGeolocation';

export interface NearbyAlert {
  report: Report;
  distanceMeters: number;
}

const ALERT_RADIUS_METERS = 1200;
const POLL_INTERVAL_MS = 30_000;

// Only categories that call for personal awareness get an interrupting
// banner — delays or lost items aren't worth a "something happened" alert.
const ALERT_CATEGORIES = new Set<ReportCategory>([
  'theft',
  'harassment',
  'suspiciousActivity',
  'medical',
  'fight',
  'aggressivePerson',
  'smoke',
]);

// Polls for new reports since mount and surfaces the nearest one that lands
// within ALERT_RADIUS_METERS of the rider's current position. Reports from
// before the hook mounted are never surfaced — this is a "something just
// happened nearby" alert, not a history feed (that's what the map/station
// view is for).
export function useNearbyReportAlerts(position: GeoPosition | null): { alert: NearbyAlert | null; dismiss: () => void } {
  const [alert, setAlert] = useState<NearbyAlert | null>(null);
  const sinceRef = useRef(new Date().toISOString());
  const seenIdsRef = useRef(new Set<string>());
  const positionRef = useRef(position);
  positionRef.current = position;

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const reports = await fetchRecentReports(sinceRef.current);
      if (cancelled) return;
      sinceRef.current = new Date().toISOString();

      const pos = positionRef.current;
      if (!pos) return;

      for (const report of reports) {
        if (seenIdsRef.current.has(report.id) || !ALERT_CATEGORIES.has(report.category)) continue;
        seenIdsRef.current.add(report.id);

        const station = getStationByName(report.station);
        if (!station) continue;

        const distance = distanceMeters(pos.lat, pos.lon, station.lat, station.lon);
        if (distance <= ALERT_RADIUS_METERS) {
          setAlert({ report, distanceMeters: distance });
          break;
        }
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { alert, dismiss: () => setAlert(null) };
}
