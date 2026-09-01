import { useEffect } from 'react';
import { copy } from '../content/copy';
import type { Report } from '../types';

const AUTO_DISMISS_MS = 10_000;

interface Props {
  report: Report;
  onDismiss: () => void;
  onView: () => void;
}

export default function NearbyAlertBanner({ report, onDismiss, onView }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [report.id, onDismiss]);

  const title = copy.reportCategory.categories[report.category]?.title ?? copy.getHelp.title;
  const tip = copy.nearbyAlert.tips[report.category as keyof typeof copy.nearbyAlert.tips];

  return (
    <div className="nearby-alert-banner" role="status" onClick={onView}>
      <span className="nearby-alert-icon" aria-hidden="true">
        ⚠️
      </span>
      <div className="nearby-alert-text">
        <strong>
          {title} {copy.nearbyAlert.reportedAt.replace('{station}', report.station)}
        </strong>
        {tip && <span>{tip}</span>}
      </div>
      <button
        type="button"
        className="nearby-alert-close"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        aria-label={copy.microcopy.close}
      >
        ×
      </button>
    </div>
  );
}
