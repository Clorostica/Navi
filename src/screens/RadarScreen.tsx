import { useEffect, useRef, useState } from 'react';
import HotspotHeatmap, { type HotspotHeatmapHandle } from '../components/HotspotHeatmap';
import StationCloud from '../components/StationCloud';
import { copy } from '../content/copy';
import type { Station } from '../data/stations';
import { useStationHotspots } from '../hooks/useStationHotspots';
import { fetchReportsForStation } from '../lib/reports';
import { fetchStationSafety } from '../lib/safety';
import { useApp } from '../state/AppContext';
import type { Report, SafetyScore } from '../types';

export default function RadarScreen() {
  const { goBack, navigate, resetDraft, updateDraft, viewReport } = useApp();
  const hotspots = useStationHotspots();
  const mapRef = useRef<HotspotHeatmapHandle>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [stationReports, setStationReports] = useState<Report[] | null>(null);
  const [safetyScores, setSafetyScores] = useState<Record<string, SafetyScore> | null>(null);
  const c = copy.radar;
  const isEmpty = hotspots !== null && Object.keys(hotspots).length === 0;

  useEffect(() => {
    let cancelled = false;
    fetchStationSafety().then((scores) => {
      if (!cancelled) setSafetyScores(scores);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const startReport = (station: Station) => {
    resetDraft();
    updateDraft({ station: station.name, locationMethod: 'manual' });
    navigate('reportCategory');
  };

  return (
    <div className="screen">
      <div className="home-map-screen">
        <div className="radar-topbar">
          <button type="button" className="radar-back-button" onClick={goBack} aria-label="Back">
            ←
          </button>
          <div className="radar-title-chip">
            <span className="radar-title-chip-title">{c.title}</span>
            <span className="radar-title-chip-subtitle">{c.subtitle}</span>
          </div>
        </div>

        <HotspotHeatmap
          ref={mapRef}
          hotspots={hotspots}
          selectedStation={selected?.name ?? null}
          onSelectStation={setSelected}
        />

        <div className="home-map-zoom">
          <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">
            −
          </button>
        </div>

        {isEmpty && !selected && <p className="radar-empty">{c.empty}</p>}

        {selected ? (
          <div className="home-map-footer">
            <StationCloud
              key={selected.name}
              station={selected}
              reports={stationReports}
              safetyScores={safetyScores}
              onClose={() => setSelected(null)}
              onReportHere={() => startReport(selected)}
              onSelectReport={viewReport}
            />
          </div>
        ) : (
          <div className="radar-legend">
            <span className="radar-legend-item radar-legend-item-red">
              <span className="radar-legend-dot" aria-hidden="true" />
              {c.legend.red}
            </span>
            <span className="radar-legend-item radar-legend-item-yellow">
              <span className="radar-legend-dot" aria-hidden="true" />
              {c.legend.yellow}
            </span>
            <span className="radar-legend-item radar-legend-item-green">
              <span className="radar-legend-dot" aria-hidden="true" />
              {c.legend.green}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
