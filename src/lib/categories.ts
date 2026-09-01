import type { ReportCategory } from '../types';

// Fixed, semantic hue per category — never reassigned based on which
// categories happen to be present, so a color always means the same thing.
// "other" folds to a neutral gray instead of taking its own hue.
export const CATEGORY_COLORS: Record<ReportCategory, string> = {
  foundItem: '#1baf7a',
  lostProperty: '#2a78d6',
  delay: '#eda100',
  damage: '#eb6834',
  theft: '#e34948',
  suspiciousActivity: '#4a3aa7',
  harassment: '#e87ba4',
  medical: '#008300',
  fight: '#b3261e',
  aggressivePerson: '#a15c00',
  smoke: '#5b6b73',
  brokenDoor: '#8a5a34',
  abandonedObject: '#2f9e97',
  other: '#9b9a94',
};

export const CATEGORY_ICONS: Record<ReportCategory, string> = {
  foundItem: '🔍',
  lostProperty: '🎒',
  delay: '🚇',
  damage: '🛠️',
  theft: '💰',
  suspiciousActivity: '👀',
  harassment: '🚫',
  medical: '❤️',
  fight: '🚨',
  aggressivePerson: '👤',
  smoke: '💨',
  brokenDoor: '🚪',
  abandonedObject: '🧳',
  other: 'ℹ️',
};
