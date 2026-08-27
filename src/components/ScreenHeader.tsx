import { copy } from '../content/copy';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
}

export default function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      {onBack ? (
        <button type="button" className="icon-button" onClick={onBack} aria-label={copy.microcopy.back}>
          ←
        </button>
      ) : (
        <span className="icon-button-spacer" />
      )}
      <h1>{title}</h1>
      <span className="icon-button-spacer" />
    </header>
  );
}
