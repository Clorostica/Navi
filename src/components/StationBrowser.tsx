import { useEffect, useMemo, useState } from 'react';
import LineBadge from './LineBadge';
import { sBahnLines } from '../data/berlinSBahn';
import { uBahnLines } from '../data/berlinUBahn';
import { allStations, searchStations, type Station } from '../data/stations';

const stationByName = new Map(allStations.map((s) => [s.name, s]));

interface StationBrowserProps {
  onSelect: (station: Station) => void;
  placeholder?: string;
  initialLine?: string | null;
  onLineChange?: (lineId: string | null) => void;
  onClose?: () => void;
}

export default function StationBrowser({
  onSelect,
  placeholder = 'Search for a station',
  initialLine = null,
  onLineChange,
  onClose,
}: StationBrowserProps) {
  const [query, setQuery] = useState('');
  const [activeLine, setActiveLine] = useState<string | null>(initialLine);

  const activeLineDef = useMemo(
    () => (activeLine ? [...uBahnLines, ...sBahnLines].find((l) => l.id === activeLine) ?? null : null),
    [activeLine],
  );

  // Reports the active line filter up so a host screen (e.g. the map) can
  // mirror it — filtering to a line here isolates that line on the map too.
  useEffect(() => {
    onLineChange?.(activeLine);
  }, [activeLine, onLineChange]);

  const results = useMemo<Station[]>(() => {
    const q = query.trim().toLowerCase();

    // A line filter narrows the pool; typing on top of it searches within
    // that line rather than resetting to a global search, so "filter by
    // line, then search" behaves as one combined, narrowing filter.
    if (activeLineDef) {
      const lineStations = activeLineDef.stations
        .map((s) => stationByName.get(s.name))
        .filter((s): s is Station => Boolean(s));
      return q ? lineStations.filter((s) => s.name.toLowerCase().includes(q)) : lineStations;
    }

    return q ? searchStations(query) : [];
  }, [query, activeLineDef]);

  // A line filter alone is meant to be browsed on the map (which isolates and
  // fits that line) — the long station list is only worth showing once
  // there's an actual name to search for.
  const hasQuery = query.trim().length > 0;

  return (
    <div className="station-browser">
      <div className="station-browser-header">
        <div className="station-browser-input-wrap">
          <svg className="station-browser-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="station-browser-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {onClose && (
          <button type="button" className="station-browser-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="station-browser-scroll">
        <div className="line-group-label">U-Bahn</div>
        <div className="line-tabs">
          {uBahnLines.map((line) => (
            <button
              key={line.id}
              type="button"
              className={`line-tab ${activeLine === line.id ? 'active' : ''}`}
              aria-pressed={activeLine === line.id}
              onClick={() => setActiveLine((prev) => (prev === line.id ? null : line.id))}
            >
              <LineBadge lineId={line.id} size="md" />
            </button>
          ))}
        </div>

        <div className="line-group-label">S-Bahn</div>
        <div className="line-tabs">
          {sBahnLines.map((line) => (
            <button
              key={line.id}
              type="button"
              className={`line-tab ${activeLine === line.id ? 'active' : ''}`}
              aria-pressed={activeLine === line.id}
              onClick={() => setActiveLine((prev) => (prev === line.id ? null : line.id))}
            >
              <LineBadge lineId={line.id} size="md" />
            </button>
          ))}
        </div>

        {activeLineDef && !hasQuery && (
          <p className="station-browser-count">
            {results.length} {results.length === 1 ? 'station' : 'stations'} on {activeLineDef.id} — tap one on the
            map
          </p>
        )}

        {hasQuery && (
          <div className="station-browser-results">
            {activeLineDef && (
              <p className="station-browser-count">
                {results.length} {results.length === 1 ? 'station' : 'stations'} on {activeLineDef.id}
              </p>
            )}
            {results.length === 0 && <p className="helper-text">No stations found. Try a different name.</p>}
            {results.map((station) => (
              <button key={station.name} type="button" className="station-item" onClick={() => onSelect(station)}>
                <span className="station-item-name">{station.name}</span>
                <span className="station-item-lines">
                  {station.lines.map((lineId) => (
                    <LineBadge key={lineId} lineId={lineId} size="sm" />
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
