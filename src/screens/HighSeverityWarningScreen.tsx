import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export default function HighSeverityWarningScreen() {
  const { goBack, navigate } = useApp();
  const c = copy.highSeverityWarning;

  return (
    <div className="screen">
      <ScreenHeader title="" onBack={goBack} />
      <div className="screen-body">
        <div className="card tone-high">
          <h1>{c.headline}</h1>
          <p>{c.explanation}</p>
        </div>

        <a href="tel:112" className="btn btn-danger">
          {c.emergencyOption}
        </a>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('reportReview')}>
          {c.continueOption}
        </button>
      </div>
    </div>
  );
}
