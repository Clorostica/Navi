import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { PROJECTED_HEIGHT, PROJECTED_WIDTH, project } from '../data/mapProjection';
import { allStations, type Station } from '../data/stations';
import { allLineDefs } from '../lib/lines';
import type { StationHotspot } from '../hooks/useStationHotspots';

export interface HotspotHeatmapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
}

interface HotspotHeatmapProps {
  hotspots: Record<string, StationHotspot> | null;
  selectedStation?: string | null;
  onSelectStation?: (station: Station) => void;
}

const stationByName = new Map(allStations.map((s) => [s.name, s]));

// Report count -> blob radius in the same projected units as the line
// geometry, so a blob's footprint stays proportionate to the map (not a
// fixed screen size) as you zoom. Capped so one heavily reported station
// can't visually swallow its neighbors.
const BASE_RADIUS = 40;
const RADIUS_PER_REPORT = 11;
const MAX_RADIUS = 130;

// Rendered in this order (not by report count) so a red blob always sits on
// top of an overlapping yellow/green one — the worst incident at a spot is
// what should read through, not whichever happened to be biggest.
const BAND_ORDER: StationHotspot['band'][] = ['green', 'yellow', 'red'];

const HotspotHeatmap = forwardRef<HotspotHeatmapHandle, HotspotHeatmapProps>(
  ({ hotspots, selectedStation = null, onSelectStation }, ref) => {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  useImperativeHandle(ref, () => ({
    zoomIn: () => transformRef.current?.zoomIn(0.5, 200),
    zoomOut: () => transformRef.current?.zoomOut(0.5, 200),
  }));

  const blobs = useMemo(() => {
    if (!hotspots) return [];
    return Object.entries(hotspots)
      .map(([name, spot]) => {
        const station = stationByName.get(name);
        if (!station) return null;
        const [x, y] = project(station.lat, station.lon);
        const radius = Math.min(BASE_RADIUS + spot.count * RADIUS_PER_REPORT, MAX_RADIUS);
        return { name, station, x, y, radius, count: spot.count, band: spot.band };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band));
  }, [hotspots]);

  // Faint, single-color network trace for geographic orientation only — full
  // line colors would compete with the heat colors, which are the whole
  // point of this view.
  const linePaths = useMemo(
    () => allLineDefs.map((line) => line.stations.map((s) => project(s.lat, s.lon))),
    [],
  );

  return (
    <div className="berlin-map-wrap">
      {/* Starts zoomed out to the whole network (unlike the nav map, which
          starts close-in) — the point of this view is spotting *where*
          across the city reports concentrate, not wayfinding around one spot. */}
      <TransformWrapper
        ref={transformRef}
        initialScale={0.65}
        minScale={0.4}
        maxScale={12}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ mode: 'zoomIn', step: 0.7 }}
        wheel={{ step: 0.2 }}
      >
        <TransformComponent wrapperClass="berlin-map-transform-wrapper" contentClass="berlin-map-transform-content">
          <svg
            className="berlin-map-svg"
            viewBox={`0 0 ${PROJECTED_WIDTH} ${PROJECTED_HEIGHT}`}
            width={PROJECTED_WIDTH}
            height={PROJECTED_HEIGHT}
            role="img"
            aria-label="Heatmap of recent incident reports across the network"
          >
            <defs>
              <radialGradient id="heatGreen" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--success)" stopOpacity="0.6" />
                <stop offset="55%" stopColor="var(--success)" stopOpacity="0.24" />
                <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatYellow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.65" />
                <stop offset="55%" stopColor="var(--warning)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--warning)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatRed" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.7" />
                <stop offset="55%" stopColor="var(--danger)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect x={0} y={0} width={PROJECTED_WIDTH} height={PROJECTED_HEIGHT} className="berlin-map-bg" />

            {linePaths.map((points, i) => (
              <polyline
                key={i}
                points={points.map((p) => p.join(',')).join(' ')}
                fill="none"
                className="radar-heatmap-trace"
              />
            ))}

            {blobs.map((blob) => {
              const isSelected = blob.name === selectedStation;
              return (
                <g
                  key={blob.name}
                  className="radar-heatmap-hit"
                  onClick={() => onSelectStation?.(blob.station)}
                >
                  {/* A plain, larger transparent circle carries the tap
                      target — the gradient blob's own edges fade to fully
                      transparent, which shrinks its clickable area on some
                      browsers' hit-testing. */}
                  <circle cx={blob.x} cy={blob.y} r={Math.max(blob.radius, 48)} fill="transparent" />
                  <circle cx={blob.x} cy={blob.y} r={blob.radius} fill={`url(#heat${capitalize(blob.band)})`} pointerEvents="none" />
                  {isSelected && (
                    <circle
                      cx={blob.x}
                      cy={blob.y}
                      r={10}
                      className="berlin-map-selected-ring berlin-map-pulse"
                      pointerEvents="none"
                    />
                  )}
                  <circle
                    cx={blob.x}
                    cy={blob.y}
                    r={isSelected ? 6 : 4}
                    className={`radar-heatmap-core radar-heatmap-core-${blob.band}`}
                    pointerEvents="none"
                  />
                  <text x={blob.x + 8} y={blob.y} className="radar-heatmap-label" pointerEvents="none">
                    {blob.name} · {blob.count}
                  </text>
                </g>
              );
            })}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});

HotspotHeatmap.displayName = 'HotspotHeatmap';

export default HotspotHeatmap;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
