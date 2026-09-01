import { useEffect, useMemo, useState } from 'react';
import LineBadge from './LineBadge';
import { sBahnLines } from '../data/berlinSBahn';
import { uBahnLines } from '../data/berlinUBahn';
import { allStations, searchStations, type Station } from '../data/stations';
import type { SafetyBand, SafetyScore } from '../types';

const stationByName = new Map(allStations.map((s) => [s.name, s]));

const SAFETY_EMOJI: Record<SafetyBand, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
};

interface StationBrowserProps {
  onSelect: (station: Station, opts?: { isSearchResult?: boolean }) => void;
  placeholder?: string;
  initialLine?: string | null;
  onLineChange?: (lineId: string | null) => void;
  onClose?: () => void;
  safetyScores?: Record<string, SafetyScore> | null;
}

export default function StationBrowser({
  onSelect,
  placeholder = 'Search for a station',
  initialLine = null,
  onLineChange,
  onClose,
  safetyScores = null,
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

  const hasQuery = query.trim().length > 0;
  // A line filter shows its full station list immediately (not just on the
  // map) — you shouldn't have to type a name you don't know yet just to see
  // what's on the line you already picked.
  const showResults = hasQuery || Boolean(activeLineDef);

  // Pressing Enter jumps straight to a match instead of forcing a tap on the
  // results list — an exact (case-insensitive) name match wins if there is
  // one, otherwise the top result in the current list.
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !hasQuery || results.length === 0) return;
    e.preventDefault();
    const q = query.trim().toLowerCase();
    const best = results.find((s) => s.name.toLowerCase() === q) ?? results[0];
    onSelect(best, { isSearchResult: true });
  };

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
            onKeyDown={handleInputKeyDown}
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

        {showResults && (
          <div className="station-browser-results">
            {activeLineDef && (
              <p className="station-browser-count">
                {results.length} {results.length === 1 ? 'station' : 'stations'} on {activeLineDef.id}
              </p>
            )}
            {results.length === 0 && <p className="helper-text">No stations found. Try a different name.</p>}
            {results.map((station) => {
              // Safety is only surfaced for a plain name search — a line
              // filter is about "where does this line go," not "is it safe,"
              // so mixing the two in one list would be more than a user
              // scanning line stops needs to take in at once.
              // A station missing from the map has zero qualifying reports
              // (score 100), matching how the station detail panel treats it.
              const safety =
                !activeLineDef && safetyScores
                  ? (safetyScores[station.name] ?? { score: 100, band: 'green' as SafetyBand })
                  : undefined;
              return (
                <button
                  key={station.name}
                  type="button"
                  className="station-item"
                  onClick={() => onSelect(station, { isSearchResult: hasQuery })}
                >
                  <span className="station-item-name">{station.name}</span>
                  <span className="station-item-meta">
                    {safety && (
                      <span className={`station-item-safety station-item-safety-${safety.band}`}>
                        <span aria-hidden="true">{SAFETY_EMOJI[safety.band]}</span>
                        {safety.score}
                      </span>
                    )}
                    <span className="station-item-lines">
                      {station.lines.map((lineId) => (
                        <LineBadge key={lineId} lineId={lineId} size="sm" />
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
