import OptionCard from '../components/OptionCard';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';
import type { Severity } from '../types';

export default function SeverityScreen() {
  const { goBack, navigate, updateDraft } = useApp();
  const c = copy.severity;

  const handleSelect = (severity: Severity) => {
    updateDraft({ severity });
    navigate(severity === 'high' ? 'highSeverityWarning' : 'reportReview');
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.subtitle}</p>
        <div className="option-list">
          {(Object.keys(c.levels) as Severity[]).map((level) => (
            <OptionCard
              key={level}
              tone={level}
              title={c.levels[level].name}
              description={`${c.levels[level].description} · ${c.levels[level].examples}`}
              onClick={() => handleSelect(level)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
