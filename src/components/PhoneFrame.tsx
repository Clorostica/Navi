import type { ReactNode } from 'react';
import { HalloweenOverlay, HalloweenSky } from './HalloweenDecor';
import { useTheme } from '../state/ThemeContext';

export default function PhoneFrame({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="phone-frame" data-theme={theme}>
      <HalloweenSky />
      <div className="phone-screen">{children}</div>
      <HalloweenOverlay />
    </div>
  );
}
