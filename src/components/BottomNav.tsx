import { useApp } from '../state/AppContext';
import type { Screen } from '../types';

const tabs: { screen: Screen; label: string; icon: string }[] = [
  { screen: 'home', label: 'Home', icon: '⌂' },
  { screen: 'myReports', label: 'Reports', icon: '☰' },
  { screen: 'profile', label: 'Profile', icon: '◍' },
];

export default function BottomNav() {
  const { screen, navigate } = useApp();

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.screen}
          type="button"
          className={`bottom-nav-item ${screen === tab.screen ? 'active' : ''}`}
          onClick={() => navigate(tab.screen)}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
