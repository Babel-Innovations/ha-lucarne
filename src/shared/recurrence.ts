/**
 * Hand-rolled RRULE builder/parser for the six contract patterns locked in
 * Phase 2 Sub-Phase A. Does NOT depend on rrule.js.
 *
 * Contract table (must round-trip with recurrence.py):
 *  none      | "" (empty string)
 *  daily     | FREQ=DAILY[;INTERVAL=N]
 *  weekly    | FREQ=WEEKLY;BYDAY=<MO,TU,...>[;INTERVAL=N]
 *  monthly-d | FREQ=MONTHLY;BYMONTHDAY=<1-31>[;INTERVAL=N]
 *  monthly-n | FREQ=MONTHLY;BYDAY=<+/-N><DAY>[;INTERVAL=N]
 *  yearly    | FREQ=YEARLY;BYMONTH=<1-12>;BYMONTHDAY=<1-31>[;INTERVAL=N]
 *
 * Any of the five may carry a start date, RFC 5545 style:
 *   DTSTART:<YYYYMMDD>\nRRULE:<one of the rules above>
 * It anchors the INTERVAL phase (which fortnight, which alternate month) and
 * nothing fires before it. Without one, rules anchor to 1970-01-01.
 */

export type RecurrenceMode =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly-date'
  | 'monthly-nth'
  | 'yearly'
  | 'unknown';

export const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export interface RecurrenceNone {
  mode: 'none';
}
export interface RecurrenceDaily {
  mode: 'daily';
  interval?: number;
  /** ISO date (YYYY-MM-DD) from DTSTART; absent → 1970-01-01. */
  start?: string;
}
export interface RecurrenceWeekly {
  mode: 'weekly';
  days: WeekdayCode[];
  interval?: number;
  start?: string;
}
export interface RecurrenceMonthlyDate {
  mode: 'monthly-date';
  dayOfMonth: number;
  interval?: number;
  start?: string;
}
export interface RecurrenceMonthlyNth {
  mode: 'monthly-nth';
  nth: number;
  day: WeekdayCode;
  interval?: number;
  start?: string;
}
export interface RecurrenceYearly {
  mode: 'yearly';
  month: number;
  dayOfMonth: number;
  interval?: number;
  start?: string;
}
export interface RecurrenceUnknown {
  mode: 'unknown';
  raw: string;
}

export type ParsedRecurrence =
  | RecurrenceNone
  | RecurrenceDaily
  | RecurrenceWeekly
  | RecurrenceMonthlyDate
  | RecurrenceMonthlyNth
  | RecurrenceYearly
  | RecurrenceUnknown;

const DTSTART_RE = /^DTSTART:(\d{4})(\d{2})(\d{2})\nRRULE:(.+)$/;

/** Parse RRULE string into structured form. Unknown patterns return {mode:'unknown', raw}. */
export function parseRRule(rrule: string): ParsedRecurrence {
  if (!rrule || rrule.trim() === '') return { mode: 'none' };

  const m = rrule.trim().match(DTSTART_RE);
  if (!m) return parseRule(rrule, rrule.trim());
  const [, y, mo, d, rule] = m;
  const start = `${y}-${mo}-${d}`;
  const parsed = parseRule(rrule, rule);
  if (parsed.mode === 'unknown' || parsed.mode === 'none' || !isRealDate(start)) {
    return { mode: 'unknown', raw: rrule };
  }
  return { ...parsed, start };
}

function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parseRule(rrule: string, rule: string): ParsedRecurrence {
  const parts = rule.split(';');
  const props: Record<string, string> = {};
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) return { mode: 'unknown', raw: rrule };
    props[p.slice(0, eq)] = p.slice(eq + 1);
  }

  const freq = props['FREQ'];
  let interval: number | undefined;
  if (props['INTERVAL'] !== undefined) {
    if (!/^[1-9]\d*$/.test(props['INTERVAL'])) return { mode: 'unknown', raw: rrule };
    interval = parseInt(props['INTERVAL'], 10);
  }
  const byDay = props['BYDAY'];
  const byMonthDay = props['BYMONTHDAY'];
  const byMonth = props['BYMONTH'];

  function hasOnlyKeys(...allowed: string[]): boolean {
    const allowedSet = new Set(allowed);
    return Object.keys(props).every((k) => allowedSet.has(k));
  }

  if (freq === 'DAILY' && !byDay && !byMonthDay && !byMonth) {
    if (!hasOnlyKeys('FREQ', 'INTERVAL')) return { mode: 'unknown', raw: rrule };
    return { mode: 'daily', ...(interval ? { interval } : {}) };
  }

  if (freq === 'WEEKLY' && byDay && !byMonthDay && !byMonth) {
    if (!hasOnlyKeys('FREQ', 'BYDAY', 'INTERVAL')) return { mode: 'unknown', raw: rrule };
    const days = byDay.split(',') as WeekdayCode[];
    if (!days.every((d) => (WEEKDAY_CODES as readonly string[]).includes(d))) {
      return { mode: 'unknown', raw: rrule };
    }
    return { mode: 'weekly', days, ...(interval ? { interval } : {}) };
  }

  if (freq === 'MONTHLY' && byMonthDay && !byDay && !byMonth) {
    if (!hasOnlyKeys('FREQ', 'BYMONTHDAY', 'INTERVAL')) return { mode: 'unknown', raw: rrule };
    if (!/^([1-9]|[12]\d|3[01])$/.test(byMonthDay)) return { mode: 'unknown', raw: rrule };
    const dom = parseInt(byMonthDay, 10);
    return { mode: 'monthly-date', dayOfMonth: dom, ...(interval ? { interval } : {}) };
  }

  if (freq === 'MONTHLY' && byDay && !byMonthDay && !byMonth) {
    if (!hasOnlyKeys('FREQ', 'BYDAY', 'INTERVAL')) return { mode: 'unknown', raw: rrule };
    // e.g. BYDAY=1SA (first Saturday) or BYDAY=-1MO (last Monday)
    const m = byDay.match(/^([+-]?\d+)([A-Z]{2})$/);
    if (!m) return { mode: 'unknown', raw: rrule };
    const nth = parseInt(m[1], 10);
    // Restrict to {1,2,3,4,-1}: the set the UI dropdown exposes.
    // recurrence.py accepts [+-]?[1-5], but values outside this set cannot be represented
    // in the edit form without silently corrupting the nth value on save.
    // Values like -2..-5 and 5 are returned as 'unknown' (round-trip preserved via raw pass-through).
    if (![1, 2, 3, 4, -1].includes(nth)) return { mode: 'unknown', raw: rrule };
    const day = m[2] as WeekdayCode;
    if (!(WEEKDAY_CODES as readonly string[]).includes(day)) return { mode: 'unknown', raw: rrule };
    return { mode: 'monthly-nth', nth, day, ...(interval ? { interval } : {}) };
  }

  if (freq === 'YEARLY' && byMonth && byMonthDay && !byDay) {
    if (!hasOnlyKeys('FREQ', 'BYMONTH', 'BYMONTHDAY', 'INTERVAL')) return { mode: 'unknown', raw: rrule };
    if (!/^([1-9]|1[0-2])$/.test(byMonth)) return { mode: 'unknown', raw: rrule };
    if (!/^([1-9]|[12]\d|3[01])$/.test(byMonthDay)) return { mode: 'unknown', raw: rrule };
    const month = parseInt(byMonth, 10);
    const dom = parseInt(byMonthDay, 10);
    return { mode: 'yearly', month, dayOfMonth: dom, ...(interval ? { interval } : {}) };
  }

  return { mode: 'unknown', raw: rrule };
}

/** Build RRULE string from structured form. */
export function buildRRule(parsed: Exclude<ParsedRecurrence, RecurrenceUnknown>): string {
  if (parsed.mode === 'none') return '';
  const rule = buildRule(parsed);
  if (!parsed.start) return rule;
  return `DTSTART:${parsed.start.replace(/-/g, '')}\nRRULE:${rule}`;
}

function buildRule(parsed: Exclude<ParsedRecurrence, RecurrenceUnknown | RecurrenceNone>): string {

  if (parsed.mode === 'daily') {
    let s = 'FREQ=DAILY';
    if (parsed.interval && parsed.interval > 1) s += `;INTERVAL=${parsed.interval}`;
    return s;
  }

  if (parsed.mode === 'weekly') {
    let s = `FREQ=WEEKLY;BYDAY=${parsed.days.join(',')}`;
    if (parsed.interval && parsed.interval > 1) s += `;INTERVAL=${parsed.interval}`;
    return s;
  }

  if (parsed.mode === 'monthly-date') {
    let s = `FREQ=MONTHLY;BYMONTHDAY=${parsed.dayOfMonth}`;
    if (parsed.interval && parsed.interval > 1) s += `;INTERVAL=${parsed.interval}`;
    return s;
  }

  if (parsed.mode === 'monthly-nth') {
    const nth = `${parsed.nth}`;
    let s = `FREQ=MONTHLY;BYDAY=${nth}${parsed.day}`;
    if (parsed.interval && parsed.interval > 1) s += `;INTERVAL=${parsed.interval}`;
    return s;
  }

  if (parsed.mode === 'yearly') {
    let s = `FREQ=YEARLY;BYMONTH=${parsed.month};BYMONTHDAY=${parsed.dayOfMonth}`;
    if (parsed.interval && parsed.interval > 1) s += `;INTERVAL=${parsed.interval}`;
    return s;
  }

  return '';
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Friendly summary for display next to the picker. */
export function friendlySummary(rrule: string): string {
  const parsed = parseRRule(rrule);
  const base = summarize(parsed);
  if (!('start' in parsed) || !parsed.start) return base;
  const [y, m, d] = parsed.start.split('-').map(Number);
  return `${base}, starting ${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}

function summarize(parsed: ParsedRecurrence): string {
  if (parsed.mode === 'none') return 'One-off (no repeat)';
  if (parsed.mode === 'unknown') return 'Custom recurrence (not editable here)';

  const interval = 'interval' in parsed && parsed.interval ? parsed.interval : 1;

  if (parsed.mode === 'daily') {
    return interval === 1 ? 'Daily' : `Every ${interval} days`;
  }

  if (parsed.mode === 'weekly') {
    const dayNames: Record<WeekdayCode, string> = {
      MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
    };
    const days = parsed.days.map((d) => dayNames[d]).join(', ');
    return interval === 1 ? `Weekly on ${days}` : `Every ${interval} weeks on ${days}`;
  }

  if (parsed.mode === 'monthly-date') {
    const suffix = ordinalSuffix(parsed.dayOfMonth);
    return interval === 1
      ? `Monthly on the ${parsed.dayOfMonth}${suffix}`
      : `Every ${interval} months on the ${parsed.dayOfMonth}${suffix}`;
  }

  if (parsed.mode === 'monthly-nth') {
    const nth = nthLabel(parsed.nth);
    const dayNames: Record<WeekdayCode, string> = {
      MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday',
      FR: 'Friday', SA: 'Saturday', SU: 'Sunday',
    };
    return interval === 1
      ? `Monthly on the ${nth} ${dayNames[parsed.day]}`
      : `Every ${interval} months on the ${nth} ${dayNames[parsed.day]}`;
  }

  if (parsed.mode === 'yearly') {
    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const suffix = ordinalSuffix(parsed.dayOfMonth);
    return interval === 1
      ? `Yearly on ${monthNames[parsed.month]} ${parsed.dayOfMonth}${suffix}`
      : `Every ${interval} years on ${monthNames[parsed.month]} ${parsed.dayOfMonth}${suffix}`;
  }

  return '';
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function nthLabel(n: number): string {
  if (n === -1) return 'last';
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function utcDays(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

function isoUtcDays(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function nthWeekdayOfMonth(d: Date, nth: number, weekday: number): boolean {
  const dom = d.getDate();
  const dow = d.getDay();
  if (dow !== weekday) return false;
  if (nth > 0) {
    // e.g. nth=1: first occurrence; this is the case when (dom - 1) / 7 < 1 → dom ≤ 7
    return Math.floor((dom - 1) / 7) === nth - 1;
  }
  // nth=-1: last occurrence
  const lastDom = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.floor((lastDom - dom) / 7) === 0;
}

const JS_DAY: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

/**
 * Returns true if the parsed recurrence fires on `today`.
 * Mirrors dateutil, which recurrence.py uses: the INTERVAL phase counts from
 * `start` (1970-01-01 when absent), weeks begin on Monday (RFC 5545's default
 * WKST), and nothing fires before `start`. tests/fixtures/recurrence-cases.json
 * pins both engines to the same answers.
 * `unknown` and `none` always return false.
 */
export function isRoutineDueToday(parsed: ParsedRecurrence, today: Date = new Date()): boolean {
  if (parsed.mode === 'none' || parsed.mode === 'unknown') return false;

  const interval = parsed.interval ?? 1;
  const start = parsed.start ?? '1970-01-01';
  const day = utcDays(today);
  const startDay = isoUtcDays(start);
  if (day < startDay) return false;
  const [startYear, startMonth] = start.split('-').map(Number);
  const monthsSince = (today.getFullYear() - startYear) * 12 + today.getMonth() + 1 - startMonth;

  if (parsed.mode === 'daily') {
    return (day - startDay) % interval === 0;
  }

  if (parsed.mode === 'weekly') {
    const weekday = today.getDay();
    const inDays = parsed.days.some((d) => JS_DAY[d] === weekday);
    if (!inDays) return false;
    // 1970-01-01 epoch day 0 was a Thursday: (epochDay + 3) % 7 is days since Monday.
    const startMonday = startDay - (((startDay + 3) % 7) + 7) % 7;
    const weeksSince = Math.floor((day - startMonday) / 7);
    return weeksSince % interval === 0;
  }

  if (parsed.mode === 'monthly-date') {
    if (today.getDate() !== parsed.dayOfMonth) return false;
    return monthsSince % interval === 0;
  }

  if (parsed.mode === 'monthly-nth') {
    const weekday = JS_DAY[parsed.day];
    if (!nthWeekdayOfMonth(today, parsed.nth, weekday)) return false;
    return monthsSince % interval === 0;
  }

  if (parsed.mode === 'yearly') {
    if (today.getMonth() + 1 !== parsed.month) return false;
    if (today.getDate() !== parsed.dayOfMonth) return false;
    return (today.getFullYear() - startYear) % interval === 0;
  }

  return false;
}

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * First day on or after `from` that the rule fires, as YYYY-MM-DD.
 * Searches eight years per interval step, enough for a Feb 29 yearly rule to
 * cross a skipped century leap year, capped so a huge INTERVAL cannot stall a
 * render.
 */
export function nextOccurrence(parsed: ParsedRecurrence, from: Date = new Date()): string | undefined {
  if (parsed.mode === 'none' || parsed.mode === 'unknown') return undefined;
  const limit = Math.min(2922 * (parsed.interval ?? 1), 400_000);
  let day = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  if (parsed.start && parsed.start > isoDate(day)) {
    const [y, m, d] = parsed.start.split('-').map(Number);
    day = new Date(y, m - 1, d, 12);
  }
  for (let i = 0; i <= limit; i++) {
    if (isRoutineDueToday(parsed, day)) return isoDate(day);
    day.setDate(day.getDate() + 1);
  }
  return undefined;
}
