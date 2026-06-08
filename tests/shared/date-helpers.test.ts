import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoursInBand,
  eventOverlapsBand,
  eventBandPortion,
  formatRelativeStart,
  parseEventBoundary,
  msUntilNextLocalMidnight,
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
// msUntilNextLocalMidnight
// ---------------------------------------------------------------------------
describe('msUntilNextLocalMidnight', () => {
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;

  it('30 minutes before midnight → 30 minutes', () => {
    const now = new Date(2026, 5, 8, 23, 30, 0, 0); // local 23:30
    assert.equal(msUntilNextLocalMidnight(now), 30 * MIN);
  });

  it('exactly midnight → one full local day, never 0', () => {
    const now = new Date(2026, 5, 8, 0, 0, 0, 0);
    // Don't hard-code 24h: the contract is "delta to the next local midnight",
    // which is 23h/25h on DST days (covered below). Compute it independently.
    const expected = new Date(2026, 5, 9, 0, 0, 0, 0).getTime() - now.getTime();
    const result = msUntilNextLocalMidnight(now);
    assert.ok(result > 0, 'never returns 0 at exactly midnight');
    assert.equal(result, expected, 'equals the delta to the next local midnight');
  });

  // TZ=America/Los_Angeles is set in the test scripts, so the US DST transitions
  // apply: clocks spring forward on 2026-03-08 (23h day) and fall back on
  // 2026-11-01 (25h day). These prove the helper tracks wall-clock midnight, not
  // a fixed 24h offset.
  it('spring-forward DST day → 23h from midnight (US DST begins 2026-03-08)', () => {
    const now = new Date(2026, 2, 8, 0, 0, 0, 0);
    assert.equal(msUntilNextLocalMidnight(now), 23 * HOUR);
  });

  it('fall-back DST day → 25h from midnight (US DST ends 2026-11-01)', () => {
    const now = new Date(2026, 10, 1, 0, 0, 0, 0);
    assert.equal(msUntilNextLocalMidnight(now), 25 * HOUR);
  });

  it('mid-day → remainder of the day', () => {
    const now = new Date(2026, 5, 8, 14, 15, 30, 0); // local 14:15:30
    // 9h 44m 30s until midnight
    assert.equal(msUntilNextLocalMidnight(now), 9 * HOUR + 44 * MIN + 30 * 1000);
  });

  it('one second before midnight → 1000ms', () => {
    const now = new Date(2026, 5, 8, 23, 59, 59, 0);
    assert.equal(msUntilNextLocalMidnight(now), 1000);
  });
});
