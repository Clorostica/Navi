import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { PROJECTED_HEIGHT, PROJECTED_WIDTH, project } from '../data/mapProjection';
import { allStations, type Station } from '../data/stations';
import { allLineDefs, lineColor } from '../lib/lines';

// Peak-hour reinforcement variants that share a color (and most of the route)
// with a primary line — drawing them too adds overlapping clutter with no
// visual benefit by default. They stay searchable via allStations, and are
// drawn on demand when explicitly chosen as the highlighted line.
const LINES_HIDDEN_FROM_MAP = new Set(['S15', 'S25', 'S26', 'S75', 'S85']);

const defaultLines = allLineDefs.filter((line) => !LINES_HIDDEN_FROM_MAP.has(line.id));

const stationDomId = (index: number) => `berlin-map-station-${index}`;
const LINE_BOUNDS_ID = 'berlin-map-line-bounds';
const LINE_BOUNDS_PADDING = 60;

// Icon sizes are in screen pixels (constant regardless of zoom — see the
// counter-scale trick on each marker's <g>). Without this, icons would grow
// exactly as fast as the gaps between them, so zooming in would never
// actually separate two overlapping stations.
const REGULAR_RADIUS = 9;
const INTERCHANGE_RADIUS = 12;
const HIT_RADIUS = 18;
const CLUSTER_MIN_RADIUS = 13;

// Stations closer than this on screen (in px) fold into a numbered cluster —
// sized comfortably larger than the icons above so clusters always leave
// room to un-fold into non-overlapping pins as you zoom in.
const CLUSTER_SCREEN_PX = 48;

// Simplified train glyph built from plain shapes (safer at tiny sizes than a
// hand-authored path): a rounded cabin, two windows, two wheels. Drawn in a
// local 0-24 box centered on (12, 11).
function TrainGlyph({ radius }: { radius: number }) {
  const scale = (radius * 1.4) / 16;
  const originX = -12 * scale;
  const originY = -11 * scale;
  const t = (n: number) => originX + n * scale;
  const u = (n: number) => originY + n * scale;
  return (
    <g pointerEvents="none">
      <rect x={t(4)} y={u(3)} width={16 * scale} height={13 * scale} rx={4 * scale} fill="#fff" />
      <rect x={t(6.3)} y={u(6)} width={4.6 * scale} height={4.4 * scale} rx={1.2 * scale} fill="#2b2f38" />
      <rect x={t(13.1)} y={u(6)} width={4.6 * scale} height={4.4 * scale} rx={1.2 * scale} fill="#2b2f38" />
      <circle cx={t(8)} cy={u(17.4)} r={1.7 * scale} fill="#fff" />
      <circle cx={t(16)} cy={u(17.4)} r={1.7 * scale} fill="#fff" />
    </g>
  );
}

interface StationPoint {
  station: Station;
  index: number;
  x: number;
  y: number;
  isInterchange: boolean;
}

interface Cluster {
  id: string;
  x: number;
  y: number;
  members: StationPoint[];
}

function buildClusters(points: StationPoint[], cellSize: number): Cluster[] {
  const cells = new Map<string, StationPoint[]>();
  for (const point of points) {
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(point);
    else cells.set(key, [point]);
  }
  let i = 0;
  return [...cells.values()].map((members) => ({
    id: `berlin-map-cluster-${i++}`,
    x: members.reduce((sum, m) => sum + m.x, 0) / members.length,
    y: members.reduce((sum, m) => sum + m.y, 0) / members.length,
    members,
  }));
}

export interface BerlinMapHandle {
  flyToStation: (stationName: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface BerlinMapProps {
  selectedStation: string | null;
  onSelectStation: (station: Station) => void;
  highlightLine?: string | null;
}

const BerlinMap = forwardRef<BerlinMapHandle, BerlinMapProps>(
  ({ selectedStation, onSelectStation, highlightLine = null }, ref) => {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [scale, setScale] = useState(2.2);
  const inverseScale = 1 / scale;

  // Filtering to one line answers "show me only this line" literally: every
  // other line's polyline disappears (rather than just fading), including
  // peak-hour variants like S25 that are otherwise hidden by default.
  const displayedLines = useMemo(() => {
    if (!highlightLine) return defaultLines;
    const line = allLineDefs.find((l) => l.id === highlightLine);
    return line ? [line] : [];
  }, [highlightLine]);

  const linePaths = useMemo(
    () =>
      displayedLines.map((line) => ({
        id: line.id,
        color: line.color,
        points: line.stations.map((s) => project(s.lat, s.lon)),
      })),
    [displayedLines],
  );

  // An invisible rect spanning the highlighted line's stations, used purely
  // as a zoomToElement target — that's what pans/zooms the map to actually
  // bring the isolated line into view, not just hide everything else.
  const highlightBounds = useMemo(() => {
    if (!highlightLine) return null;
    const line = allLineDefs.find((l) => l.id === highlightLine);
    if (!line) return null;
    const points = line.stations.map((s) => project(s.lat, s.lon));
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      x: Math.min(...xs) - LINE_BOUNDS_PADDING,
      y: Math.min(...ys) - LINE_BOUNDS_PADDING,
      width: Math.max(...xs) - Math.min(...xs) + LINE_BOUNDS_PADDING * 2,
      height: Math.max(...ys) - Math.min(...ys) + LINE_BOUNDS_PADDING * 2,
    };
  }, [highlightLine]);

  useEffect(() => {
    if (!highlightBounds) return;
    const raf = requestAnimationFrame(() => {
      transformRef.current?.zoomToElement(LINE_BOUNDS_ID, undefined, 500);
    });
    return () => cancelAnimationFrame(raf);
  }, [highlightBounds]);

  const stationPoints = useMemo<StationPoint[]>(
    () =>
      allStations.map((station, index) => {
        const [x, y] = project(station.lat, station.lon);
        return { station, index, x, y, isInterchange: station.lines.length > 1 };
      }),
    [],
  );

  const stationIndexByName = useMemo(() => {
    const map = new Map<string, number>();
    stationPoints.forEach(({ station, index }) => map.set(station.name, index));
    return map;
  }, [stationPoints]);

  // Stations off the highlighted line are excluded from clustering entirely —
  // they're hidden, so they shouldn't bulk up a neighboring cluster's count.
  const clusterablePoints = useMemo(
    () => (highlightLine ? stationPoints.filter((p) => p.station.lines.includes(highlightLine)) : stationPoints),
    [stationPoints, highlightLine],
  );

  const clusters = useMemo(
    () => buildClusters(clusterablePoints, CLUSTER_SCREEN_PX / scale),
    [clusterablePoints, scale],
  );

  const clusteredIndexes = useMemo(() => {
    const set = new Set<number>();
    for (const cluster of clusters) {
      if (cluster.members.length > 1) {
        for (const member of cluster.members) set.add(member.index);
      }
    }
    return set;
  }, [clusters]);

  // The selected station always renders last (on top of every other marker,
  // including ones it geographically overlaps) so it's never buried.
  const orderedPoints = useMemo(() => {
    if (!selectedStation) return stationPoints;
    const idx = stationPoints.findIndex((p) => p.station.name === selectedStation);
    if (idx === -1) return stationPoints;
    const copy = stationPoints.slice();
    const [selected] = copy.splice(idx, 1);
    copy.push(selected);
    return copy;
  }, [stationPoints, selectedStation]);

  useImperativeHandle(ref, () => ({
    flyToStation: (stationName: string) => {
      const index = stationIndexByName.get(stationName);
      if (index === undefined || !transformRef.current) return;
      transformRef.current.zoomToElement(stationDomId(index), 5, 500);
    },
    zoomIn: () => transformRef.current?.zoomIn(0.5, 200),
    zoomOut: () => transformRef.current?.zoomOut(0.5, 200),
  }));

  return (
    <div className="berlin-map-wrap">
      <TransformWrapper
        ref={transformRef}
        initialScale={2.2}
        minScale={0.6}
        maxScale={16}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ mode: 'zoomIn', step: 0.7 }}
        wheel={{ step: 0.2 }}
        onTransform={(_, state) => {
          const rounded = Math.round(state.scale * 10) / 10;
          setScale((prev) => (prev === rounded ? prev : rounded));
        }}
      >
        <TransformComponent wrapperClass="berlin-map-transform-wrapper" contentClass="berlin-map-transform-content">
          <svg
            className="berlin-map-svg"
            viewBox={`0 0 ${PROJECTED_WIDTH} ${PROJECTED_HEIGHT}`}
            width={PROJECTED_WIDTH}
            height={PROJECTED_HEIGHT}
            role="img"
            aria-label="Map of Berlin's U-Bahn and S-Bahn stations"
          >
            <defs>
              <filter id="pinShadow" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="0" dy="1.2" stdDeviation="1.3" floodColor="#14141a" floodOpacity="0.4" />
              </filter>
              <radialGradient id="stationGloss" cx="35%" cy="28%" r="75%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                <stop offset="55%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="stationShade" cx="68%" cy="78%" r="75%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
              </radialGradient>
            </defs>

            <rect x={0} y={0} width={PROJECTED_WIDTH} height={PROJECTED_HEIGHT} className="berlin-map-bg" />

            {highlightBounds && (
              <rect
                id={LINE_BOUNDS_ID}
                x={highlightBounds.x}
                y={highlightBounds.y}
                width={highlightBounds.width}
                height={highlightBounds.height}
                fill="none"
                pointerEvents="none"
              />
            )}

            {/* White casing drawn first so crossing lines stay readable */}
            {linePaths.map((line) => (
              <polyline
                key={`${line.id}-casing`}
                points={line.points.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="#f2f1ec"
                strokeWidth={7.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {linePaths.map((line) => (
              <polyline
                key={line.id}
                points={line.points.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke={line.color}
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Individual stations always exist in the DOM (so search can zoom to
                them even while clustered) but are invisible while grouped.
                Each marker is counter-scaled so it stays a constant size on
                screen no matter how far the map is zoomed in or out — only
                the real geographic gap between stations grows with zoom. */}
            {orderedPoints.map(({ station, index, x, y, isInterchange }) => {
              const isSelected = station.name === selectedStation;
              const isClustered = clusteredIndexes.has(index);
              // The active station always stays put — a line filter narrows
              // what else is visible, but never hides where you already are.
              const isOffHighlightedLine = !isSelected && highlightLine ? !station.lines.includes(highlightLine) : false;
              const hidden = isClustered || isOffHighlightedLine;
              const baseRadius = isInterchange ? INTERCHANGE_RADIUS : REGULAR_RADIUS;
              const radius = isSelected ? baseRadius + 5 : baseRadius;
              const fill = isSelected ? 'var(--accent, #6c2bd9)' : isInterchange ? '#14141a' : lineColor(station.lines[0]);

              return (
                <g
                  key={station.name}
                  id={stationDomId(index)}
                  transform={`translate(${x},${y}) scale(${inverseScale})`}
                  style={{ opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' }}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={HIT_RADIUS}
                    fill="transparent"
                    onClick={() => onSelectStation(station)}
                    className="berlin-map-hit"
                  />
                  {isSelected && (
                    <circle cx={0} cy={0} r={radius + 7} className="berlin-map-selected-ring berlin-map-pulse" />
                  )}
                  <g filter="url(#pinShadow)" pointerEvents="none">
                    <circle cx={0} cy={0} r={radius} fill={fill} stroke="#fff" strokeWidth={isSelected ? 3 : 1.6} />
                    <circle cx={0} cy={0} r={radius} fill="url(#stationShade)" />
                    <circle cx={0} cy={0} r={radius} fill="url(#stationGloss)" />
                    {isSelected ? <circle cx={0} cy={0} r={radius * 0.42} fill="#fff" /> : <TrainGlyph radius={radius} />}
                  </g>
                </g>
              );
            })}

            {clusters
              .filter((cluster) => cluster.members.length > 1)
              .map((cluster) => {
                const size = Math.min(CLUSTER_MIN_RADIUS + cluster.members.length * 0.5, 20);
                return (
                  <g
                    key={cluster.id}
                    id={cluster.id}
                    transform={`translate(${cluster.x},${cluster.y}) scale(${inverseScale})`}
                  >
                    <g filter="url(#pinShadow)">
                      <circle
                        cx={0}
                        cy={0}
                        r={size}
                        fill="#14141a"
                        stroke="#fff"
                        strokeWidth={2.5}
                        className="berlin-map-cluster-hit"
                        onClick={() =>
                          transformRef.current?.zoomToElement(cluster.id, Math.min(scale * 2.4, 16), 400)
                        }
                      />
                      <circle cx={0} cy={0} r={size} fill="url(#stationShade)" pointerEvents="none" />
                      <circle cx={0} cy={0} r={size} fill="url(#stationGloss)" pointerEvents="none" />
                    </g>
                    <text
                      x={0}
                      y={size * 0.35}
                      className="berlin-map-cluster-label"
                      fontSize={size}
                      pointerEvents="none"
                    >
                      {cluster.members.length}
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

BerlinMap.displayName = 'BerlinMap';

export default BerlinMap;
