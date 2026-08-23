# Architecture

## Data flow

```
Apple Reminders
      │
      │  Shortcuts.app (ha-lucarne-sync)
      │  every 300 s via launchd
      ▼
    MacOS ──── POST /api/webhook/<secret> ────► Home Assistant
                                                     │
                                              lucarne_reminders_sync
                                              automation (blueprint)
                                                     │ upsert by Apple UID
                                                     ▼
                                            local_todo entities
                                        (todo.<slug>, todo.lucarne_household)
                                                     │ state_changed
                                                     ▼
                                          lucarne_family completion_listener
                                          ┌─────────────────────────────┐
                                          │  snapshot diff (uid→status) │
                                          │  ┌──────────────────────┐   │
                                          │  │ new item appeared?   │   │
                                          │  │ → apple_sentinel_    │   │
                                          │  │   backfill           │   │
                                          │  │   ([apple:UUID] →    │   │
                                          │  │   source=apple meta) │   │
                                          │  │   others stay        │   │
                                          │  │   un-adopted         │   │
                                          │  └──────────────────────┘   │
                                          │  status transition →        │
                                          │    completion_log row       │
                                          │    (completed/undone/reset) │
                                          │  all routines done? →       │
                                          │    lucarne_family_all_      │
                                          │    routines_done event      │
                                          │    + ha_lucarne_chores_all_ │
                                          │      done (legacy compat)   │
                                          └─────────────────────────────┘
                                                     │
                                        WebSocket subscription
                                                     ▼
                                          Wall iPad (kiosk mode)
                                        ┌──────────────────────┐
                                        │  lucarne-today-card  │
                                        │  lucarne-calendar-   │
                                        │    card              │
                                        │  lucarne-chores-card │
                                        └──────────────────────┘

lucarne_family integration (time-change listeners)
  ├── reset_time  → perform_daily_reset  → flip type=routine items → needs_action
  └── streak_check_time → evaluate_all_streaks → recompute streak → counter.<slug>_streak
```

## Card subscription model

Each card manages its own HA subscriptions independently.

**lucarne-today-card**
- `fetchCalendarEvents` REST `GET /api/calendars/<entity_id>?start=...&end=...` (via `hass.callApi`) on connect + 5-minute poll (all configured `calendar.*` entities, 7-day window). Returns `{ events: Map<entity_id, CalendarEvent[]>, failed: Set<entity_id> }`. REST is used (not the `calendar.get_events` service-call) so events include `uid`, which is required for the `calendar/event/delete` WS command used by the Delete affordance.
- `weather.get_forecasts` service call (daily type) on connect + on weather entity state change
- `subscribeTodoItems` — `subscribe_trigger` on entity state change + `todo.get_items` re-poll for live task-count badge. Only subscribed when `tasks:` is set and `household_tasks_from_integration` is false.
- `subscribeFamilyState` — subscribed whenever any task surface is enabled (`tasks:`, `household_tasks_from_integration`, or `show_family_ready_pill`). Reuses the same WebSocket subscription as the chores card (`lucarne_family/get_family`). The pill reads `tasksByMember` for each member's routines; the household tasks pane reads `tasksByMember.get('household')`. Raw `tasks:` mode pulls `taskMetadataByUid` from the same state to enrich raw items with the integration's icon + member ownership (so the Today summary mirrors the chores card visually). If the integration is missing, raw rows still render — just without enrichment — and `get_family` failures log at `debug` level since this is an expected fallback.
- **Integration-mode guard**: both the family-ready pill and household task pane are suppressed when `familyState.integrationError !== null` (integration missing or failed) to avoid rendering a misleading empty state.
- **Agenda windowing is render-side**: the fetch stays a 7-day window (above), but `lucarne-agenda-strip` filters to events still ongoing AND starting before the end of the agenda window — today only (`windowDays=1`), or today+tomorrow when `agenda_show_tomorrow` is set (`windowDays=2`). The window boundary is computed in local time so date-only all-day events align with the viewer's day. A long list scrolls within the section rather than using a fixed count.
- **Task ordering / window**: `lucarne-tasks-summary` sorts active tasks by urgency (overdue → due today → due ≤3 days → no due date → due >3 days) and renders up to `max_tasks` (default 5); tasks beyond the limit are not shown (backlog is intentionally hidden, not scrollable). With `refill_tasks_on_complete` false (default), a completed task's slot is burned and not refilled from the backlog — tracked on admitted uids that left the active set, so the burn survives even if the todo provider drops completed items; un-burned only if the uid returns to active. With it true, the window is the first `max_tasks` active by priority (rolling).
- **Crossed-out completions**: a completed task stays rendered struck through in the slot it burned, rather than vanishing, so a mistap is visible and undoable — the row count in no-refill mode is therefore unchanged. In refill mode the backlog still slides up and crossed rows become extra rows on top of the `max_tasks` active ones, capped at `max_tasks`. "Extra" is a count, not a position: an un-sunk crossed row renders in the slot it occupied, and only moves to the bottom once it has been sunk. Only tasks seen *active first* qualify: a plain todo entity retains completed items indefinitely and carries no completion timestamp, so items already completed on first render are ignored rather than flooding the card.
- **Where that state lives**: `shared/completed-window.ts`, at module scope keyed by entity + local day — **not** on `lucarne-tasks-summary`. Lovelace renders only the active view and destroys the previous view's DOM, so element fields reset on the very event (a view switch) that is supposed to sink crossed rows to the bottom. The card calls `sinkCompleted()` from `disconnectedCallback` and on `visibilitychange → hidden` (the kiosk backgrounding never unmounts the card), marking rows to render last on return so nothing reorders while the user is looking. The day key prunes at local midnight; a full reload clears it. Tests must call `resetWindows()` in `afterEach` — module-global state otherwise leaks between cases. Surviving a reload would mean dating completions the cards did not witness; the cheapest route is HA's own `TodoItem.completed` (populated by `local_todo`, which backs every entity Lucarne creates) — the cards' `TodoItem` type simply does not read it today. A `completion_log` WS query would also work but exists only in integration mode.

**lucarne-calendar-card**
- `RollingWindowController` (Lit ReactiveController) owns the fetch lifecycle: fetches `visible + ±visibleCount buffer` days on connect, on `setHass` first-arrival, on day-step navigation (pan), and on a 5-minute background poll
- Fetch range: `[today + dayOffset − visibleCount, today + dayOffset + 2×visibleCount)` — 3×visibleCount days total (past buffer + visible + future buffer)
- ResizeObserver on `.grid-area` computes `visibleCount` from container width using `computeVisibleDays(width, cfg)` and calls `controller.setVisibleCount(n)` on change
- Navigation: `←` / `→` arrows step by `visibleCount` days; "Today" button re-anchors to today as column 0
- Midnight rollover: 60-second tick compares stored "today" to current local date; re-anchors and re-fetches when the user is at the today anchor
- Optimistic UI: newly created events injected into local state immediately; real data clears them on the next fetch via `onFetchComplete` callback

### RollingWindowController

`RollingWindowController` (`src/shared/rolling-window.ts`) is a Lit `ReactiveController` that owns the calendar-event fetch lifecycle and maintains the sliding day window. It stores a `_dayOffset` (integer, steps of one day), an `_anchorToday` (local midnight `Date`), and a `_visibleCount`. When `pan(deltaDays)` is called, the offset is clamped to ±90 days; if the new range extends past the event cache, a fresh fetch is issued. The event cache is keyed by calendar entity ID (`Map<string, CalendarEvent[]>`); a parallel `_cachedDayKeys: Set<string>` (ISO `YYYY-MM-DD` strings) lets the grid decide per-column whether to render real events or a skeleton placeholder. `cachedRange` returns a sorted array of cached `Date` objects; `isDayCached(day)` is a single Set lookup. See [visible-days.md](visible-days.md) for the formula and state machine.

### `calendar-day-pan` wrapper

`LucarneCalendarDayPan` (`src/components/calendar-day-pan.ts`) is a thin Lit element that wraps `<lucarne-calendar-grid>` via a `<slot>` and translates Pointer Events into a `pan-snap` CustomEvent carrying a `deltaDays` count. It uses the Pointer Events API (`pointerdown / pointermove / pointerup / pointercancel`) so that mouse, pen, and touch are handled uniformly without fighting the browser's native scroll. Direction lock: the first 10 px of movement decide the axis — if vertical movement dominates, pointer capture is released immediately and the browser's native vertical scroll takes over. During a horizontal pan the slotted grid's inner `.day-cols-track` elements receive a `transform: translateX(...)`, while the time-column gutter (grid column 1, outside `.day-cols-track`) remains stationary. When the pointer is released, `snapToDay(dx, dayWidthPx, velocity)` (from `pan-math.ts`) computes the day count with a flick-velocity bias (≥500 px/s overcomes the half-column threshold), and `rubberBand(dx, 0)` provides resistance when panning into a disabled direction. The snap-back animation uses the `--lucarne-pan-easing` and `--lucarne-pan-duration` tokens; under `prefers-reduced-motion: reduce`, the transform is applied instantly.

### Calendar grid sticky head

`lucarne-calendar-grid` renders two stacked blocks inside `.grid-wrapper`, not one three-row grid: `.grid-head` (day-name row + all-day row) and `.grid-body` (hour gutter + time band). `.grid-head` is `position: sticky; top: 0`, so the day names and all-day events stay pinned while the time band scrolls under them. Both blocks declare the same `grid-template-columns: 40px minmax(0, 1fr)`, which is what keeps the gutter aligned across the split.

The two rows pin as one block rather than as two sticky rows because sticky siblings all resolve `top` against the same scrollport: a separately-sticky all-day row would need `top: <height of the day-name row>` to land below the headers instead of under them, and that hard-coded offset breaks whenever the header's font, padding, or narrow-column layout changes its height. One block pins both with `top: 0` and no measurement.

Three things have to stay true or the head silently stops sticking:

- **`lucarne-calendar-day-pan` must not set `overflow`.** `overflow: hidden` there makes the pan host a scroll container, which then becomes the scrollport for every sticky descendant — and since the host is content-sized, that scrollport never scrolls, so `.day-header`'s long-standing `position: sticky; top: 0` resolved to a zero offset. That is a necessary cause of the original bug; whether a stretched sticky grid item could have travelled once the overflow was gone is engine-dependent (hence the widely cited `align-self: start` workaround), and the current shape deliberately doesn't depend on the answer — `.grid-head` is a plain block child of a block wrapper, with no grid-item constraint anywhere. The clipping it used to provide is now `.grid-area`'s job.
- **`.grid-area` (in the card) must be the nearest scroll container.** It declares `overflow-x: hidden; overflow-y: auto` — hidden, not auto, on the x axis so the render-buffer day columns that make the day track wider than the card are clipped without ever exposing a horizontal scrollbar. Days move by pan gesture only. Note `overflow-x: hidden` still scrolls *programmatically* (focus moving to an off-screen buffer day), which is why the two gutter spacers keep `position: sticky; left: 0` to stay in column 1 alongside `.time-col`.
- **`.grid-wrapper` must not scroll or clip** — including `overflow-x`, since `overflow-x: hidden` with a visible `overflow-y` computes `overflow-y` to `auto`. It is the sticky element's containing block, so it defines how far the head may travel.

Because the head overlays the top of the scrollport, `computeNowScrollTop` takes a `stickyHeadPx` input and stops that much short of the plain target, so scroll-to-now leaves the now-line below the head rather than under it.

### User action data flow

```
User taps "complete" on chores card
          │
          │  todo.update_item (HA service)
          ▼
  todo.<slug> entity (local_todo)
          │ state_changed
          ▼
  completion_listener.py
    ├── snapshot diff detects completed transition
    ├── appends completion_log row (action="completed")
    ├── fires lucarne_family_task_completed {member, uid, summary}
    ├── all routines done?
    │     yes → fires lucarne_family_all_routines_done
    │           + ha_lucarne_chores_all_done (compat shim)
    └── (fires nothing extra if already seen this transition)
          │
          │  WebSocket state push (todo entity state changed)
          ▼
  subscribeFamilyState (card)
    ├── todoItemsByEntity updated
    ├── tasksByMember rebuilt
    └── callback → card re-renders
```

**lucarne-chores-card**
- Subscribes to `subscribeFamilyState` (`src/shared/family-subscription.ts`) on first `hass` set; unsubscribes in `disconnectedCallback`
- `subscribeFamilyState` calls `lucarne_family/get_family` (WebSocket) to fetch member list + task metadata, then subscribes to each member's `todo.<slug>` via `subscribeTodoItems` and to `counter.<slug>_streak` via `subscribeEntityState`
- Refreshes task metadata on any `lucarne_family_task_*` or `lucarne_family_all_routines_done` event (debounced ≤ 1/sec)
- Mutations go through `todo.update_item` (HA service) and `lucarne_family.*` services (integration)

## Optimistic UI

**Rule: every user-initiated mutation must update the acting device's UI immediately
and reconcile when the authoritative state arrives. Never rely on the server
round-trip + WebSocket push to reflect the user's *own* action.**

Why: the cards live-update purely through server→client WebSocket pushes
(`lucarne_family_*` events and per-entity state triggers; see *Card subscription
model*). On the always-on iPad Companion-app kiosk (a WKWebView), those *inbound*
push frames stall while the page sits idle and aren't delivered to JS until a user
interaction wakes the runloop — so a mutation's effect would not appear on its own.
*Outbound* request/response calls keep working (a direct tap updates instantly),
which is exactly why an immediate local update + a later reconcile is reliable.
`subscribeFamilyState` also runs a ~20 s fallback poll + visibility refresh
(`src/shared/family-subscription.ts`) as a safety net, but that bounds staleness —
it does not make a mutation feel live. Optimistic UI is what makes it feel live.

Four mechanisms are in use; pick the one that fits the mutation:

| Mechanism | State | Used by | Reconcile |
|-----------|-------|---------|-----------|
| **Status override** | `Map<uid, status>` | chores + Today task toggle (`_optimistic`) | drop when the pushed status matches (or the task vanishes) |
| **Provisional inject + TTL** | `Map<uid, task>` / array | chores add (`_optimisticAdds`), calendar create (`_pendingEvents`) | drop when the real item (same uid) arrives; TTL backstop clears a never-reconciled phantom |
| **Tombstone** | `Set<uid>` | chores delete (`_deletedUids`), calendar delete (`_deletedUids`) | keep hiding while the server still returns the item; drop once it's gone |
| **Full-replace override + TTL** | `Map<uid, task>` | chores edit save (`_optimisticEdits`, reconciled via `editMatches`) | drop when the pushed task reflects every saved field; TTL backstop |

Two timing patterns, by cost of being wrong:

- **Flip-then-revert** (toggle): set the override *before* the service call and revert
  in `catch` on failure. A status flip is cheap to undo.
- **Confirm-then-apply** (add / delete / edit): dispatch the optimistic event only
  *after* the service call resolves, so a failed mutation never leaves phantom UI.
  These calls return fast (direct request/response); only the *push* is slow.

Reconciliation lives in each card's family-state callback (`_onFamilyState` for the
chores card, `_reconcileOptimistic` for the Today card): every override is dropped as
soon as the next authoritative push/poll proves the server agrees, so the override
maps can't grow stale. TTL backstops are sized **above** the ~20 s family poll
interval so an override survives until at least one refresh can confirm it.

**Intentionally excluded:** member-avatar changes. The only mutation site is the
chores-card *editor* (`src/editors/lucarne-chores-card-editor.ts`), an interactive
config surface — not a kiosk-runtime card — so the idle-WKWebView stall does not
apply. If avatar editing ever moves onto a live card, it needs optimistic treatment.

## Design-token layer

All three cards import `lucarneStyles` from `src/shared/design-tokens.ts`. This block defines CSS
custom properties on `:host` for spacing, radii, font-size scale, palette, and shadow. Cards use
the properties (`var(--lucarne-spacing-lg)` etc.) and never hard-code values. Typography uses
`clamp()` to scale between breakpoints without media queries.

```
src/shared/design-tokens.ts   ← single source of truth
   └─► lucarneStyles (CSSResult)
         └─► imported by every card and component
```

See [visible-days.md](visible-days.md) for the `computeVisibleDays` formula, worked examples,
and the `RollingWindowController` state machine.

## Custom integration (lucarne_family)

This repo ships a single **Integration** (`custom_components/lucarne_family/`) that also bundles the **Frontend** (Lovelace card pack, `custom_components/lucarne_family/frontend/ha-lucarne.js`). The integration owns family members, task metadata, managed entities (`todo.<slug>`, `counter.<slug>_streak`), and managed automations — and on setup it serves the card bundle and registers the loader shim that imports it, so the cards load with no separate install.

### Data flow — entity-manager + task-service (Phase 2)

```
Options flow (add/edit/remove member)
          │
          │  async_create_member_entities
          │  async_delete_member_entities
          │  async_rename_member_entities
          ▼
   entity_manager.py ───────────────────────────────────────►  HA Entity Registry
          │                                                       todo.<slug>
          │  local_todo config-flow init                          counter.<slug>_streak
          │  counter StorageCollection API
          │
          │  async_setup_entry (on reload)
          │  _async_reconcile_member_entities
          ▼
   Both entities missing → recreate
   Partial state (one missing) → warn, skip (Phase 3 adds per-side recovery)
   Orphaned local_todo entity → warn

Service calls (Developer Tools / automations / cards)
          │
          │  lucarne_family.add_task
          │  lucarne_family.update_task_metadata
          │  lucarne_family.delete_task
          │  lucarne_family.toggle_task
          ▼
   task_service.py ─── calls entity (async_create_todo_item / update / remove)
          │                          todo.<slug> or todo.lucarne_household
          │
          └──► store.py (SQLite) ── task_metadata table
                                    completion_log table

   lucarne_family.upload_avatar
          │
          ▼
   avatar_service.py ─── validates (magic bytes, size, dimensions)
          │               writes <config>/www/lucarne/avatars/<slug>.<ext>
          └──► store.py  updates member.avatar path

WebSocket (chores card Phase 4)
          │
          │  lucarne_family/get_family
          ▼
   websocket_api.py ─── reads store.get_members() + store.async_get_all_task_metadata()
                         returns {members, task_metadata, reset_time, streak_check_time,
                                  household_entity_id}
```

### Config flow shape

The integration uses a single config entry per family. The config flow runs once at install (collects `family_name`). Ongoing edits go through the Options flow ("Configure" button in Settings → Devices & Services).

The config entry `data` dict has this shape (Phase 2):
```json
{
  "family_name": "Family",
  "members": [
    {
      "slug": "anna",
      "name": "Anna",
      "color": "#f5c89c",
      "avatar": "/local/lucarne/avatars/anna.png",
      "created_at": "2026-05-24T12:00:00+00:00",
      "preset": "school-age",
      "todo_entity_id": "todo.anna",
      "streak_counter_id": "counter.anna_streak"
    }
  ],
  "reset_time": "04:00",
  "streak_check_time": "21:00",
  "round_trip": { "enabled": false, "webhook_url": "", "secret": "", "device_name": "Sync device" },
  "custom_presets": []
}
```

### Storage split

| What | Where | Why |
|------|-------|-----|
| Members | `config_entry.data["members"]` | Bounded (~5), visible in HA backups, easily debuggable via `.storage/core.config_entries` |
| Task metadata | SQLite (`lucarne_family_<entry_id>.db`, table `task_metadata`) | Unbounded — could be thousands; SQLite handles this cleanly |
| Completion history | SQLite (`completion_log` table) | Append-only audit log; foundation for streak computation and future rewards |
| Avatar files | `<config>/www/lucarne/avatars/` | Binary files stay off the database; path reference in member data |

### The todo entity owns existence; `task_metadata` is enrichment

A task exists because a `local_todo` item exists. Its `task_metadata` row carries the
Lucarne-specific extras — type, icon, recurrence, assignee, time-of-day, rotation
owners — and may legitimately be absent.

Anything created outside `lucarne_family.add_task` arrives without one: HA's to-do
panel, voice, the Companion app, an agent/MCP `todo.add_item` call, the Reminders
bridge. Such an item still renders in the cards, because `buildRenderableTasks`
(`src/shared/family-subscription.ts`) synthesizes fallback metadata for uids it
doesn't recognize. Treating the table as the *existence* check therefore produced a
row that looked normal but could not be deleted, toggled, or edited (issue #111).

`task_adoption.py` owns the reconciliation:

- **`find_managed_item`** — locate a uid across the managed lists (household list
  included) when no metadata row names the owning list. `delete_task` and
  `toggle_task` fall back to this and act on the todo entity directly. Neither
  adopts: removing or ticking an item needs no metadata.
- **`async_adopt_item`** — write the missing row so the item becomes first-class.
  Idempotent: an existing row is never overwritten, since the user may have
  deliberately changed its type, and losing the insert race to a concurrent adopter
  returns `False` rather than raising `IntegrityError` out of a service call. A
  description carrying the bridge's `[apple:UUID]` sentinel adopts as `source=apple`
  with the extracted `apple_uid`; everything else as a manual chore.

**Adoption is deliberately not automatic.** `update_task_metadata` is its only
caller — it needs a row to write to, and reaching it means the user edited the task
in Lucarne. The completion listener does *not* adopt every uid that appears; it
still runs only `apple_sentinel_backfill`, enrolling bridge-synced items alone.

The reason is `reset_logic`: it deletes completed `chore` items at the daily reset
window, and `if metadata is None: continue` is the only thing keeping foreign items
out of that sweep. Adopting on appearance would give a `chore` row to everything
added through HA's to-do panel, voice, or the Companion app — so ticking one off
there would silently destroy it at 04:00. Two tests pin both halves:
`test_orphan_survives_daily_reset_after_completion` and
`test_adopted_orphan_is_swept_by_daily_reset`.

**Behaviour change to expect on upgrade.** `resolve_member_slug` special-cases the
household list, which the previous `get_members()` scan resolved to `""`. Two
consequences, both previously-broken paths now working: completions logged against
an un-adopted household item are no longer dropped, and bridge-synced items in the
household list are now apple-sentinel backfilled like they always were in member
lists. The second one enrolls them in the daily-reset sweep once completed — and
because a `local_todo` reload replays every item as an appearance (below), it
reaches existing installs on the next reload, not just newly-synced items.

Note the listener's appeared branch is not a reliable "seen for the first time"
signal anyway: `_read_entity_snapshot` returns `{}` for an entity missing from
`DATA_COMPONENT`, so reloading a `local_todo` config entry diffs `{}` → full list
and re-surfaces every item as an appearance. (An HA restart is safe — `_on_ha_started`
re-snapshots before arming the listener.) Anything keyed off that branch must be
idempotent and cheap; enrolling items into a destructive sweep is neither.

### Members are first-class

Each member has: `slug` (stable ID, used in entity IDs), `name` (display, freely editable), `color` (hex), `avatar` (emoji or `/local/...` path), `preset` (routine template set), `todo_entity_id`, `streak_counter_id`. Members are stored in `config_entry.data` so HA's Configure dialog can render and edit them.

**Entity lifecycle** (Phase 2+): when a member is added, `entity_manager.py` creates `todo.<slug>` via the `local_todo` config flow and `counter.<slug>_streak` via the counter storage collection API. Both entity IDs are normalized to the canonical slug form after creation. On remove, both are deleted through their respective APIs. On rename (slug-changing), both are renamed with rollback logic.

**Reconciliation**: `async_setup_entry` calls `_async_reconcile_member_entities` on every load. If both entities for a member are missing, they are recreated. If only one is missing (partial state), a warning is logged — per-side recovery is deferred to Phase 3.

### Rotating tasks

A **rotating task** is a shared household chore that cycles through an ordered list of owners. It
lives exclusively in `todo.lucarne_household` (member_slug = `"household"`) and carries two extra
columns in `task_metadata`:

| Column | Type | Meaning |
|--------|------|---------|
| `rotation_owners` | `TEXT` (JSON array) | Ordered list of member slugs who take turns |
| `current_owner` | `TEXT` | Slug of the person whose turn it is *right now* |

**Storage invariants**
- `rotation_owners` is a JSON-serialised `list[str]`; `rotation.py` owns all ser/de and must be
  the only place these strings are parsed or produced.
- `current_owner` must always be a member in `rotation_owners`. When a member is removed from the
  family, `_sanitize_rotating_tasks_after_removal` in `config_flow.py` strips the removed slug,
  advances `current_owner` if needed, and deletes the task if no valid owners remain.

**Rotation-advances-at-reset flow**

The daily-reset window (not the moment of completion) is when ownership shifts:

```
Daily reset fires
    │
    ├── For each item in todo.lucarne_household with type == "rotating":
    │       is the item completed?
    │           yes → advance current_owner → flip item back to NEEDS_ACTION
    │                  → fire lucarne_family_rotation_advanced {uid, summary, from, to}
    │           no  → leave current_owner unchanged → flip item back to NEEDS_ACTION
    │                  (no event)
    └── (rotating items are NOT counted in the routine reset total)
```

Because `completion_listener._on_state_changed` dispatches the handler via `hass.async_create_task`
(an async task), the handler runs after `reset_logic` has completed all its awaits — including the
`async_update_task_metadata(current_owner=nxt)` call. A naive "flip before advance" ordering would
still attribute the reset row to `nxt` (the wrong person).

The actual mechanism is a **stash dict** in `hass.data[_RESET_ROTATING_PREV_KEY]`: `reset_logic`
writes `{uid: prev}` into the stash before flipping the item. When the listener runs and detects a
rotating reset row, it pops from the stash (using `prev`) instead of reading `current_owner` from
the already-advanced metadata. This is the same pattern as `_RESET_PENDING_KEY` (the dict that
tells the listener to log `action="reset"` instead of `action="undone"`).

**Streak exclusion**

Rotating tasks are excluded from streak computation:
- `recurrence_evaluator` (in `recurrence.py`) filters by `type == "routine"` — rotating items are
  never returned, so they cannot satisfy or break a streak.
- The `all_routines_done` gate in `completion_listener.py` also filters on routine type — a
  rotating task completion does not trigger `lucarne_family_all_routines_done`.

**Completion attribution**

When `completion_listener.py` detects a transition to `completed` for a rotating task, it
overrides `member_slug` with `metadata["current_owner"]`. This means `lucarne_family_task_completed`
fires with the turn-holder's slug, not `"household"`.

**Card-side routing (chores card)**

`tasksByMember` is keyed by the todo entity a task lives in — all rotating tasks appear
in `tasksByMember.get('household')`, never in `tasksByMember.get(<owner-slug>)`. The chores
card's `_resolveMembers()` therefore routes rotating tasks explicitly:

- **Non-household column** (`slug !== 'household'`): pull rotating tasks from the household
  bucket where `metadata.current_owner === slug` and concatenate them onto the member's own
  tasks. Gate by `show_tasks` (same toggle as chores).
- **Household column**: rotating tasks are excluded so they don't double-render in both the
  owner's column and the household column.

A `↻` badge and a "next: \<name\>" sub-line are rendered by `lucarne-task-row` for rotating
tasks. The next-owner hint is computed via `nextOwner()` from `src/shared/rotation.ts`, which
mirrors the Python backend's wrapping logic. It is display-only — the backend advances
`current_owner` at reset time.

---

### SQLite schema versioning

`schema_version` table tracks the applied DDL version. Phase 1 initialises version 1. Future phases add migration logic in `store.async_migrate`.

See [features/chores-card/README.md](../features/chores-card/README.md) for the full design and phase roadmap.

## Blueprints

One automation blueprint ships under `blueprints/automation/`:

- **lucarne_reminders_sync** — webhook receiver, diffs by Apple UID, upserts into `local_todo`

Daily routine reset and streak checks are now managed by the `lucarne_family` integration via
in-process time-change listeners (configured via the integration's Options Flow). The former
`lucarne_chores_daily_reset` and `lucarne_chores_streak_advance` blueprints have been retired.

## Build

Vite bundles `src/index.ts` (which imports all three card entry points) into
`custom_components/lucarne_family/frontend/ha-lucarne.js`. The bundle is a single ES module with no
external runtime dependencies (Lit is bundled in) and is committed to the repo. HACS installs the
integration directory at the tagged GitHub release, so the bundle ships with it; the integration's
`async_setup` serves it at `/lucarne_family_frontend/ha-lucarne.js`. It is deliberately **not**
passed to `add_extra_js_url` — the loader described below is the only importer (#101) — and no
separate HACS plugin or Lovelace resource is needed.

A **second, ~4 kB artifact** is built alongside it from `src/loader.ts` by
`vite.loader.config.ts` and served at `/lucarne_family_frontend/ha-lucarne-loader.js`.
`async_setup` registers **only that URL** as a frontend module; the bundle is served but never
imported by Home Assistant directly. That is the fix for issue #101: HA's app entrypoint imports
`@webcomponents/scoped-custom-element-registry`, which replaces `window.customElements` with a
fresh registry and discards everything defined earlier, and `index.html` imports extra modules
*before* that runs — so a directly-registered bundle registered all 31 elements and lost them
all. The polyfill ships in **both** builds; the modern one only escapes because `index.html`
preloads its core/app so they swap first. The loader therefore waits for the swap on every path
(`whenRegistryIsFinal`) before importing, since module evaluation is what registers.
Being the sole importer also means its `.catch` observes any parse or evaluation failure that
Home Assistant's own un-caught `import()` would discard. On failure it registers the
three card tags with an element that renders the exception on the dashboard; on success it
re-fires `ll-rebuild` at any `hui-error-card` still standing in for one of our cards. This is
the only path by which a bundle that fails to *parse* can report anything at all — the file
header in `src/loader/boot.ts` has the full account. It is a separate single-entry Vite config
on purpose:
multiple lib entries can emit a shared chunk, and each artifact needs its own static path.

## Breakpoints

| Width | Context | Behavior |
|-------|---------|----------|
| ≤ 700 px | iPad 9 portrait | Single-column stacking; calendar grid collapses |
| 1080 px | iPad 9 landscape | **Primary target** — all three cards tuned here |
| 1366 px | iPad Pro 12.9" landscape | Wider grid columns; font scales up via `clamp()` |
| 1440 px | Large external display | Similar to 1366; clamp values plateau |

Typography uses `clamp(min, preferred, max)` so no media queries are needed for font size.
Grid layout uses `auto-fit minmax()` for chores columns (200 px min per column).
