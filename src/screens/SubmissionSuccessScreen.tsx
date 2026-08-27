import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export default function SubmissionSuccessScreen() {
  const { navigate, lastReportId } = useApp();
  const c = copy.submissionSuccess;

  return (
    <div className="screen">
      <div className="screen-body success-body">
        <div className="success-check">✓</div>
        <h1>{c.confirmation}</h1>
        <p className="subtext">{c.explanation}</p>
        {lastReportId && <p className="report-id">{c.reportId.replace('{id}', lastReportId)}</p>}

        <button type="button" className="btn btn-primary" onClick={() => navigate('myReports')}>
          {c.viewReports}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('home')}>
          {c.backHome}
        </button>
      </div>
    </div>
  );
}
