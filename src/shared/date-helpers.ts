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

/** Parse a local-time `HH:MM` string to minutes-since-midnight, or `null` if it
 *  isn't a valid 00:00–23:59 time. Rejects both non-numeric input (`'nonsense'`,
 *  a missing minutes half) and out-of-range values (`'25:00'`, `'12:99'`) so a
 *  hand-edited config can't be silently coerced — `Number('25')` is finite, and
 *  the `Date` constructor would otherwise normalize `25:00` into `01:00` the next
 *  day. Callers treat `null` as a threshold that never triggers. */
function parseHmToMinutes(hm: string): number | null {
  const parts = hm.split(':');
  if (parts.length !== 2) return null;
  const [h, m] = parts.map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** The time-of-day scroll bucket that the local clock `now` falls into, given the
 *  configured afternoon/night start times (HH:MM). Before `afternoonStart` is
 *  'morning'; at/after `nightStart` is 'night'. Used to auto-scroll each chores
 *  column to the relevant section as the day advances (issue #68). */
export function currentScrollBucket(
  now: Date,
  afternoonStart: string,
  nightStart: string,
): 'morning' | 'afternoon' | 'night' {
  // A malformed or out-of-range entry (hand-edited YAML) maps to Infinity — a
  // threshold that never triggers — so the bucket safely falls back to 'morning'.
  const toMin = (hm: string) => parseHmToMinutes(hm) ?? Infinity;
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= toMin(nightStart)) return 'night';
  if (mins >= toMin(afternoonStart)) return 'afternoon';
  return 'morning';
}

/** Milliseconds from `now` until the next occurrence of any HH:MM time in `times`
 *  — today if that time is still ahead, otherwise tomorrow. Always returns a value
 *  > 0 (at an exact boundary it rolls to tomorrow), so a self-rescheduling timer
 *  can't spin in a zero-delay loop. Building each candidate with the local `Date`
 *  constructor keeps DST-transition days correct. Malformed or out-of-range entries
 *  are skipped (they'd otherwise be normalized into the wrong time); returns
 *  `Infinity` when no entry is valid (caller should guard). */
export function msUntilNextDailyBoundary(now: Date, times: string[]): number {
  let best = Infinity;
  for (const t of times) {
    const mins = parseHmToMinutes(t);
    if (mins === null) continue;
    const cand = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(mins / 60), mins % 60, 0, 0,
    );
    if (cand.getTime() <= now.getTime()) cand.setDate(cand.getDate() + 1);
    best = Math.min(best, cand.getTime() - now.getTime());
  }
  return best;
}

/** The most recent occurrence of the local `HH:MM` reset boundary at or before
 *  `now`. A malformed or empty `resetTime` falls back to local midnight, so a
 *  card that has not yet received the integration's configured reset time still
 *  gets a sane day boundary rather than no boundary at all.
 *
 *  Built in the *browser's* zone, not `hass.config.time_zone` — the same convention
 *  every other clock helper here uses (`currentScrollBucket`,
 *  `msUntilNextDailyBoundary`, the chores card's `endOfToday` window). A kiosk in a
 *  different zone to HA shifts the boundary accordingly; if that ever moves to
 *  `hass.config.time_zone`, move all four together rather than mixing conventions
 *  inside one card.
 *
 *  The step-back keeps the result `<= now`. The one residual case is a `reset_time`
 *  that falls inside a spring-forward DST gap (e.g. `02:30` on 2026-03-08 US/Pacific):
 *  the local `Date` constructor normalizes it to 03:30, which needs no step-back, so
 *  for that one day the boundary lands an hour later than configured and a completion
 *  stamped inside the gap reads as stale early. Once a year, bounded by an hour. */
export function lastResetBoundary(now: Date, resetTime: string): Date {
  const mins = parseHmToMinutes(resetTime) ?? 0;
  const boundary = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(mins / 60), mins % 60, 0, 0,
  );
  if (boundary.getTime() > now.getTime()) boundary.setDate(boundary.getDate() - 1);
  return boundary;
}

/** Clock-skew allowance around the reset boundary — see `isCompletionStale`. Sized
 *  well above any plausible browser/HA drift on a LAN, and far below the shortest
 *  interval that could make a genuinely stale row (a day) look fresh. */
const FRESH_COMPLETION_GRACE_MS = 60_000;

/** Whether a completion predates the current reset window — i.e. the integration's
 *  daily reset has already had its chance to clear the task, so the crossed-out row
 *  is left over from a previous day and should no longer render.
 *
 *  The boundary is the configured `reset_time` rather than local midnight on
 *  purpose: `reset_logic.async_perform_daily_reset` is what deletes a completed
 *  chore and flips a completed routine back, so anything completed since the last
 *  boundary is still legitimately "done today" from the card's point of view. Using
 *  midnight would blank a routine completed last night during the 00:00–04:00 gap,
 *  hours before the reset actually restores it.
 *
 *  An absent or unparseable timestamp returns `false` (keep rendering). Nothing in
 *  the frontend can date a completion HA did not stamp, and hiding an undatable row
 *  would make a fresh tap vanish on any backend that does not populate
 *  `TodoItem.completed`. Lucarne's own lists are `local_todo`, which does. */
export function isCompletionStale(
  completed: string | undefined,
  now: Date,
  resetTime: string,
): boolean {
  if (!completed) return false;
  const at = new Date(completed).getTime();
  if (Number.isNaN(at)) return false;
  // `completed` is stamped by the HA server; `now` is the browser's clock. A tap a
  // few seconds either side of the boundary on a browser running ahead of HA would
  // otherwise be stamped just below it and vanish on the spot. Anything this recent
  // is a completion the user is watching happen, whatever the clocks say.
  if (now.getTime() - at < FRESH_COMPLETION_GRACE_MS) return false;
  return at < lastResetBoundary(now, resetTime).getTime();
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
