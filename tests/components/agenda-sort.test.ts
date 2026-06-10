import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortEvents } from '../../src/components/agenda-strip.js';
import type { CalendarEvent } from '../../src/shared/types.js';

function makeEvent(start: string, end: string, summary = 'Test'): CalendarEvent {
  return { start, end, summary };
}

// Tests run under TZ=America/Los_Angeles (see package.json). At this instant it
// is 2026-05-21 03:00 PDT, so "today" is May 21 and "tomorrow" is May 22 local.
const now = new Date('2026-05-21T10:00:00.000Z');

describe('filterAndSortEvents', () => {
  it('returns empty array for no events', () => {
    assert.deepEqual(filterAndSortEvents([], now, 1), []);
  });

  it('keeps events that already ended earlier today (shown all day, dimmed)', () => {
    const events = [
      // 00:00–02:00 PDT today — already ended at "now" (03:00 PDT) but still today.
      makeEvent('2026-05-21T07:00:00Z', '2026-05-21T09:00:00Z', 'Past'),
      makeEvent('2026-05-21T11:00:00Z', '2026-05-21T12:00:00Z', 'Future'),
    ];
    const result = filterAndSortEvents(events, now, 1);
    assert.deepEqual(result.map((e) => e.summary), ['Past', 'Future']);
  });

  it('excludes an event that ended before today started', () => {
    const events = [
      // 2026-05-20 23:00 PDT — ended yesterday, before the start-of-today anchor.
      makeEvent('2026-05-21T05:00:00Z', '2026-05-21T06:00:00Z', 'Yesterday'),
      makeEvent('2026-05-21T11:00:00Z', '2026-05-21T12:00:00Z', 'Today'),
    ];
    const result = filterAndSortEvents(events, now, 1);
    assert.deepEqual(result.map((e) => e.summary), ['Today']);
  });

  it('includes events that are currently happening', () => {
    const events = [makeEvent('2026-05-21T09:30:00Z', '2026-05-21T10:30:00Z', 'Active')];
    const result = filterAndSortEvents(events, now, 1);
    assert.equal(result.length, 1);
    assert.equal(result[0].summary, 'Active');
  });

  it('sorts events by start time', () => {
    const events = [
      makeEvent('2026-05-21T14:00:00Z', '2026-05-21T15:00:00Z', 'C'),
      makeEvent('2026-05-21T11:00:00Z', '2026-05-21T12:00:00Z', 'A'),
      makeEvent('2026-05-21T13:00:00Z', '2026-05-21T14:00:00Z', 'B'),
    ];
    const result = filterAndSortEvents(events, now, 1);
    assert.deepEqual(result.map((e) => e.summary), ['A', 'B', 'C']);
  });

  it('today-only window excludes a tomorrow event', () => {
    const events = [
      makeEvent('2026-05-21T18:00:00Z', '2026-05-21T19:00:00Z', 'Today'),
      // 2026-05-22 09:00 PDT — tomorrow, local.
      makeEvent('2026-05-22T16:00:00Z', '2026-05-22T17:00:00Z', 'Tomorrow'),
    ];
    const result = filterAndSortEvents(events, now, 1);
    assert.deepEqual(result.map((e) => e.summary), ['Today']);
  });

  it('two-day window includes tomorrow but not the day after', () => {
    const events = [
      makeEvent('2026-05-21T18:00:00Z', '2026-05-21T19:00:00Z', 'Today'),
      makeEvent('2026-05-22T16:00:00Z', '2026-05-22T17:00:00Z', 'Tomorrow'),
      // 2026-05-23 09:00 PDT — day after tomorrow, local.
      makeEvent('2026-05-23T16:00:00Z', '2026-05-23T17:00:00Z', 'DayAfter'),
    ];
    const result = filterAndSortEvents(events, now, 2);
    assert.deepEqual(result.map((e) => e.summary), ['Today', 'Tomorrow']);
  });

  it('includes an all-day event covering today', () => {
    // Date-only boundaries parse to local midnight: starts today, ends tomorrow.
    const events = [makeEvent('2026-05-21', '2026-05-22', 'AllDayToday')];
    const result = filterAndSortEvents(events, now, 1);
    assert.deepEqual(result.map((e) => e.summary), ['AllDayToday']);
  });
});
