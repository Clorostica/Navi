import { useEffect, useState } from 'react';
import { copy } from '../content/copy';
import type { Station } from '../data/stations';
import { fetchStationExits } from '../lib/exits';
import { isBerlinNightHour } from '../lib/time';
import type { StationExit } from '../types';

interface ExitAdvisorProps {
  station: Station;
}

export default function ExitAdvisor({ station }: ExitAdvisorProps) {
  const [exits, setExits] = useState<StationExit[] | null>(null);
  const c = copy.exitAdvisor;
  const isNight = isBerlinNightHour();

  useEffect(() => {
    let cancelled = false;
    setExits(null);
    fetchStationExits(station.lat, station.lon).then((result) => {
      if (!cancelled) setExits(result);
    });
    return () => {
      cancelled = true;
    };
  }, [station.lat, station.lon]);

  // Only police proximity is a real, verifiable signal from the data we
  // have — there's no public source for exit-level lighting or foot
  // traffic, so we don't manufacture a "busier exit" claim.
  const recommended = exits?.find((exit) => exit.nearPolice) ?? null;

  return (
    <div className="exit-advisor">
      <div className="exit-advisor-title">{c.title}</div>

      {isNight && <div className="exit-advisor-night">🌙 {c.nightNote}</div>}

      {exits === null && <p className="helper-text">{c.loading}</p>}

      {exits !== null && exits.length === 0 && <p className="helper-text">{c.noData}</p>}

      {exits !== null && exits.length > 0 && (
        <>
          <div className="exit-advisor-label">{c.exitsLabel}</div>
          <div className="exit-advisor-chips">
            {exits.map((exit) => (
              <span
                key={exit.ref}
                className={`exit-advisor-chip${exit.nearPolice ? ' exit-advisor-chip-police' : ''}`}
                title={exit.streets.join(', ')}
              >
                {exit.ref}
                {exit.nearPolice && (
                  <span aria-hidden="true" className="exit-advisor-chip-icon">
                    🚔
                  </span>
                )}
              </span>
            ))}
          </div>

          {recommended && (
            <p className="exit-advisor-recommended">
              {c.recommended
                .replace('{ref}', recommended.ref)
                .replace('{streets}', recommended.streets.length ? ` on ${recommended.streets[0]}` : '')}
            </p>
          )}

          <p className="exit-advisor-attribution">{c.attribution}</p>
        </>
      )}
    </div>
  );
}
