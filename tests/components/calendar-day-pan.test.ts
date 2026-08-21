import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { snapToDay, rubberBand } from '../../src/shared/pan-math.js';
import type { LucarneCalendarDayPan } from '../../src/components/calendar-day-pan.js';

// Register the custom element (triggers customElements.define via @customElement)
await import('../../src/components/calendar-day-pan.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEl(): LucarneCalendarDayPan {
  const el = document.createElement('lucarne-calendar-day-pan') as LucarneCalendarDayPan;
  el.dayWidthPx = 150;
  document.body.appendChild(el);
  return el;
}

function makePE(
  type: string,
  opts: {
    pointerId?: number;
    pointerType?: string;
    button?: number;
    clientX?: number;
    clientY?: number;
    currentTarget?: Element;
  } = {},
): PointerEvent {
  return {
    type,
    pointerId: opts.pointerId ?? 1,
    pointerType: opts.pointerType ?? 'mouse',
    button: opts.button ?? 0,
    clientX: opts.clientX ?? 100,
    clientY: opts.clientY ?? 100,
    currentTarget: opts.currentTarget ?? null,
  } as unknown as PointerEvent;
}

interface MockTrackEl {
  style: { transform: string; transition: string };
  readonly offsetWidth: number;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  addEventListener(type: string, fn: Function, opts?: { once?: boolean }): void;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  removeEventListener(type: string, fn: Function): void;
  fireTransitionEnd(opts?: { propertyName?: string; targetEl?: unknown }): void;
}

function makeMockTrack(): MockTrackEl {
  const listeners = new Map<string, Set<Function>>();
  const onceSet = new WeakSet<Function>();
  const track: MockTrackEl = {
    style: { transform: '', transition: '' },
    get offsetWidth() { return 100; },
    addEventListener(type: string, fn: Function, opts?: { once?: boolean }) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
      if (opts?.once) onceSet.add(fn);
    },
    removeEventListener(type: string, fn: Function) {
      listeners.get(type)?.delete(fn);
    },
    fireTransitionEnd(opts: { propertyName?: string; targetEl?: unknown } = {}) {
      const fns = [...(listeners.get('transitionend') ?? [])];
      for (const fn of fns) {
        // Production code now filters bubbled events by target/propertyName.
        // Default both fields to "the track's own transform" so existing tests
        // that just call fireTransitionEnd() continue to drive the happy path.
        const ev = {
          type: 'transitionend',
          target: opts.targetEl ?? track,
          propertyName: opts.propertyName ?? 'transform',
        } as unknown as TransitionEvent;
        fn(ev);
        if (onceSet.has(fn)) listeners.get('transitionend')?.delete(fn);
      }
    },
  };
  return track;
}

// ---------------------------------------------------------------------------
// Pure-function tests
// ---------------------------------------------------------------------------

describe('snapToDay', () => {
  it('snapToDay(0, 150, 0) → 0 days', () => {
    assert.equal(snapToDay(0, 150, 0), 0);
  });

  it('snapToDay(80, 150, 0) → 1 day (more than half a column)', () => {
    assert.equal(snapToDay(80, 150, 0), 1);
  });

  it('snapToDay(70, 150, 0) → 0 days (less than half)', () => {
    assert.equal(snapToDay(70, 150, 0), 0);
  });

  it('snapToDay(50, 150, +800) → 1 day (velocity overcomes the threshold)', () => {
    assert.equal(snapToDay(50, 150, 800), 1);
  });

  it('snapToDay(-50, 150, -800) → -1 day', () => {
    assert.equal(snapToDay(-50, 150, -800), -1);
  });

  it('snapToDay(0, 0, 0) → 0 (dayWidthPx <= 0 guard)', () => {
    assert.equal(snapToDay(0, 0, 0), 0);
  });

  it('snapToDay(200, 0, 0) → 0 (dayWidthPx <= 0 guard)', () => {
    assert.equal(snapToDay(200, 0, 0), 0);
  });

  it('velocity exactly at threshold (500 px/s) → velocity-snap applies', () => {
    assert.equal(snapToDay(10, 150, 500), 1);
  });

  it('velocity just below threshold (499 px/s) → standard round applies', () => {
    assert.equal(snapToDay(10, 150, 499), 0);
  });
});

describe('rubberBand', () => {
  it('deltaPx within bound → returns deltaPx unchanged', () => {
    assert.equal(rubberBand(50, 100), 50);
    assert.equal(rubberBand(-50, 100), -50);
    assert.equal(rubberBand(100, 100), 100);
  });

  it('deltaPx beyond bound → linear up to bound, then 1/3 rate', () => {
    assert.ok(Math.abs(rubberBand(130, 100) - 109.9) < 0.01, `expected ~109.9 got ${rubberBand(130, 100)}`);
  });

  it('negative overshoot mirrors positive', () => {
    const pos = rubberBand(130, 100);
    const neg = rubberBand(-130, 100);
    assert.ok(Math.abs(pos + neg) < 0.001, `expected symmetric result, got +${pos} / ${neg}`);
  });

  it('zero deltaPx → 0', () => {
    assert.equal(rubberBand(0, 100), 0);
  });

  it('zero maxPx → full 1/3 from the start', () => {
    assert.ok(Math.abs(rubberBand(50, 0) - 16.5) < 0.01, `expected ~16.5 got ${rubberBand(50, 0)}`);
  });
});

// ---------------------------------------------------------------------------
// Sub-Phase 1A: setPointerCapture deferred to drag threshold
// ---------------------------------------------------------------------------

describe('LucarneCalendarDayPan — pointer capture (1A)', () => {
  let el: LucarneCalendarDayPan;
  let panWrapper: Element;
  let capturedIds: number[];

  beforeEach(async () => {
    el = makeEl();
    await el.updateComplete;
    panWrapper = el.shadowRoot!.querySelector('.pan-wrapper')!;
    capturedIds = [];
    (panWrapper as unknown as { setPointerCapture(id: number): void }).setPointerCapture =
      (id: number) => capturedIds.push(id);
    (panWrapper as unknown as { releasePointerCapture(id: number): void }).releasePointerCapture =
      (_id: number) => {};
  });

  afterEach(() => el.remove());

  const down = (opts = {}) => makePE('pointerdown', { currentTarget: panWrapper, ...opts });
  const move = (dx: number, dy: number, opts = {}) =>
    makePE('pointermove', { clientX: 100 + dx, clientY: 100 + dy, currentTarget: panWrapper, ...opts });
  const up = (dx = 0, opts = {}) =>
    makePE('pointerup', { clientX: 100 + dx, clientY: 100, currentTarget: panWrapper, ...opts });

  it('pointerdown does NOT call setPointerCapture', () => {
    (el as unknown as Record<string, Function>)._onPointerDown(down());
    assert.equal(capturedIds.length, 0);
  });

  it('pointermove with dx=5,dy=3 (below threshold) does NOT call setPointerCapture', () => {
    (el as unknown as Record<string, Function>)._onPointerDown(down());
    (el as unknown as Record<string, Function>)._onPointerMove(move(5, 3));
    assert.equal(capturedIds.length, 0);
  });

  it('pointermove with dx=12,dy=3 (horizontal-dominant, above threshold) calls setPointerCapture exactly once', () => {
    (el as unknown as Record<string, Function>)._onPointerDown(down());
    (el as unknown as Record<string, Function>)._onPointerMove(move(12, 3));
    assert.equal(capturedIds.length, 1);
    assert.equal(capturedIds[0], 1);
    // second move should not re-capture
    (el as unknown as Record<string, Function>)._onPointerMove(move(20, 3));
    assert.equal(capturedIds.length, 1);
  });

  it('pointermove with dy>dx (vertical scroll wins) does NOT call setPointerCapture', () => {
    (el as unknown as Record<string, Function>)._onPointerDown(down());
    (el as unknown as Record<string, Function>)._onPointerMove(move(3, 15));
    assert.equal(capturedIds.length, 0);
  });

  it('pointermove with dy>dx clears _pointerId so gesture is aborted', () => {
    (el as unknown as Record<string, Function>)._onPointerDown(down());
    (el as unknown as Record<string, Function>)._onPointerMove(move(3, 15));
    assert.equal((el as unknown as Record<string, unknown>)._pointerId, undefined);
  });

  it('pointerdown then pointerup with no move does NOT capture', () => {
    (el as unknown as Record<string, Function>)._onPointerDown(down());
    (el as unknown as Record<string, Function>)._onPointerUp(up());
    assert.equal(capturedIds.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Sub-Phase 1B: snap animation target + deferred pan-snap dispatch
// ---------------------------------------------------------------------------

describe('LucarneCalendarDayPan — snap animation (1B)', () => {
  let el: LucarneCalendarDayPan;
  let track: MockTrackEl;
  let snapEvents: CustomEvent[];
  // Only patch matchMedia on the existing window — replacing the whole window
  // object loses happy-dom prototype methods.
  const originalMatchMedia = (globalThis.window as unknown as Record<string, unknown>).matchMedia;

  function setReducedMotion(reduced: boolean) {
    (globalThis.window as unknown as Record<string, Function>).matchMedia =
      (query: string) => ({
        matches: reduced && query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      });
  }

  beforeEach(async () => {
    el = makeEl();
    await el.updateComplete;
    track = makeMockTrack();
    (el as unknown as Record<string, unknown>)._cachedTargets = [track];
    snapEvents = [];
    el.addEventListener('pan-snap', (e) => snapEvents.push(e as CustomEvent));
    // Default: no reduced motion
    setReducedMotion(false);
  });

  afterEach(() => {
    el.remove();
    (globalThis.window as unknown as Record<string, unknown>).matchMedia = originalMatchMedia;
  });

  it('with deltaDays=1, transform is set to translateX(150px) (not 0)', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(track.style.transform, 'translateX(150px)');
  });

  it('with deltaDays=-1, transform is set to translateX(-150px)', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(-1);
    assert.equal(track.style.transform, 'translateX(-150px)');
  });

  it('with deltaDays=0, transform is set to translateX(0)', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(0);
    assert.equal(track.style.transform, 'translateX(0px)');
  });

  it('pan-snap is NOT dispatched synchronously from _snapAndCommit', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(snapEvents.length, 0);
  });

  it('pan-snap IS dispatched after transitionend fires', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(snapEvents.length, 0);
    track.fireTransitionEnd();
    assert.equal(snapEvents.length, 1);
    assert.equal(snapEvents[0].detail.deltaDays, 1);
  });

  it('with deltaDays=0, pan-snap is never dispatched even after transitionend', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(0);
    track.fireTransitionEnd();
    assert.equal(snapEvents.length, 0);
  });

  it('after transitionend, transform stays at animation target until rAF clears inline style', () => {
    // The atomic swap happens via requestAnimationFrame AFTER transitionend:
    //   1. transitionend handler dispatches pan-snap synchronously
    //   2. Card updates dayOffset → Lit re-renders grid with new days
    //   3. rAF fires → _clearInlineTransform removes inline style → CSS baseline
    //      (`--lucarne-day-baseline-px`) applies; new days at baseline visually
    //      equal old days at animation target.
    // In this test the mock track isn't reachable via _panTargets, so the
    // rAF-based clear doesn't touch it. We assert the pre-clear state.
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    track.fireTransitionEnd();
    assert.equal(track.style.transform, 'translateX(150px)', 'transform stays at animation target before rAF clear');
    assert.match(track.style.transition, /transform 240ms/, 'transition stays until rAF clear');
  });

  it('with prefers-reduced-motion, pan-snap is dispatched immediately', () => {
    setReducedMotion(true);
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(snapEvents.length, 1);
  });

  it('with prefers-reduced-motion, transform is translateX(0px) immediately', () => {
    setReducedMotion(true);
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(track.style.transform, 'translateX(0px)');
  });

  it('with bufferDays=1, dayWidthPx=150, deltaDays=1 → target includes baseline (-150 + 150 = 0)', () => {
    el.bufferDays = 1;
    // baseline = -bufferDays * dayWidthPx = -150
    // target = baseline + deltaDays * dayWidthPx = -150 + 150 = 0
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(track.style.transform, 'translateX(0px)');
  });

  it('with bufferDays=2, dayWidthPx=150, deltaDays=-1 → target = -300 + (-150) = -450', () => {
    el.bufferDays = 2;
    // baseline = -300, target = -300 + (-1 * 150) = -450
    (el as unknown as Record<string, Function>)._snapAndCommit(-1);
    assert.equal(track.style.transform, 'translateX(-450px)');
  });

  it('with bufferDays=1, _setTranslate(50) → translateX(-150 + 50) = -100px', () => {
    el.bufferDays = 1;
    (el as unknown as Record<string, Function>)._setTranslate(50);
    assert.equal(track.style.transform, 'translateX(-100px)');
  });

  // -------------------------------------------------------------------------
  // Boundary-clamp guard: at a pan bound (e.g. ±90 days), a fast flick into
  // the disabled direction must NOT dispatch pan-snap, because the controller
  // would just clamp it back to 0. Without the clamp in _onPointerUp,
  // snapToDay's velocity branch can return ±1 even though rubberBand has
  // reduced the displacement to ~1/3 of its raw value.
  // -------------------------------------------------------------------------
  it('fast flick into !canPanBack bound → pan-snap NOT dispatched (clamped to 0)', () => {
    const panWrapper = el.shadowRoot!.querySelector('.pan-wrapper')!;
    (panWrapper as unknown as { releasePointerCapture(id: number): void }).releasePointerCapture = () => {};
    el.canPanBack = false;
    el.canPanForward = true;
    setReducedMotion(true); // dispatches immediately, makes assertion synchronous
    (el as unknown as Record<string, unknown>)._isDragging = true;
    (el as unknown as Record<string, unknown>)._startX = 100;
    (el as unknown as Record<string, unknown>)._pointerId = 1;
    (el as unknown as Record<string, unknown>)._startTime = performance.now() - 20;
    // dx=+20px over 20ms → velocity = +1000 px/s, well above the 500 threshold
    (el as unknown as Record<string, Function>)._onPointerUp(
      makePE('pointerup', { clientX: 120, currentTarget: panWrapper }),
    );
    assert.equal(snapEvents.length, 0);
  });

  it('fast flick into !canPanForward bound → pan-snap NOT dispatched (clamped to 0)', () => {
    const panWrapper = el.shadowRoot!.querySelector('.pan-wrapper')!;
    (panWrapper as unknown as { releasePointerCapture(id: number): void }).releasePointerCapture = () => {};
    el.canPanBack = true;
    el.canPanForward = false;
    setReducedMotion(true);
    (el as unknown as Record<string, unknown>)._isDragging = true;
    (el as unknown as Record<string, unknown>)._startX = 100;
    (el as unknown as Record<string, unknown>)._pointerId = 1;
    (el as unknown as Record<string, unknown>)._startTime = performance.now() - 20;
    // dx=-20px over 20ms → velocity = -1000 px/s
    (el as unknown as Record<string, Function>)._onPointerUp(
      makePE('pointerup', { clientX: 80, currentTarget: panWrapper }),
    );
    assert.equal(snapEvents.length, 0);
  });

  it('fast flick when both directions allowed → pan-snap dispatched (clamp is direction-specific)', () => {
    const panWrapper = el.shadowRoot!.querySelector('.pan-wrapper')!;
    (panWrapper as unknown as { releasePointerCapture(id: number): void }).releasePointerCapture = () => {};
    el.canPanBack = true;
    el.canPanForward = true;
    setReducedMotion(true);
    (el as unknown as Record<string, unknown>)._isDragging = true;
    (el as unknown as Record<string, unknown>)._startX = 100;
    (el as unknown as Record<string, unknown>)._pointerId = 1;
    (el as unknown as Record<string, unknown>)._startTime = performance.now() - 20;
    (el as unknown as Record<string, Function>)._onPointerUp(
      makePE('pointerup', { clientX: 120, currentTarget: panWrapper }),
    );
    assert.equal(snapEvents.length, 1);
    assert.equal(snapEvents[0].detail.deltaDays, 1);
  });

  // -------------------------------------------------------------------------
  // Bubble-filter guard: transitionend bubbles, so an unrelated descendant
  // transition (e.g. lucarne-calendar-event-block's `filter` transition)
  // must NOT trigger pan-snap. Only targets[0]'s own transform-property
  // completion counts.
  // -------------------------------------------------------------------------
  it('transitionend from a descendant (different target) does NOT dispatch pan-snap', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(snapEvents.length, 0);
    // Simulate a child element bubbling its transitionend up to the track listener.
    const fakeChild = { isFakeDescendant: true };
    track.fireTransitionEnd({ targetEl: fakeChild });
    assert.equal(snapEvents.length, 0, 'descendant event must be ignored');
    // The real transform completion that follows still dispatches pan-snap.
    track.fireTransitionEnd();
    assert.equal(snapEvents.length, 1);
    assert.equal(snapEvents[0].detail.deltaDays, 1);
  });

  it('transitionend on a non-transform property (e.g. filter) does NOT dispatch pan-snap', () => {
    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    track.fireTransitionEnd({ propertyName: 'filter' });
    assert.equal(snapEvents.length, 0, 'non-transform property must be ignored');
    track.fireTransitionEnd({ propertyName: 'transform' });
    assert.equal(snapEvents.length, 1);
  });

  it('new pointerdown during snap cancels the pending transitionend dispatch', async () => {
    const panWrapper = el.shadowRoot!.querySelector('.pan-wrapper')!;
    (panWrapper as unknown as { setPointerCapture(id: number): void }).setPointerCapture = () => {};
    (panWrapper as unknown as { releasePointerCapture(id: number): void }).releasePointerCapture = () => {};

    (el as unknown as Record<string, Function>)._snapAndCommit(1);
    assert.equal(snapEvents.length, 0);

    // New gesture starts — should cancel the pending snap
    (el as unknown as Record<string, Function>)._onPointerDown(
      makePE('pointerdown', { currentTarget: panWrapper }),
    );

    // transitionend fires but pan-snap must NOT be dispatched
    track.fireTransitionEnd();
    assert.equal(snapEvents.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Sticky head scrollport (issue #82)
// ---------------------------------------------------------------------------

describe('LucarneCalendarDayPan — host must not be a scroll container', () => {
  // `overflow: hidden` here makes the host the nearest scrollport for every
  // sticky descendant, so the calendar grid's sticky head silently stops
  // sticking. Clipping the wider-than-viewport day track is the card's job
  // (`.grid-area { overflow-x: hidden }`), not this element's.
  let el: LucarneCalendarDayPan;
  afterEach(() => el?.remove());

  it(':host declares no overflow', async () => {
    el = makeEl();
    await el.updateComplete;

    let seen = 0;
    for (const sheet of el.shadowRoot?.adoptedStyleSheets ?? []) {
      for (const rule of Array.from(sheet.cssRules) as CSSStyleRule[]) {
        if (rule.selectorText?.trim() !== ':host') continue;
        seen++;
        for (const prop of ['overflow', 'overflow-x', 'overflow-y']) {
          assert.equal(
            rule.style.getPropertyValue(prop),
            '',
            `:host must not set ${prop} — it would capture the grid's sticky head`,
          );
        }
      }
    }
    // Without this the loop body could stop running (rule renamed or moved) and
    // the guard would green-light the very regression it exists to catch.
    assert.ok(seen > 0, 'no :host rule found — the guard is not actually running');
  });
});
