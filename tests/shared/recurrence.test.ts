import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRRule, buildRRule, friendlySummary, isRoutineDueToday, nextOccurrence } from '../../src/shared/recurrence.js';
import type { ParsedRecurrence } from '../../src/shared/recurrence.js';

/**
 * Contract table from Phase 2 Sub-Phase A (must round-trip with recurrence.py):
 *
 * none            | ""
 * daily           | FREQ=DAILY[;INTERVAL=N]
 * weekly          | FREQ=WEEKLY;BYDAY=<MO,TU,...>[;INTERVAL=N]
 * monthly-date    | FREQ=MONTHLY;BYMONTHDAY=<1-31>[;INTERVAL=N]
 * monthly-nth     | FREQ=MONTHLY;BYDAY=<+/-N><DAY>[;INTERVAL=N]
 * yearly          | FREQ=YEARLY;BYMONTH=<1-12>;BYMONTHDAY=<1-31>[;INTERVAL=N]
 */

function roundTrip(rrule: string): string {
  const parsed = parseRRule(rrule);
  if (parsed.mode === 'unknown') return rrule;
  return buildRRule(parsed as Exclude<ParsedRecurrence, import('../../src/shared/recurrence.js').RecurrenceUnknown>);
}

describe('parseRRule', () => {
  it('empty string → mode: none', () => {
    assert.deepEqual(parseRRule(''), { mode: 'none' });
  });

  it('FREQ=DAILY → mode: daily, no interval', () => {
    const r = parseRRule('FREQ=DAILY');
    assert.equal(r.mode, 'daily');
    assert.ok(!('interval' in r) || (r as { interval?: number }).interval === undefined);
  });

  it('FREQ=DAILY;INTERVAL=2 → mode: daily, interval 2', () => {
    const r = parseRRule('FREQ=DAILY;INTERVAL=2') as import('../../src/shared/recurrence.js').RecurrenceDaily;
    assert.equal(r.mode, 'daily');
    assert.equal(r.interval, 2);
  });

  it('FREQ=WEEKLY;BYDAY=MO,WE,FR → mode: weekly, days=[MO,WE,FR]', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR') as import('../../src/shared/recurrence.js').RecurrenceWeekly;
    assert.equal(r.mode, 'weekly');
    assert.deepEqual(r.days, ['MO', 'WE', 'FR']);
  });

  it('FREQ=WEEKLY;BYDAY=MO;INTERVAL=2 → mode: weekly, interval 2', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO;INTERVAL=2') as import('../../src/shared/recurrence.js').RecurrenceWeekly;
    assert.equal(r.mode, 'weekly');
    assert.equal(r.interval, 2);
  });

  it('FREQ=MONTHLY;BYMONTHDAY=15 → mode: monthly-date, dayOfMonth 15', () => {
    const r = parseRRule('FREQ=MONTHLY;BYMONTHDAY=15') as import('../../src/shared/recurrence.js').RecurrenceMonthlyDate;
    assert.equal(r.mode, 'monthly-date');
    assert.equal(r.dayOfMonth, 15);
  });

  it('FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6 → mode: monthly-date, interval 6', () => {
    const r = parseRRule('FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6') as import('../../src/shared/recurrence.js').RecurrenceMonthlyDate;
    assert.equal(r.mode, 'monthly-date');
    assert.equal(r.dayOfMonth, 15);
    assert.equal(r.interval, 6);
  });

  it('FREQ=MONTHLY;BYDAY=1SA → mode: monthly-nth, nth 1 day SA (first Saturday)', () => {
    const r = parseRRule('FREQ=MONTHLY;BYDAY=1SA') as import('../../src/shared/recurrence.js').RecurrenceMonthlyNth;
    assert.equal(r.mode, 'monthly-nth');
    assert.equal(r.nth, 1);
    assert.equal(r.day, 'SA');
  });

  it('FREQ=MONTHLY;BYDAY=-1MO → mode: monthly-nth, nth -1 day MO (last Monday)', () => {
    const r = parseRRule('FREQ=MONTHLY;BYDAY=-1MO') as import('../../src/shared/recurrence.js').RecurrenceMonthlyNth;
    assert.equal(r.mode, 'monthly-nth');
    assert.equal(r.nth, -1);
    assert.equal(r.day, 'MO');
  });

  it('FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15 → mode: yearly, March 15', () => {
    const r = parseRRule('FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15') as import('../../src/shared/recurrence.js').RecurrenceYearly;
    assert.equal(r.mode, 'yearly');
    assert.equal(r.month, 3);
    assert.equal(r.dayOfMonth, 15);
  });

  it('FREQ=YEARLY with interval 2 → every 2 years', () => {
    const r = parseRRule('FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=31;INTERVAL=2') as import('../../src/shared/recurrence.js').RecurrenceYearly;
    assert.equal(r.mode, 'yearly');
    assert.equal(r.interval, 2);
  });

  it('unknown pattern → mode: unknown with raw preserved', () => {
    const r = parseRRule('FREQ=DAILY;COUNT=5');
    assert.equal(r.mode, 'unknown');
    assert.equal((r as import('../../src/shared/recurrence.js').RecurrenceUnknown).raw, 'FREQ=DAILY;COUNT=5');
  });

  it('BYHOUR outside contract → mode: unknown', () => {
    const r = parseRRule('FREQ=DAILY;BYHOUR=9');
    assert.equal(r.mode, 'unknown');
  });

  it('UNTIL= outside contract → mode: unknown', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T000000Z');
    assert.equal(r.mode, 'unknown');
  });

  it('INTERVAL=0 → mode: unknown', () => {
    assert.equal(parseRRule('FREQ=DAILY;INTERVAL=0').mode, 'unknown');
  });

  it('INTERVAL=-1 → mode: unknown', () => {
    assert.equal(parseRRule('FREQ=DAILY;INTERVAL=-1').mode, 'unknown');
  });

  it('INTERVAL=abc → mode: unknown', () => {
    assert.equal(parseRRule('FREQ=DAILY;INTERVAL=abc').mode, 'unknown');
  });

  it('monthly-nth BYDAY=6MO → mode: unknown (nth out of supported range)', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYDAY=6MO').mode, 'unknown');
  });

  it('monthly-nth BYDAY=5SA → mode: unknown (5 not in UI set {1,2,3,4,-1})', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYDAY=5SA').mode, 'unknown');
  });

  it('monthly-nth BYDAY=0SA → mode: unknown (nth = 0)', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYDAY=0SA').mode, 'unknown');
  });

  it('monthly-nth BYDAY=-2MO → mode: unknown (-2 not in UI set {1,2,3,4,-1})', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYDAY=-2MO').mode, 'unknown');
  });

  it('monthly-nth BYDAY=-6FR → mode: unknown (nth out of range)', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYDAY=-6FR').mode, 'unknown');
  });

  it('BYMONTHDAY=15x → mode: unknown (trailing garbage)', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYMONTHDAY=15x').mode, 'unknown');
  });

  it('BYMONTHDAY=0 → mode: unknown (out of range)', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYMONTHDAY=0').mode, 'unknown');
  });

  it('BYMONTHDAY=32 → mode: unknown (out of range)', () => {
    assert.equal(parseRRule('FREQ=MONTHLY;BYMONTHDAY=32').mode, 'unknown');
  });

  it('BYMONTH=5z in yearly → mode: unknown (trailing garbage)', () => {
    assert.equal(parseRRule('FREQ=YEARLY;BYMONTH=5z;BYMONTHDAY=15').mode, 'unknown');
  });

  it('BYMONTH=0 in yearly → mode: unknown (out of range)', () => {
    assert.equal(parseRRule('FREQ=YEARLY;BYMONTH=0;BYMONTHDAY=15').mode, 'unknown');
  });

  it('BYMONTH=13 in yearly → mode: unknown (out of range)', () => {
    assert.equal(parseRRule('FREQ=YEARLY;BYMONTH=13;BYMONTHDAY=15').mode, 'unknown');
  });
});

describe('buildRRule', () => {
  it('none → empty string', () => {
    assert.equal(buildRRule({ mode: 'none' }), '');
  });

  it('daily → FREQ=DAILY', () => {
    assert.equal(buildRRule({ mode: 'daily' }), 'FREQ=DAILY');
  });

  it('daily interval 2 → FREQ=DAILY;INTERVAL=2', () => {
    assert.equal(buildRRule({ mode: 'daily', interval: 2 }), 'FREQ=DAILY;INTERVAL=2');
  });

  it('daily interval 1 → FREQ=DAILY (no INTERVAL suffix)', () => {
    assert.equal(buildRRule({ mode: 'daily', interval: 1 }), 'FREQ=DAILY');
  });

  it('weekly MO,WE,FR → FREQ=WEEKLY;BYDAY=MO,WE,FR', () => {
    assert.equal(buildRRule({ mode: 'weekly', days: ['MO', 'WE', 'FR'] }), 'FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('monthly-date 15 → FREQ=MONTHLY;BYMONTHDAY=15', () => {
    assert.equal(buildRRule({ mode: 'monthly-date', dayOfMonth: 15 }), 'FREQ=MONTHLY;BYMONTHDAY=15');
  });

  it('monthly-date 15 interval 6 → FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6', () => {
    assert.equal(
      buildRRule({ mode: 'monthly-date', dayOfMonth: 15, interval: 6 }),
      'FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6',
    );
  });

  it('monthly-nth 1 SA → FREQ=MONTHLY;BYDAY=1SA', () => {
    assert.equal(buildRRule({ mode: 'monthly-nth', nth: 1, day: 'SA' }), 'FREQ=MONTHLY;BYDAY=1SA');
  });

  it('monthly-nth -1 MO → FREQ=MONTHLY;BYDAY=-1MO', () => {
    assert.equal(buildRRule({ mode: 'monthly-nth', nth: -1, day: 'MO' }), 'FREQ=MONTHLY;BYDAY=-1MO');
  });

  it('yearly March 15 → FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15', () => {
    assert.equal(
      buildRRule({ mode: 'yearly', month: 3, dayOfMonth: 15 }),
      'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15',
    );
  });
});

describe('round-trip', () => {
  const contractExamples = [
    '',
    'FREQ=DAILY',
    'FREQ=DAILY;INTERVAL=2',
    'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    'FREQ=WEEKLY;BYDAY=MO;INTERVAL=2',
    'FREQ=MONTHLY;BYMONTHDAY=15',
    'FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6',
    'FREQ=MONTHLY;BYDAY=1SA',
    'FREQ=MONTHLY;BYDAY=-1MO',
    'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15',
    'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=31;INTERVAL=2',
  ];

  for (const example of contractExamples) {
    it(`round-trips: "${example}"`, () => {
      assert.equal(roundTrip(example), example, `buildRRule(parseRRule("${example}")) should equal "${example}"`);
    });
  }

  it('unknown pattern passes through raw value', () => {
    const raw = 'FREQ=DAILY;COUNT=5';
    assert.equal(roundTrip(raw), raw);
  });

  it('BYDAY=-2MO round-trips correctly via unknown pass-through (UI cannot represent, but string is preserved)', () => {
    const raw = 'FREQ=MONTHLY;BYDAY=-2MO';
    assert.equal(roundTrip(raw), raw, 'nth=-2 is outside UI set {1,2,3,4,-1}, returned as unknown, string preserved');
  });

  it('BYDAY=5SA round-trips correctly via unknown pass-through', () => {
    const raw = 'FREQ=MONTHLY;BYDAY=5SA';
    assert.equal(roundTrip(raw), raw, 'nth=5 is outside UI set, returned as unknown, string preserved');
  });
});

describe('friendlySummary', () => {
  it('empty → One-off', () => {
    assert.equal(friendlySummary(''), 'One-off (no repeat)');
  });

  it('daily → Daily', () => {
    assert.equal(friendlySummary('FREQ=DAILY'), 'Daily');
  });

  it('daily interval 3 → Every 3 days', () => {
    assert.equal(friendlySummary('FREQ=DAILY;INTERVAL=3'), 'Every 3 days');
  });

  it('weekly Mon/Wed/Fri → Weekly on Mon, Wed, Fri', () => {
    assert.equal(friendlySummary('FREQ=WEEKLY;BYDAY=MO,WE,FR'), 'Weekly on Mon, Wed, Fri');
  });

  it('monthly first Saturday → Monthly on the 1st Saturday', () => {
    assert.equal(friendlySummary('FREQ=MONTHLY;BYDAY=1SA'), 'Monthly on the 1st Saturday');
  });

  it('every 6 months → Every 6 months on the 15th', () => {
    assert.equal(friendlySummary('FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6'), 'Every 6 months on the 15th');
  });

  it('yearly March 15 → Yearly on March 15th', () => {
    assert.equal(friendlySummary('FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15'), 'Yearly on March 15th');
  });

  it('unknown pattern → Custom recurrence message', () => {
    assert.equal(friendlySummary('FREQ=DAILY;COUNT=5'), 'Custom recurrence (not editable here)');
  });
});

describe('start date (DTSTART)', () => {
  const fortnight = 'DTSTART:20261012\nRRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=2';

  it('parses the start into an ISO date', () => {
    assert.deepEqual(parseRRule(fortnight), { mode: 'weekly', days: ['MO'], interval: 2, start: '2026-10-12' });
  });

  it('round-trips', () => {
    assert.equal(roundTrip(fortnight), fortnight);
  });

  it('buildRRule prefixes the start', () => {
    assert.equal(buildRRule({ mode: 'daily', interval: 3, start: '2026-01-05' }), 'DTSTART:20260105\nRRULE:FREQ=DAILY;INTERVAL=3');
  });

  for (const raw of [
    'DTSTART:20261399\nRRULE:FREQ=DAILY',
    'DTSTART:20250229\nRRULE:FREQ=DAILY',
    'DTSTART:20261012\nRRULE:FREQ=DAILY;COUNT=5',
    'DTSTART:20261012\nFREQ=DAILY',
  ]) {
    it(`unsupported start line → unknown: ${JSON.stringify(raw)}`, () => {
      assert.deepEqual(parseRRule(raw), { mode: 'unknown', raw });
    });
  }

  it('summary names the start', () => {
    assert.equal(friendlySummary(fortnight), 'Every 2 weeks on Mon, starting Oct 12, 2026');
  });
});

describe('isRoutineDueToday matches recurrence.py', () => {
  const { cases } = JSON.parse(
    readFileSync(new URL('../fixtures/recurrence-cases.json', import.meta.url), 'utf8'),
  ) as { cases: Array<{ rrule: string; date: string; due: boolean }> };

  it('agrees with every case in the shared fixture', () => {
    const wrong = cases.filter(({ rrule, date, due }) => {
      const [y, m, d] = date.split('-').map(Number);
      return isRoutineDueToday(parseRRule(rrule), new Date(y, m - 1, d, 12)) !== due;
    });
    assert.deepEqual(wrong, []);
  });
});

describe('nextOccurrence', () => {
  const tue = new Date(2026, 9, 6, 9);

  it('finds the nearest matching day for an un-anchored weekly rule', () => {
    assert.equal(nextOccurrence({ mode: 'weekly', days: ['MO'] }, tue), '2026-10-12');
  });

  it('respects the epoch fortnight when no start is set', () => {
    assert.equal(nextOccurrence({ mode: 'weekly', days: ['MO'], interval: 2 }, tue), '2026-10-19');
  });

  it('respects an explicit start', () => {
    assert.equal(nextOccurrence({ mode: 'weekly', days: ['MO'], interval: 2, start: '2026-10-12' }, tue), '2026-10-12');
  });

  it('jumps straight to a far-future start', () => {
    assert.equal(nextOccurrence({ mode: 'weekly', days: ['MO'], interval: 2, start: '2099-10-05' }, tue), '2099-10-05');
  });

  it('includes today', () => {
    assert.equal(nextOccurrence({ mode: 'daily' }, tue), '2026-10-06');
  });

  it('reaches a leap-day yearly rule', () => {
    assert.equal(nextOccurrence({ mode: 'yearly', month: 2, dayOfMonth: 29 }, tue), '2028-02-29');
  });

  it('crosses a skipped century leap year', () => {
    assert.equal(nextOccurrence({ mode: 'yearly', month: 2, dayOfMonth: 29 }, new Date(2097, 0, 1)), '2104-02-29');
  });

  it('gives up rather than stall on an absurd interval', () => {
    assert.equal(nextOccurrence({ mode: 'yearly', month: 2, dayOfMonth: 29, interval: 100000 }, tue), undefined);
  });

  it('none → undefined', () => {
    assert.equal(nextOccurrence({ mode: 'none' }, tue), undefined);
  });
});
