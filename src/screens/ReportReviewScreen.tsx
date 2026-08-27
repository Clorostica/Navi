import { useState } from 'react';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';
import type { ReportCategory, Severity } from '../types';

export default function ReportReviewScreen() {
  const { goBack, navigate, draft, submitReport } = useApp();
  const c = copy.reportReview;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryTitle = draft.category
    ? copy.reportCategory.categories[draft.category as ReportCategory].title
    : '—';
  const severityName = draft.severity
    ? copy.severity.levels[draft.severity as Severity].name
    : '—';

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await submitReport();
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.subtitle}</p>

        <div className="review-list">
          <ReviewRow label={c.labels.category} value={categoryTitle} onEdit={() => navigate('reportCategory')} />
          <ReviewRow label={c.labels.station} value={draft.station ?? '—'} onEdit={() => navigate('location')} />
          <ReviewRow
            label={c.labels.description}
            value={draft.description ?? '—'}
            onEdit={() => navigate('reportDetails')}
          />
          <ReviewRow label={c.labels.severity} value={severityName} onEdit={() => navigate('severity')} />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
          {submitting ? copy.microcopy.loading : c.submit}
        </button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="review-row">
      <div>
        <div className="review-label">{label}</div>
        <div className="review-value">{value}</div>
      </div>
      <button type="button" className="link-button" onClick={onEdit}>
        {copy.reportReview.edit}
      </button>
    </div>
  );
}
