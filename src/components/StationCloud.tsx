import { useMemo, useState } from 'react';
import LineBadge from './LineBadge';
import { copy } from '../content/copy';
import type { Station } from '../data/stations';
import { timeAgo } from '../lib/timeAgo';
import type { Report, ReportCategory } from '../types';

// Fixed, semantic hue per category — never reassigned based on which
// categories happen to be present, so a color always means the same thing.
// "other" folds to a neutral gray instead of taking a 9th hue.
const CATEGORY_COLORS: Record<ReportCategory, string> = {
  foundItem: '#1baf7a',
  lostProperty: '#2a78d6',
  delay: '#eda100',
  damage: '#eb6834',
  theft: '#e34948',
  suspiciousActivity: '#4a3aa7',
  harassment: '#e87ba4',
  medical: '#008300',
  other: '#9b9a94',
};

interface CategoryBucket {
  category: ReportCategory;
  count: number;
  items: Report[];
}

interface StationCloudProps {
  station: Station;
  reports: Report[] | null;
  onClose: () => void;
  onReportHere: () => void;
}

export default function StationCloud({ station, reports, onClose, onReportHere }: StationCloudProps) {
  const [openCategory, setOpenCategory] = useState<ReportCategory | null>(null);

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

      <div className="station-cloud-scroll">
        <div className="station-cloud-body">
          {reports === null && <p className="helper-text">Loading reports…</p>}
          {reports !== null && total === 0 && <p className="helper-text">No reports here yet.</p>}

          {breakdown.length > 0 && (
            <div className="station-cloud-categories">
              {breakdown.map(({ category, items, count }) => {
                const isOpen = openCategory === category;
                const color = CATEGORY_COLORS[category];
                return (
                  <div key={category} className="station-cloud-category">
                    <button
                      type="button"
                      className="station-cloud-category-row"
                      onClick={() => setOpenCategory(isOpen ? null : category)}
                      aria-expanded={isOpen}
                    >
                      <span className="station-cloud-category-dot" style={{ backgroundColor: color }} />
                      <span className="station-cloud-category-name">{copy.reportCategory.categories[category].title}</span>
                      <span className="station-cloud-category-count">{count}</span>
                      <span className={`station-cloud-category-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
                        ›
                      </span>
                    </button>
                    <div className="station-cloud-category-bar-track">
                      <div
                        className="station-cloud-category-bar-fill"
                        style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }}
                      />
                    </div>

                    {isOpen && (
                      <div className="station-cloud-category-reports">
                        {items.slice(0, 5).map((report) => (
                          <div key={report.id} className="station-cloud-report-row">
                            <span className={`severity-dot severity-${report.severity}`} />
                            <span className="station-cloud-report-desc">{report.description}</span>
                            <span className="station-cloud-report-time">{timeAgo(report.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
