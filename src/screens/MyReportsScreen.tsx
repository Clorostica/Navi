import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';
import type { ReportCategory, ReportStatus } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyReportsScreen() {
  const { reports, viewReport } = useApp();
  const c = copy.myReports;

  return (
    <div className="screen">
      <div className="screen-body">
        <h1>{c.title}</h1>

        {reports.length === 0 ? (
          <p className="empty-state">{c.emptyState}</p>
        ) : (
          <div className="report-list">
            {reports.map((report) => (
              <button key={report.id} type="button" className="report-card" onClick={() => viewReport(report)}>
                <div className="report-card-top">
                  <span className="report-category">
                    {copy.reportCategory.categories[report.category as ReportCategory].title}
                  </span>
                  <span className={`status-badge status-${report.status}`}>
                    {c.statuses[report.status as ReportStatus].name}
                  </span>
                </div>
                <p className="report-station">{report.station}</p>
                <p className="report-description">{report.description}</p>
                <p className="report-status-explanation">{c.statuses[report.status as ReportStatus].description}</p>
                <p className="report-meta">
                  {report.id} · {formatDate(report.createdAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
