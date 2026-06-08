import type { CalendarEvent } from './types.js';

/** Returns inclusive array of hours in the band: hoursInBand("07:00","21:00") → [7,8,...,21] */
export function hoursInBand(start: string, end: string): number[] {
  const startH = parseInt(start.split(':')[0], 10);
  const endH = parseInt(end.split(':')[0], 10);
  const hours: number[] = [];
  for (let h = startH; h <= endH; h++) {
    hours.push(h);
  }
  return hours;
}

function bandBoundaries(day: Date, bandStart: string, bandEnd: string): { bandStartMs: number; bandEndMs: number } {
  const [startH, startM] = bandStart.split(':').map(Number);
  const [endH, endM] = bandEnd.split(':').map(Number);

  const bs = new Date(day);
  bs.setHours(startH, startM, 0, 0);

  const be = new Date(day);
  be.setHours(endH, endM, 0, 0);

  return { bandStartMs: bs.getTime(), bandEndMs: be.getTime() };
}

/** Returns true if the event has any portion within the band on the given day. */
export function eventOverlapsBand(event: CalendarEvent, day: Date, bandStart: string, bandEnd: string): boolean {
  const eventStart = parseEventBoundary(event.start).getTime();
  const eventEnd = parseEventBoundary(event.end).getTime();
  const { bandStartMs, bandEndMs } = bandBoundaries(day, bandStart, bandEnd);
  return eventStart < bandEndMs && eventEnd > bandStartMs;
}

/** Returns the clipped portion of an event that falls within the band on the given day, or null. */
export function eventBandPortion(
  event: CalendarEvent,
  day: Date,
  bandStart: string,
  bandEnd: string,
): { start: Date; end: Date } | null {
  const eventStart = parseEventBoundary(event.start).getTime();
  const eventEnd = parseEventBoundary(event.end).getTime();
  const { bandStartMs, bandEndMs } = bandBoundaries(day, bandStart, bandEnd);

  const clippedStart = Math.max(eventStart, bandStartMs);
  const clippedEnd = Math.min(eventEnd, bandEndMs);

  if (clippedStart >= clippedEnd) return null;
  return { start: new Date(clippedStart), end: new Date(clippedEnd) };
}

/** Parse event boundary strings safely in local time. Date-only strings ("YYYY-MM-DD")
 *  are parsed at local midnight matching agenda-strip convention; parsing them as UTC
 *  produces wrong day attribution (e.g., UTC midnight = 4pm Pacific the day before). */
export function parseEventBoundary(value: string): Date {
  return value.length === 10 && !value.includes('T') ? new Date(`${value}T00:00:00`) : new Date(value);
}

/** Milliseconds from `now` until the next local midnight (00:00:00.000).
 *  At exactly midnight it returns one full local day — the delta to the *next*
 *  local midnight, never 0 — so a self-rescheduling timer can't spin in a
 *  zero-delay loop. Building the target with the local `Date` constructor keeps
 *  DST-transition days correct: that "full day" is 23h or 25h when the clocks
 *  change, not a fixed 24h. */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function formatRelativeStart(event: CalendarEvent, now: Date): string {
  const start = parseEventBoundary(event.start);
  const end = parseEventBoundary(event.end);
  const diffMs = start.getTime() - now.getTime();

  // currently happening
  if (now >= start && now < end) return 'now';

  if (diffMs < 0) return '';

  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;

  // Check if tomorrow in local time (before the < 24h hour check, since
  // events the next calendar day are more usefully shown as "tomorrow")
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  if (start >= tomorrowStart && start < tomorrowEnd) return 'tomorrow';

  const diffH = Math.round(diffMs / 3600000);
  if (diffH < 24) return `in ${diffH}h`;

  return start.toLocaleDateString('en-US', { weekday: 'short' });
}
