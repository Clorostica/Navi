import { useApp } from '../state/AppContext';
import type { Screen } from '../types';

interface Tab {
  screen: Screen;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { screen: 'feed', label: 'Feed', icon: '⚡' },
  { screen: 'home', label: 'Map', icon: '⌂' },
  { screen: 'reportCategory', label: 'Report', icon: '+' },
  { screen: 'profile', label: 'Profile', icon: '◍' },
];

export default function BottomNav() {
  const { screen, navigate, resetDraft } = useApp();

  const handleClick = (tab: Tab) => {
    if (tab.screen === 'reportCategory') resetDraft();
    navigate(tab.screen);
  };

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.screen}
          type="button"
          className={`bottom-nav-item ${screen === tab.screen ? 'active' : ''}`}
          onClick={() => handleClick(tab)}
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
