import { useEffect, useState } from 'react';
import Field from '../components/Field';
import OptionCard from '../components/OptionCard';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { fetchContacts } from '../lib/contacts';
import { useApp } from '../state/AppContext';

const DURATION_PRESETS_MIN = [10, 20, 30, 45, 60];

function formatArrival(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CompanionSetupScreen() {
  const { goBack, navigate, startCompanion } = useApp();
  const c = copy.companionSetup;

  const [hasContacts, setHasContacts] = useState<boolean | null>(null);
  const [destination, setDestination] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchContacts().then((contacts) => {
      if (!cancelled) setHasContacts(contacts.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = async () => {
    if (!selectedMinutes) return;
    setSubmitting(true);
    setError(null);
    const { error: startError } = await startCompanion({
      destinationLabel: destination.trim() || undefined,
      durationMinutes: selectedMinutes,
    });
    setSubmitting(false);
    if (startError) setError(c.errors.generic);
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.subtitle}</p>

        {hasContacts === false ? (
          <div className="card">
            <h2>{c.noContacts.title}</h2>
            <p>{c.noContacts.description}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('contacts')}>
              {c.noContacts.button}
            </button>
          </div>
        ) : hasContacts === true ? (
          <>
            <Field
              label={c.destinationLabel}
              placeholder={c.destinationPlaceholder}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />

            <p className="field-label">{c.durationTitle}</p>
            <div className="option-list">
              {DURATION_PRESETS_MIN.map((minutes) => (
                <OptionCard
                  key={minutes}
                  title={`${minutes} minutes`}
                  description={c.arrivalPreview.replace('{time}', formatArrival(minutes))}
                  selected={selectedMinutes === minutes}
                  onClick={() => setSelectedMinutes(minutes)}
                />
              ))}
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="button" className="btn btn-primary" disabled={!selectedMinutes || submitting} onClick={handleStart}>
              {submitting ? copy.microcopy.loading : c.startButton}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
