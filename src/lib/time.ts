const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;

const berlinHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  hourCycle: 'h23',
});

// Mirrors navi-worker/src/safety.ts's night window so the client-side
// "it's late" note lines up with the server-computed safety score.
export function isBerlinNightHour(date: Date = new Date()): boolean {
  const hour = Number(berlinHourFormatter.format(date));
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}
