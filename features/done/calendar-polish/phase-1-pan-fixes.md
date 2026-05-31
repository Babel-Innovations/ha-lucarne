---
status: done
---

# Phase 1: Pan interaction fixes

Two fixes in `src/components/calendar-day-pan.ts`:

- **1a**: Move `setPointerCapture` from `pointerdown` to the moment the 10px drag threshold is crossed in `pointermove`. Fixes Chrome desktop where clicking an event pill currently does nothing (the pan-wrapper captures the pointer and steals the synthesized `click`).
- **1b**: Restructure the snap-release animation so the OLD day content animates to a position equal to the NEW content's `translateX(0)` state, then atomically swaps on `transitionend`. Fixes the visible "jump from the left" on swipe release.

This is the first implementation phase because **1a** unblocks Chrome-desktop end-to-end testing of the Phase 3 delete-events flow.

## Context

Read [./README.md](./README.md) for the bug catalog and root cause analysis.

The current implementation (post-Phase-3-of-visible-days):

- `_onPointerDown` (line 109-120) immediately calls `setPointerCapture` for **every** pointerdown, regardless of intent. On a mouse pointerdown that turns into a click (no movement), the capture stays active until `_onPointerUp` releases it. With capture active, the browser-synthesized `click` event targets the capturing element (`.pan-wrapper`), not the originating `calendar-event-block` underneath. `calendar-event-block`'s `@click` handler never fires → no detail modal. iOS Safari handles touch-to-click synthesis differently and is not affected.

- `_onPointerUp` (line 142-172) calls `_snapBack()` (always animates to `translateX(0)`) and then synchronously dispatches `pan-snap`. The card receives `pan-snap` → calls `_rolling.pan(-deltaDays)` → updates `_dayOffset` → schedules a Lit re-render. The re-render lands within a frame and replaces the day-cell content of the `.day-cols-track`. The CSS transition (`transform 240ms ease`) continues, but now animates the **new** content from the old drag offset to `0`. Visually, day 28 "flies in from the left" instead of continuing smoothly from its drag position.

The fix for 3b: change the animation target from `0` to `deltaDays * dayWidthPx` (i.e., one full column shift in the drag direction), keep the OLD content during the animation, and on `transitionend`, atomically (a) set `translateX(0)` with `transition: none`, (b) dispatch `pan-snap`. Because the OLD content at `translateX(deltaDays * dayWidthPx)` and the NEW content at `translateX(0)` occupy identical screen positions for the visible columns, the swap is visually invisible.

## Structure

```
src/components/
  calendar-day-pan.ts            # MODIFY: 3a (pointer capture timing) + 3b (snap animation target + transitionend swap)
tests/components/
  calendar-day-pan.test.ts       # MODIFY: pure-function tests already cover snapToDay; add tests for the new pan-snap timing contract
src/cards/
  lucarne-calendar-card.ts       # VERIFY: the @pan-snap handler still works unchanged (the dispatch is now async — confirm no synchronous-assumption code depends on the old timing)
```

No new files.

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline verification

- [ ] On a fresh build, on Chrome desktop, click an event pill → **modal does not open** (the bug). Take a console log via `mcp__browsermcp__browser_get_console_logs` — confirm no `lucarne-event-tap` event fires.
- [ ] On iPad, tap an event pill → modal opens correctly (this path stays working).
- [ ] Swipe-drag on both devices and observe the snap-end jump (release at ~60% of a day-width). Capture a screen recording or take rapid-fire screenshots to document.

### Sub-Phase 1A: Defer `setPointerCapture` until drag threshold (issue 4)

Deployable when: Chrome desktop click opens the detail modal AND drag still pans correctly.

#### Tests

- [x] In `tests/components/calendar-day-pan.test.ts`, add tests that simulate pointer events on a mounted `<lucarne-calendar-day-pan>` (use happy-dom or jsdom via the existing test setup):
  - `pointerdown` does NOT trigger `setPointerCapture` (spy on the element method).
  - `pointermove` with `dx < 10 && dy < 10` does NOT trigger `setPointerCapture`.
  - `pointermove` with `dx >= 10` (horizontal-dominant) DOES trigger `setPointerCapture` exactly once.
  - `pointermove` with `dy > dx` (vertical scroll wins) does NOT trigger `setPointerCapture` and aborts the gesture (clears `_pointerId`).
  - A pointerdown→pointerup with no intermediate move does NOT capture, so the synthesized `click` reaches descendant elements normally.

#### Implementation

- [x] Edit `src/components/calendar-day-pan.ts`:
  - In `_onPointerDown` (lines 109-120): **remove** the line `(e.currentTarget as Element).setPointerCapture(e.pointerId);`. Keep everything else (pointerId tracking, startX/startY/startTime, target caching).
  - In `_onPointerMove` (lines 122-140): inside the `if (!this._isDragging)` block, **after** `this._isDragging = true;`, add:

    ```typescript
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* capture failed; continue without — events will still arrive on the wrapper */
    }
    ```

  - `_onPointerUp` (lines 142-172) already calls `releasePointerCapture` inside a try/catch — that handles the now-possible case of "no capture ever taken" silently. No change needed.

#### Manual verification (1A)

- [ ] Rebuild and deploy (`npm run deploy`).
- [ ] Chrome desktop: click an event pill → detail modal opens.
- [ ] Chrome desktop: click-and-drag horizontally on an empty area → pans normally → release → snaps (jump bug still present, fixed in sub-phase 1B).
- [ ] Chrome desktop: click-and-drag starting **on** an event pill, with horizontal motion → pans normally; modal does NOT open at the end of the drag (the pointer was captured mid-drag, so the click target became the wrapper).
- [ ] iPad: tap event pill → modal opens (unchanged behavior).
- [ ] iPad: swipe horizontally → pans normally.

### Sub-Phase 1B: Snap animation target + atomic swap on transitionend (issue 5)

Deployable when: swipe-release snap visually continues smoothly with no content "fly-in".

#### Tests

- [x] In `tests/components/calendar-day-pan.test.ts`, add tests:
  - When `_onPointerUp` fires with non-zero `deltaDays`, the `transform` is set to `translateX(${deltaDays * dayWidthPx}px)` (NOT `translateX(0)`), with a transition.
  - When `_onPointerUp` fires with `deltaDays === 0`, the `transform` is set to `translateX(0)` with a transition (unchanged behavior).
  - The `pan-snap` event is NOT dispatched synchronously from `_onPointerUp`. It IS dispatched after a `transitionend` event on the first track element.
  - When `prefers-reduced-motion: reduce` is matched, the `pan-snap` event is dispatched immediately and the `transform` is set to `translateX(0)` with no transition.
  - When a new pointerdown arrives during a snap animation, any pending `transitionend`-deferred `pan-snap` dispatch is cancelled (the new gesture wins; the old snap is abandoned).

  Hint for the test: use `window.matchMedia` mock to control reduced-motion; use `Event` constructors to fire `transitionend` programmatically since happy-dom does not run CSS transitions.

#### Implementation

- [x] Add private state to `LucarneCalendarDayPan`:

  ```typescript
  private _pendingSnapDelta = 0;
  private _pendingTransitionEnd?: () => void;
  ```

- [x] Replace `_snapBack` and the dispatch logic in `_onPointerUp` with a new `_snapAndCommit(deltaDays: number)`:

  ```typescript
  private _snapAndCommit(deltaDays: number) {
    const targets = this._cachedTargets;
    if (targets.length === 0) {
      // No track to animate; just commit immediately.
      if (deltaDays !== 0) this._dispatchPanSnap(deltaDays);
      return;
    }
    this._cancelPendingSnap();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Skip animation: snap target=0 visually, commit immediately so the
      // new content renders at translateX(0).
      for (const el of targets) {
        el.style.transition = '';
        el.style.transform = 'translateX(0)';
      }
      if (deltaDays !== 0) this._dispatchPanSnap(deltaDays);
      return;
    }

    const duration = getComputedStyle(this).getPropertyValue('--lucarne-pan-duration').trim() || '240ms';
    const easing = getComputedStyle(this).getPropertyValue('--lucarne-pan-easing').trim() || 'cubic-bezier(0.32, 0.72, 0, 1)';
    const transition = `transform ${duration} ${easing}`;

    // Animation target: deltaDays !== 0 → animate to one full day-shift in the drag direction
    // (showing OLD content). deltaDays === 0 → animate back to 0 (unchanged behavior).
    const targetPx = deltaDays * this.dayWidthPx;

    for (const el of targets) {
      el.style.transition = transition;
      el.style.transform = `translateX(${targetPx}px)`;
    }

    const onEnd = () => {
      this._pendingTransitionEnd = undefined;
      targets[0].removeEventListener('transitionend', onEnd);
      // Atomic swap: clear transition, reset to 0 with old content still in place,
      // then dispatch pan-snap. The card updates _dayOffset; Lit re-renders with
      // new content at translateX(0). Old content at translateX(targetPx) and
      // new content at translateX(0) occupy identical screen positions, so the
      // swap is visually invisible.
      for (const el of targets) {
        el.style.transition = '';
        el.style.transform = 'translateX(0)';
      }
      // Force layout so the transform reset is flushed before Lit re-renders.
      void targets[0].offsetWidth;
      if (deltaDays !== 0) this._dispatchPanSnap(deltaDays);
    };
    this._pendingTransitionEnd = onEnd;
    targets[0].addEventListener('transitionend', onEnd, { once: true });
  }

  private _dispatchPanSnap(deltaDays: number) {
    this.dispatchEvent(
      new CustomEvent('pan-snap', {
        detail: { deltaDays },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _cancelPendingSnap() {
    if (this._pendingTransitionEnd && this._cachedTargets[0]) {
      this._cachedTargets[0].removeEventListener('transitionend', this._pendingTransitionEnd);
      this._pendingTransitionEnd = undefined;
    }
  }
  ```

- [x] Call `_cancelPendingSnap()` at the top of `_onPointerDown` so a new gesture aborts any in-flight snap commit (the user took control again).
- [x] In `_onPointerUp`, replace the `_snapBack(); if (deltaDays !== 0) this.dispatchEvent(...)` block with a single `this._snapAndCommit(deltaDays);`.
- [x] Delete the old `_snapBack()` method (its responsibilities are absorbed into `_snapAndCommit`).
- [x] Update the file-level JSDoc on `LucarneCalendarDayPan` (lines 5-13) to document the new contract: `pan-snap` is dispatched after the snap animation completes, not synchronously on pointerup.

#### Manual verification (1B)

- [ ] Rebuild and deploy.
- [ ] iPad and Chrome: swipe horizontally, release at ~60% of a day-width. The day under your finger slides smoothly to slot 0 with no content jump or "fly-in".
- [ ] Test flick (high velocity, short distance): the snap completes in the direction of motion smoothly.
- [ ] Test at the ±90-day bound: rubber-band still works on overswipe; release snaps back to bound with no jump.
- [ ] Toggle `prefers-reduced-motion: reduce` in Chrome devtools (Rendering panel) → swipe-release snaps instantly, no animation, no jump.
- [ ] Capture before/after screen recordings for the PR.

### Final verification

- [x] All four gates green:
  - [x] `npm run typecheck`
  - [x] `npm run lint`
  - [x] `npm test`
  - [x] `npm run build`
- [ ] Manual verification on both iPad and Chrome covering: click event, click-and-drag, swipe release at various offsets, flick, bound resistance, reduced-motion.
- [ ] Commit message format: `fix(calendar-polish): Phase 1 — pointer capture timing + smooth snap`.

## Out of scope for this phase

- Pan momentum / inertia (a swipe with high velocity does not continue panning past the snap point — current behavior).
- Multi-touch (two-finger) gestures.
- Snap to a different granularity (e.g. half-day).
- Refactor of `lucarne-calendar-day-pan` to use a Lit ReactiveController.
- Any change to the `RollingWindowController.pan()` semantics — the card-side wiring stays identical; only the timing of the `pan-snap` event changes.
