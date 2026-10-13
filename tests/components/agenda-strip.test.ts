import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneAgendaStrip } from '../../src/components/agenda-strip.js';
import type { CalendarEvent } from '../../src/shared/types.js';

await import('../../src/components/agenda-strip.js');

// The strip reads the real clock, so build events relative to the local day.
function localDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function allDay(offsetDays: number, summary: string): CalendarEvent {
  return { start: localDate(offsetDays), end: localDate(offsetDays + 1), summary };
}

function tomorrowAt(hour: number, summary: string): CalendarEvent {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString(), summary };
}

function makeStrip(events: CalendarEvent[], windowDays: 1 | 2): LucarneAgendaStrip {
  const el = document.createElement('lucarne-agenda-strip') as LucarneAgendaStrip;
  el.events = events;
  el.windowDays = windowDays;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.querySelectorAll('lucarne-agenda-strip').forEach((el) => el.remove());
});

describe('lucarne-agenda-strip day divider', () => {
  it('renders a Tomorrow header between today and tomorrow events', async () => {
    const el = makeStrip([allDay(0, 'Rates'), allDay(1, 'Pay day')], 2);
    await el.updateComplete;
    const children = [...el.shadowRoot!.querySelectorAll('.event-row, .day-divider')];
    assert.deepEqual(
      children.map((c) => (c.classList.contains('day-divider') ? 'divider' : c.querySelector('.event-summary')!.textContent)),
      ['Rates', 'divider', 'Pay day'],
    );
    const divider = el.shadowRoot!.querySelector('.day-divider')!;
    assert.equal(divider.textContent!.trim(), 'Tomorrow');
    assert.equal(divider.getAttribute('role'), 'heading');
  });

  it('marks the divider as leading only when nothing is on today', async () => {
    const tomorrowOnly = makeStrip([allDay(1, 'Pay day')], 2);
    await tomorrowOnly.updateComplete;
    assert.ok(tomorrowOnly.shadowRoot!.querySelector('.day-divider')!.classList.contains('leading'));

    const both = makeStrip([allDay(0, 'Rates'), allDay(1, 'Pay day')], 2);
    await both.updateComplete;
    assert.ok(!both.shadowRoot!.querySelector('.day-divider')!.classList.contains('leading'));
  });

  it('renders no divider when nothing is on tomorrow', async () => {
    const el = makeStrip([allDay(0, 'Rates')], 2);
    await el.updateComplete;
    assert.equal(el.shadowRoot!.querySelector('.day-divider'), null);
  });

  it('shows a plain time, not a "tomorrow" prefix, under the header', async () => {
    const el = makeStrip([tomorrowAt(9, 'Dentist')], 2);
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.time-pill')!.textContent!.trim();
    assert.equal(pill, '09:00');
  });
});
