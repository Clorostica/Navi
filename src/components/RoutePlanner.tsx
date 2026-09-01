import { useMemo, useState } from 'react';
import LineBadge from './LineBadge';
import { searchStations, type Station } from '../data/stations';

interface RoutePlannerProps {
  onRouteSelected: (origin: Station, destination: Station) => void;
  onClose: () => void;
  error?: string | null;
}

type Step = 'origin' | 'destination';

export default function RoutePlanner({ onRouteSelected, onClose, error = null }: RoutePlannerProps) {
  const [step, setStep] = useState<Step>('origin');
  const [origin, setOrigin] = useState<Station | null>(null);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const matches = query.trim() ? searchStations(query) : [];
    // Can't route to the station you're already at.
    return step === 'destination' && origin ? matches.filter((s) => s.name !== origin.name) : matches;
  }, [query, step, origin]);

  const pick = (station: Station) => {
    if (step === 'origin') {
      setOrigin(station);
      setStep('destination');
      setQuery('');
    } else if (origin) {
      onRouteSelected(origin, station);
    }
  };

  const backToOrigin = () => {
    setStep('origin');
    setQuery('');
  };

  return (
    <div className="route-planner">
      <div className="route-planner-header">
        <div className="route-planner-input-wrap">
          <svg className="station-browser-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="station-browser-input"
            placeholder={step === 'origin' ? '¿Desde dónde salís?' : '¿Hacia dónde vas?'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button type="button" className="station-browser-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      {step === 'destination' && origin && (
        <button type="button" className="route-planner-origin-chip" onClick={backToOrigin}>
          <span className="route-planner-origin-label">Desde</span>
          <span className="route-planner-origin-name">{origin.name}</span>
          <span className="route-planner-origin-edit">Cambiar</span>
        </button>
      )}

      {error && <p className="route-planner-error">{error}</p>}

      <div className="station-browser-scroll">
        <div className="station-browser-results">
          {query.trim() && results.length === 0 && <p className="helper-text">No se encontraron estaciones.</p>}
          {results.map((station) => (
            <button key={station.name} type="button" className="station-item" onClick={() => pick(station)}>
              <span className="station-item-name">{station.name}</span>
              <span className="station-item-lines">
                {station.lines.map((lineId) => (
                  <LineBadge key={lineId} lineId={lineId} size="sm" />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
