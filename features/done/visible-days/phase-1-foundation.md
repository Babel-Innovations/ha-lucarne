---
status: done
---

# Phase 1: Foundation — layout parameterization + visible-count helper

This phase introduces the pure helpers needed for the rolling window and refactors `layoutEvents` to accept an arbitrary array of days. It also deletes the now-unused week helpers. **No user-visible change** — the card still renders a fixed 7-day week — but the engine is parameterized and unit-tested, unblocking Phase 2.

## Context

The current layout pipeline assumes a 7-day week starting at `weekStart`:

- `lucarne-calendar-card.ts:225-234` computes `_weekStart` / `_weekEnd` from `weekStartsOn`.
- `calendar-layout.ts:116` calls `weekDays(startOfWeek(weekStart, weekStartsOn))` — the only place the `7` is baked in (`weekDays` hardcodes `for i < 7` at `date-helpers.ts:21-30`).
- `calendar-grid.ts:32` uses `grid-template-columns: 40px repeat(7, minmax(0, 1fr))` — the only CSS hardcode of 7.

This phase changes `layoutEvents` to accept a `days: Date[]` array directly (the call site still passes 7 days, computed the old way). The CSS `repeat(7, ...)` is changed to use `repeat(var(--lucarne-day-count, 7), ...)` so Phase 2 can override it without touching the grid component.

The new `visible-window.ts` helper is pure and lives in `src/shared/`. It is unit-tested but **not yet wired into the card** in this phase.

Read [./README.md](./README.md) for overall feature context, especially the `computeVisibleDays` formula and the buffer model.

## Structure

```
src/shared/
  visible-window.ts          # NEW: computeVisibleDays() pure helper
  calendar-layout.ts         # MODIFY: layoutEvents signature accepts days[]
  date-helpers.ts            # MODIFY: delete startOfWeek/endOfWeek/weekDays (unused after refactor)
src/cards/
  lucarne-calendar-card.ts   # MODIFY: call layoutEvents with a days array; keep _weekOffset behavior for now
src/components/
  calendar-grid.ts           # MODIFY: CSS uses --lucarne-day-count var (default 7); no other change
tests/shared/
  visible-window.test.ts     # NEW: 10+ cases covering the formula
  calendar-layout.test.ts    # MODIFY: update existing tests to pass days[] directly; add a few non-7-day cases
  date-helpers.test.ts       # MODIFY: drop tests for deleted helpers
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] Run `npm test` — all tests pass. If any fail, fix them and commit separately before proceeding.
- [x] Run `npm run lint` — zero warnings.
- [x] Run `npm run typecheck` — zero errors.
- [x] Run `npm run build` — produces `dist/ha-lucarne.js`.

> **Why all gates?** ha-lucarne has no E2E suite — these four gates (test, lint, typecheck, build) are the entire baseline. If any is failing on `main`, we cannot tell whether Phase 1 broke something.

### Sub-Phase A: `visible-window.ts` pure helper

Deployable when: helper exists, is exported from `src/shared/`, and unit tests pass. Nothing imports it yet — pure addition.

#### Tests first (TDD)

- [x] Create `tests/shared/visible-window.test.ts`. Use `node:test` + `node:assert/strict` like the other tests.
- [x] Test: defaults (`min_days=3, max_days=7, min_col=140, max_col=220, timeCol=40`):
  - `containerWidth=720` → `visibleCount=4, dayWidthPx=170`
  - `containerWidth=1080` → `visibleCount=7` (capped), `dayWidthPx≈148.6` (assert within 0.5)
  - `containerWidth=1366` → `visibleCount=7` (capped), `dayWidthPx≈189.4`
  - `containerWidth=480` → `visibleCount=3` (floored), `dayWidthPx≈146.6`
- [x] Test: bounds enforced — `containerWidth=200` with defaults still returns `visibleCount=3` (the floor wins over the math).
- [x] Test: zero / negative `containerWidth` returns `visibleCount=min_days, dayWidthPx=min_col_width` (defensive).
- [x] Test: custom config — `min_days=2, max_days=14, min_col=100, max_col=300, timeCol=40` at `containerWidth=1366` → `visibleCount=13, dayWidthPx≈102.0` (within 0.5). Derivation: `available=1326`, `maxFitting=floor(1326/100)=13`, `minFitting=ceil(1326/300)=5`, `visibleCount=min(14, max(2, 5, min(13, 14)))=13`.
- [x] Test: `min_col_width > max_col_width` (invalid config) — clamp behavior. Pick: fall back to defaults? Throw? **Decision: silently swap them.** Document in JSDoc.
- [x] Test: `min_days > max_days` (invalid config) — same defensive-swap behavior as for col widths. **Decision: swap them so the larger value becomes the effective max.** E.g. `min_days=10, max_days=3` is treated as `min_days=3, max_days=10`, so `visibleCount` is clamped to `≤10` (the larger of the two). Document in JSDoc.
- [x] Test: very wide container (`containerWidth=4000`) returns `max_days` (no overflow).

#### Implementation

- [x] Create `src/shared/visible-window.ts`:
  ```typescript
  export interface VisibleWindowConfig {
    minDays: number;
    maxDays: number;
    minColWidth: number;
    maxColWidth: number;
    timeColWidth: number; // pass from caller; default 40 in the card
  }

  export interface VisibleWindowResult {
    visibleCount: number;
    dayWidthPx: number;
  }

  export function computeVisibleDays(
    containerWidth: number,
    config: VisibleWindowConfig,
  ): VisibleWindowResult { /* ... */ }
  ```
- [x] Implement the formula from the README. Use `Math.floor` / `Math.ceil` / `Math.max` / `Math.min` only — no floating-point comparisons.
- [x] JSDoc the function with the worked examples from the README.
- [x] Add export to a barrel if one exists (check `src/shared/index.ts` — likely none; per-file imports are the convention).
- [x] Run `npm test` — new tests pass; existing tests still pass.

### Sub-Phase B: Refactor `layoutEvents` to accept `days: Date[]`

Deployable when: `layoutEvents` accepts a days array; the card calls it with the same 7-day week as before; all existing tests pass; new "arbitrary days" tests pass.

#### Tests first (TDD)

- [x] Update `tests/shared/calendar-layout.test.ts`: change all existing test call sites from `layoutEvents(events, weekStart, '07:00', '21:00', 'monday')` to `layoutEvents(events, days, '07:00', '21:00')` where `days` is built via a small `mkDays(start, n)` helper at the top of the test file.
- [x] Add a new test: layout 5 consecutive days starting on a Wednesday — assert `result.days.length === 5` (the `weekDays` field is renamed to `days` in this sub-phase; the existing test on line 24 (`result.weekDays.length === 7`) is updated to `result.days.length === 7`).
- [x] Add a new test: layout 3 consecutive days, with an all-day event that spans 7 days — assert the event appears on all 3 visible days.
- [x] Add a new test: layout 7 days starting on a date that is NOT a week start (e.g. Wednesday) — assert events on the correct days (no `startOfWeek` snap-back).

#### Implementation

- [x] Modify `src/shared/calendar-layout.ts`:
  - Rename `weekDays` field in `CalendarLayoutResult` to `days` (the term "week" is no longer accurate).
  - Change `layoutEvents` signature: `layoutEvents(events: CalendarEvent[], days: Date[], bandStart: string, bandEnd: string): CalendarLayoutResult`. Remove the `weekStart` and `weekStartsOn` parameters.
  - Remove the internal `weekDays(startOfWeek(weekStart, weekStartsOn))` call; use the passed-in `days` array directly.
  - **Also remove the now-unused imports** at `calendar-layout.ts:2-6`: drop `weekDays` and `startOfWeek` from the `date-helpers` import (keep `eventBandPortion`). This is required for Sub-Phase C to delete the helpers without leaving dangling imports here.
  - Verify the per-day loop and lane-assignment logic is unchanged (it iterates `days`, which was already flexible).
- [x] Modify `src/cards/lucarne-calendar-card.ts`:
  - The card does not reference `layout.weekDays` directly today (only the grid component does), so no `weekDays → days` rename is needed here — the change is in the call to `layoutEvents`.
  - **Introduce a `_currentDays(): Date[]` private method** on the card (see Technical Details below for the full body). Both `_recompute` and `_fetchEvents` MUST call `_currentDays()` rather than inlining the 7-day computation — Sub-Phase C deletes `_weekStart`/`_weekEnd` and assumes this single source of truth already exists.
  - In `_recompute`, build the days array via `const days = this._currentDays();` and pass it to `layoutEvents`. Drop the trailing `week_starts_on` argument from the call (see updated `layoutEvents` signature above).
  - In `_fetchEvents`, derive the fetch range from `_currentDays()`: `const days = this._currentDays(); const start = days[0]; const end = new Date(days[6].getTime() + 86_400_000);` (end-exclusive).
- [x] Modify `src/components/calendar-grid.ts`:
  - Replace `this.layout.weekDays` with `this.layout.days` throughout (line 350, 364, 408).
  - Replace `grid-template-columns: 40px repeat(7, minmax(0, 1fr));` (line 32) with `grid-template-columns: 40px repeat(var(--lucarne-day-count, 7), minmax(0, 1fr));`. Keep `min-width: 480px` for now (Phase 2 makes it dynamic).
- [x] Run `npm test` — all tests pass.
- [x] Run `npm run typecheck` — zero errors.

### Sub-Phase C: Delete unused week helpers and `week_starts_on`

Deployable when: dead code is removed, old configs with `week_starts_on` still load (silently ignored), and all gates pass.

#### Implementation

- [x] In `src/shared/date-helpers.ts`, delete:
  - `startOfWeek` (lines 3-11)
  - `endOfWeek` (lines 13-19)
  - `weekDays` (lines 21-30)

  Keep `hoursInBand`, `eventOverlapsBand`, `eventBandPortion`, `parseEventBoundary`, `formatRelativeStart` (used elsewhere).

- [x] In `src/cards/lucarne-calendar-card.ts`:
  - **Update `_weekLabel()` (lines 337-345) BEFORE deleting `_weekStart`/`_weekEnd`** — it currently calls `this._weekStart` / `this._weekEnd` at lines 338-339. Replace those two lines with `const days = this._currentDays(); const start = days[0]; const end = days[days.length - 1];` (the label rendering otherwise stays the same — "This week" / "Last week" / "Next week" / "Mon X – Mon Y"). `_navWeek` (line 332) only mutates `_weekOffset` and calls `_fetchEvents` — it does not reference `_weekStart`/`_weekEnd`, so it stays untouched in Phase 1. (Phase 2 deletes `_weekLabel` and `_navWeek` entirely when the controller's day-step nav lands.)
  - Delete the `_weekStart` and `_weekEnd` getters (lines 225-235). After the `_weekLabel` update above, `_recompute`, `_fetchEvents`, and `_weekLabel` all call `_currentDays()` instead — verify there are no remaining references to `_weekStart` / `_weekEnd` after this deletion (`npm run typecheck` will surface any).
  - Delete the `import { startOfWeek, endOfWeek } from '../shared/date-helpers.js';` line.
  - **Keep** `week_starts_on` in the `LucarneCalendarCardConfig` interface as `week_starts_on?: 'monday' | 'sunday'` with a JSDoc `@deprecated` tag and a `// silently ignored — see features/visible-days/README.md` comment. Old configs must still load.
  - The existing `setConfig` (lines 120-156) does not currently warn on `week_starts_on` — leave it untouched. (There is no warning to remove; the field already passes through silently.)
  - Update `getStubConfig` to NOT include `week_starts_on`.
- [x] In `src/editors/lucarne-calendar-card-editor.ts`:
  - Delete the entire `_weekStartsOnChanged` handler and the `<select>` block in render (lines 40-44, 138-148).
- [x] In `tests/shared/date-helpers.test.ts`:
  - Delete all tests for `startOfWeek`, `endOfWeek`, `weekDays`.
  - Keep tests for the helpers that survive.
- [x] Run all gates (see Build Verification below).

#### Documentation (End of Sub-Phase)

- [x] `docs/architecture.md` — no change (week-naming is referenced descriptively, not as API). Verify no stale mention of `week_starts_on`.
- [x] `docs/config-recipes.md` — no change in Phase 1 (Phase 3 documents the new options).
- [x] `CHANGELOG.md` — add an `[Unreleased]` section if none exists; under `### Changed`, note: *"`lucarne-calendar-card` — layout engine refactored to accept arbitrary day arrays (no user-visible change in v0.1; foundation for rolling-window in v0.2)."*

### Build Verification (required before marking phase complete)

ha-lucarne has four gates: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. There is no E2E suite. All four must pass.

- [x] `npm run lint` — zero warnings, zero errors.
- [x] `npm run typecheck` — zero errors.
- [x] `npm test` — all tests pass. **Scan stdout for warnings or deprecation notices** (node:test will print them above the summary).
- [x] `npm run build` — produces `dist/ha-lucarne.js` with no errors.
- [x] `package-lock.json` — not modified by this phase. If it was, investigate why.
- [x] Mark this phase `status: done` only after all four gates pass.

> **This is a hard gate.** Do not mark the phase complete until all four gates pass.

### Manual Verification with MCP Tools

Phase 1 is a refactor with no user-visible change. Manual verification confirms the existing card still works.

- [ ] Build with `npm run build`, copy `dist/ha-lucarne.js` to the deploy target (see `memory/deploy_ha_lucarne.md` — `scp` to `/homeassistant/www/lucarne/` on host `ha-vm`).
- [ ] Use `mcp__browsermcp__browser_navigate` to open the wall-iPad dashboard at the user's HA URL.
- [ ] Use `mcp__browsermcp__browser_screenshot` to capture the calendar card. Confirm visually: 7 day columns, today highlight in the right place, events render at the right positions.
- [ ] Use `mcp__browsermcp__browser_get_console_logs` — no new errors or warnings.
- [ ] Click ← / → / This week — week navigation still works as before.

> **Skip this section** only if the dev HA instance is unavailable. Note the skip in the commit message.

## Technical Details

### `visible-window.ts` formula reference

```typescript
export function computeVisibleDays(
  containerWidth: number,
  cfg: VisibleWindowConfig,
): VisibleWindowResult {
  // Defensive: swap if inverted
  const minCol = Math.min(cfg.minColWidth, cfg.maxColWidth);
  const maxCol = Math.max(cfg.minColWidth, cfg.maxColWidth);
  const minD   = Math.min(cfg.minDays, cfg.maxDays);
  const maxD   = Math.max(cfg.minDays, cfg.maxDays);

  const available = Math.max(0, containerWidth - cfg.timeColWidth);
  if (available <= 0) {
    return { visibleCount: minD, dayWidthPx: minCol };
  }

  const maxFitting = Math.floor(available / minCol);   // largest N respecting min col
  const minFitting = Math.ceil (available / maxCol);   // smallest N respecting max col
  const visibleCount = Math.min(maxD, Math.max(minD, minFitting, Math.min(maxFitting, maxD)));
  const dayWidthPx   = available / visibleCount;

  return { visibleCount, dayWidthPx };
}
```

### `CalendarLayoutResult` rename

Before:
```typescript
export interface CalendarLayoutResult {
  weekDays: Date[];
  perDay: Map<string, PerDayLayout>;
}
```

After:
```typescript
export interface CalendarLayoutResult {
  days: Date[];
  perDay: Map<string, PerDayLayout>;
}
```

All call sites (calendar-grid.ts, calendar-card.ts, tests) must be updated.

### `lucarne-calendar-card.ts` `_currentDays()` method (Phase 1 only)

Introduce this as a private method on `LucarneCalendarCard` in Sub-Phase B; it becomes the single source of truth for the day array (called from both `_recompute` and `_fetchEvents`). Sub-Phase C deletes `_weekStart`/`_weekEnd`; Phase 2 deletes `_currentDays` itself (the `RollingWindowController.days` getter replaces it).

```typescript
// Single source of truth for the day array during Phase 1; Phase 2 deletes this
// entirely (controller.days replaces it). Called by both _recompute and _fetchEvents.
private _currentDays(): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  // Snap to week start, honoring the user's existing week_starts_on setting
  // (still present in the config in Phase 1; Phase 2 removes the setting and
  // anchors to today instead). This preserves behavior parity for users on
  // both 'monday' and 'sunday' configs.
  const day = start.getDay(); // 0=Sun..6=Sat
  const startDay = (this._config?.week_starts_on ?? 'monday') === 'monday' ? 1 : 0;
  const diff = (day - startDay + 7) % 7;
  start.setDate(start.getDate() - diff + this._weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
```

> **Why honor `week_starts_on` in Phase 1?** Behavior parity for the refactor PR — users with `week_starts_on: 'sunday'` should not see their week silently shift to Monday in a release labeled "no user-visible change". Phase 2 removes the snap entirely when the rolling window lands.

## Constraints

- **No user-visible change in this phase.** Visual diff between v0.1 and Phase 1 output must be zero. If a tester notices anything different, the refactor is wrong.
- **Backward-compatible config.** Old configs containing `week_starts_on` must still load without errors (silently ignored).
- **No new runtime dependencies.** This phase adds only one new file (`visible-window.ts`) and one new test file. No `package.json` change.
- **Tests are pure-function only.** ha-lucarne has no DOM/Lit test infrastructure. Do not add a headless-browser test runner in this phase.
- **Time-of-day handling.** `Date` arithmetic must use local time (`setHours(0,0,0,0)`), never UTC, to match the existing pattern in `date-helpers.ts:85-87`.
