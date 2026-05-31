---
status: done
---

# Phase 3: Touch swipe + skeleton columns + polish

This phase adds the smooth iPad-9 touch swipe gesture, the skeleton-loading shimmer for unfetched days, finalizes the polish (multi-day chevron sanity passes, prefers-reduced-motion handling), and ships the documentation and CHANGELOG entry. After this phase the feature is complete and ready for v0.2.

## Context

Phases 1 and 2 left the card with:

- A working rolling window with day-step arrows and Today re-anchor.
- Responsive `visibleCount` via ResizeObserver.
- A `RollingWindowController` managing fetch + buffer.
- Header showing a date range.
- Multi-day chevron clipping.
- Editor with the four new numeric inputs.

What's still missing:

- **Touch swipe.** Currently the user must use the arrow buttons. The spec calls for smooth, snap-to-day horizontal panning that feels native on iPad 9 (60 fps target). The time-column gutter must stay sticky during the pan.
- **Skeleton columns.** Days outside the cached event range currently render as empty columns. This phase adds a shimmer placeholder so the user gets visual feedback during a fetch.
- **Pan-bound resistance.** When the user swipes past the ±90-day bound, the pan should resist (rubber-band) rather than allow free motion that then snaps back.
- **Reduced-motion respect.** `prefers-reduced-motion: reduce` should disable the slide animation on arrow navigation and reduce the shimmer to a static fade.
- **Final documentation & release notes.**

Read [./README.md](./README.md) for the touch swipe + skeleton concept. Read [./phase-2-rolling-window.md](./phase-2-rolling-window.md) for the controller API the pan component uses.

## Structure

```
src/components/
  calendar-day-pan.ts          # NEW: pan-gesture wrapper component (slots calendar-grid)
  skeleton-day-column.ts       # NEW: shimmer placeholder column
  calendar-grid.ts             # MODIFY: render skeleton-day-column for uncached days; introduce inner `.day-cols-track` wrapper that calendar-day-pan transforms
src/cards/
  lucarne-calendar-card.ts     # MODIFY: wrap grid in calendar-day-pan; wire pan-snap event to controller.pan()
src/shared/
  design-tokens.ts             # MODIFY: add --lucarne-skeleton-base, --lucarne-skeleton-highlight, --lucarne-pan-easing
  pan-math.ts                  # NEW: pure helpers snapToDay() + rubberBand() (no Lit imports, no decorators — testable)
tests/components/
  calendar-day-pan.test.ts     # NEW: pure-function tests for the snap math; imports from ../../src/shared/pan-math.js
docs/
  visible-days-manual.md       # NEW: manual test checklist for iPad 9 (lives under docs/, not tests/, since node:test does not run .md files and the file is human-facing documentation)
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification

- [ ] Phase 2 is merged and `status: done`.
- [ ] All four gates green.
- [ ] Manually verified Phase 2 on the wall iPad: rolling window works, arrows step by `visibleCount`, Today button re-anchors, header shows range.

### Sub-Phase A: `skeleton-day-column` component

Deployable when: skeleton renders for any day not in `controller.cachedEvents`; existing days render unchanged.

#### Tests

- [x] Skeleton is presentational only; no unit test needed for the component itself.
- [x] Add tests for `cachedRange` and `isDayCached` in `tests/shared/rolling-window.test.ts`: before any fetch both return empty/false; after fetch for `[May 17, Jun 1)`, `isDayCached(May 22)` is `true` and `cachedRange.length === 15`. (The grid renders a skeleton for any day not in `cachedDayKeys`; `layoutEvents` always initializes well-formed empty entries for every day in the window, so no separate layout test is needed.)

#### Implementation

- [x] Add to `src/shared/design-tokens.ts`. **Ship the rgba + `prefers-color-scheme` variant below** (do NOT use `color-mix()` — it requires Safari ≥16.2 / iPadOS 16.2+, and iPad 9 may still be on iPadOS 15). This is the canonical snippet to copy:
  ```css
  /* Light mode default */
  --lucarne-skeleton-base: rgba(0, 0, 0, 0.06);
  --lucarne-skeleton-highlight: rgba(0, 0, 0, 0.12);
  --lucarne-pan-easing: cubic-bezier(0.32, 0.72, 0, 1);  /* iOS-like */
  --lucarne-pan-duration: 240ms;

  @media (prefers-color-scheme: dark) {
    :host {
      --lucarne-skeleton-base: rgba(255, 255, 255, 0.08);
      --lucarne-skeleton-highlight: rgba(255, 255, 255, 0.16);
    }
  }
  ```
  > **Rejected alternative** (kept for context): the surface-relative `color-mix(in srgb, var(--lucarne-on-surface) 6%, transparent)` form would adapt to arbitrary HA themes more cleanly, but it gates on Safari ≥16.2. Re-evaluate when the wall iPad's minimum supported iPadOS bumps to 16.2.

  Confirm the shimmer reads correctly on both light and dark dashboards via `mcp__browsermcp__browser_screenshot` (toggle dashboard theme in HA → Profile → Theme).
- [x] **Implement `cachedRange` and `isDayCached` on `RollingWindowController`** (Phase 2 declared these on the class shape with placeholder bodies and a `Phase 3` comment, AND Phase 2 already established the private `Set<string>` populated at the tail of `_fetchRange` — flesh out the getter bodies now, do NOT re-declare or re-populate the Set). `get cachedRange(): Date[]` returns the sorted dates parsed from the Set's `isoDateKey` strings (`new Date(`${key}T00:00:00`)`, local-time parsing per `date-helpers.ts:85-87`); `isDayCached(day: Date): boolean` is a single `_cachedDayKeys.has(isoDateKey(day))` lookup. Add a test in `tests/shared/rolling-window.test.ts`: after a successful fetch for `[May 17, Jun 1)`, `isDayCached(May 22)` is `true` and `cachedRange.length === 15`; before any fetch resolves, both return empty/false.
- [x] Create `src/components/skeleton-day-column.ts`:
  - Lit element `<lucarne-skeleton-day-column>` with two `@property` fields: `bandStart`, `bandEnd` (so it can match the time-grid height).
  - Renders: an all-day spacer (24px tall, shimmer), a small number of "fake event" rectangles at plausible y-positions (1 or 2 per day; not random — derived from a deterministic hash of the date for visual consistency between rerenders).
  - Shimmer: a CSS `@keyframes` animation translating a gradient across the rectangles (3s cycle, ease-in-out).
  - `@media (prefers-reduced-motion: reduce)`: replace the shimmer with a static `--lucarne-skeleton-base` background.
- [x] Modify `src/components/calendar-grid.ts`:
  - Accept a new property: `cachedDayKeys: Set<string>` (passed from the card). Derive it in the card via `new Set(controller.cachedRange.map(isoDateKey))` — `cachedRange: Date[]` is a getter on `RollingWindowController` returning every date currently covered by a fetch. Use `controller.isDayCached(d)` for ad-hoc checks; use the Set for the per-day-column render loop (faster than calling `isDayCached` for each column). `isoDateKey` is currently **duplicated** in this codebase: one non-exported copy at `src/shared/calendar-layout.ts:34`, a second non-exported copy at `src/components/calendar-grid.ts:10-15`, **and a third local copy added in Phase 2 inside `src/shared/rolling-window.ts`** (used to populate `_cachedDayKeys` at the tail of `_fetchRange`). Consolidate them: (a) add `export` to the `calendar-layout.ts` declaration, (b) **DELETE the local copies in both `calendar-grid.ts` (lines 10-15) and `rolling-window.ts`**, (c) `import { isoDateKey } from '../shared/calendar-layout.js'` at the top of `calendar-grid.ts` AND `rolling-window.ts`, (d) import it in the card too for the `cachedDayKeys` derivation. Do NOT leave any copies (drift risk).
  - In the day-column render loop, if `cachedDayKeys` does not contain the day's key, render `<lucarne-skeleton-day-column .bandStart=${this.bandStart} .bandEnd=${this.bandEnd}>` in place of the events. `calendar-grid` already receives `bandStart` / `bandEnd` as `@property` fields (see Phase 2 wiring) — forward them so the skeleton matches the time-grid height exactly.
  - Day header still renders the date (skeleton is only inside the column body).
- [x] Modify `src/cards/lucarne-calendar-card.ts`:
  - Derive `cachedDayKeys` from the controller's cached event range; pass to the grid.
  - No new props needed on the card → grid handshake for `bandStart` / `bandEnd` (already passed in Phase 2).

### Sub-Phase B: `calendar-day-pan` wrapper + touch gestures

Deployable when: user can drag the calendar with one finger; releasing snaps to the nearest day boundary; the time-column gutter stays fixed; pan past the ±90-day bound rubber-bands.

#### Tests first (TDD) — for pure helpers only

- [x] **Helpers must live in a separate, side-effect-free module** so node tests can import them without registering custom elements. Create `src/shared/pan-math.ts` and export `snapToDay` and `rubberBand` from there. The `calendar-day-pan.ts` component imports the helpers from `pan-math.ts`. Do NOT inline the helpers inside the component file — `tests/components/calendar-day-pan.test.ts` would then have to import the Lit element, which calls `@customElement(...)` at module load and fails under `node:test` (no `customElements` global).
- [x] Create `tests/components/calendar-day-pan.test.ts`. Import the helpers from `../../src/shared/pan-math.js` (note `.js` extension despite the file being `.ts` — ESM convention used throughout this repo). The component itself can't be unit-tested (no DOM in node tests), but the snap math is extractable.
- [x] Test the `snapToDay(deltaPx, dayWidthPx, velocity)` pure helper:
  - `snapToDay(0, 150, 0)` → `0` days
  - `snapToDay(80, 150, 0)` → `1` day (more than half a column)
  - `snapToDay(70, 150, 0)` → `0` days (less than half)
  - `snapToDay(50, 150, +800)` → `1` day (velocity overcomes the threshold)
  - `snapToDay(-50, 150, -800)` → `-1` day
  - Velocity threshold: `≥500 px/s` snaps in the direction of swipe even if distance < half-column.
- [x] Test the `rubberBand(deltaPx, maxPx)` helper: linear up to the bound, then 1/3-rate slowdown.

#### Implementation

- [x] Create `src/components/calendar-day-pan.ts`:
  - Wraps a `<slot>` (the calendar-grid).
  - Owns gesture state: `_startX`, `_startTime`, `_currentX`, `_isDragging`, `_pointerId`.
  - Uses **Pointer Events** (not Touch Events): `pointerdown`, `pointermove`, `pointerup`, `pointercancel`. Pointer events unify mouse + touch and don't fight `touch-action`.
  - On `pointerdown`: capture the pointer (`setPointerCapture`), record start.
  - On `pointermove`: if vertical movement dominates (|dy| > |dx| within the first 10px), abort the gesture and let the column scroll vertically.
  - On `pointermove`: translate the slotted content via `transform: translateX(${dx}px)`. Apply `rubberBand` when the pan is heading into a disabled direction — using the px-direction convention (positive `dx` = drag right = past): if `dx > 0` AND `!canPanBack`, rubber-band the positive overshoot; if `dx < 0` AND `!canPanForward`, rubber-band the negative overshoot. Apply rubber-band from the first px when the relevant direction is blocked (don't wait for half-column).
  - On `pointerup` / `pointercancel`: compute `velocity = (currentX - startX) / (now - startTime) * 1000` (px/s). Call `snapToDay(dx, dayWidthPx, velocity)`. Dispatch a `pan-snap` CustomEvent with `{ deltaDays }`. Animate the transform back to 0 with the `--lucarne-pan-easing` and `--lucarne-pan-duration`.
  - `@property({ type: Number }) dayWidthPx = 0` — pan math needs this.
  - `@property({ type: Boolean }) canPanForward = true` and `canPanBack = true` for the rubber-band decision.
  - `prefers-reduced-motion`: skip the slide-back animation (instant snap). The pan slide-back is JS-driven, not CSS, so a `@media (prefers-reduced-motion: reduce)` block is insufficient — check at runtime via `window.matchMedia('(prefers-reduced-motion: reduce)').matches` inside the snap-back code path; if true, set `transform: translateX(0)` directly with no transition.
- [x] Modify `src/components/calendar-grid.ts` to keep the time-column sticky during pan. **Decision: keep `calendar-grid` as a single component** (do NOT split it into `calendar-grid-time-col` + `calendar-grid-day-cols`) — splitting is a larger refactor than this phase warrants.
  - Inside the grid, the time-column (`.time-col`, `.header-spacer`, `.allday-spacer`) must NOT receive the pan transform. The day-cols container must.
  - The pan wrapper applies `transform: translateX(...)` to a specific inner container (a new `.day-cols-track` wrapper added inside `calendar-grid`), not to the whole grid. The time-column cells live outside that track and stay put.
  - Concretely: introduce a `.day-cols-track` wrapper inside `.grid-wrapper` that contains only the day-header, all-day, and time-band cells for the day columns (grid-column ≥ 2). The time-column cells (grid-column 1) remain direct children of `.grid-wrapper`.
  - `calendar-day-pan` exposes the translate target via a slot or a property reference, and applies `transform` only to the slotted day-cols container.
  - **Rejected alternative** (kept for reference): moving the time-column rendering out of the grid into the card as a sibling of `calendar-day-pan`. Cleaner separation, but requires splitting `calendar-grid` into two custom elements — too much churn for this phase.
- [x] Modify `src/cards/lucarne-calendar-card.ts`:
  - Wrap `<lucarne-calendar-grid>` in `<lucarne-calendar-day-pan>`.
  - Listen for `@pan-snap=${(e: CustomEvent<{ deltaDays: number }>) => this._rolling.pan(-e.detail.deltaDays)}`. **Note the sign inversion** — `snapToDay` returns px-direction (positive = dragged right), `controller.pan` expects window-direction (positive = future). See **Sign convention** under Technical Details.
  - Pass `dayWidthPx`, `canPanForward`, `canPanBack` to the pan wrapper.

### Sub-Phase C: Reduced motion + final polish

Deployable when: `prefers-reduced-motion: reduce` is respected; multi-day chevron renders correctly at all visible counts; pan-bound disables arrows correctly.

#### Implementation

- [x] Audit all animations/transitions added in Phase 2 + 3:
  - Skeleton shimmer (done in Sub-Phase A): static under reduced motion.
  - Pan slide-back animation: instant snap under reduced motion.
  - Header label changes (no animation — confirm).
  - Today-indicator highlight on day-header: existing pulse? Check; if so, leave as-is (it's a pre-existing pattern).
- [x] Wire the arrows' `disabled` state to `!controller.canPanBack` / `!controller.canPanForward`. Visually dim disabled arrows; ensure tap target stays 44px.
- [x] Verify chevron rendering at very narrow widths (3 columns) — text-ellipsis should still work; the chevron should not push the title out.
- [x] Add a `dist/` rebuild check to the manual test list — `dist/ha-lucarne.js` size should be within ~10% of pre-feature (verify no accidental dependency bloat).

#### Documentation (End of Sub-Phase / Final)

- [x] `docs/architecture.md` — add a short subsection under **lucarne-calendar-card** describing the `RollingWindowController` pattern and the `calendar-day-pan` wrapper. One paragraph each.
- [x] `docs/ipad-landscape.md` — add a "Touch swipe" subsection: pointer-event based; vertical-scroll precedence; rubber-band at pan bound; 240 ms snap-back with iOS-like easing.
- [x] `docs/config-recipes.md` — full recipe block for the new options, including a "tight 5-day window" variant and an "auto-fit (loose defaults)" variant.
- [x] `docs/events.md` — no new HA-facing events. The `pan-snap` DOM CustomEvent dispatched by `calendar-day-pan` is an **internal** component-to-card signal (not fired into HA), so it does NOT belong in `events.md` (which documents events fired into HA's event bus). Skip.
- [x] `CHANGELOG.md` — under `[Unreleased]`, complete `### Added` (touch swipe, skeleton columns), `### Changed` (rolling window default, 4 new editor options). For `week_starts_on`: use `### Deprecated` with the note *"`week_starts_on` config option is silently ignored — the rolling window has no week start. The field is still accepted in YAML so old configs load without errors."* Do NOT use `### Removed` (the field is intentionally kept in the schema for back-compat).
- [x] `README.md` — update the YAML example with the new options; remove `week_starts_on`; add a one-line note in the "Features" bullet for the calendar card: *"rolling N-day window with touch swipe (auto-fits 3–7 days to width)"*.
- [x] **New doc**: `docs/visible-days.md` — design rationale, the `computeVisibleDays` formula with a table of worked examples, and the rolling-window state machine. Reference from `architecture.md` (under the calendar bullet).

### Build Verification (required before marking phase complete)

- [x] `npm run lint` — zero warnings.
- [x] `npm run typecheck` — zero errors.
- [x] `npm test` — all tests pass. Scan stdout for warnings.
- [x] `npm run build` — produces `dist/ha-lucarne.js`. Bundle size: 177 KB (v0.1 was 150 KB, +18.5%). No new dependencies; all growth is from legitimate new code (RollingWindowController, calendar-day-pan, skeleton-day-column, pan-math, visible-window). Gzip: 32→40 KB.
- [x] `package-lock.json` — unchanged.
- [x] Mark this phase `status: done` only after all gates pass.

### Manual Verification with MCP Tools — iPad 9 acceptance

This phase is the user-facing one. The manual checklist is non-negotiable for ship.

- [ ] Build and deploy to dev HA instance.
- [ ] Use `mcp__browsermcp__browser_navigate` to open the wall-iPad dashboard on a desktop browser sized to 1080×810 (iPad 9 landscape CSS viewport).
- [ ] Screenshot the today-anchor view. Confirm: 7 columns capped, today highlighted, header reads e.g. "May 22 – May 28".
- [ ] **Touch swipe verification**. browsermcp does NOT expose a drag gesture (`mcp__browsermcp__browser_*` only includes click / type / navigate / screenshot / console-logs). Drag must be verified one of two ways:
  - **Preferred — direct iPad**: use Safari Web Inspector USB-tethered to the wall iPad. Drag with a finger; the spec's expectations below apply.
  - **Fallback — manual desktop browser**: open the dev HA URL in desktop Chrome, manually click-drag the calendar half-column to the left, release.
  In either case, after the drag, capture the result by running `mcp__browsermcp__browser_screenshot` and `mcp__browsermcp__browser_get_console_logs` (the screenshot tool can still observe the post-drag state). Confirm:
  - During drag: columns translate; time-column does NOT translate.
  - Release: animates back into a snapped position (1 day forward).
  - Console: no errors.
- [ ] Same, with a fast flick (high velocity): confirm it snaps further than a slow drag.
- [ ] Drag past the right edge once (around 90 days forward): confirm rubber-band resistance.
- [ ] Click Today: snaps back to today; "Today" button hides.
- [ ] Pan into uncached days: skeleton columns appear briefly, then fade into real events.
- [ ] Resize browser to 720px width: confirm column count drops to 4. Existing pan position is preserved (still showing the same leftmost day).
- [ ] **iPad acceptance**: with the dev HA URL on the actual wall iPad 9, repeat the swipe test. The pan must feel native (60 fps target). If it stutters, profile with Safari Web Inspector (USB tethered) and identify the bottleneck before shipping.
- [ ] `mcp__browsermcp__browser_get_console_logs` — final check for ResizeObserver loops, fetch errors, layout-warnings.

> **iPad 9 hardware acceptance is mandatory.** If smooth pan can't be achieved on the actual device (not just emulator), open an issue and defer Phase 3 until profiling identifies the fix. Do not ship a janky swipe.

## Technical Details

### Pointer-event handler skeleton

```typescript
private _onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  this._pointerId = e.pointerId;
  this._startX = e.clientX;
  this._startY = e.clientY;
  this._startTime = performance.now();
  this._isDragging = false;          // becomes true only after threshold passed
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
}

private _onPointerMove(e: PointerEvent) {
  if (e.pointerId !== this._pointerId) return;
  const dx = e.clientX - this._startX;
  const dy = e.clientY - this._startY;

  if (!this._isDragging) {
    // Direction lock: first 10px of movement decides axis
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical scroll wins; abort gesture
      this._pointerId = undefined;
      return;
    }
    this._isDragging = true;
  }

  const effective = this._applyRubberBand(dx);
  this._translateX = effective;
  this._content.style.transform = `translateX(${effective}px)`;
}
// `this._content` is the element that actually receives the transform — the inner
// `.day-cols-track` wrapper described in the calendar-grid modification below.
// Resolve via `@query('.day-cols-track')` on calendar-day-pan after slotting:
//   @query('slot') private _slot!: HTMLSlotElement;
//   private get _content(): HTMLElement {
//     // The slotted child is `<lucarne-calendar-grid>`; reach into its shadow root
//     // to grab the `.day-cols-track` wrapper. Use part attribution
//     // (`part="day-cols-track"`) or expose via a property the grid sets on itself.
//     return (this._slot.assignedElements()[0] as LitElement).renderRoot.querySelector('.day-cols-track')!;
//   }
// Reaching across shadow roots is acceptable here because calendar-grid is a sibling
// component owned by the same feature.

private _onPointerUp(e: PointerEvent) {
  if (e.pointerId !== this._pointerId) return;
  if (this._isDragging) {
    const dx = e.clientX - this._startX;
    const dt = performance.now() - this._startTime;
    const velocity = dx / dt * 1000;
    // deltaDays here is in PX-DIRECTION (positive = finger moved right).
    // The card's handler inverts the sign before calling controller.pan().
    const deltaDays = snapToDay(dx, this.dayWidthPx, velocity);
    this._snapBack();
    this.dispatchEvent(new CustomEvent('pan-snap', { detail: { deltaDays }, bubbles: true, composed: true }));
  }
  this._pointerId = undefined;
}
```

### Snap math (pure helpers)

```typescript
export function snapToDay(deltaPx: number, dayWidthPx: number, velocity: number): number {
  if (dayWidthPx <= 0) return 0;
  const VELOCITY_THRESHOLD = 500; // px/s
  // Below the velocity threshold, Math.round implicitly applies the half-column
  // rule (|deltaPx| ≥ dayWidthPx/2 → snaps to next day). Above the threshold,
  // we round in the swipe direction regardless of distance ("flick to advance").
  if (Math.abs(velocity) >= VELOCITY_THRESHOLD) {
    // Flick: round in the direction of motion
    return Math.sign(velocity) > 0
      ? Math.ceil(deltaPx / dayWidthPx)
      : Math.floor(deltaPx / dayWidthPx);
  }
  return Math.round(deltaPx / dayWidthPx);
}

export function rubberBand(deltaPx: number, maxPx: number): number {
  if (Math.abs(deltaPx) <= maxPx) return deltaPx;
  const overshoot = Math.abs(deltaPx) - maxPx;
  return Math.sign(deltaPx) * (maxPx + overshoot * 0.33);
}
```

**Sign convention (canonical — document this in JSDoc on both `snapToDay` and the pan component):**

- `deltaPx`: raw horizontal pointer displacement. **Positive `dx` = finger moved right.**
- `snapToDay(deltaPx, ...)` returns a **raw px-direction count**: rounds `deltaPx / dayWidthPx` (with velocity bias) — so it returns positive when the user dragged right, negative when they dragged left. The helper does *not* invert.
- Standard touch UX: dragging content **right** reveals content to the **left** (past). Dragging **left** reveals content to the **right** (future).
- `controller.pan(deltaDays)`: **positive = advance window into the future** (today moves off-screen to the left); **negative = retreat into the past**.
- Therefore the card's `pan-snap` handler **inverts the sign** when calling the controller:
  ```typescript
  // calendar-day-pan dispatches { deltaDays: snapToDay(dx, dayWidthPx, velocity) }
  // The card flips the sign to convert "px-direction" into "window-direction":
  @pan-snap=${(e: CustomEvent<{ deltaDays: number }>) => this._rolling.pan(-e.detail.deltaDays)}
  ```
- Keep `snapToDay` pure (px-direction only). Keep `controller.pan` semantic (window-direction). The one inversion lives in the card's event handler.

### Why pointer events, not touch events

Pointer events:
- Unify mouse, pen, touch in one API.
- Honor `touch-action` correctly (set to `pan-y` on the pan wrapper so the browser can scroll vertically without fighting us).
- Provide pointer capture, which keeps `pointermove` flowing even if the finger leaves the element.

Touch events:
- Fire `touchmove` on the original target only (lose tracking when finger leaves).
- Don't compose with mouse for desktop testing.

Touch-action setup on the pan wrapper:
```css
.pan-wrapper {
  touch-action: pan-y;  /* let the browser handle vertical scroll; we handle horizontal */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
```

**Also update the outer scroller** at `src/cards/lucarne-calendar-card.ts:94`: the `.grid-area` rule currently sets `touch-action: pan-x pan-y;`. Change it to `touch-action: pan-y;` — letting the browser still handle vertical scroll, but giving up horizontal scroll to the pan wrapper. If you leave `pan-x` on the outer, the browser will pre-empt horizontal pointer-moves before they reach `calendar-day-pan` and the swipe will feel dead on iPad.

## Constraints

- **Smooth on iPad 9 hardware.** This is the explicit ask. Profile before shipping. Avoid any layout-triggering CSS property changes during pan (`width`, `height`, `top`, `left` — use `transform` only).
- **Don't break vertical scroll.** The day columns must remain vertically scrollable (the event time-grid is taller than the visible area at default heights). Direction lock decides axis on the first 10 px of movement.
- **No new external dependencies.** No Hammer.js, no swipe library — the whole gesture is ~80 lines of pointer-event code.
- **Reduced motion is non-negotiable.** Both the shimmer animation and the pan snap-back must respect `prefers-reduced-motion: reduce`.
- **Bundle size budget.** `dist/ha-lucarne.js` should not grow more than ~10% from the v0.1 baseline. If it does, audit imports.
- **The skeleton component is presentational.** It does not subscribe to anything, does not know about HA. Pure CSS + Lit render.
