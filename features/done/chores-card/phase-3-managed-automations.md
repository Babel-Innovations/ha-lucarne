---
status: done
---

# Phase 3: Managed automations

The integration writes and owns two HA automations that previously lived in user-edited blueprints: daily routine reset and streak advance. Add the state-change listener that's the authoritative source for completion log entries. Add the Apple-sentinel backfill listener so items synced via the Reminders bridge automatically get metadata. Retire the old blueprint instances cleanly.

By end of phase: at the configured reset time, all `type=routine` items flip back to `needs_action` and a `reset` log row is appended. At the configured streak check time, each member's streak counter updates. Reminders synced from the bridge get `source=apple` metadata applied within seconds of arrival.

## Context

Phase 2 built the task and entity layer. This phase adds the **temporal behavior** (reset, streak) and the **observability** (completion log via state-change listener). The shape of the managed automations is constrained by HA's automation storage format: they must be valid YAML automations that the user can view in Settings → Automations & Scenes (but should not edit — Phase 6 polishes the "owned by integration, do not edit" UX).

Read [./README.md](./README.md) for overall feature context.

## Structure

```
custom_components/lucarne_family/
  __init__.py                              # update: register state-change listener at setup
  automation_writer.py                     # new: write/update HA automations from config
  completion_listener.py                   # new: state_changed listener for managed todo entities
  apple_sentinel_backfill.py               # new: scans descriptions for [apple:UUID] and writes metadata
  reset_logic.py                           # new: pure functions called by the daily reset automation (via service)
  streak_logic.py                          # new: pure functions called by the streak check automation
blueprints/automation/
  lucarne_chores_daily_reset.yaml          # delete
  lucarne_chores_streak_advance.yaml       # delete
docs/
  events.md                                # update: deprecate ha_lucarne_chores_all_done, add lucarne_family_* events
tests/python/
  test_automation_writer.py                # new
  test_completion_listener.py              # new
  test_apple_sentinel_backfill.py          # new
  test_reset_logic.py                      # new
  test_streak_logic.py                     # new
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline verification (before starting)

- [x] `pytest tests/python` — Phase 2 tests pass
- [x] On real HA: 2 test members with todo entities + counter entities; ~5 tasks across them (some routines, some chores)
- [x] Note: the existing `lucarne_chores_daily_reset` blueprint instance (if user has one wired up) will be retired by this phase — back up the user's current automation config first

### Sub-Phase A: Pure reset & streak logic

Build the logic as testable pure functions before wiring it into automations.

#### `reset_logic.py`
- [x] `async def async_perform_daily_reset(hass, store) -> int`:
  - For each member: fetch their todo items via `todo.get_items` (status: completed)
  - For each completed item with metadata `type=routine`: flip status via `todo.update_item`
  - Append `reset` row to completion_log with current timestamp + the item's RRULE at reset time
  - Returns count of items reset
- [x] Idempotent: running twice on the same day → second call is no-op (because items are already `needs_action`)

#### `streak_logic.py`
- [x] `async def async_evaluate_streak(hass, store, member: Member, as_of: datetime) -> int`:
  - Build a recurrence evaluator: `evaluator = recurrence.make_recurrence_evaluator(hass, store, member.slug)` (factory defined in Phase 2 `recurrence.py`)
  - Compute the new streak from `completion_log` via `store.async_get_streak(member.slug, as_of.date(), evaluator)`; do not read `counter.<slug>_streak` as an input to the calculation. The store walks backward day-by-day, calling `evaluator(date)` to learn which routine UIDs were due on each historical day.
  - Behavior delegated to the store's algorithm (locked in Phase 2 Sub-Phase B): no-routine days are skipped, all-complete days increment, any-missing days stop the walk and return the accumulated count.
  - Returns the new streak value. `completion_log` is the canonical source; `counter.<slug>_streak` is a derived mirror for external automations.
- [x] `async def async_apply_streak(hass, store, member, new_streak)`:
  - Call `counter.set_value` to update the derived `counter.<slug>_streak` mirror
  - Append a metadata-event row to completion_log? No — streak changes already derivable from log; don't double-write

#### Tests
- [x] `test_reset_logic.py`: idempotency; only routines flipped (not chores); log row count matches reset count
- [x] `test_streak_logic.py`:
  - 3 consecutive days of full completion → streak 3
  - 1 missed day (any expected routine not in `completion_log` for that day) → streak resets to 0
  - Member with no routines today but completed yesterday → streak today equals yesterday's streak (the no-routine day is skipped, not counted)
  - Mixed schedule (weekly Mon/Wed/Fri): completed all on Mon + Wed + Fri spanning 2 weeks → streak 6 even though 8 days passed (4 no-routine days skipped)
  - 365-day walk-back cap honored (synthesize a 400-day log; assert streak capped at 365)
  - Recurrence evaluator is called with member's CURRENT routine set (acknowledged limitation from Phase 2)

### Sub-Phase B: Automation writer

#### `automation_writer.py`
- [x] `async def async_write_managed_automations(hass, entry: ConfigEntry)`:
  - Reads `entry.data["reset_time"]` and `entry.data["streak_check_time"]`
  - Builds two automation configs in HA's standard YAML-as-dict format:
    - `lucarne_daily_reset`: `alias: "Lucarne Daily Reset"`, trigger at reset_time, action `service: lucarne_family.perform_daily_reset` (new internal service registered in this phase). Resulting entity_id MUST be `automation.lucarne_daily_reset`.
    - `lucarne_streak_check`: `alias: "Lucarne Streak Check"`, trigger at streak_check_time, action `service: lucarne_family.evaluate_all_streaks`. Resulting entity_id MUST be `automation.lucarne_streak_check`.
  - Each automation has an `id` field of `lucarne_family_daily_reset` / `lucarne_family_streak_check` (HA uses `id` as the storage key — keep stable across updates so traces are continuous)
  - Each automation has `description: "Managed by Lucarne Family integration. Do not edit."`
  - **Verify after first write**: read back from the entity registry that the entity_ids are exactly `automation.lucarne_daily_reset` and `automation.lucarne_streak_check`. If HA appended a suffix (e.g. `_2` because of a prior collision), fail loudly — the user has a stale automation that must be cleaned up before the integration can take over.
- [x] Use HA's automation config API exposed by `homeassistant/components/automation/config.py` and registered from `homeassistant/components/automation/__init__.py` to create/update/delete the two managed YAML automation entries. Phase 3's first implementation task is to add a failing `test_automation_writer.py` fixture that exercises the chosen in-process call path on the pinned HA version. If HA exposes no stable in-process upsert API on that version, replace managed persisted automations with integration-owned `async_track_time_change` listeners in this phase and update README + docs before implementing runtime logic; do not write raw `.storage` files.
- [x] Treat the automation config API path above as a pinned-version verification gate, not a guaranteed API. Document the exact HA source file + function used in `automation_writer.py` once verified.
- [x] `async def async_remove_managed_automations(hass, entry)` — for integration uninstall

#### Internal services (called by the managed automations)
- [x] Register `lucarne_family.perform_daily_reset` service in `task_service.py` — calls `reset_logic.async_perform_daily_reset`
- [x] Register `lucarne_family.evaluate_all_streaks` — iterates members, calls `streak_logic`
- [x] Both services are listed in `services.yaml` so they're discoverable. Their voluptuous schemas have no user-supplied fields, so the `services.yaml` field map for each is empty (`fields: {}`) and `test_services_yaml.py` includes them in the schema/field-name parity assertion.

#### Wire into setup + options-flow listener

**Order of operations in `async_setup_entry` is load-bearing.** Implement it in this exact sequence — a different order causes "service not found" errors when the managed automations try to fire on startup:

1. Initialize the store (`store.async_init()`).
2. Ensure household + per-member entities exist (Phase 2's `async_ensure_household_entity` + reconcile).
3. **Register all `lucarne_family.*` services** (Phase 2 task services + Phase 3 internal services `perform_daily_reset` / `evaluate_all_streaks`). Services must exist before any automation referencing them is loaded.
4. **Register the `lucarne_family/get_family` WebSocket command** (Phase 2 Sub-Phase D) — once per HA process, guarded by `hass.data[DOMAIN].setdefault("_ws_registered", False)`.
5. Start the completion listener (`async_start_completion_listener`) — needs the entity set from step 2 and the store from step 1.
6. **Write managed automations LAST** (`async_write_managed_automations`). If HA reloads the automation right after write, its trigger fires against already-registered services from step 3.
7. Register the options-update listener (`entry.async_on_unload(entry.add_update_listener(async_options_updated))`).

- [x] Implement `async_setup_entry` with the seven steps above, in order. Add a code comment naming the order so a future edit doesn't reshuffle it.
- [x] In `async_options_updated` (stubbed in Phase 1): call `async_write_managed_automations` again to pick up time changes. Services are already registered from initial setup, so order matters less here.
- [x] On `async_unload_entry`: unsubscribe the completion listener, unregister services, then optionally leave the managed automations (default: leave them so user can re-install without losing automation history).
- [x] Test in `test_automation_writer.py`: stop+restart the integration; assert services are re-registered before the automation entity is loaded (check by reading `hass.services.has_service` immediately after `async_setup_entry` returns and BEFORE the next event loop tick).

#### Phase 2 `toggle_task` handoff

- [x] Update the Phase 2 `lucarne_family.toggle_task` service handler in this phase: it must continue to resolve metadata and call `todo.update_item`, but it must **stop appending directly to `completion_log`**. The completion listener is now authoritative for every status transition, including toggles initiated by this integration service. Leaving the Phase 2 direct append in place creates duplicate `completed` / `undone` rows for card taps and Developer Tools calls.
- [x] Add a regression test in `test_completion_listener.py` or `test_task_service.py`: call `lucarne_family.toggle_task` once after the listener is started, then assert exactly one completion-log row is written for that UID and status transition.

#### Tests
- [x] `test_automation_writer.py`: write creates 2 automations with correct triggers and actions; reset_time change in config → automation updated; remove deletes both

### Sub-Phase C: Completion listener

#### `completion_listener.py`
- [x] `def async_start_completion_listener(hass, store, managed_todo_entity_ids: set[str]) -> CALLBACK_TYPE`:
  - Registers `async_track_state_change_event` for the managed todo entities
  - On each state change: HA passes the event with old + new state. First verify on the pinned HA version whether managed todo states include an `items` attribute. If they do, diff that attribute to find which item changed status. If they do not, maintain an in-memory per-entity snapshot from `todo.get_items`, refresh it after each state change, and diff old snapshot → new snapshot. Do NOT assume `items` exists without a compatibility test.
  - For each item whose status changed:
    - `needs_action → completed`: append `completed` row to completion_log
    - `completed → needs_action`: append `undone` row
  - Fires `lucarne_family_task_completed` HA event with `{member, uid, summary}` so other automations can subscribe (replaces `ha_lucarne_chores_all_done`)
- [x] Returns an unsubscribe callback; store it in `hass.data[DOMAIN][entry.entry_id]` so it can be cleaned up at unload
- [x] **Carefully diff todo item snapshots** — HA fires `state_changed` for any attribute change, not just status. Whether the snapshot came from an `items` attribute or `todo.get_items`, compute the actual status delta by UID before logging.

#### Wire into setup
- [x] On `async_setup_entry`, after entity manager has ensured all member entities exist, start the listener
- [x] On member add/remove: restart the listener with the updated entity set (or use a dynamic filter)

#### Tests
- [x] `test_completion_listener.py` with `hass` fixture:
  - Mark item complete → log row appended with action=completed
  - Mark item uncompleted → log row appended with action=undone
  - Update item's summary without changing status → NO log row
  - Add new item to entity → NO log row (only status changes log)
  - Pinned-version compatibility: if todo state attributes do not expose `items`, listener uses the `todo.get_items` snapshot fallback and still logs exactly one status change
  - Event `lucarne_family_task_completed` fires when an item completes

### Sub-Phase D: Apple sentinel backfill

#### `apple_sentinel_backfill.py`
- [x] When the Reminders bridge upserts an item via `todo.add_item` (called from the existing blueprint), the description contains `[apple:UUID]`. The integration must notice and write a `source=apple` metadata row.
- [x] **Exact regex** (lock this, do not let an LLM "improve" it): `r"\[apple:([^\]]+)\]"` — this matches the existing `lucarne_reminders_sync` blueprint's sentinel extraction and accepts standard UUIDs, Shortcuts-provided IDs such as `apple-stable-uuid`, and opaque Apple IDs. Match is case-insensitive on the literal `apple:` prefix? **No** — keep `apple:` literal-lowercase to match what `bridge/README.md` documents. Cover a real synced-item fixture in `test_apple_sentinel_backfill.py`.
- [x] Approach: in the completion_listener's state-change handler, on items that appear (new uid not previously seen), run the regex against the item's `description`. If matched: insert a task_metadata row with `source=apple`, `apple_uid=<captured group>`, `type=chore` (default for synced items), `recurrence=""`.
- [x] Idempotent: if a metadata row already exists for this UID, do not overwrite (the user may have explicitly set a different `type` via `update_task_metadata`).

#### Tests
- [x] `test_apple_sentinel_backfill.py`:
  - New item arrives with `[apple:abc123]` in description → metadata row created with `source=apple`, `apple_uid=abc123`
  - Item without sentinel → no metadata row (treated as orphan; cards show with default styling)
  - Existing metadata for an apple_uid → backfill does not overwrite

### Sub-Phase E: Retire old blueprints

- [x] Delete `blueprints/automation/lucarne_chores_daily_reset.yaml`
- [x] Delete `blueprints/automation/lucarne_chores_streak_advance.yaml`
- [x] **Keep** `blueprints/automation/lucarne_reminders_sync.yaml` — the bridge still needs it
- [x] Update `README.md` Blueprints section to remove the deleted blueprints and add a note explaining the integration now owns reset/streak

### Sub-Phase F: Event compatibility shim

The existing `ha_lucarne_chores_all_done` event (documented in `docs/events.md`) is fired by the old chores card. Phase 4 removes the card. To preserve compatibility for users who built automations on this event:

- [x] In `completion_listener`, when all of a member's today's routines flip to completed (transition: not-all-complete → all-complete): fire BOTH the new `lucarne_family_all_routines_done` event AND the legacy `ha_lucarne_chores_all_done` event with the legacy payload (so user's existing automations keep working)
- [x] Document deprecation in `docs/events.md`: the legacy event will be removed in v1.0; recommend migrating to the new event

### Documentation (end of phase)

- [x] `docs/events.md`: deprecate `ha_lucarne_chores_all_done`; add `lucarne_family_task_added`, `lucarne_family_task_completed`, `lucarne_family_task_deleted`, `lucarne_family_task_metadata_updated`, `lucarne_family_task_toggled`, `lucarne_family_all_routines_done`, `lucarne_family_avatar_uploaded`. Each with full payload schema.
- [x] `docs/integration.md`: add Managed Automations section explaining reset/streak behavior + how to change times via Options Flow
- [x] `docs/architecture.md`: data-flow diagram updated with completion listener path and apple backfill flow

### Build verification

- [x] Ruff, mypy, pytest clean
- [x] TS side green
- [x] On real HA: trigger reset by setting reset_time to ~2 minutes from now; watch routines flip; observe log rows via SQLite query (use sqlite3 CLI in the container or expose a debug service)
- [x] Trigger streak check similarly; verify counter updates
- [x] Complete a task on a member's todo entity via Developer Tools → Services → `todo.update_item`; observe `lucarne_family_task_completed` event in Developer Tools → Events
- [x] Trigger the bridge or simulate by calling `todo.add_item` with `[apple:test123]` in description; verify metadata row inserted with `source=apple`
- [x] HA logs clean for `lucarne_family`
- [x] Mark phase `status: done`

### Manual verification with MCP tools

- [x] `mcp__home-assistant__ha_call_service` for `lucarne_family.perform_daily_reset` — observe state changes
- [x] `mcp__home-assistant__ha_get_automation_traces` for `automation.lucarne_daily_reset` — verify successful traces after reset_time fires
- [x] `mcp__home-assistant__ha_eval_template` to inspect any related state

## Technical Details

### Why managed automations instead of in-process scheduling

HA has built-in scheduling (`async_track_time_change`). The integration could schedule the reset internally without writing an HA automation. **Why write the automation anyway?**

1. Visibility: user sees the reset in Settings → Automations & Scenes
2. Traceability: HA's automation traces show every run with inputs/outputs
3. User can disable: if the user wants to pause resets temporarily, they can toggle the automation off
4. Convention: matches what blueprints did before, with a smooth migration story

### Why state-change listener for completion log (not service wrapping)

A user could update a todo item via:
- Tapping in the chores card
- Voice via Assist
- `todo.update_item` from a custom automation
- HA's native todo card

Wrapping `todo.update_item` only catches the first. A state-change listener catches all. Cost: must diff `items` attribute carefully — see shortcut-resistance notes.

### Why fire both old and new events during transition

Removing the old event breaks any user's existing automations. Pre-1.0 we technically can break things, but this event is documented in `docs/events.md` with breaking-change policy. Two events for one release cycle is cheap insurance.

### Idempotency of reset

If HA restarts at reset_time + 30 seconds, the automation may fire twice. Reset must be idempotent (only flip items already `completed`). Verify by running the service twice in a row in tests.

## Constraints

- **Managed automations are owned by the integration** — overwritten on every config change. Users editing them lose changes on next options flow save.
- **Completion log must capture every status change**, regardless of source. Tests must include all 4 sources listed above.
- **Reset is idempotent.**
- **The state-change listener must filter to managed entities only** — don't log for unmanaged todo entities the user has.
- **Apple sentinel backfill is opt-in via the bridge** — items without sentinels don't get auto-tagged.
- **Legacy event fired in parallel during v0.x**; remove in v1.0 per existing breaking-change policy in `docs/events.md`.

## Shortcut-resistance notes for LLM implementer

- **Diff state-change events carefully.** When `items` attributes are available, they are lists of dicts; computing "what changed" requires matching by UID, not by index. When they are not available, use the explicit `todo.get_items` snapshot fallback. A naive `if old != new: log` fires on every attribute change.
- **Don't append to completion_log for HA recorder backfills or state restoration on restart.** State changes during the first ~30s after HA start should be ignored (HA's `EVENT_HOMEASSISTANT_STARTED` marks the boundary).
- **Don't write the automation YAML by string concatenation.** Use the dict-based API. HA validates it before persisting.
- **The internal services (`perform_daily_reset`, `evaluate_all_streaks`) must be registered before the managed automations reference them.** The authoritative `async_setup_entry` order is the seven-step list in Sub-Phase B: store → entities → services → WebSocket → completion listener → managed automations → options listener. Do not reorder it in shortcut notes or tests.
- **Test with realistic timezone handling.** Reset_time is wall-clock local; recurrence math uses UTC. Mismatches cause "reset fired but routines stayed completed" bugs.
- **Don't put business logic in the automation YAML.** Keep automations as thin triggers calling integration services where the logic lives.
