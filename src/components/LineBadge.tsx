import { lineColor } from '../lib/lines';

interface LineBadgeProps {
  lineId: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LineBadge({ lineId, size = 'md' }: LineBadgeProps) {
  const isSBahn = lineId.startsWith('S');
  return (
    <span
      className={`line-badge line-badge-${size} ${isSBahn ? 'line-badge-s' : 'line-badge-u'}`}
      style={{ backgroundColor: lineColor(lineId) }}
    >
      {lineId}
    </span>
  );
}
