import ReportRow from '../components/ReportRow';
import { copy } from '../content/copy';
import { useFeedReports } from '../hooks/useFeedReports';
import { useApp } from '../state/AppContext';

export default function FeedScreen() {
  const { viewReport } = useApp();
  const { reports, loading, loadingMore, hasMore, loadMore } = useFeedReports();
  const c = copy.feed;

  return (
    <div className="screen">
      <div className="screen-body">
        <h1>{c.title}</h1>
        <p className="subtext">{c.subtitle}</p>

        {loading && <p className="helper-text">{c.loading}</p>}

        {!loading && reports.length === 0 && <p className="empty-state">{c.emptyState}</p>}

        {reports.length > 0 && (
          <div className="feed-list">
            {reports.map((report) => (
              <ReportRow key={report.id} report={report} onSelect={viewReport} showMeta />
            ))}
          </div>
        )}

        {hasMore && reports.length > 0 && (
          <button type="button" className="link-button feed-load-more" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? copy.microcopy.loading : c.loadMore}
          </button>
        )}
      </div>
    </div>
  );
}
