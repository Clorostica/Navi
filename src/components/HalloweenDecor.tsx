import { useState } from 'react';
import { useTheme } from '../state/ThemeContext';

// One wing half — a small pointed ear near the body, a smooth leading edge
// swept out to the wingtip, and a notched trailing edge with two finger-like
// scallops coming back to the body. The mirrored copy (scale(-1,1)) gives
// the other wing, which is what actually reads as "bat" rather than the
// smooth single-swoop "seagull M" a bird silhouette uses — ears + a jagged
// membrane edge are the two shape cues that survive being drawn this small.
const BAT_WING_PATH =
  'M0,-5 L2.4,-8.6 L3.2,-3.6 C7,-5.2 12,-4.6 15.5,-0.4 L10.5,1 L13.6,4.4 L7,2.2 L8.2,6.2 L1.8,2.6 L0,4.2 Z';

function Bat() {
  return (
    <svg viewBox="-16 -9.5 32 19" className="halloween-bat-svg" aria-hidden="true">
      <g fill="currentColor" stroke="#0a0611" strokeWidth={0.5} strokeLinejoin="round">
        <path d={BAT_WING_PATH} />
        <path d={BAT_WING_PATH} transform="scale(-1,1)" />
        <ellipse cx={0} cy={-1} rx={2.6} ry={3.4} />
      </g>
    </svg>
  );
}

// Small stylized spider — round body, round head, eight legs — drawn in
// currentColor so it inherits `.halloween-spider-body`'s color.
function SpiderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="halloween-spider-svg" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d="M12,10 L3,6" />
        <path d="M12,10 L2.5,10" />
        <path d="M12,10 L4,14.5" />
        <path d="M12,10 L6.5,18.5" />
        <path d="M12,10 L21,6" />
        <path d="M12,10 L21.5,10" />
        <path d="M12,10 L20,14.5" />
        <path d="M12,10 L17.5,18.5" />
      </g>
      <ellipse cx="12" cy="14" rx="4.4" ry="5.2" fill="currentColor" />
      <circle cx="12" cy="7.4" r="3.1" fill="currentColor" />
    </svg>
  );
}

// Hangs from the top edge on a silk thread, drops down, dangles and bobs,
// then retreats — on an infinite CSS loop. Tapping it early-triggers the
// "startled" retreat and, once that finishes, remounts (via `cycle`) so the
// infinite drop animation restarts clean instead of resuming mid-timeline.
function Spider() {
  const [fleeing, setFleeing] = useState(false);
  const [cycle, setCycle] = useState(0);

  return (
    <div key={cycle} className={`halloween-spider${fleeing ? ' halloween-spider--fleeing' : ''}`}>
      <div className="halloween-spider-thread" />
      <div
        className="halloween-spider-body"
        onClick={() => setFleeing(true)}
        onAnimationEnd={(e) => {
          if (fleeing && e.animationName === 'halloween-spider-flee') {
            setFleeing(false);
            setCycle((c) => c + 1);
          }
        }}
      >
        <SpiderIcon />
      </div>
    </div>
  );
}

const COBWEB_PATH =
  'M0,0 L46,46 M0,0 L46,16 M0,0 L46,0 M0,0 L16,46 M0,0 L0,46 M6,6 Q22,14 14,30 Q30,24 26,40';

function Cobweb({ mirrored }: { mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 46 46"
      className={`halloween-cobweb${mirrored ? ' halloween-cobweb-mirrored' : ''}`}
      aria-hidden="true"
    >
      <path
        d={COBWEB_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Moon + stars, rendered BEHIND the screen content (see .halloween-sky's
// negative z-index) so it reads as genuine background ambience instead of a
// glowing circle floating on top of buttons and text.
export function HalloweenSky() {
  const { theme } = useTheme();
  if (theme !== 'halloween') return null;

  return (
    <div className="halloween-sky" aria-hidden="true">
      <div className="halloween-moon" />
      <div className="halloween-stars">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`halloween-star halloween-star-${i}`} />
        ))}
      </div>
    </div>
  );
}

// Drifting bats, the interactive spider, and cobwebbed corners — rendered
// on top of screen content since these are meant to be seen actively
// moving. Pointer-events stay off throughout except on the spider's body.
export function HalloweenOverlay() {
  const { theme } = useTheme();
  if (theme !== 'halloween') return null;

  return (
    <div className="halloween-decor" aria-hidden="true">
      <Cobweb />
      <Cobweb mirrored />
      <Spider />
      <div className="halloween-bat halloween-bat-1">
        <Bat />
      </div>
    </div>
  );
}
