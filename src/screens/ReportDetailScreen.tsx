import { useEffect, useState } from 'react';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { fetchReportUpdates } from '../lib/reports';
import { timeAgo } from '../lib/timeAgo';
import { useApp } from '../state/AppContext';
import type { ReportCategory, ReportStatus, ReportUpdate } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReportDetailScreen() {
  const { goBack, selectedReport } = useApp();
  const c = copy.reportDetail;
  const [updates, setUpdates] = useState<ReportUpdate[] | null>(null);

  useEffect(() => {
    if (!selectedReport) return;
    let cancelled = false;
    setUpdates(null);
    fetchReportUpdates(selectedReport.id).then((fetched) => {
      if (!cancelled) setUpdates(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedReport]);

  // Only reachable if this screen is entered some way other than
  // `viewReport(report)`, which always sets `selectedReport` first — there's
  // no deep link into this screen today. Render nothing rather than a broken
  // detail view.
  if (!selectedReport) {
    return <div className="screen" />;
  }

  const report = selectedReport;

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <div className="report-card">
          <div className="report-card-top">
            <span className="report-category">{copy.reportCategory.categories[report.category as ReportCategory].title}</span>
            <span className={`status-badge status-${report.status}`}>
              {copy.myReports.statuses[report.status as ReportStatus].name}
            </span>
          </div>
          <p className="report-station">{report.station}</p>
          <p className="report-description">{report.description}</p>
          {report.additionalDetails && <p className="report-description">{report.additionalDetails}</p>}
          <p className="report-meta">
            {report.id} · {formatDate(report.createdAt)}
          </p>
        </div>

        <h2 className="report-detail-timeline-title">{c.timelineTitle}</h2>

        {updates === null && <p className="helper-text">{c.loading}</p>}
        {updates !== null && updates.length === 0 && <p className="helper-text">{c.timelineEmpty}</p>}

        {updates !== null && updates.length > 0 && (
          <div className="report-timeline">
            {updates.map((update) => (
              <div key={update.id} className="report-timeline-item">
                <span className={`status-badge status-${update.status}`}>
                  {copy.myReports.statuses[update.status].name}
                </span>
                {update.message && <p className="report-timeline-message">{update.message}</p>}
                <p className="report-timeline-time">{timeAgo(update.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
