import { copy } from '../content/copy';
import type { CompanionSession } from '../types';

interface Props {
  session: CompanionSession;
  onOpen: () => void;
}

export default function CompanionBanner({ session, onOpen }: Props) {
  const arrival = new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <button type="button" className="companion-banner" onClick={onOpen}>
      <span className="companion-banner-icon" aria-hidden="true">
        🛡️
      </span>
      <span>{copy.companionBanner.active.replace('{time}', arrival)}</span>
    </button>
  );
}
