---
status: done
---

# visible-days — Rolling N-day window for the calendar card

> **Progress Tracking**: Update checkboxes in phase files as you complete tasks. Run `/spec-implement features/visible-days/phase-1-foundation.md` to begin implementation.

## Goal

Convert `lucarne-calendar-card` from a fixed 7-day week view into a rolling N-day window anchored on today, where N is chosen automatically from the container width (with min/max bounds and min/max column widths from config), with day-step navigation, a "Today" re-anchor button, and smooth touch swipe on iPad 9.

## Concepts

### Rolling window

The first (leftmost) column is **today** by default. The user pans forward (future) or backward (past) by whole days. There is no longer a notion of a "current week" — the window is just N consecutive days starting at the anchor day. After local midnight, an idle dashboard auto-shifts so today returns to the leftmost column.

### Visible-count selection (responsive)

The number of visible day columns is computed at runtime from the card's container width using four config values:

- `min_days` (default 3) — never render fewer columns than this
- `max_days` (default 7) — never render more, even on very wide displays
- `min_col_width` (default 140px) — refuse to shrink columns below this
- `max_col_width` (default 220px) — soft cap; if columns would render fatter, show more days instead

Formula (in `computeVisibleDays`):

```
availableWidth = containerWidth − timeColumnWidth          // ~40px for the time gutter
maxFitting     = floor(availableWidth / min_col_width)     // largest N that respects min col width
minFitting     = ceil (availableWidth / max_col_width)     // smallest N that respects max col width
visibleCount   = clamp(maxFitting, max(min_days, minFitting), max_days)
dayWidthPx     = availableWidth / visibleCount
```

Worked examples (defaults min_days=3, max_days=7, min_col=140, max_col=220, timeCol=40):

| containerWidth | availableWidth | visibleCount | dayWidthPx |
|---|---|---|---|
| 720px (iPad 9 landscape, calendar pane) | 680 | 4 | 170 |
| 1080px (iPad 9 landscape, full card) | 1040 | 7 (capped) | ~148 |
| 1366px (iPad Pro 12.9") | 1326 | 7 (capped) | ~189 |
| 480px (narrow) | 440 | 3 (floored) | ~146 |

### Buffer & RollingWindowController

A `RollingWindowController` (Lit ReactiveController) holds events for **visible + ±visibleCount days** in memory (e.g. 5 visible → 15 days cached). The 5-minute background poll refetches this full range. When the user pans into the buffer, events render instantly; when they pan **past** the buffer, the controller fetches the new edge and renders skeleton columns in the meantime.

### Day-step navigation

- **Arrow buttons** advance/retreat by the current `visibleCount` (page-step). When `visibleCount=5`, ← jumps 5 days back, → jumps 5 days forward.
- **Today button** snaps the window so today is column 0. Hidden when already at the today anchor.
- **Touch swipe** pans the day columns horizontally with snap-to-day on release. The time-column gutter stays fixed during the pan.
- **Pan bound**: ±90 days from today. Beyond the bound, arrows are disabled and swipes resist.

### Skeleton columns

When `days[i]` falls outside the cached event range, the grid renders a `<lucarne-skeleton-day-column>` in its place: same dimensions as a real column, with a subtle gray shimmer in the all-day cell and time grid. Events fade in once data lands.

### Multi-day event clipping

**All-day events** that span multiple days and extend beyond either edge of the visible window are clipped at the visible edge and rendered with a chevron indicator (`›` on the right edge, `‹` on the left) on the clipped pill. The title remains in the leftmost visible day the event occupies.

**Timed events** that span multiple days use the existing per-day band-clipping (each day shows the portion that falls within that day's visible band). No chevron is added for timed events — the band-clipping already provides visual continuity within each day, and adding chevrons would clutter the in-band rendering.

### Midnight rollover

A `setInterval` (60s) compares the current local date to the stored "today" date. When they differ, the controller:

1. Re-anchors the window so today is column 0 again (only if the user was already at the today anchor — never yank a panned-away view out from under the user).
2. Re-computes the cached range.
3. Triggers a fetch for any newly-needed days.
4. Updates the `today` highlight on the day-header.

## Requirements

### Responsive day-count

- Visible columns chosen from container width using `min_days`, `max_days`, `min_col_width`, `max_col_width`.
- Recompute on container resize (ResizeObserver on the grid wrapper).
- When `visibleCount` changes, the day-offset is preserved (still showing the same leftmost day) unless the user was at the today anchor.

### Rolling window navigation

- Default anchor: today as column 0.
- Arrows step by `visibleCount` days (forward / back).
- "Today" button re-anchors. Visible only when not at the today anchor.
- Touch swipe pans horizontally; snaps to nearest whole day on release.
- Hard cap: ±90 days from today.
- Time-column gutter is sticky during pan (does not translate with the day columns).

### Buffer + fetch

- Maintain `±visibleCount` days of buffer around the visible range.
- 5-minute background poll refreshes the **full** cached range (visible + buffer).
- When user pans past the buffer, fetch new edge days; render skeleton columns until events arrive.
- Discard stale fetch responses via sequence number (existing pattern).

### UI polish

- Header label: same-month `"May 22 – 26"`, cross-month `"May 28 – Jun 1"`, cross-year `"Dec 28, 2026 – Jan 1, 2027"`. Formatted via `Intl.DateTimeFormat` (locale `'en-US'`, matching the project-wide convention — see Phase 2 Technical Details `_rangeLabel` implementation for the exact branches).
- Multi-day events clipped at window edge with `›` / `‹` chevron indicator on the clipped pill.
- Midnight rollover auto-shifts the window when the user is at the today anchor.

### Editor

Expose all four new options in the visual editor as plain `<input type="number">` fields (matching the existing `.text-input` pattern in `src/editors/lucarne-calendar-card-editor.ts:120-135` — do NOT use `ha-textfield`, `ha-selector`, or the HA form schema, since the editor already uses raw HTML inputs throughout):

- `min_days` — `<input type="number" min="1" max="14" step="1">`
- `max_days` — `<input type="number" min="1" max="14" step="1">`
- `min_col_width` — `<input type="number" min="60" max="400" step="10">` (px)
- `max_col_width` — `<input type="number" min="100" max="600" step="10">` (px)

Editor validates `min_days ≤ max_days` and `min_col_width ≤ max_col_width` (inline error message, no save block — fall back to defaults if invalid).

### Migration

- `week_starts_on` is removed from the editor UI and silently ignored at runtime. The field is **kept** in the `LucarneCalendarCardConfig` TypeScript interface with a `@deprecated` JSDoc tag (and a comment pointing here) so old YAML / saved configs still parse without errors. The rolling window has no week start; the value is never read.
- `startOfWeek`, `endOfWeek`, `weekDays` in `src/shared/date-helpers.ts` are deleted (no other consumers).
- The editor's "Week starts on" `<select>` is removed.
- `getStubConfig` no longer emits `week_starts_on`.

### Non-goals (explicitly OUT of scope)

- No new view modes (day / agenda / month). The time-grid layout is preserved.
- No infinite scroll — the ±90-day bound is a hard wall.
- No date-picker / calendar picker UI. Only buttons + swipe + Today.
- No persistence of pan position across reloads — refresh resets to today as column 0.
- No changes to `lucarne-today-card`, `lucarne-chores-card`, or the Reminders bridge.

### Authorization

Card-level only; no HA service permissions added or changed. Event fetching uses HA's REST endpoint `GET /api/calendars/<entity_id>?start=...&end=...` (via `hass.callApi`), the same endpoint HA's own frontend calendar dashboard uses. Authorization is enforced by HA per the user's existing session — `hass.callApi` sends the access token `hass.auth` already holds as `Authorization: Bearer …`, so no extra credential plumbing or scope expansion vs. the previous `calendar.get_events` service-call path.

## Phases

| Phase | Title | Description |
|-------|-------|-------------|
| 1 | Foundation: layout parameterization + helper | Pure helpers (`visible-window.ts`, `computeVisibleDays`), refactor `layoutEvents` to accept `days[]`, delete unused week helpers. Card still renders a fixed 7-day week — no user-visible change. |
| 2 | Rolling window + responsive count | Introduce `RollingWindowController`, ResizeObserver, day-offset state. Replace week-anchored fetch with rolling fetch + buffer. Update header label, day-step arrows, Today button, midnight rollover. Multi-day chevron. Editor adds the 4 new options. |
| 3 | Touch swipe + skeleton columns + polish | Add `calendar-day-pan` wrapper component (touch gesture with snap), `skeleton-day-column` component, pan-bound enforcement, documentation, CHANGELOG, manual MCP verification on iPad. |

## Related Documentation

- [Phase 1: Foundation](./phase-1-foundation.md)
- [Phase 2: Rolling Window](./phase-2-rolling-window.md)
- [Phase 3: Touch Swipe + Polish](./phase-3-touch-polish.md)
- [Architecture](../../docs/architecture.md)
- [iPad landscape sizing](../../docs/ipad-landscape.md)
- [Config recipes](../../docs/config-recipes.md)
- [Visible-days design rationale](../../docs/visible-days.md) — created in Phase 3; canonical reference for the `computeVisibleDays` formula and the rolling-window state machine.

## Testing Tools

> Discovered during spec creation. Use these for manual verification after automated tests pass.

| MCP Server | Tool Prefix | Use For |
|-----------|-------------|---------|
| browsermcp | `mcp__browsermcp__*` | Visual verification of the card at multiple widths; resize the viewport to 480/720/1080/1366px and confirm `visibleCount` adapts. Take screenshots of the today-anchor, panned state, skeleton columns, and pan-bound limits. |
| home-assistant | `mcp__home-assistant__*` | Read live `calendar.*` entities, push test events via `ha_config_set_calendar_event`, and verify the card subscribes correctly. Use `ha_eval_template` to seed dates for midnight-rollover testing. |

Browser MCP and Home Assistant MCP are configured globally (not project-scoped). If the user has a HA dev instance running (e.g. `abode-stack/ha-dev-config/`), use it via the home-assistant MCP rather than the production wall iPad.

## Logging & Diagnostics

> No structured log files exist in the ha-lucarne project. All diagnostics go to the browser console.

| Log Source | Location | Format | What to Check |
|---|---|---|---|
| Card runtime | Browser DevTools console | Plain text, `[lucarne]` prefix | `console.warn` calls in `ha-subscriptions.ts` (fetch failures); errors thrown by `setConfig`; ResizeObserver loop warnings |
| Test output | stdout from `npm test` | node:test TAP | `not ok` lines and assertion failures. Run with `node --test` for full output. |
| Vite build | stdout from `npm run build` | Plain text | TypeScript errors via `tsc --noEmit`; build warnings. |
| ESLint | stdout from `npm run lint` | Plain text | Type errors, unused imports, decorator issues. |

The browsermcp `browser_get_console_logs` tool surfaces console output during manual verification — use it after each panning action to catch silent fetch errors or ResizeObserver loops.

## Access Control

> Not applicable. The card fetches events via HA's REST endpoint `GET /api/calendars/<entity_id>` (called through `hass.callApi` in `fetchCalendarEvents`, `src/shared/ha-subscriptions.ts`), the same endpoint HA's own frontend calendar dashboard uses. No new entities, services, or storage are introduced. All authorization is enforced by Home Assistant per the user's existing HA session — `hass.callApi` carries the same access token `hass.auth` already holds, no extra credentials wired up.
