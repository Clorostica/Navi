import { useState } from 'react';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export default function ReportDetailsScreen() {
  const { goBack, navigate, draft, updateDraft } = useApp();
  const c = copy.reportDetails;

  const [description, setDescription] = useState(draft.description ?? '');
  const [additionalDetails, setAdditionalDetails] = useState(draft.additionalDetails ?? '');

  const handleContinue = () => {
    updateDraft({ description, additionalDetails });
    if (draft.severity === 'high') {
      navigate('highSeverityWarning');
    } else if (draft.severity) {
      navigate('reportReview');
    } else {
      navigate('severity');
    }
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.instructions}</p>

        <textarea
          className="textarea"
          placeholder={c.placeholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
        <p className="helper-text">{c.exampleText}</p>

        <label className="field-label" htmlFor="additional-details">
          {c.optionalDetails}
        </label>
        <textarea
          id="additional-details"
          className="textarea"
          value={additionalDetails}
          onChange={(e) => setAdditionalDetails(e.target.value)}
          rows={3}
        />

        <button type="button" className="btn btn-primary" disabled={!description.trim()} onClick={handleContinue}>
          {copy.microcopy.continue}
        </button>
      </div>
    </div>
  );
}
