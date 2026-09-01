import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { mapBounds, PROJECTED_HEIGHT, PROJECTED_WIDTH, project } from '../data/mapProjection';
import { allStations, type Station } from '../data/stations';
import { allLineDefs, lineColor } from '../lib/lines';
import { flattenRoute, type RouteSegment } from '../lib/routing';
import { useLiveTrainPositions } from '../hooks/useLiveTrainPositions';
import { type GeoPosition } from '../hooks/useGeolocation';
import { useTheme } from '../state/ThemeContext';
import type { SafetyScore } from '../types';
import type { StationHotspot } from '../hooks/useStationHotspots';

// Peak-hour reinforcement variants that are fully covered, station-for-station,
// by an already-visible line — drawing them too adds overlapping clutter with
// no visual benefit by default. They stay searchable via allStations, and are
// drawn on demand when explicitly chosen as the highlighted line.
//
// S25, S26 and S75 are NOT included here even though they share a color with
// S2/S7: each has a branch (S75's Wartenberg spur; S25/S26's Teltow Stadt–
// Lankwitz spur) that no other visible line covers, so hiding them left those
// stations floating with no line drawn under them.
const LINES_HIDDEN_FROM_MAP = new Set(['S15', 'S85']);

const defaultLines = allLineDefs.filter((line) => !LINES_HIDDEN_FROM_MAP.has(line.id));

const stationDomId = (index: number) => `berlin-map-station-${index}`;
const LINE_BOUNDS_ID = 'berlin-map-line-bounds';
const LINE_BOUNDS_PADDING = 60;

// Icon sizes are in screen pixels (constant regardless of zoom — see the
// counter-scale trick on each marker's <g>). Without this, icons would grow
// exactly as fast as the gaps between them, so zooming in would never
// actually separate two overlapping stations.
const REGULAR_RADIUS = 11;
const INTERCHANGE_RADIUS = 15;
const HIT_RADIUS = 22;
const CLUSTER_MIN_RADIUS = 16;
const HOTSPOT_BADGE_RADIUS = 9;

// Ghost figures on screen (train-riding + danger-station) should stay in the
// 5-10 range total — enough to notice, not so many the map reads as
// "haunted" everywhere.
const MAX_GHOST_TRAINS = 5;

// Station names are only worth the clutter once a search has narrowed the
// map to a single line — with every line visible at once there are simply
// too many stops for labels to stay legible.
const STATION_LABEL_GAP = 7;

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

// A hooded Death Eater-like wraith rather than a cute rounded ghost — a
// sharp pointed hood, a narrow straight-shouldered robe (not a bell-shaped
// sheet), and an uneven tattered hem with no visible face, just a shadowed
// hollow. Drawn in a local box centered on (0, 0), scaled by `size`.
// Builds the robe outline at a given wind phase `t` (roughly -1..1) — each
// hem point carries its own flutter amplitude (the low, loose tips swing
// further than the points still anchored near the shoulders), so the cloth
// ripples unevenly rather than swaying as one rigid fin.
function ghostPath(s: number, t: number) {
  const pt = (x: number, y: number, amp: number) => `${(x + t * amp) * s},${y * s}`;
  const shoulderX = 6.2 + t * 0.3;
  const hoodX = 0 + t * 0.25;
  return `M ${hoodX * s},${-13 * s}
          L ${(hoodX - 2.1) * s},${-9 * s}
          C ${-shoulderX * s},${-8.4 * s} ${-shoulderX * s},${-3 * s} ${-shoulderX * s * 0.94},${3.5 * s}
          L ${pt(-6, 8, 0.9)}
          L ${pt(-2.8, 14.5, 1.2)}
          L ${pt(0.4, 6.5, 0.4)}
          L ${pt(3.6, 16.5, 1.3)}
          L ${pt(6.4, 9, 0.8)}
          L ${shoulderX * s * 0.94},${3.5 * s}
          C ${shoulderX * s},${-3 * s} ${shoulderX * s},${-8.4 * s} ${(hoodX + 2.1) * s},${-9 * s}
          Z`;
}

function GhostGlyph({ size }: { size: number }) {
  const s = size / 9;
  // Same path "topology" (identical command sequence) at each wind phase, so
  // the browser tweens the coordinates smoothly instead of jump-cutting.
  const frames = [0, 1, 0.35, -1, -0.4, 0].map((t) => ghostPath(s, t));
  return (
    <g className="berlin-map-ghost-glyph" filter="url(#ghostGlow)">
      <path d={frames[0]} fill="#180f22" fillOpacity={0.95} stroke="#6b5a8c" strokeWidth={0.5 * s} strokeLinejoin="round">
        <animate attributeName="d" dur="3.2s" repeatCount="indefinite" values={frames.join(';')} />
      </path>
      {/* A faint center seam so the silhouette reads as draped cloth over a
          body rather than a flat cutout. */}
      <line x1={0} y1={-8 * s} x2={0} y2={2 * s} stroke="#0a0611" strokeWidth={0.4 * s} opacity={0.6} />
      <ellipse cx={0} cy={-4 * s} rx={2.2 * s} ry={3.4 * s} fill="#050308" opacity={0.9} />
    </g>
  );
}

// A jack-o'-lantern used in place of the plain train glyph for Halloween
// mode station pins — carved triangle eyes/mouth over an orange pumpkin
// body, built from plain shapes like TrainGlyph so it stays crisp at tiny
// pin sizes.
function PumpkinGlyph({ radius }: { radius: number }) {
  const scale = (radius * 1.4) / 16;
  const originX = -12 * scale;
  const originY = -11 * scale;
  const t = (n: number) => originX + n * scale;
  const u = (n: number) => originY + n * scale;
  return (
    <g pointerEvents="none">
      <rect x={t(10.6)} y={u(0.5)} width={2.8 * scale} height={4 * scale} rx={1 * scale} fill="#3a7a2a" />
      <ellipse cx={t(12)} cy={u(11.5)} rx={8.6 * scale} ry={7.4 * scale} fill="#ff8a1f" />
      <path d={`M ${t(12)},${u(4.5)} L ${t(12)},${u(18.5)}`} stroke="#d9670a" strokeWidth={0.9 * scale} />
      <path d={`M ${t(7.4)},${u(6)} Q ${t(9.5)},${u(11.5)} ${t(7.4)},${u(17)}`} stroke="#d9670a" strokeWidth={0.8 * scale} fill="none" />
      <path d={`M ${t(16.6)},${u(6)} Q ${t(14.5)},${u(11.5)} ${t(16.6)},${u(17)}`} stroke="#d9670a" strokeWidth={0.8 * scale} fill="none" />
      <polygon points={`${t(8.2)},${u(9.2)} ${t(10.4)},${u(9.2)} ${t(9.3)},${u(11.6)}`} fill="#2b2f38" />
      <polygon points={`${t(13.6)},${u(9.2)} ${t(15.8)},${u(9.2)} ${t(14.7)},${u(11.6)}`} fill="#2b2f38" />
      <path
        d={`M ${t(8.4)},${u(14)} Q ${t(12)},${u(16.8)} ${t(15.6)},${u(14)}`}
        stroke="#2b2f38"
        strokeWidth={1.1 * scale}
        fill="none"
        strokeLinecap="round"
      />
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

function centroidOf(id: string, members: StationPoint[]): Cluster {
  return {
    id,
    x: members.reduce((sum, m) => sum + m.x, 0) / members.length,
    y: members.reduce((sum, m) => sum + m.y, 0) / members.length,
    members,
  };
}

// Buckets stations into a grid first (cheap), then does a consolidation pass
// merging any two cluster centers still closer than cellSize apart. The grid
// alone isn't enough on its own: two stations a few px apart but straddling
// a cell boundary land in different buckets and never merge, so two pins can
// end up touching — this second pass is what actually guarantees every
// rendered pin (or cluster) keeps a real gap from its neighbors.
function buildClusters(points: StationPoint[], cellSize: number): Cluster[] {
  const cells = new Map<string, StationPoint[]>();
  for (const point of points) {
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(point);
    else cells.set(key, [point]);
  }
  let i = 0;
  let clusters = [...cells.values()].map((members) => centroidOf(`berlin-map-cluster-${i++}`, members));

  let mergedAny = true;
  while (mergedAny) {
    mergedAny = false;
    outer: for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        const dx = clusters[a].x - clusters[b].x;
        const dy = clusters[a].y - clusters[b].y;
        if (Math.hypot(dx, dy) < cellSize) {
          const combined = centroidOf(clusters[a].id, [...clusters[a].members, ...clusters[b].members]);
          clusters = [combined, ...clusters.filter((_, idx) => idx !== a && idx !== b)];
          mergedAny = true;
          break outer;
        }
      }
    }
  }
  return clusters;
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
  // True when highlightLine came from picking one specific station in a text
  // search rather than browsing a line tab — narrows the map down to just
  // that station's pin (plus its line for context) instead of every stop on
  // the line.
  isolateStation?: boolean;
  routeSegments?: RouteSegment[] | null;
  userPosition?: GeoPosition | null;
  safetyScores?: Record<string, SafetyScore> | null;
  hotspots?: Record<string, StationHotspot> | null;
}

const BerlinMap = forwardRef<BerlinMapHandle, BerlinMapProps>(
  (
    {
      selectedStation,
      onSelectStation,
      highlightLine = null,
      isolateStation = false,
      routeSegments = null,
      userPosition = null,
      safetyScores = null,
      hotspots = null,
    },
    ref,
  ) => {
  const { theme } = useTheme();
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  // Halloween starts more zoomed-in than the default theme: stations sit at
  // the same geographic coordinates either way, so a higher scale is what
  // actually buys more screen space between neighboring stops. minScale is
  // raised to match so a pinch-out can't undo it back into the cluttered
  // full-network view.
  const isHalloween = theme === 'halloween';
  const initialScale = isHalloween ? 4.4 : 3.2;
  const minScale = isHalloween ? 1.4 : 0.6;
  // A wider minimum on-screen gap in Halloween mode — stations fold into a
  // numbered cluster sooner, so the ones left as individual pins stay
  // clearly separated instead of crowding together.
  const clusterScreenPx = isHalloween ? 60 : CLUSTER_SCREEN_PX;
  const [scale, setScale] = useState(initialScale);
  const inverseScale = 1 / scale;

  const liveTrains = useLiveTrainPositions(mapBounds);

  const routeLineIds = useMemo(
    () => (routeSegments ? new Set(routeSegments.map((s) => s.lineId)) : null),
    [routeSegments],
  );

  const routeStationNames = useMemo(() => {
    if (!routeSegments) return null;
    return new Set(flattenRoute(routeSegments).map((s) => s.name));
  }, [routeSegments]);

  // A planned route spans multiple lines by definition, so it takes over the
  // single-line isolation view rather than composing with it — the two
  // filters answer different questions ("show me this line" vs "show me my
  // path") and showing both at once would just be confusing.
  const displayedLines = useMemo(() => {
    if (routeLineIds) return allLineDefs.filter((line) => routeLineIds.has(line.id));
    if (!highlightLine) return defaultLines;
    const line = allLineDefs.find((l) => l.id === highlightLine);
    return line ? [line] : [];
  }, [routeLineIds, highlightLine]);

  // The literal path the rider takes, stitched across line/transfer
  // boundaries — drawn as a distinct overlay on top of the ordinary line
  // polylines so "your route" reads as one continuous thread even where it
  // crosses from one line's track onto another's.
  const routePathPoints = useMemo(() => {
    if (!routeSegments) return null;
    return flattenRoute(routeSegments).map((s) => project(s.lat, s.lon));
  }, [routeSegments]);

  const linePaths = useMemo(
    () =>
      displayedLines.map((line) => ({
        id: line.id,
        color: line.color,
        points: line.stations.map((s) => project(s.lat, s.lon)),
      })),
    [displayedLines],
  );

  // Live trains only get a marker at all in Halloween mode, where they're
  // drawn as little ghosts riding the rails — outside Halloween the map
  // stays clean (no default-theme "cursor" gimmick). Capped well below the
  // real live-train count (which can be dozens across Berlin's network) so
  // the effect reads as a sprinkle of ghosts, not a haunted-looking map.
  const ghostTrains = useMemo(() => {
    if (theme !== 'halloween') return [];
    const visibleLineIds = new Set(displayedLines.map((line) => line.id));
    return liveTrains.filter((train) => visibleLineIds.has(train.line)).slice(0, MAX_GHOST_TRAINS);
  }, [theme, liveTrains, displayedLines]);

  // An invisible rect spanning whatever's currently focused (an isolated
  // line, or a planned route), used purely as a zoomToElement target —
  // that's what pans/zooms the map to actually bring it into view, not just
  // hide everything else.
  const focusBounds = useMemo(() => {
    let points: [number, number][] | null = null;
    if (routePathPoints) {
      points = routePathPoints;
    } else if (highlightLine) {
      const line = allLineDefs.find((l) => l.id === highlightLine);
      if (line) points = line.stations.map((s) => project(s.lat, s.lon));
    }
    if (!points || points.length === 0) return null;
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      x: Math.min(...xs) - LINE_BOUNDS_PADDING,
      y: Math.min(...ys) - LINE_BOUNDS_PADDING,
      width: Math.max(...xs) - Math.min(...xs) + LINE_BOUNDS_PADDING * 2,
      height: Math.max(...ys) - Math.min(...ys) + LINE_BOUNDS_PADDING * 2,
    };
  }, [routePathPoints, highlightLine]);

  useEffect(() => {
    if (!focusBounds) return;
    const raf = requestAnimationFrame(() => {
      transformRef.current?.zoomToElement(LINE_BOUNDS_ID, undefined, 500);
    });
    return () => cancelAnimationFrame(raf);
  }, [focusBounds]);

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

  // Halloween-only easter egg: stations whose safety score has dropped into
  // the worst band get a ghost. Reuses the score we already fetch for the
  // station detail panel rather than a separate raw-report-count endpoint —
  // "red band" is a reasonable stand-in for "lots of reports here."
  const ghostStationNames = useMemo(() => {
    if (theme !== 'halloween' || !safetyScores) return null;
    // Ranking by score (rather than requiring the 'red' band specifically)
    // means the effect still shows up as soon as *any* qualifying reports
    // exist, instead of needing enough of them to cross the red threshold —
    // this is meant to be seen, not just technically correct.
    const worst = Object.entries(safetyScores)
      .filter(([, score]) => score.score < 100)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 5)
      .map(([name]) => name);
    return new Set(worst);
  }, [theme, safetyScores]);

  // Stations off the highlighted line/route are excluded from clustering
  // entirely — they're hidden, so they shouldn't bulk up a neighboring
  // cluster's count. Ghost stations and hotspot stations are excluded too,
  // but for the opposite reason: they're never hidden, so folding one into a
  // cluster bubble would bury the one thing that view is meant to draw
  // attention to — a radar badge only ever renders on an individual pin, so
  // at the default zoomed-out view (where most stations cluster) it would
  // otherwise be invisible even though the data loaded fine.
  const clusterablePoints = useMemo(() => {
    let points = stationPoints;
    if (routeStationNames) points = points.filter((p) => routeStationNames.has(p.station.name));
    else if (highlightLine) points = points.filter((p) => p.station.lines.includes(highlightLine));
    // Isolating a single searched station means it never needs to fold into
    // a cluster with its line-mates — excluding them here (rather than just
    // hiding their pins below) is what keeps a cluster bubble from popping
    // up in the isolated station's place.
    if (isolateStation && selectedStation) points = points.filter((p) => p.station.name === selectedStation);
    if (ghostStationNames) points = points.filter((p) => !ghostStationNames.has(p.station.name));
    if (hotspots) points = points.filter((p) => !hotspots[p.station.name]);
    return points;
  }, [stationPoints, highlightLine, routeStationNames, ghostStationNames, isolateStation, selectedStation, hotspots]);

  const clusters = useMemo(
    () => buildClusters(clusterablePoints, clusterScreenPx / scale),
    [clusterablePoints, scale, clusterScreenPx],
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
        initialScale={initialScale}
        minScale={minScale}
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
              <filter id="ghostGlow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                {/* Tints the blur an icy violet — a "cold spot" aura — since a
                    near-black robe against a near-black map would otherwise
                    glow invisibly dark-on-dark. */}
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="0 0 0 0 0.55
                          0 0 0 0 0.42
                          0 0 0 0 0.85
                          0 0 0 1 0"
                  result="tintedBlur"
                />
                <feMerge>
                  <feMergeNode in="tintedBlur" />
                  <feMergeNode in="tintedBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
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

            {focusBounds && (
              <rect
                id={LINE_BOUNDS_ID}
                x={focusBounds.x}
                y={focusBounds.y}
                width={focusBounds.width}
                height={focusBounds.height}
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
                strokeWidth={9}
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
                strokeWidth={5.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* The rider's actual path, traced on top of the ordinary line
                colors — a white casing for contrast, then a dashed gold
                stroke so it reads as "your route" rather than another rail. */}
            {routePathPoints && (
              <>
                <polyline
                  points={routePathPoints.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
                <polyline
                  points={routePathPoints.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke="#f5a623"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="1 9"
                  className="berlin-map-route-path"
                />
              </>
            )}

            {/* Halloween-only: live trains ride the rails as little ghosts.
                Positioned via inline `style.transform` (not the SVG `transform`
                attribute) so the CSS transition can animate movement between
                polls — CSS transitions don't apply to XML attribute changes. */}
            {theme === 'halloween' &&
              ghostTrains.map((train) => {
                const [x, y] = project(train.lat, train.lon);
                return (
                  <g
                    key={train.id}
                    className="berlin-map-train-ghost"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                    pointerEvents="none"
                  >
                    <g transform={`scale(${inverseScale})`}>
                      <GhostGlyph size={10} />
                    </g>
                  </g>
                );
              })}

            {/* The rider's own position — GPS-driven, only present while a
                route is open (see useGeolocation in HomeScreen) and only
                drawn in Halloween mode, same as the train ghosts above. */}
            {theme === 'halloween' &&
              userPosition &&
              (() => {
                const [x, y] = project(userPosition.lat, userPosition.lon);
                return (
                  <g
                    className="berlin-map-train-ghost berlin-map-user-ghost"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                    pointerEvents="none"
                  >
                    <g transform={`scale(${inverseScale})`}>
                      <GhostGlyph size={15} />
                    </g>
                  </g>
                );
              })()}

            {/* Individual stations always exist in the DOM (so search can zoom to
                them even while clustered) but are invisible while grouped.
                Each marker is counter-scaled so it stays a constant size on
                screen no matter how far the map is zoomed in or out — only
                the real geographic gap between stations grows with zoom. */}
            {orderedPoints.map(({ station, index, x, y, isInterchange }) => {
              const isSelected = station.name === selectedStation;
              const isClustered = clusteredIndexes.has(index);
              // The active station always stays put — a line/route filter
              // narrows what else is visible, but never hides where you
              // already are.
              const isOffHighlightedLine = !isSelected && highlightLine ? !station.lines.includes(highlightLine) : false;
              const isOffRoute = !isSelected && routeStationNames ? !routeStationNames.has(station.name) : false;
              // In isolate mode every other stop on the line stays hidden too
              // (not just off-line ones) — only the searched-for station's
              // own pin should show, with the line drawn purely for context.
              const isOffFocus = !isSelected && isolateStation && Boolean(highlightLine);
              const hidden = isClustered || isOffHighlightedLine || isOffRoute || isOffFocus;
              const isFocused = Boolean(highlightLine || routeStationNames);
              const isGhost = Boolean(ghostStationNames?.has(station.name));
              const hotspot = hotspots?.[station.name] ?? null;
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
                    {isSelected ? (
                      <circle cx={0} cy={0} r={radius * 0.42} fill="#fff" />
                    ) : isHalloween ? (
                      <PumpkinGlyph radius={radius} />
                    ) : (
                      <TrainGlyph radius={radius} />
                    )}
                  </g>
                  {isFocused && !hidden && (
                    <text
                      x={radius + STATION_LABEL_GAP}
                      y={4}
                      className="berlin-map-station-label"
                      pointerEvents="none"
                    >
                      {station.name}
                    </text>
                  )}
                  {isGhost && !hidden && (
                    // Anchored close enough to overlap the top of the pin so
                    // it unmistakably reads as hovering directly over THIS
                    // station, not floating somewhere beside it.
                    <g transform={`translate(0, ${-radius - 18})`} pointerEvents="none">
                      <g className="berlin-map-ghost">
                        <GhostGlyph size={18} />
                      </g>
                    </g>
                  )}
                  {hotspot && !hidden && (
                    // The "radar" badge — how many reports landed here in the
                    // last 24h, colored by the worst one. Only drawn for
                    // stations that actually have recent reports, so it stays
                    // sparse even with every line visible at once.
                    <g
                      transform={`translate(${radius * 0.72}, ${-radius * 0.72})`}
                      className={`berlin-map-hotspot berlin-map-hotspot-${hotspot.band}`}
                      pointerEvents="none"
                    >
                      <circle cx={0} cy={0} r={HOTSPOT_BADGE_RADIUS} stroke="#fff" strokeWidth={1.6} />
                      <text x={0} y={0} textAnchor="middle" dominantBaseline="central">
                        {hotspot.count}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {clusters
              .filter((cluster) => cluster.members.length > 1)
              .map((cluster) => {
                const size = Math.min(CLUSTER_MIN_RADIUS + cluster.members.length * 0.6, 24);
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
