import { sBahnLines } from '../data/berlinSBahn';
import { uBahnLines } from '../data/berlinUBahn';

export const allLineDefs = [...uBahnLines, ...sBahnLines];

export function lineColor(lineId: string): string {
  return allLineDefs.find((l) => l.id === lineId)?.color ?? '#14141a';
}
