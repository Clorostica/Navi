import { copy } from '../content/copy';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/categories';
import { timeAgo } from '../lib/timeAgo';
import type { Report } from '../types';

interface ReportRowProps {
  report: Report;
  onSelect: (report: Report) => void;
  // Station-cloud rows are already grouped by category and station, so
  // showing those again per-row would be redundant there — only the
  // cross-station, cross-category feed needs this context on every row.
  showMeta?: boolean;
}

export default function ReportRow({ report, onSelect, showMeta = false }: ReportRowProps) {
  return (
    <button type="button" className="report-row" onClick={() => onSelect(report)}>
      <span className={`severity-dot severity-${report.severity}`} />
      {showMeta && (
        <span className="report-row-icon" style={{ backgroundColor: CATEGORY_COLORS[report.category] }} aria-hidden="true">
          {CATEGORY_ICONS[report.category]}
        </span>
      )}
      <span className="report-row-main">
        {showMeta && (
          <span className="report-row-meta">
            <span className="report-row-category">{copy.reportCategory.categories[report.category].title}</span>
            <span className="report-row-meta-sep">·</span>
            <span className="report-row-station">{report.station}</span>
          </span>
        )}
        <span className="report-row-summary">{report.description}</span>
      </span>
      <span className="report-row-time">{timeAgo(report.createdAt)}</span>
      <span className="report-row-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}
