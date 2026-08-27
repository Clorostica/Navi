import type { ReactNode } from 'react';
import { useTheme } from '../state/ThemeContext';

export default function PhoneFrame({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="phone-frame" data-theme={theme}>
      <div className="phone-screen">{children}</div>
    </div>
  );
}
