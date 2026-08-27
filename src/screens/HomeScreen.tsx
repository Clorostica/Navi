import { useEffect, useRef, useState } from 'react';
import BerlinMap, { type BerlinMapHandle } from '../components/BerlinMap';
import BottomNav from '../components/BottomNav';
import StationBrowser from '../components/StationBrowser';
import StationCloud from '../components/StationCloud';
import { type Station } from '../data/stations';
import { fetchReportsForStation } from '../lib/reports';
import { useApp } from '../state/AppContext';
import type { Report } from '../types';

export default function HomeScreen() {
  const { navigate, resetDraft, updateDraft } = useApp();
  const [selected, setSelected] = useState<Station | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stationReports, setStationReports] = useState<Report[] | null>(null);
  const [highlightLine, setHighlightLine] = useState<string | null>(null);
  const mapRef = useRef<BerlinMapHandle>(null);

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

  const goToStation = (station: Station) => {
    setSelected(station);
    setPickerOpen(false);
    mapRef.current?.flyToStation(station.name);
  };

  const startReport = (station?: Station) => {
    resetDraft();
    if (station) {
      updateDraft({ station: station.name, locationMethod: 'manual' });
    }
    navigate('reportCategory');
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
                  onLineChange={setHighlightLine}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
            ) : (
              <button type="button" className="home-map-search-trigger" onClick={() => setPickerOpen(true)}>
                Search for a station
              </button>
            )}
          </div>
          {!pickerOpen && (
            <button type="button" className="home-map-help" onClick={() => navigate('getHelp')} aria-label="Get help">
              ?
            </button>
          )}
        </div>

        <BerlinMap
          ref={mapRef}
          selectedStation={selected?.name ?? null}
          onSelectStation={goToStation}
          highlightLine={highlightLine}
        />

        {!pickerOpen && (
          <div className="home-map-zoom">
            <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">
              −
            </button>
          </div>
        )}

        {!pickerOpen && (
          <div className="home-map-footer">
            {selected ? (
              <StationCloud
                key={selected.name}
                station={selected}
                reports={stationReports}
                onClose={() => setSelected(null)}
                onReportHere={() => startReport(selected)}
              />
            ) : (
              <button type="button" className="home-report-button" onClick={() => startReport()}>
                REPORT
              </button>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
