import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { CalendarEvent } from '../../src/shared/types.js';
import type { CalendarLayoutResult } from '../../src/shared/calendar-layout.js';

// Register ha-card stub so Lit doesn't warn about an unknown element
if (!customElements.get('ha-card')) {
  customElements.define('ha-card', class extends HTMLElement {});
}

await import('../../src/cards/lucarne-calendar-card.js');
import type { LucarneCalendarCard } from '../../src/cards/lucarne-calendar-card.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CardPrivate = {
  _deletedUids: Set<string>;
  _openEvent: CalendarEvent | null;
  _layout: CalendarLayoutResult | null;
  _rolling: {
    cachedEvents: Map<string, CalendarEvent[]>;
    days: Date[];
    renderDays: Date[];
    cachedRange: Date[];
    canPanBack: boolean;
    canPanForward: boolean;
    isAtToday: boolean;
    bufferDays: number;
  };
  _visibleIds: Set<string>;
  _pendingEvents: CalendarEvent[];
  _config: { visible_hours?: { start: string; end: string }; calendars: unknown[] };
  _recompute(): void;
  _onEventDeleted(e: CustomEvent<{ entityId: string; uid: string }>): void;
  _onFetchComplete(events: Map<string, CalendarEvent[]>, failed: Set<string>): void;
};

function makeEvent(uid: string, summary = 'Test Event'): CalendarEvent {
  return {
    start: '2026-05-25',
    end: '2026-05-26',
    summary,
    uid,
  };
}

/** May 25 2026, local time — matches the date in makeEvent's all-day start. */
const FIXTURE_DAY = new Date(2026, 4, 25);
const FIXTURE_DAY_KEY = '2026-05-25';

function makeCard(): LucarneCalendarCard {
  const card = document.createElement('lucarne-calendar-card') as LucarneCalendarCard;
  document.body.appendChild(card);
  return card;
}

function priv(card: LucarneCalendarCard): CardPrivate {
  return card as unknown as CardPrivate;
}

function setupCardState(
  card: LucarneCalendarCard,
  events: CalendarEvent[],
  opts: { entityId?: string; days?: Date[] } = {},
) {
  const entityId = opts.entityId ?? 'calendar.family';
  // Default to a single-day window covering FIXTURE_DAY so layoutEvents
  // actually places the all-day fixture events; tests can then inspect the
  // resulting layout to verify _deletedUids filtering really took effect.
  const days = opts.days ?? [FIXTURE_DAY];
  const p = priv(card);
  p._config = {
    visible_hours: { start: '07:00', end: '21:00' },
    calendars: [{ entity: entityId, color: '#a8d8b9' }],
  };
  p._visibleIds = new Set([entityId]);
  p._pendingEvents = [];
  const cachedMap = new Map<string, CalendarEvent[]>();
  cachedMap.set(entityId, events);
  p._rolling = {
    cachedEvents: cachedMap,
    days,
    renderDays: days,
    cachedRange: days,
    canPanBack: false,
    canPanForward: false,
    isAtToday: true,
    bufferDays: 0,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LucarneCalendarCard — _deletedUids filtering in _recompute', () => {
  let card: LucarneCalendarCard;

  afterEach(() => card?.remove());

  it('_recompute includes all events when _deletedUids is empty', () => {
    card = makeCard();
    const events = [makeEvent('calendar.family::abc-123', 'A'), makeEvent('calendar.family::def-456', 'B')];
    setupCardState(card, events);

    priv(card)._deletedUids = new Set();
    priv(card)._recompute();

    const layout = priv(card)._layout;
    assert.ok(layout !== null, '_layout must be populated');
    const allDay = layout.perDay.get(FIXTURE_DAY_KEY)?.allDay ?? [];
    assert.equal(allDay.length, 2, 'both events should be placed');
    assert.deepEqual(
      allDay.map((e) => e.uid).sort(),
      ['calendar.family::abc-123', 'calendar.family::def-456'],
    );
  });

  it('_recompute excludes an event whose uid is in _deletedUids', () => {
    card = makeCard();
    const keep = makeEvent('calendar.family::def-456', 'Keep me');
    const del = makeEvent('calendar.family::abc-123', 'Delete me');
    setupCardState(card, [keep, del]);

    priv(card)._deletedUids = new Set(['calendar.family::abc-123']);
    priv(card)._recompute();

    const layout = priv(card)._layout;
    assert.ok(layout !== null, '_layout must be populated');
    const allDay = layout.perDay.get(FIXTURE_DAY_KEY)?.allDay ?? [];
    assert.equal(allDay.length, 1, 'only one event should remain after filter');
    assert.equal(allDay[0].uid, 'calendar.family::def-456', 'the kept event should be the non-deleted one');
  });

  it('_recompute passes all events when _deletedUids has a different uid', () => {
    card = makeCard();
    const events = [makeEvent('calendar.family::abc-123')];
    setupCardState(card, events);

    priv(card)._deletedUids = new Set(['calendar.family::OTHER']);
    priv(card)._recompute();

    const layout = priv(card)._layout;
    assert.ok(layout !== null, '_layout must be populated');
    const allDay = layout.perDay.get(FIXTURE_DAY_KEY)?.allDay ?? [];
    assert.equal(allDay.length, 1, 'unrelated tombstone must not filter the event');
    assert.equal(allDay[0].uid, 'calendar.family::abc-123');
  });

  it('_recompute is idempotent with an empty _deletedUids set (no filter branch taken)', () => {
    card = makeCard();
    const events = [makeEvent('calendar.family::abc-123')];
    setupCardState(card, events);

    priv(card)._deletedUids = new Set();
    priv(card)._recompute();
    const layout1 = priv(card)._layout;
    priv(card)._recompute();
    const layout2 = priv(card)._layout;

    assert.ok(layout1 !== null && layout2 !== null);
    const allDay1 = layout1.perDay.get(FIXTURE_DAY_KEY)?.allDay ?? [];
    const allDay2 = layout2.perDay.get(FIXTURE_DAY_KEY)?.allDay ?? [];
    assert.equal(allDay1.length, 1);
    assert.equal(allDay2.length, 1);
    assert.equal(allDay1[0].uid, allDay2[0].uid);
  });
});

describe('LucarneCalendarCard — _onEventDeleted handler', () => {
  let card: LucarneCalendarCard;

  afterEach(() => card?.remove());

  it('adds uid to _deletedUids', () => {
    card = makeCard();
    setupCardState(card, []);
    priv(card)._deletedUids = new Set();

    priv(card)._onEventDeleted(new CustomEvent('lucarne-event-deleted', {
      detail: { entityId: 'calendar.family', uid: 'calendar.family::abc-123' },
    }));

    assert.ok(priv(card)._deletedUids.has('calendar.family::abc-123'));
  });

  it('closes the popover (_openEvent = null)', () => {
    card = makeCard();
    setupCardState(card, []);
    priv(card)._openEvent = makeEvent('calendar.family::abc-123');

    priv(card)._onEventDeleted(new CustomEvent('lucarne-event-deleted', {
      detail: { entityId: 'calendar.family', uid: 'calendar.family::abc-123' },
    }));

    assert.equal(priv(card)._openEvent, null);
  });

  it('accumulates multiple deletions across calls', () => {
    card = makeCard();
    setupCardState(card, []);
    priv(card)._deletedUids = new Set(['calendar.family::existing']);

    priv(card)._onEventDeleted(new CustomEvent('lucarne-event-deleted', {
      detail: { entityId: 'calendar.family', uid: 'calendar.family::new-uid' },
    }));

    assert.ok(priv(card)._deletedUids.has('calendar.family::existing'), 'pre-existing uid preserved');
    assert.ok(priv(card)._deletedUids.has('calendar.family::new-uid'), 'new uid added');
  });
});

describe('LucarneCalendarCard — _onFetchComplete pruning', () => {
  let card: LucarneCalendarCard;
  afterEach(() => card?.remove());

  it('retains a uid in _deletedUids when the server still returns the event', () => {
    card = makeCard();
    setupCardState(card, []);
    priv(card)._deletedUids = new Set(['calendar.family::abc']);
    // Server's next fetch still includes the just-deleted event (stale)
    const events = new Map<string, CalendarEvent[]>();
    events.set('calendar.family', [makeEvent('calendar.family::abc')]);

    priv(card)._onFetchComplete(events, new Set());

    assert.ok(
      priv(card)._deletedUids.has('calendar.family::abc'),
      'uid still present in fetch → keep optimistic-delete entry so the event stays hidden',
    );
  });

  it('drops a uid from _deletedUids when the server stops returning the event', () => {
    card = makeCard();
    setupCardState(card, []);
    priv(card)._deletedUids = new Set(['calendar.family::abc', 'calendar.family::keep']);
    // Server has converged: 'abc' is gone, 'keep' is still pending
    const events = new Map<string, CalendarEvent[]>();
    events.set('calendar.family', [makeEvent('calendar.family::keep')]);

    priv(card)._onFetchComplete(events, new Set());

    assert.equal(priv(card)._deletedUids.has('calendar.family::abc'), false,
      'uid absent from fetch → drop the optimistic-delete entry (delete converged)');
    assert.ok(priv(card)._deletedUids.has('calendar.family::keep'),
      'uid still in fetch → keep the optimistic-delete entry');
  });

  it('keeps tombstones for entities whose fetch FAILED (transient signal-loss)', () => {
    card = makeCard();
    setupCardState(card, []);
    priv(card)._deletedUids = new Set(['calendar.family::abc']);
    // Fetch failed for calendar.family → no events for it, but failed flag set
    const events = new Map<string, CalendarEvent[]>();
    events.set('calendar.family', []);
    const failed = new Set(['calendar.family']);

    priv(card)._onFetchComplete(events, failed);

    assert.ok(
      priv(card)._deletedUids.has('calendar.family::abc'),
      'failed fetch is not authoritative — keep tombstone to avoid resurrecting a deleted event',
    );
  });

  it('clears _pendingEvents on every fetch-complete', () => {
    card = makeCard();
    setupCardState(card, []);
    priv(card)._pendingEvents = [makeEvent('calendar.family::pending:abc')];

    priv(card)._onFetchComplete(new Map(), new Set());

    assert.equal(priv(card)._pendingEvents.length, 0);
  });
});

describe('lucarne-calendar-card — config validation', () => {
  function setConfigOn(config: unknown): void {
    const el = document.createElement('lucarne-calendar-card') as LucarneCalendarCard;
    (el as unknown as { setConfig(c: unknown): void }).setConfig(config);
  }

  it('rejects a missing or empty calendars list', () => {
    assert.throws(() => setConfigOn({}), /"calendars" must be a non-empty array/);
    assert.throws(() => setConfigOn({ calendars: [] }), /"calendars" must be a non-empty array/);
  });

  it('rejects a null calendar entry with a readable message, not a TypeError', () => {
    // `calendars:` followed by a bare `-` is a common hand-edit slip and YAML makes
    // that entry null. Dereferencing it would raise a TypeError, which the card-base
    // boundary contains as an internal bug — leaving HA to accept the broken config.
    assert.throws(
      () => setConfigOn({ calendars: [null] }),
      (err: Error) => {
        assert.equal(err.name, 'LucarneConfigError');
        assert.match(err.message, /each calendar requires "entity" and "color"/);
        return true;
      },
    );
  });

  it('rejects an entry missing entity or color', () => {
    assert.throws(
      () => setConfigOn({ calendars: [{ entity: 'calendar.family' }] }),
      /each calendar requires "entity" and "color"/,
    );
  });
});

describe('lucarne-calendar-card — grid measurement re-arms', () => {
  const VALID_CONFIG = { calendars: [{ entity: 'calendar.family', color: '#a8d8b9' }] };
  const realResizeObserver = globalThis.ResizeObserver;
  let log: string[] = [];
  /** Elements currently under observation — cleared on disconnect, like the real API. */
  let observed: Element[] = [];

  function installRecorder() {
    log = [];
    observed = [];
    globalThis.ResizeObserver = class {
      constructor(private cb: () => void) {
        log.push('construct');
      }
      observe(el: Element) {
        log.push('observe');
        observed.push(el);
      }
      unobserve(el: Element) {
        observed = observed.filter((e) => e !== el);
      }
      disconnect() {
        log.push('disconnect');
        observed = [];
      }
    } as unknown as typeof ResizeObserver;
  }

  /** Observations recorded after the most recent teardown. */
  function observedSinceLastDisconnect(): boolean {
    return log.slice(log.lastIndexOf('disconnect') + 1).includes('observe');
  }

  afterEach(() => {
    globalThis.ResizeObserver = realResizeObserver;
    document.body.innerHTML = '';
  });

  it('re-observes the grid after a detach + re-attach (issue #105)', async () => {
    // firstUpdated() fires once per element, so a card that HA detaches on a view
    // switch and re-attaches would otherwise never re-measure — the grid would stay
    // frozen at the pre-detach width.
    installRecorder();
    const card = document.createElement('lucarne-calendar-card') as LucarneCalendarCard;
    card.setConfig(VALID_CONFIG);
    document.body.appendChild(card);
    await card.updateComplete;
    assert.deepEqual(log, ['construct', 'observe']);

    card.remove();
    assert.ok(log.includes('disconnect'), 'teardown ran on detach');

    document.body.appendChild(card);
    await card.updateComplete;
    assert.ok(observedSinceLastDisconnect(), 're-attached card observes its grid again');
  });

  it('measures the grid after recovering from a contained config failure', async () => {
    // card-base renders its error notice instead of the grid when applyConfig throws
    // something that is not a LucarneConfigError, so `.grid-area` is absent on the
    // first render. firstUpdated() alone would never see the grid that appears later.
    installRecorder();
    const card = document.createElement('lucarne-calendar-card') as LucarneCalendarCard;
    const inner = card as unknown as { _configFailure?: string; _dayWidthPx: number };
    card.setConfig(VALID_CONFIG);
    inner._configFailure = 'simulated internal failure';
    document.body.appendChild(card);
    await card.updateComplete;
    assert.equal(card.shadowRoot?.querySelector('.grid-area'), null, 'notice, not grid');
    assert.deepEqual(log, [], 'nothing to observe yet');

    // HA re-invokes setConfig on the same element when the config is edited.
    card.setConfig(VALID_CONFIG);
    await card.updateComplete;
    assert.ok(card.shadowRoot?.querySelector('.grid-area'), 'grid renders after recovery');
    assert.deepEqual(log, ['construct', 'observe'], 'and is measured');
  });

  it('re-targets the observer when a config failure replaces an already-measured grid', async () => {
    // Failure *after* a successful render is the harder case: Lit destroys the
    // measured `.grid-area` and recovery builds a brand new one. Tracking "have we
    // measured?" as a boolean would leave the observer bound to the discarded node,
    // so responsive sizing would be dead for the life of the card.
    installRecorder();
    const card = document.createElement('lucarne-calendar-card') as LucarneCalendarCard;
    const inner = card as unknown as { _configFailure?: string };
    card.setConfig(VALID_CONFIG);
    document.body.appendChild(card);
    await card.updateComplete;
    const firstGrid = card.shadowRoot?.querySelector('.grid-area');
    assert.ok(firstGrid && observed.includes(firstGrid), 'healthy card observes its grid');

    // Pretend the one-time scroll-to-now already ran against the original grid.
    const scroll = card as unknown as { _didInitialScroll: boolean; _initialScrollScheduled: boolean };
    scroll._didInitialScroll = true;

    inner._configFailure = 'late internal failure';
    card.requestUpdate();
    await card.updateComplete;
    assert.equal(card.shadowRoot?.querySelector('.grid-area'), null, 'grid torn down');
    // Must not keep watching the detached subtree for as long as the failure lasts.
    assert.ok(log.includes('disconnect'), 'observer torn down while the notice shows');
    assert.deepEqual(observed, [], 'nothing observed while the notice shows');

    card.setConfig(VALID_CONFIG);
    await card.updateComplete;
    const newGrid = card.shadowRoot?.querySelector('.grid-area');
    assert.ok(newGrid, 'grid rebuilt after recovery');
    assert.notEqual(newGrid, firstGrid, 'Lit built a new element, not the old one');
    assert.deepEqual(observed, [newGrid], 'observer targets the live grid and only that');
    assert.equal(
      scroll._didInitialScroll,
      false,
      'rebuilt grid starts at scrollTop 0, so scroll-to-now must be re-armed',
    );
  });

  it('seeds the measurement even when the browser has no ResizeObserver', async () => {
    // The iPadOS 15 / Tizen floor is about syntax, but a missing runtime API has to
    // degrade rather than break: the grid should still get one measurement, it just
    // won't re-measure on resize. Asserting _dayWidthPx (not the observer call log)
    // is what makes this fail if the direct _onResize() seed is ever dropped.
    const saved = globalThis.ResizeObserver;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
    try {
      const card = document.createElement('lucarne-calendar-card') as LucarneCalendarCard;
      card.setConfig(VALID_CONFIG);
      document.body.appendChild(card);
      await card.updateComplete;
      // _onResize defers the measurement to an animation frame.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const measured = (card as unknown as { _dayWidthPx: number })._dayWidthPx;
      assert.ok(measured > 0, `expected a seeded column width, got ${measured}`);
    } finally {
      globalThis.ResizeObserver = saved as typeof ResizeObserver;
    }
  });
});

describe('LucarneCalendarCard — .grid-area is the sticky scrollport (issue #82)', () => {
  // The grid's sticky head pins against the nearest scroll container. That has
  // to be `.grid-area`: it is the only ancestor that actually scrolls
  // vertically. It also has to clip horizontally, because the day track is
  // rendered wider than the card (buffer days) and days move by pan gesture —
  // never by a horizontal scrollbar.
  let card: LucarneCalendarCard;
  afterEach(() => card?.remove());

  it('declares overflow-x: hidden and overflow-y: auto (not a bare overflow: auto)', () => {
    card = makeCard();

    const styles = (card.constructor as unknown as { styles: { styleSheet?: CSSStyleSheet }[] }).styles;
    let rule: CSSStyleRule | null = null;
    for (const sheet of styles) {
      for (const r of Array.from(sheet.styleSheet?.cssRules ?? []) as CSSStyleRule[]) {
        if (r.selectorText?.trim() === '.grid-area') rule = r;
      }
    }
    assert.ok(rule, '.grid-area rule must exist');
    assert.equal(rule.style.getPropertyValue('overflow-y'), 'auto', 'the grid scrolls vertically here');
    assert.equal(
      rule.style.getPropertyValue('overflow-x'),
      'hidden',
      'auto would expose a horizontal scrollbar for the off-screen buffer days',
    );
    assert.equal(
      rule.style.getPropertyValue('overflow'),
      '',
      'a shorthand would re-introduce horizontal scrolling',
    );
  });
});
