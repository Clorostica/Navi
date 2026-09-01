import { useEffect, useState } from 'react';
import { fetchRecentReports } from '../lib/reports';
import type { SafetyBand } from '../types';

export interface StationHotspot {
  count: number;
  band: SafetyBand;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 60_000;

// "Radar" view: how many reports landed at each station in the last 24h,
// and how bad the worst one was. Recomputed from scratch each poll (rather
// than accumulated incrementally like useNearbyReportAlerts) since the
// window itself slides forward — a report can age out without a new one
// ever arriving.
export function useStationHotspots(): Record<string, StationHotspot> | null {
  const [hotspots, setHotspots] = useState<Record<string, StationHotspot> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const reports = await fetchRecentReports(since);
      if (cancelled) return;

      const byStation = new Map<string, { count: number; band: SafetyBand }>();
      for (const report of reports) {
        const band: SafetyBand = report.severity === 'high' ? 'red' : report.severity === 'medium' ? 'yellow' : 'green';
        const existing = byStation.get(report.station);
        if (existing) {
          existing.count += 1;
          if (band === 'red' || (band === 'yellow' && existing.band === 'green')) existing.band = band;
        } else {
          byStation.set(report.station, { count: 1, band });
        }
      }

      setHotspots(Object.fromEntries(byStation));
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return hotspots;
}
