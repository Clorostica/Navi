import OptionCard from '../components/OptionCard';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';
import type { ReportCategory } from '../types';

export default function ReportCategoryScreen() {
  const { goBack, navigate, updateDraft, draft } = useApp();
  const c = copy.reportCategory;

  const categories = Object.entries(c.categories) as [ReportCategory, { title: string; description: string }][];

  const handleSelect = (category: ReportCategory) => {
    updateDraft({ category });
    navigate(draft.station ? 'reportDetails' : 'location');
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.subtitle}</p>
        <div className="option-list">
          {categories.map(([key, value]) => (
            <OptionCard key={key} title={value.title} description={value.description} onClick={() => handleSelect(key)} />
          ))}
        </div>
      </div>
    </div>
  );
}
