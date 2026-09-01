import { useMemo } from 'react';
import ExitAdvisor from './ExitAdvisor';
import LineBadge from './LineBadge';
import ReportRow from './ReportRow';
import { copy } from '../content/copy';
import type { Station } from '../data/stations';
import { CATEGORY_COLORS } from '../lib/categories';
import type { Report, ReportCategory, SafetyBand, SafetyScore } from '../types';

const SAFETY_EMOJI: Record<SafetyBand, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
};

interface CategoryBucket {
  category: ReportCategory;
  count: number;
  items: Report[];
}

interface StationCloudProps {
  station: Station;
  reports: Report[] | null;
  safetyScores: Record<string, SafetyScore> | null;
  onClose: () => void;
  onReportHere: () => void;
  onSelectReport: (report: Report) => void;
}

export default function StationCloud({
  station,
  reports,
  safetyScores,
  onClose,
  onReportHere,
  onSelectReport,
}: StationCloudProps) {
  // `safetyScores` itself is null until the one-time fetch resolves; once
  // loaded, a station simply missing from the map means it has zero
  // qualifying reports (score 100) rather than being unknown.
  const safety = safetyScores ? (safetyScores[station.name] ?? { score: 100, band: 'green' as SafetyBand }) : null;
  const hasSafetyData = safetyScores ? station.name in safetyScores : false;

  const breakdown = useMemo<CategoryBucket[]>(() => {
    if (!reports) return [];
    const byCategory = new Map<ReportCategory, Report[]>();
    for (const report of reports) {
      const bucket = byCategory.get(report.category);
      if (bucket) bucket.push(report);
      else byCategory.set(report.category, [report]);
    }
    return [...byCategory.entries()]
      .map(([category, items]) => ({ category, items, count: items.length }))
      .sort((a, b) => b.count - a.count);
  }, [reports]);

  const total = reports?.length ?? 0;
  const maxCount = breakdown[0]?.count ?? 0;

  return (
    <div className="station-cloud">
      <button type="button" className="station-cloud-close" onClick={onClose} aria-label={copy.microcopy.close}>
        ×
      </button>

      <div className="station-cloud-header">
        <div>
          <div className="station-cloud-name">{station.name}</div>
          <div className="station-cloud-lines">
            {station.lines.map((lineId) => (
              <LineBadge key={lineId} lineId={lineId} size="sm" />
            ))}
          </div>
        </div>
        <div className="station-cloud-count">
          <span className="station-cloud-count-value">{reports === null ? '–' : total}</span>
          <span className="station-cloud-count-label">{total === 1 ? 'report' : 'reports'}</span>
        </div>
      </div>

      {safety && (
        <div className={`station-cloud-safety station-cloud-safety-${safety.band}`}>
          <span className="station-cloud-safety-emoji" aria-hidden="true">
            {SAFETY_EMOJI[safety.band]}
          </span>
          <span className="station-cloud-safety-score">{safety.score}/100</span>
          <span className="station-cloud-safety-label">
            — {hasSafetyData ? copy.stationSafety.labels[safety.band] : copy.stationSafety.labels.noData}
          </span>
        </div>
      )}

      <div className="station-cloud-scroll">
        <div className="station-cloud-body">
          <ExitAdvisor station={station} />
          {reports === null && <p className="helper-text">Loading reports…</p>}
          {reports !== null && total === 0 && <p className="helper-text">No reports here yet.</p>}

          {breakdown.length > 0 && (
            <div className="station-cloud-categories">
              {breakdown.map(({ category, items, count }) => {
                const color = CATEGORY_COLORS[category];
                return (
                  <div key={category} className="station-cloud-category">
                    <div className="station-cloud-category-row">
                      <span className="station-cloud-category-dot" style={{ backgroundColor: color }} />
                      <span className="station-cloud-category-name">{copy.reportCategory.categories[category].title}</span>
                      <span className="station-cloud-category-count">{count}</span>
                    </div>
                    <div className="station-cloud-category-bar-track">
                      <div
                        className="station-cloud-category-bar-fill"
                        style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }}
                      />
                    </div>

                    <div className="station-cloud-category-reports">
                      {items.map((report) => (
                        <ReportRow key={report.id} report={report} onSelect={onSelectReport} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button type="button" className="station-cloud-report-button" onClick={onReportHere}>
        Report here
      </button>
    </div>
  );
}
