import LineBadge from './LineBadge';
import { flattenRoute, worstSafetyScore, type RouteSegment } from '../lib/routing';
import type { SafetyBand, SafetyScore } from '../types';

const SAFETY_EMOJI: Record<SafetyBand, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
};

export type RouteKind = 'fast' | 'safe';

interface RouteSummaryProps {
  routes: Record<RouteKind, RouteSegment[]>;
  activeKind: RouteKind;
  onSelectKind: (kind: RouteKind) => void;
  showSafeOption: boolean;
  safetyScores: Record<string, SafetyScore> | null;
  onClose: () => void;
}

export default function RouteSummary({
  routes,
  activeKind,
  onSelectKind,
  showSafeOption,
  safetyScores,
  onClose,
}: RouteSummaryProps) {
  const route = routes[activeKind];
  const stations = flattenRoute(route);
  const origin = stations[0];
  const destination = stations[stations.length - 1];
  const stops = stations.length - 1;
  const worst = safetyScores ? worstSafetyScore(route, safetyScores) : null;

  return (
    <div className="route-summary">
      <button type="button" className="route-summary-close" onClick={onClose} aria-label="Close route">
        ×
      </button>
      <div className="route-summary-endpoints">
        <span className="route-summary-station">{origin.name}</span>
        <span className="route-summary-arrow" aria-hidden="true">→</span>
        <span className="route-summary-station">{destination.name}</span>
      </div>

      {showSafeOption && (
        <div className="route-summary-tabs">
          <button
            type="button"
            className={`route-summary-tab ${activeKind === 'fast' ? 'route-summary-tab-active' : ''}`}
            onClick={() => onSelectKind('fast')}
          >
            ⚡ Más rápida
          </button>
          <button
            type="button"
            className={`route-summary-tab ${activeKind === 'safe' ? 'route-summary-tab-active' : ''}`}
            onClick={() => onSelectKind('safe')}
          >
            🛡️ Más segura
          </button>
        </div>
      )}

      <div className="route-summary-legs">
        {route.map((segment, i) => (
          <span key={`${segment.lineId}-${i}`} className="route-summary-leg">
            <LineBadge lineId={segment.lineId} size="sm" />
            {i < route.length - 1 && (
              <span className="route-summary-transfer">transbordo en {segment.stations[segment.stations.length - 1].name}</span>
            )}
          </span>
        ))}
        <span className="route-summary-stops">{stops} {stops === 1 ? 'parada' : 'paradas'}</span>
      </div>

      {worst && (
        <div className={`route-summary-safety route-summary-safety-${worst.band}`}>
          <span aria-hidden="true">{SAFETY_EMOJI[worst.band]}</span>
          <span>Punto más bajo en la ruta: {worst.score}/100</span>
        </div>
      )}
    </div>
  );
}
