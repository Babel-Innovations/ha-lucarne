import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoursInBand,
  eventOverlapsBand,
  eventBandPortion,
  formatRelativeStart,
  parseEventBoundary,
  currentScrollBucket,
  msUntilNextDailyBoundary,
  lastResetBoundary,
  isCompletionStale,
} from '../../src/shared/date-helpers.js';
import type { CalendarEvent } from '../../src/shared/types.js';

// TZ=America/Los_Angeles is set in the npm test script

// ---------------------------------------------------------------------------
// parseEventBoundary
// ---------------------------------------------------------------------------
describe('parseEventBoundary', () => {
  it('date-only string → local midnight (hour=0)', () => {
    const d = parseEventBoundary('2026-01-05');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 0); // January
    assert.equal(d.getDate(), 5);
    assert.equal(d.getHours(), 0);
    assert.equal(d.getMinutes(), 0);
  });

  it('ISO datetime string passes through unchanged', () => {
    const d = parseEventBoundary('2026-01-05T10:30:00');
    assert.equal(d.getHours(), 10);
    assert.equal(d.getMinutes(), 30);
  });
});

// ---------------------------------------------------------------------------
// hoursInBand
// ---------------------------------------------------------------------------
describe('hoursInBand', () => {
  it('default 07:00–21:00 returns 15 hours', () => {
    const hours = hoursInBand('07:00', '21:00');
    assert.equal(hours.length, 15);
    assert.equal(hours[0], 7);
    assert.equal(hours[14], 21);
  });

  it('single-hour band returns 1 entry', () => {
    const hours = hoursInBand('12:00', '12:00');
    assert.deepEqual(hours, [12]);
  });

  it('count is unchanged on DST-transition days (band is clock-independent)', () => {
    // The band is determined purely by string parsing — DST does not affect it
    assert.equal(hoursInBand('07:00', '21:00').length, 15);
  });
});

// ---------------------------------------------------------------------------
// eventOverlapsBand
// ---------------------------------------------------------------------------
function makeEvent(start: string, end: string): CalendarEvent {
  return { start, end, summary: 'Test' };
}

describe('eventOverlapsBand', () => {
  const day = new Date('2026-01-05T00:00:00');

  it('event fully inside band → true', () => {
    const e = makeEvent('2026-01-05T10:00:00', '2026-01-05T11:00:00');
    assert.equal(eventOverlapsBand(e, day, '07:00', '21:00'), true);
  });

  it('event partially overlapping at start of band → true', () => {
    const e = makeEvent('2026-01-05T05:00:00', '2026-01-05T09:00:00');
    assert.equal(eventOverlapsBand(e, day, '07:00', '21:00'), true);
  });

  it('event partially overlapping at end of band → true', () => {
    const e = makeEvent('2026-01-05T20:00:00', '2026-01-05T23:00:00');
    assert.equal(eventOverlapsBand(e, day, '07:00', '21:00'), true);
  });

  it('event fully before band → false', () => {
    const e = makeEvent('2026-01-05T04:00:00', '2026-01-05T06:00:00');
    assert.equal(eventOverlapsBand(e, day, '07:00', '21:00'), false);
  });

  it('event fully after band → false', () => {
    const e = makeEvent('2026-01-05T22:00:00', '2026-01-05T23:59:00');
    assert.equal(eventOverlapsBand(e, day, '07:00', '21:00'), false);
  });
});

// ---------------------------------------------------------------------------
// eventBandPortion
// ---------------------------------------------------------------------------
describe('eventBandPortion', () => {
  const day = new Date('2026-01-05T00:00:00');

  it('event fully inside band → clipped equals event', () => {
    const e = makeEvent('2026-01-05T10:00:00', '2026-01-05T11:00:00');
    const portion = eventBandPortion(e, day, '07:00', '21:00');
    assert.ok(portion);
    assert.equal(portion!.start.getHours(), 10);
    assert.equal(portion!.end.getHours(), 11);
  });

  it('event starting before band → clipped to band start', () => {
    const e = makeEvent('2026-01-05T05:00:00', '2026-01-05T09:00:00');
    const portion = eventBandPortion(e, day, '07:00', '21:00');
    assert.ok(portion);
    assert.equal(portion!.start.getHours(), 7);
    assert.equal(portion!.end.getHours(), 9);
  });

  it('event ending after band → clipped to band end', () => {
    const e = makeEvent('2026-01-05T20:00:00', '2026-01-05T23:00:00');
    const portion = eventBandPortion(e, day, '07:00', '21:00');
    assert.ok(portion);
    assert.equal(portion!.start.getHours(), 20);
    assert.equal(portion!.end.getHours(), 21);
  });

  it('event fully outside band → null', () => {
    const e = makeEvent('2026-01-05T04:00:00', '2026-01-05T06:00:00');
    const portion = eventBandPortion(e, day, '07:00', '21:00');
    assert.equal(portion, null);
  });
});

// ---------------------------------------------------------------------------
// eventOverlapsBand — date-only (all-day) inputs
// ---------------------------------------------------------------------------
describe('eventOverlapsBand with date-only strings', () => {
  const day = new Date('2026-01-05T00:00:00');

  it('all-day event on Jan 5 (end Jan 6 exclusive) overlaps the band on Jan 5', () => {
    const e = { start: '2026-01-05', end: '2026-01-06', summary: 'AllDay' };
    assert.equal(eventOverlapsBand(e, day, '07:00', '21:00'), true);
  });

  it('all-day event for Jan 6 does NOT overlap Jan 5 band', () => {
    const e = { start: '2026-01-06', end: '2026-01-07', summary: 'AllDay' };
    assert.equal(eventOverlapsBand(e, day, '07:00', '21:00'), false);
  });
});

// ---------------------------------------------------------------------------
// formatRelativeStart
// ---------------------------------------------------------------------------
describe('formatRelativeStart', () => {
  it('returns "now" for in-progress event', () => {
    const now = new Date('2026-01-05T10:30:00');
    const e = makeEvent('2026-01-05T10:00:00', '2026-01-05T11:00:00');
    assert.equal(formatRelativeStart(e, now), 'now');
  });

  it('returns "in Nm" for event within the hour', () => {
    const now = new Date('2026-01-05T09:00:00');
    const e = makeEvent('2026-01-05T09:30:00', '2026-01-05T10:30:00');
    const result = formatRelativeStart(e, now);
    assert.equal(result, 'in 30m');
  });

  it('returns "in Nh" for event 2h out', () => {
    const now = new Date('2026-01-05T08:00:00');
    const e = makeEvent('2026-01-05T10:00:00', '2026-01-05T11:00:00');
    assert.equal(formatRelativeStart(e, now), 'in 2h');
  });

  it('returns "tomorrow" for event tomorrow', () => {
    const now = new Date('2026-01-05T20:00:00');
    const e = makeEvent('2026-01-06T09:00:00', '2026-01-06T10:00:00');
    assert.equal(formatRelativeStart(e, now), 'tomorrow');
  });

  it('returns weekday short name for event this week (not tomorrow)', () => {
    const now = new Date('2026-01-05T08:00:00'); // Monday
    const e = makeEvent('2026-01-07T09:00:00', '2026-01-07T10:00:00'); // Wednesday
    const result = formatRelativeStart(e, now);
    assert.equal(result, 'Wed');
  });

  it('all-day event today → "now" (event is ongoing all day)', () => {
    const now = new Date('2026-01-05T09:00:00');
    // All-day Jan 5: start=Jan 5 00:00, end=Jan 6 00:00 (exclusive)
    const e = { start: '2026-01-05', end: '2026-01-06', summary: 'AllDay' };
    assert.equal(formatRelativeStart(e, now), 'now');
  });

  it('all-day event ended → empty string (past event)', () => {
    // Now is Jan 6 09:00, event ended at Jan 6 00:00
    const now = new Date('2026-01-06T09:00:00');
    const e = { start: '2026-01-05', end: '2026-01-06', summary: 'AllDay' };
    assert.equal(formatRelativeStart(e, now), '');
  });
});

// ---------------------------------------------------------------------------
// currentScrollBucket
// ---------------------------------------------------------------------------
describe('currentScrollBucket', () => {
  // Default thresholds: 12:00 → afternoon, 19:00 → night.
  it('before afternoon start → morning', () => {
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 6, 0), '12:00', '19:00'), 'morning');
  });

  it('one minute before afternoon start → still morning', () => {
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 11, 59), '12:00', '19:00'), 'morning');
  });

  it('exactly at afternoon start → afternoon', () => {
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 12, 0), '12:00', '19:00'), 'afternoon');
  });

  it('one minute before night start → still afternoon', () => {
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 18, 59), '12:00', '19:00'), 'afternoon');
  });

  it('exactly at night start → night', () => {
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 19, 0), '12:00', '19:00'), 'night');
  });

  it('late evening → night', () => {
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 23, 30), '12:00', '19:00'), 'night');
  });

  it('treats a malformed threshold as never-triggering (falls back to morning)', () => {
    // Infinity, not NaN: an unparseable threshold must read as "never", so even
    // late in the day the bucket stays at the earlier, valid one.
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 22, 0), '12:00', 'nonsense'), 'afternoon');
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 22, 0), 'nope', 'nope'), 'morning');
  });

  it('treats out-of-range numeric thresholds as never-triggering', () => {
    // '25:00'/'12:99' are numeric but not valid HH:MM — must not be coerced into
    // a real time; they read as "never" just like non-numeric input.
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 22, 0), '12:00', '25:00'), 'afternoon');
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 22, 0), '12:99', '25:00'), 'morning');
  });

  it('rejects thresholds that are not exactly HH:MM', () => {
    // Bare hour ('12') and extra segments ('12:00:45') are not valid HH:MM. At
    // 13:00 a wrongly-accepted '12' would read as afternoon; rejection (→ Infinity)
    // leaves it at morning.
    // Both '12' and '12:00:45' are rejected, so at 13:00 neither makes it
    // afternoon — it stays at morning (afternoon threshold never triggers).
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 13, 0), '12', '19:00'), 'morning');
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 13, 0), '12:00:45', '19:00'), 'morning');
  });

  it('honors custom thresholds (afternoon 13:30, night 20:15)', () => {
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 13, 0), '13:30', '20:15'), 'morning');
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 13, 30), '13:30', '20:15'), 'afternoon');
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 20, 14), '13:30', '20:15'), 'afternoon');
    assert.equal(currentScrollBucket(new Date(2026, 5, 8, 20, 15), '13:30', '20:15'), 'night');
  });
});

// ---------------------------------------------------------------------------
// msUntilNextDailyBoundary
// ---------------------------------------------------------------------------
describe('msUntilNextDailyBoundary', () => {
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;

  // TZ=America/Los_Angeles is set in the test scripts, so the US DST transitions
  // apply: clocks spring forward on 2026-03-08 (23h day) and fall back on
  // 2026-11-01 (25h day). These prove the helper tracks wall-clock time, not a
  // fixed 24h offset — it is what arms the chores card's day-boundary timer.
  it('spring-forward DST day → 23h from midnight (US DST begins 2026-03-08)', () => {
    const now = new Date(2026, 2, 8, 0, 0, 0, 0);
    assert.equal(msUntilNextDailyBoundary(now, ['00:00']), 23 * HOUR);
  });

  it('fall-back DST day → 25h from midnight (US DST ends 2026-11-01)', () => {
    const now = new Date(2026, 10, 1, 0, 0, 0, 0);
    assert.equal(msUntilNextDailyBoundary(now, ['00:00']), 25 * HOUR);
  });

  it('one second before midnight → 1000ms', () => {
    const now = new Date(2026, 5, 8, 23, 59, 59, 0);
    assert.equal(msUntilNextDailyBoundary(now, ['00:00']), 1000);
  });

  it('picks the soonest upcoming boundary later today', () => {
    const now = new Date(2026, 5, 8, 9, 0, 0, 0); // 09:00, both boundaries ahead
    assert.equal(msUntilNextDailyBoundary(now, ['12:00', '19:00']), 3 * HOUR);
  });

  it('skips a boundary already passed and uses the next one today', () => {
    const now = new Date(2026, 5, 8, 14, 0, 0, 0); // past 12:00, before 19:00
    assert.equal(msUntilNextDailyBoundary(now, ['12:00', '19:00']), 5 * HOUR);
  });

  it('rolls to tomorrow when every boundary has passed', () => {
    const now = new Date(2026, 5, 8, 21, 0, 0, 0); // both past
    // Next is 12:00 tomorrow → 15h away.
    assert.equal(msUntilNextDailyBoundary(now, ['12:00', '19:00']), 15 * HOUR);
  });

  it('at an exact boundary it rolls forward, never returns 0', () => {
    const now = new Date(2026, 5, 8, 12, 0, 0, 0); // exactly 12:00
    const result = msUntilNextDailyBoundary(now, ['12:00', '19:00']);
    assert.ok(result > 0, 'never returns 0 at an exact boundary');
    assert.equal(result, 7 * HOUR, 'next boundary is 19:00 the same day');
  });

  it('empty list → Infinity (caller guards)', () => {
    const now = new Date(2026, 5, 8, 9, 0, 0, 0);
    assert.equal(msUntilNextDailyBoundary(now, []), Infinity);
  });

  it('skips malformed entries (no NaN delay), still uses valid ones', () => {
    const now = new Date(2026, 5, 8, 9, 0, 0, 0);
    assert.equal(msUntilNextDailyBoundary(now, ['nonsense', '12:00']), 3 * HOUR);
  });

  it('all entries malformed → Infinity (caller skips arming)', () => {
    const now = new Date(2026, 5, 8, 9, 0, 0, 0);
    assert.equal(msUntilNextDailyBoundary(now, ['nope', '']), Infinity);
  });

  it('skips out-of-range numeric entries instead of letting Date normalize them', () => {
    const now = new Date(2026, 5, 8, 9, 0, 0, 0);
    // '25:00' would normalize to 01:00 next day (~16h) — skipping it leaves the
    // valid '12:00' boundary (3h) as the answer.
    assert.equal(msUntilNextDailyBoundary(now, ['25:00', '12:00']), 3 * HOUR);
    // All out of range → Infinity.
    assert.equal(msUntilNextDailyBoundary(now, ['25:00', '12:60']), Infinity);
  });

  it('rejects strings that are not exactly HH:MM (extra segments)', () => {
    const now = new Date(2026, 5, 8, 9, 0, 0, 0);
    // '12:00:45' has a trailing seconds segment — not a valid HH:MM, so it's
    // skipped and the valid '19:00' boundary (10h) is used.
    assert.equal(msUntilNextDailyBoundary(now, ['12:00:45', '19:00']), 10 * HOUR);
    // A bare hour with no minutes is also skipped.
    assert.equal(msUntilNextDailyBoundary(now, ['12', '19:00']), 10 * HOUR);
  });
});

describe('lastResetBoundary', () => {
  it('returns today\'s boundary once the clock is past it', () => {
    const now = new Date(2026, 7, 30, 9, 0, 0, 0);
    assert.deepEqual(lastResetBoundary(now, '04:00'), new Date(2026, 7, 30, 4, 0, 0, 0));
  });

  it('rolls back to yesterday before the boundary', () => {
    const now = new Date(2026, 7, 30, 1, 30, 0, 0);
    assert.deepEqual(lastResetBoundary(now, '04:00'), new Date(2026, 7, 29, 4, 0, 0, 0));
  });

  it('treats the exact boundary instant as already reset', () => {
    const now = new Date(2026, 7, 30, 4, 0, 0, 0);
    assert.deepEqual(lastResetBoundary(now, '04:00'), new Date(2026, 7, 30, 4, 0, 0, 0));
  });

  it('falls back to local midnight for an empty or malformed reset time', () => {
    const now = new Date(2026, 7, 30, 9, 0, 0, 0);
    const midnight = new Date(2026, 7, 30, 0, 0, 0, 0);
    for (const bad of ['', '25:00', '12:99', 'nonsense', '12', '04:00:00']) {
      assert.deepEqual(lastResetBoundary(now, bad), midnight, `"${bad}" falls back to midnight`);
    }
  });

  it('crosses a month boundary when rolling back', () => {
    const now = new Date(2026, 8, 1, 2, 0, 0, 0);
    assert.deepEqual(lastResetBoundary(now, '04:00'), new Date(2026, 7, 31, 4, 0, 0, 0));
  });
});

describe('isCompletionStale', () => {
  const now = new Date(2026, 7, 30, 9, 0, 0, 0);

  it('is stale when completed before the last boundary', () => {
    const at = new Date(2026, 7, 29, 20, 0, 0, 0).toISOString();
    assert.equal(isCompletionStale(at, now, '04:00'), true);
  });

  it('is fresh when completed after the last boundary', () => {
    const at = new Date(2026, 7, 30, 6, 0, 0, 0).toISOString();
    assert.equal(isCompletionStale(at, now, '04:00'), false);
  });

  it('keeps last night\'s completion fresh during the pre-reset gap', () => {
    // 01:00 local: the reset has not run yet, so a routine ticked off at 20:00
    // yesterday is still legitimately "done today" and must keep rendering.
    // Using local midnight as the boundary would blank it for four hours.
    const preReset = new Date(2026, 7, 30, 1, 0, 0, 0);
    const at = new Date(2026, 7, 29, 20, 0, 0, 0).toISOString();
    assert.equal(isCompletionStale(at, preReset, '04:00'), false);
  });

  it('treats a completion within the clock-skew grace as fresh', () => {
    // HA stamps `completed`; the browser supplies `now`. Just below the boundary
    // but seconds old is a tap the user is watching happen, not stale history.
    const justAfter = new Date(2026, 7, 30, 4, 0, 5, 0);
    const stampedEarly = new Date(2026, 7, 30, 3, 59, 55, 0).toISOString();
    assert.equal(isCompletionStale(stampedEarly, justAfter, '04:00'), false);
  });

  it('still hides a pre-boundary completion once it is past the grace', () => {
    const wellAfter = new Date(2026, 7, 30, 4, 5, 0, 0);
    const stampedEarly = new Date(2026, 7, 30, 3, 59, 55, 0).toISOString();
    assert.equal(isCompletionStale(stampedEarly, wellAfter, '04:00'), true);
  });

  it('brackets the grace at 60s', () => {
    // Pins the constant itself, not just "some grace exists". `now` has to sit past
    // the 04:00 boundary for staleness to be in play at all, so the completion is
    // stamped just below it and `now` walks across the grace edge.
    const stamped = new Date(2026, 7, 30, 3, 59, 30, 0);
    const at = stamped.toISOString();
    const plus = (ms: number) => new Date(stamped.getTime() + ms);
    assert.equal(isCompletionStale(at, plus(59_000), '04:00'), false, '59s → fresh');
    assert.equal(isCompletionStale(at, plus(61_000), '04:00'), true, '61s → stale');
  });

  it('never hides a completion it cannot date', () => {
    // Nothing in the frontend can date a completion HA did not stamp; hiding one
    // would make a fresh tap vanish on a backend that omits TodoItem.completed.
    assert.equal(isCompletionStale(undefined, now, '04:00'), false);
    assert.equal(isCompletionStale('', now, '04:00'), false);
    assert.equal(isCompletionStale('not-a-date', now, '04:00'), false);
  });

  it('parses the UTC timestamps HA actually sends', () => {
    // todo.get_items serializes TodoItem.completed via datetime.isoformat(), so
    // the wire value carries an offset rather than local wall-clock time.
    const at = new Date(2026, 7, 25, 16, 58, 26, 0).toISOString();
    assert.equal(isCompletionStale(at, now, '04:00'), true);
  });
});
