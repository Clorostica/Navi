import { useEffect, useRef, useState } from 'react';
import BerlinMap, { type BerlinMapHandle } from '../components/BerlinMap';
import NearbyAlertBanner from '../components/NearbyAlertBanner';
import RoutePlanner from '../components/RoutePlanner';
import RouteSummary, { type RouteKind } from '../components/RouteSummary';
import StationBrowser from '../components/StationBrowser';
import StationCloud from '../components/StationCloud';
import { type Station } from '../data/stations';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNearbyReportAlerts } from '../hooks/useNearbyReportAlerts';
import { useStationHotspots } from '../hooks/useStationHotspots';
import { findRoute, findSafestRoute, routesMatch, type RouteSegment } from '../lib/routing';
import { fetchReportsForStation } from '../lib/reports';
import { fetchStationSafety } from '../lib/safety';
import { useApp } from '../state/AppContext';
import type { Report, SafetyScore } from '../types';

export default function HomeScreen() {
  const { navigate, resetDraft, updateDraft, viewReport } = useApp();
  const [selected, setSelected] = useState<Station | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [routes, setRoutes] = useState<Record<RouteKind, RouteSegment[]> | null>(null);
  const [activeRouteKind, setActiveRouteKind] = useState<RouteKind>('fast');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [stationReports, setStationReports] = useState<Report[] | null>(null);
  const [safetyScores, setSafetyScores] = useState<Record<string, SafetyScore> | null>(null);
  const [highlightLine, setHighlightLine] = useState<string | null>(null);
  // True once a station was picked by typing in the search box (as opposed
  // to tapping a line tab and browsing its full stop list) — narrows the map
  // down to just that one pin instead of every stop on its line.
  const [isolateStation, setIsolateStation] = useState(false);
  const mapRef = useRef<BerlinMapHandle>(null);

  // Active for as long as Home is mounted (not just while a route is open)
  // so nearby-incident alerts work without the rider having to open
  // directions first.
  const userPosition = useGeolocation(true);
  const { alert: nearbyAlert, dismiss: dismissNearbyAlert } = useNearbyReportAlerts(userPosition);
  const hotspots = useStationHotspots();
  const activeRoute = routes ? routes[activeRouteKind] : null;
  const showSafeOption = routes ? !routesMatch(routes.fast, routes.safe) : false;

  useEffect(() => {
    if (!selected) {
      setStationReports(null);
      return;
    }
    let cancelled = false;
    setStationReports(null);
    fetchReportsForStation(selected.name).then((reports) => {
      if (!cancelled) setStationReports(reports);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // One request covers every station, so it's fetched once up front rather
  // than per selection.
  useEffect(() => {
    let cancelled = false;
    fetchStationSafety().then((scores) => {
      if (!cancelled) setSafetyScores(scores);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goToStation = (station: Station, opts?: { isSearchResult?: boolean }) => {
    setSelected(station);
    setPickerOpen(false);
    mapRef.current?.flyToStation(station.name);
    if (opts?.isSearchResult) {
      setHighlightLine(station.lines[0] ?? null);
      setIsolateStation(true);
    } else {
      setIsolateStation(false);
    }
  };

  // A line-tab change always means "browse this line" (or clear the
  // filter) — never the isolated single-station view a text search puts you
  // in, so it resets that flag even if it was left on from a prior search.
  const handleLineChange = (lineId: string | null) => {
    setHighlightLine(lineId);
    setIsolateStation(false);
  };

  const startReport = (station?: Station) => {
    resetDraft();
    if (station) {
      updateDraft({ station: station.name, locationMethod: 'manual' });
    }
    navigate('reportCategory');
  };

  const openRoutePlanner = () => {
    setPickerOpen(false);
    setRouteError(null);
    setRoutePlannerOpen(true);
  };

  const handleRouteSelected = (origin: Station, destination: Station) => {
    const fast = findRoute(origin.name, destination.name);
    if (!fast) {
      setRouteError('No encontramos una ruta entre esas estaciones.');
      return;
    }
    const safe = findSafestRoute(origin.name, destination.name, safetyScores ?? {}) ?? fast;
    setRoutes({ fast, safe });
    setActiveRouteKind('fast');
    setHighlightLine(null);
    setIsolateStation(false);
    setRoutePlannerOpen(false);
    setRouteError(null);
  };

  return (
    <div className="screen">
      <div className="home-map-screen">
        <div className="home-map-topbar">
          <div className="home-map-search">
            {pickerOpen ? (
              <div className="home-map-search-panel">
                <StationBrowser
                  onSelect={goToStation}
                  onLineChange={handleLineChange}
                  onClose={() => setPickerOpen(false)}
                  safetyScores={safetyScores}
                />
              </div>
            ) : routePlannerOpen ? (
              <div className="home-map-search-panel">
                <RoutePlanner
                  onRouteSelected={handleRouteSelected}
                  onClose={() => {
                    setRoutePlannerOpen(false);
                    setRouteError(null);
                  }}
                  error={routeError}
                />
              </div>
            ) : (
              <div className="home-map-search-row">
                <button type="button" className="home-map-search-trigger" onClick={() => setPickerOpen(true)}>
                  Search for a station
                </button>
                <button type="button" className="home-map-directions" onClick={openRoutePlanner} aria-label="Plan a route">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 19L10 5L14 14L20 5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {!pickerOpen && !routePlannerOpen && (
            <>
              <button type="button" className="home-map-radar" onClick={() => navigate('radar')} aria-label="View incident radar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
                  <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.6" opacity="0.75" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                className="home-map-radar"
                onClick={() => navigate('companionSetup')}
                aria-label="Start Companion Mode"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3L19 6V11C19 15.5 16 19 12 21C8 19 5 15.5 5 11V6L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button type="button" className="home-map-help" onClick={() => navigate('getHelp')} aria-label="Get help">
                ?
              </button>
            </>
          )}
        </div>

        {nearbyAlert && (
          <NearbyAlertBanner
            report={nearbyAlert.report}
            onDismiss={dismissNearbyAlert}
            onView={() => {
              viewReport(nearbyAlert.report);
              dismissNearbyAlert();
            }}
          />
        )}

        <BerlinMap
          ref={mapRef}
          selectedStation={selected?.name ?? null}
          onSelectStation={goToStation}
          highlightLine={highlightLine}
          isolateStation={isolateStation}
          routeSegments={activeRoute}
          userPosition={userPosition}
          safetyScores={safetyScores}
          hotspots={hotspots}
        />

        {!pickerOpen && !routePlannerOpen && (
          <div className="home-map-zoom">
            <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">
              −
            </button>
          </div>
        )}

        {!pickerOpen && !routePlannerOpen && (
          <div className="home-map-footer">
            {selected ? (
              <StationCloud
                key={selected.name}
                station={selected}
                reports={stationReports}
                safetyScores={safetyScores}
                onClose={() => {
                  setSelected(null);
                  if (isolateStation) {
                    setHighlightLine(null);
                    setIsolateStation(false);
                  }
                }}
                onReportHere={() => startReport(selected)}
                onSelectReport={viewReport}
              />
            ) : routes ? (
              <RouteSummary
                routes={routes}
                activeKind={activeRouteKind}
                onSelectKind={setActiveRouteKind}
                showSafeOption={showSafeOption}
                safetyScores={safetyScores}
                onClose={() => setRoutes(null)}
              />
            ) : (
              <button type="button" className="home-report-button" onClick={() => startReport()}>
                REPORT
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
