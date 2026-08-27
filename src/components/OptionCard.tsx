interface OptionCardProps {
  title: string;
  description: string;
  onClick: () => void;
  selected?: boolean;
  tone?: 'default' | 'low' | 'medium' | 'high';
}

export default function OptionCard({ title, description, onClick, selected, tone = 'default' }: OptionCardProps) {
  return (
    <button
      type="button"
      className={`option-card tone-${tone} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="option-card-title">{title}</span>
      <span className="option-card-description">{description}</span>
    </button>
  );
}
