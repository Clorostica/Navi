import { useState } from 'react';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export const DESCRIPTION_MIN_LENGTH = 20;
export const DESCRIPTION_MAX_LENGTH = 500;

export default function ReportDetailsScreen() {
  const { goBack, navigate, draft, updateDraft } = useApp();
  const c = copy.reportDetails;

  const [description, setDescription] = useState(draft.description ?? '');
  const [additionalDetails, setAdditionalDetails] = useState(draft.additionalDetails ?? '');
  const [touched, setTouched] = useState(false);

  const trimmedLength = description.trim().length;
  const isTooShort = trimmedLength > 0 && trimmedLength < DESCRIPTION_MIN_LENGTH;
  const isValid = trimmedLength >= DESCRIPTION_MIN_LENGTH && description.length <= DESCRIPTION_MAX_LENGTH;

  const handleContinue = () => {
    if (!isValid) {
      setTouched(true);
      return;
    }
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
          onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
          onBlur={() => setTouched(true)}
          rows={5}
          maxLength={DESCRIPTION_MAX_LENGTH}
        />
        <p className={`helper-text char-counter${description.length >= DESCRIPTION_MAX_LENGTH ? ' char-counter-limit' : ''}`}>
          {description.length}/{DESCRIPTION_MAX_LENGTH}
        </p>
        {touched && isTooShort && (
          <p className="error-text">
            {c.tooShortError.replace('{min}', String(DESCRIPTION_MIN_LENGTH))}
          </p>
        )}
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

        <button type="button" className="btn btn-primary" disabled={!isValid} onClick={handleContinue}>
          {copy.microcopy.continue}
        </button>
      </div>
    </div>
  );
}
