import { useEffect, useRef, useState } from 'react';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useGeolocation } from '../hooks/useGeolocation';
import { sendHeartbeat } from '../lib/companion';
import { useApp } from '../state/AppContext';

const HEARTBEAT_INTERVAL_MS = 45_000;

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.round(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function CompanionActiveScreen() {
  const { companionSession, checkInSafely, extendCompanion, triggerCompanionSOS, navigate } = useApp();
  const c = copy.companionActive;
  const position = useGeolocation(true);
  const positionRef = useRef(position);
  const sentInitialHeartbeatRef = useRef(false);

  const [, forceTick] = useState(0);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    if (!companionSession) navigate('home');
  }, [companionSession, navigate]);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!companionSession || !position || sentInitialHeartbeatRef.current) return;
    sentInitialHeartbeatRef.current = true;
    sendHeartbeat(companionSession.id, position);
  }, [companionSession, position]);

  useEffect(() => {
    if (!companionSession) return;
    const id = setInterval(() => {
      if (positionRef.current) sendHeartbeat(companionSession.id, positionRef.current);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [companionSession?.id]);

  if (!companionSession) return <div className="screen" />;

  const remainingMs = new Date(companionSession.expiresAt).getTime() - Date.now();

  const handleSosConfirm = async () => {
    await triggerCompanionSOS(positionRef.current);
    setShowSosConfirm(false);
    setSosSent(true);
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={() => navigate('home')} />
      <div className="screen-body companion-active-body">
        {companionSession.destinationLabel && (
          <p className="subtext">{c.destinationLabel.replace('{destination}', companionSession.destinationLabel)}</p>
        )}

        <div className="companion-countdown">
          <span className="companion-countdown-label">{c.countdownLabel}</span>
          <span className="companion-countdown-time">{formatCountdown(remainingMs)}</span>
        </div>

        <button type="button" className="btn btn-primary" onClick={checkInSafely}>
          {c.arrivedButton}
        </button>
        <button type="button" className="btn btn-secondary" onClick={extendCompanion}>
          {c.extendButton}
        </button>

        {sosSent ? (
          <p className="success-text">{c.sosSent}</p>
        ) : showSosConfirm ? (
          <div className="card tone-high">
            <h2>{c.sosConfirm.title}</h2>
            <p>{c.sosConfirm.description}</p>
            <button type="button" className="btn btn-danger" onClick={handleSosConfirm}>
              {c.sosConfirm.confirmButton}
            </button>
            <button type="button" className="link-button" onClick={() => setShowSosConfirm(false)}>
              {copy.microcopy.cancel}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setShowSosConfirm(true)}>
            {c.sosButton}
          </button>
        )}
      </div>
    </div>
  );
}
