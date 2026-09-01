import { useState } from 'react';
import OptionCard from '../components/OptionCard';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';
import type { ReportCategory, Severity } from '../types';

const quickReportMap: Record<'unsafe' | 'medical' | 'theft', { category: ReportCategory; severity: Severity }> = {
  unsafe: { category: 'harassment', severity: 'high' },
  medical: { category: 'medical', severity: 'high' },
  theft: { category: 'theft', severity: 'high' },
};

export default function GetHelpScreen() {
  const { goBack, navigate, updateDraft } = useApp();
  const c = copy.getHelp;
  const [showDanger, setShowDanger] = useState(false);

  const handleQuickReport = (key: 'unsafe' | 'medical' | 'theft') => {
    updateDraft(quickReportMap[key]);
    navigate('location');
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.subtitle}</p>

        {showDanger ? (
          <div className="card tone-high">
            <h2>{c.options.immediateDanger.title}</h2>
            <p>{c.options.immediateDanger.description}</p>
            <a href="tel:112" className="btn btn-danger">
              Call emergency services (112)
            </a>
            <button type="button" className="link-button" onClick={() => setShowDanger(false)}>
              {copy.microcopy.back}
            </button>
          </div>
        ) : (
          <div className="option-list">
            <OptionCard
              title={c.options.unsafe.title}
              description={c.options.unsafe.description}
              onClick={() => handleQuickReport('unsafe')}
            />
            <OptionCard
              title={c.options.medical.title}
              description={c.options.medical.description}
              onClick={() => handleQuickReport('medical')}
            />
            <OptionCard
              title={c.options.theft.title}
              description={c.options.theft.description}
              onClick={() => handleQuickReport('theft')}
            />
            <OptionCard
              title={c.options.companion.title}
              description={c.options.companion.description}
              onClick={() => navigate('companionSetup')}
            />
            <OptionCard
              title={c.options.immediateDanger.title}
              description={c.options.immediateDanger.description}
              tone="high"
              onClick={() => setShowDanger(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
