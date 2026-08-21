import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { CalendarLayoutResult } from '../../src/shared/calendar-layout.js';
import { isoDateKey } from '../../src/shared/calendar-layout.js';
import type { LucarneCalendarGrid } from '../../src/components/calendar-grid.js';

await import('../../src/components/calendar-grid.js');

function makeLayout(day: Date): CalendarLayoutResult {
  return {
    days: [day],
    perDay: new Map([
      [isoDateKey(day), { allDay: [], inBand: [], earlier: [], later: [] }],
    ]),
  };
}

function makeLayoutMulti(days: Date[]): CalendarLayoutResult {
  return {
    days,
    perDay: new Map(
      days.map((d) => [isoDateKey(d), { allDay: [], inBand: [], earlier: [], later: [] }]),
    ),
  };
}

function makeGrid(): LucarneCalendarGrid {
  const grid = document.createElement('lucarne-calendar-grid') as LucarneCalendarGrid;
  grid.layout = makeLayout(new Date(2026, 4, 25));
  grid.cachedDayKeys = new Set(['2026-05-25']);
  grid.calendars = [{ entity: 'calendar.family', color: '#a8d8b9' }];
  document.body.appendChild(grid);
  return grid;
}

function shadowQueryAll(grid: LucarneCalendarGrid, selector: string): Element[] {
  return Array.from(grid.shadowRoot?.querySelectorAll(selector) ?? []);
}

describe('LucarneCalendarGrid — column-2 clip wrapper (issue #3)', () => {
  // The transformed `.day-cols-track` shifts left during pan; without a
  // scoped clip the all-day events painted in the wider track bleed across
  // the column-1 gutter on iPad Safari (the gutter spacer and the track's
  // transform-induced stacking context don't reliably stack).
  //
  // The clip is intentionally applied ONLY to the all-day track:
  //  - The day-name track holds only the headers, which never overflow their
  //    own column.
  //  - The time-band track hosts <lucarne-out-of-band-stub> whose
  //    backdrop/popover are `position: fixed`; because .day-cols-track has
  //    `transform`, it is their containing block, so a clip would also clip
  //    the stub overlay.
  let grid: LucarneCalendarGrid;
  afterEach(() => grid?.remove());

  it('renders three .day-cols-track elements (one per outer grid row)', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    const tracks = shadowQueryAll(grid, '.day-cols-track');
    assert.equal(tracks.length, 3, 'pan logic relies on three tracks (one per row)');
  });

  it('wraps ONLY the all-day track in a .day-cols-clip; the other two remain direct', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    const clips = shadowQueryAll(grid, '.day-cols-clip');
    assert.equal(clips.length, 1, 'expect exactly one clip wrapper (all-day only)');
    const clip = clips[0] as HTMLElement;
    assert.match(clip.getAttribute('style') ?? '', /grid-row:\s*2/);
    const innerTrack = clip.querySelector('.day-cols-track');
    assert.ok(innerTrack, 'clip should contain the all-day .day-cols-track');

    // Day names live in the sticky head, the time band in the scrolling body;
    // both keep their track as a direct, unclipped grid child.
    const headTrack = shadowQueryAll(grid, '.grid-head > .day-cols-track');
    assert.equal(headTrack.length, 1, 'day-name track is a direct child of .grid-head');
    const bodyTrack = shadowQueryAll(grid, '.grid-body > .day-cols-track');
    assert.equal(bodyTrack.length, 1, 'time-band track is a direct child of .grid-body');
  });

  it('.day-cols-clip rule declares overflow:hidden and grid-column:2', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    // Walk the constructed stylesheets on the shadow root to find the rule.
    // happy-dom doesn't resolve `grid-column` / `overflow` via getComputedStyle
    // for rules declared in adopted stylesheets, so we inspect the rule
    // declarations directly. Test fails if the declaration is removed,
    // renamed, or merged into a combined selector.
    const sheets = grid.shadowRoot?.adoptedStyleSheets ?? [];
    let found = false;
    for (const sheet of sheets) {
      for (const rule of Array.from(sheet.cssRules) as CSSStyleRule[]) {
        if (rule.selectorText && rule.selectorText.split(',').map((s) => s.trim()).includes('.day-cols-clip')) {
          assert.equal(rule.style.overflow, 'hidden');
          assert.equal(rule.style.gridColumn, '2');
          found = true;
        }
      }
    }
    assert.ok(found, '.day-cols-clip CSS rule must exist with overflow:hidden + grid-column:2');
  });
});

describe('LucarneCalendarGrid — single-row day header (issue #5)', () => {
  // Day header used to stack weekday name above the day number (two text
  // lines), with the "today" pill only encircling the number. The header is
  // now a single inline pill where weekday + number share the pill background
  // when the day is today. When the column gets too narrow the weekday hides.
  let grid: LucarneCalendarGrid;
  afterEach(() => grid?.remove());

  // We can't fake Date here without module-mocking calendar-grid's `new Date()`
  // call, so tests pass today's real date through and rely on isSameDay(day,
  // new Date()) inside the component.
  function buildGridWith(days: Date[]): LucarneCalendarGrid {
    const g = document.createElement('lucarne-calendar-grid') as LucarneCalendarGrid;
    g.layout = makeLayoutMulti(days);
    g.cachedDayKeys = new Set(days.map(isoDateKey));
    g.calendars = [{ entity: 'calendar.family', color: '#a8d8b9' }];
    document.body.appendChild(g);
    return g;
  }

  it('renders weekday + day number as a single inline pill (no stacked rows)', async () => {
    const today = new Date();
    grid = buildGridWith([today]);
    await grid.updateComplete;

    const header = grid.shadowRoot?.querySelector('.day-header') as HTMLElement | null;
    assert.ok(header, '.day-header should exist');
    const pill = header.querySelector('.day-pill') as HTMLElement | null;
    assert.ok(pill, '.day-pill should wrap weekday + number on one row');
    const weekday = pill.querySelector('.day-weekday');
    const num = pill.querySelector('.day-num');
    assert.ok(weekday, '.day-weekday should be inside .day-pill');
    assert.ok(num, '.day-num should be inside .day-pill');
    assert.equal(num!.textContent?.trim(), String(today.getDate()));
  });

  it('today highlight applies to the whole pill, not just the number', async () => {
    const today = new Date();
    grid = buildGridWith([today]);
    await grid.updateComplete;

    // The rendered header for today must carry the `today` class — otherwise
    // the CSS rule below could exist while runtime logic stopped applying it.
    const header = grid.shadowRoot?.querySelector('.day-header') as HTMLElement | null;
    assert.ok(header, '.day-header should exist');
    assert.ok(
      header.classList.contains('today'),
      '.day-header for today\'s date must have the `today` class',
    );

    const sheets = grid.shadowRoot?.adoptedStyleSheets ?? [];
    let pillRule: CSSStyleRule | null = null;
    let numRule: CSSStyleRule | null = null;
    for (const sheet of sheets) {
      for (const rule of Array.from(sheet.cssRules) as CSSStyleRule[]) {
        if (!rule.selectorText) continue;
        const sels = rule.selectorText.split(',').map((s) => s.trim());
        if (sels.includes('.day-header.today .day-pill')) pillRule = rule;
        if (sels.includes('.day-header.today .day-num')) numRule = rule;
      }
    }
    // Asserting the rule's selector exists is the structural guarantee that
    // matters; happy-dom's CSSOM silently drops `var(..., fallback)` values so
    // we can't reliably read the background back from .style.* — verified
    // manually in-browser.
    assert.ok(pillRule, '.day-header.today .day-pill rule must exist (carries the today pill background)');
    assert.equal(
      numRule,
      null,
      'today background must no longer be scoped to .day-num alone — it should cover the whole pill',
    );
  });

  it('hides .day-weekday in narrow columns via a container query', async () => {
    const today = new Date();
    grid = buildGridWith([today]);
    await grid.updateComplete;

    const sheets = grid.shadowRoot?.adoptedStyleSheets ?? [];
    let found = false;
    for (const sheet of sheets) {
      for (const rule of Array.from(sheet.cssRules)) {
        const text = rule.cssText ?? '';
        if (text.includes('@container') && text.includes('.day-weekday') && text.includes('display: none')) {
          found = true;
        }
      }
    }
    assert.ok(found, 'a @container rule should hide .day-weekday in narrow columns');
  });
});

describe('LucarneCalendarGrid — sticky head (issue #82)', () => {
  // The day-name row and the all-day row must stay pinned to the top of the
  // card's scrollport while the time band scrolls under them. `.day-header`
  // used to carry its own `position: sticky`, which did nothing:
  // <lucarne-calendar-day-pan> set `overflow: hidden`, so the scrollport it
  // pinned against was a content-sized box that never scrolls. Both rows now
  // live in one `.grid-head` block: sticky siblings all resolve `top` against
  // the same scrollport, so keeping them separate would need a hard-coded
  // `top` equal to the header row's height.
  let grid: LucarneCalendarGrid;
  afterEach(() => grid?.remove());

  /** Every rule whose selector list contains `selector` (a class may be styled by several). */
  function rulesFor(g: LucarneCalendarGrid, selector: string): CSSStyleRule[] {
    const out: CSSStyleRule[] = [];
    for (const sheet of g.shadowRoot?.adoptedStyleSheets ?? []) {
      for (const rule of Array.from(sheet.cssRules) as CSSStyleRule[]) {
        if (!rule.selectorText) continue;
        if (rule.selectorText.split(',').map((x) => x.trim()).includes(selector)) out.push(rule);
      }
    }
    return out;
  }

  /** Last declared value of `prop` across all rules matching `selector` (cascade order). */
  function declFor(g: LucarneCalendarGrid, selector: string, prop: string): string {
    let value = '';
    for (const rule of rulesFor(g, selector)) {
      const v = rule.style.getPropertyValue(prop);
      if (v) value = v;
    }
    return value;
  }

  it('puts the day-name and all-day rows in .grid-head, the time band in .grid-body', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    const head = grid.shadowRoot?.querySelector('.grid-head') as HTMLElement | null;
    assert.ok(head, '.grid-head must exist');
    assert.ok(head.querySelector('.header-spacer'), 'gutter spacer for the day-name row');
    assert.ok(head.querySelector('.day-header'), 'day names belong to the head');
    assert.ok(head.querySelector('.allday-spacer'), 'the "all-day" gutter label belongs to the head');
    assert.ok(head.querySelector('.allday-cell'), 'all-day cells belong to the head');
    assert.equal(head.querySelector('.time-col'), null, 'the hour gutter must NOT be in the head');

    const body = grid.shadowRoot?.querySelector('.grid-body') as HTMLElement | null;
    assert.ok(body, '.grid-body must exist');
    assert.ok(body.querySelector('.time-col'), 'hour gutter scrolls with the body');
    assert.equal(body.querySelector('.day-header'), null, 'day names must not be duplicated in the body');
    assert.equal(body.querySelector('.allday-cell'), null, 'all-day cells must not be duplicated in the body');
  });

  it('.grid-head is position:sticky at top:0 with an opaque background', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    assert.ok(rulesFor(grid, '.grid-head').length > 0, '.grid-head must be styled');
    assert.equal(
      declFor(grid, '.grid-head', 'position'),
      'sticky',
      'without sticky the head scrolls away again',
    );
    assert.equal(declFor(grid, '.grid-head', 'top'), '0px');
    // The time band scrolls underneath; a transparent head would show it through.
    assert.ok(declFor(grid, '.grid-head', 'background'), '.grid-head must paint a background');
  });

  it('head and body declare the same column template so the gutter stays aligned', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    for (const block of ['.grid-head', '.grid-body']) {
      assert.equal(declFor(grid, block, 'display'), 'grid', `${block} must be a grid`);
      assert.ok(
        declFor(grid, block, 'grid-template-columns').includes('40px'),
        `${block} needs the 40px gutter column or the head drifts out of alignment`,
      );
    }
    // Shared, not merely equal: one declaration for both keeps them in step.
    const combined = rulesFor(grid, '.grid-head').filter((r) =>
      (r.selectorText ?? '').split(',').map((x) => x.trim()).includes('.grid-body'),
    );
    assert.equal(combined.length, 1, 'expected one rule covering both .grid-head and .grid-body');
  });

  it('keeps all three gutter cells stuck to column 1 together', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    // `.grid-area` uses overflow-x: hidden, which still scrolls
    // *programmatically* — e.g. when focus moves to an off-screen buffer day.
    // Measured at scrollLeft 120 with these dropped: .time-col held at left 0
    // while both spacers sat at -120, tearing the gutter apart. Identical
    // construction is the durable property: whatever an engine does with a
    // sticky grid item, it then does to all three together.
    for (const cell of ['.header-spacer', '.allday-spacer', '.time-col']) {
      assert.equal(declFor(grid, cell, 'position'), 'sticky', `${cell} must be sticky`);
      assert.equal(declFor(grid, cell, 'left'), '0px', `${cell} must pin to left: 0`);
    }
    // The vertical pin belongs to .grid-head alone; a `top` here would fight it.
    for (const cell of ['.header-spacer', '.allday-spacer']) {
      assert.equal(declFor(grid, cell, 'top'), '', `${cell} must not set top`);
    }
  });

  it('.grid-wrapper stays a plain, unclipped block (it is the sticky containing block)', async () => {
    grid = makeGrid();
    await grid.updateComplete;

    assert.ok(rulesFor(grid, '.grid-wrapper').length > 0, '.grid-wrapper must be styled');
    assert.equal(declFor(grid, '.grid-wrapper', 'display'), 'block');
    // overflow-x counts too: `overflow-x: hidden` with a visible overflow-y
    // computes overflow-y to `auto`, making the wrapper a scroll container.
    for (const prop of ['overflow', 'overflow-x', 'overflow-y']) {
      assert.equal(
        declFor(grid, '.grid-wrapper', prop),
        '',
        `${prop} on the wrapper would become the head's scrollport and kill the sticky`,
      );
    }
  });
});
