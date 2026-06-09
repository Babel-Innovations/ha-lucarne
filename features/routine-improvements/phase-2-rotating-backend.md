---
status: done
---

# Phase 2: Rotating tasks — backend & data model

This phase adds the `rotating` task type end-to-end on the **Python side**: schema + storage for an ordered owners list and a current-owner pointer, a pure rotation-math helper, the daily-reset advance behavior, correct completion attribution (logged under the current owner), a `lucarne_family_rotation_advanced` event, and owner-removal handling. After this phase the backend fully supports rotating tasks even though no UI exists yet — it is testable and deployable on its own (a rotating task can be created via the `lucarne_family.add_task` service / Developer Tools).

## Context

Read [./README.md](./README.md) first — especially the "Rotating task" and "Rotation order math" concepts. They define the exact behavior this phase implements.

Key existing facts (verified against the codebase) you must build on:

- **Schema** (`custom_components/lucarne_family/schema.sql`): `task_metadata.type` is `CHECK (type IN ('routine','chore'))`. Migrations are applied in `store.py::_init_db` by checking `PRAGMA table_info` and running `ALTER TABLE … ADD COLUMN` for missing columns. **SQLite `ALTER TABLE ADD COLUMN` cannot add a `CHECK` constraint**, so the `type` CHECK only applies on fresh installs; existing DBs rely on the voluptuous validator in `task_service.py` (this is the same pattern used for `time_of_day` — see the comment at `store.py` lines ~40–48).
- **Storage** (`store.py`): `async_add_task_metadata` (INSERT), `async_update_task_metadata` (allow-list at lines ~137–140), `async_get_all_task_metadata`, `async_get_task_metadata`.
- **Service** (`task_service.py`): `_TASK_TYPES = ("routine", "chore")`; `ADD_TASK_SCHEMA`; `UPDATE_METADATA_SCHEMA`; `handle_add_task` validates member/assignee.
- **Daily reset** (`reset_logic.py`): iterates member lists (`reset_routines=True`) and the household list (`reset_routines=False`, deletes completed one-off chores). The household list is where rotating tasks live. Reset marks UIDs in `hass.data[_RESET_PENDING_KEY]` before flipping status so `completion_listener` logs `action="reset"`.
- **Completion log** (`completion_listener.py`): the authoritative logger. It logs `member_slug = metadata["member_slug"]` (lines ~171–189). For rotating tasks `member_slug` is `"household"`, so attribution must be overridden to `current_owner`.
- **Streaks** (`recurrence.py::make_recurrence_evaluator`, line ~230): only considers `type == "routine"`, so `rotating` is **automatically excluded** from streak math — do not add streak logic, just don't break this.
- **Member removal** (`config_flow.py::async_step_remove_member`, lines ~1015–1066): deletes the member's entities, then saves the remaining members at line ~1052. This is the hook point for sanitizing rotating owners.

> **Do not hand-roll rotation as date math.** There is no recurrence here — rotation is purely list-index math over `rotation_owners`. Keep it in `rotation.py` as pure functions.

## Structure

```
custom_components/lucarne_family/
  schema.sql                 # update: add 'rotating' to type CHECK; add rotation_owners + current_owner columns
  store.py                   # update: migration (ALTER ADD COLUMN x2); INSERT + update allow-list + a rotating-tasks query
  rotation.py                # new: pure helpers — sanitize_owners, next_owner, (de)serialize owners JSON
  task_service.py            # update: 'rotating' in _TASK_TYPES; schema fields; add_task + update validation
  reset_logic.py             # update: 'rotating' branch in the household loop (advance on completion)
  completion_listener.py     # update: attribute rotating completions to current_owner
  config_flow.py             # update: sanitize rotating owners when a member is removed
  const.py                   # update: EVENT_ROTATION_ADVANCED constant
docs/
  services.md                # update: add_task/update_task_metadata rotating params
  events.md                  # update: lucarne_family_rotation_advanced
  architecture.md            # update: rotating task storage + rotation/reset flow
tests/python/
  test_rotation.py           # new: pure helper unit tests
  test_store_rotation.py     # new: migration + rotating metadata CRUD
  test_task_service_rotating.py  # new: add/update validation
  test_reset_rotating.py     # new: advance-on-completion, stay-on-skip, owner-removal at reset
  test_completion_rotating.py    # new: attribution to current_owner + rotation event
  test_config_flow_remove_member.py  # update/new: owner sanitization on member removal
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] `pytest tests/python/` (use `.venv/bin/pytest` per `CLAUDE.md`) — all green, statement floor 86 met
- [x] `ruff check custom_components/lucarne_family/` and `mypy custom_components/lucarne_family/` — clean
- [x] `npm run test:coverage && npm run lint && npm run typecheck && npm run build` — green (proves clean tree)
- [x] If anything fails, fix and commit separately before proceeding

### Sub-Phase A: Schema, storage & service plumbing

Deliverable: the integration can persist a `rotating` task (type, ordered owners, current owner) and read it back. Validated end-to-end via the `add_task` service.

#### Schema & migration

- [x] `schema.sql`: change the type CHECK to `CHECK (type IN ('routine','chore','rotating'))`.
- [x] `schema.sql`: add two columns to `task_metadata`:
  - `rotation_owners TEXT NOT NULL DEFAULT ''` — JSON array of member slugs in turn order, e.g. `'["alice","bob","cara"]'`. Empty string for non-rotating tasks.
  - `current_owner TEXT NOT NULL DEFAULT ''` — slug of whose turn it is now. Empty for non-rotating.
- [x] `store.py::_init_db`: add `ALTER TABLE task_metadata ADD COLUMN …` for `rotation_owners` and `current_owner` guarded by `if "<col>" not in existing_cols`, mirroring the `time_of_day` migration. Add a comment noting the type CHECK cannot be extended on existing DBs (runtime validator enforces `rotating`).
- [x] Keep `STORAGE_VERSION = 1` unless the project's migration convention requires a bump — the existing code uses column-existence checks, not versioned migrations, so follow that. (Confirm by reading `store.py` before changing `const.py`.)

#### Storage

- [x] `store.async_add_task_metadata`: add `rotation_owners: str = ""` and `current_owner: str = ""` params; include both in the INSERT column list and values tuple.
- [x] `store.async_update_task_metadata`: add `"rotation_owners"` and `"current_owner"` to the `allowed` set.
- [x] Add `store.async_get_rotating_tasks() -> list[dict]` (returns all `task_metadata` rows where `type = 'rotating'`) for the reset loop and member-removal sanitization. (Or reuse `async_get_all_task_metadata` and filter in the caller — pick one and be consistent.)

#### `rotation.py` (pure helpers — no HA, no I/O)

- [x] `serialize_owners(owners: list[str]) -> str` and `parse_owners(raw: str) -> list[str]` — JSON encode/decode; `parse_owners("")` returns `[]`; tolerate malformed JSON by returning `[]`.
- [x] `sanitize_owners(owners: list[str], known_slugs: set[str]) -> list[str]` — drop slugs not in `known_slugs`, drop duplicates, **preserve order**.
- [x] `next_owner(owners: list[str], current: str, known_slugs: set[str]) -> str | None` — sanitize first; if empty return `None`; if `current` not in the sanitized list (it was removed), return the **first** sanitized owner; otherwise return the next owner cyclically (wrap to index 0 after the last).

#### Service validation

- [x] `task_service.py`: add `"rotating"` to `_TASK_TYPES`.
- [x] `ADD_TASK_SCHEMA`: add `vol.Optional("rotation_owners", default=list)` as a list of slug strings (`[cv.string]`) and `vol.Optional("current_owner", default="")`.
- [x] `handle_add_task`: when `type == "rotating"`:
  - Require `member == HOUSEHOLD_SLUG` (rotating tasks live in the household list). Raise `ServiceValidationError` otherwise.
  - Require `len(rotation_owners) >= 2`; every owner must be a known member slug; de-duplicate preserving order. Raise `ServiceValidationError` on violation.
  - Default `current_owner` to `rotation_owners[0]` when not provided; if provided it must be one of `rotation_owners`.
  - Reject a non-empty `recurrence` for rotating (rotating tasks have no schedule).
  - Persist via `async_add_task_metadata` with `rotation_owners=serialize_owners(...)` and `current_owner=...`. The todo item is created in `todo.lucarne_household` (same path as other household tasks).
- [x] `UPDATE_METADATA_SCHEMA`: add optional `rotation_owners` (list of slugs) and `current_owner`. In `handle_update_task_metadata`, when the task is `rotating`, validate owners (known slugs, ≥1 to keep the task alive, current_owner ∈ owners) and serialize before storing. (Editing owners/order comes from the UI in Phase 3.)

#### Tests (Sub-Phase A)

- [x] `test_rotation.py`: `next_owner` cycles A→B→C→A; skips a removed middle owner; when `current` was removed returns the first remaining; single-owner list always returns that owner; empty/sanitized-empty returns `None`. `sanitize_owners` drops unknown + dupes and preserves order. `parse_owners("")==[]` and malformed → `[]`.
- [x] `test_store_rotation.py`: fresh DB has the new columns; an existing-DB simulation (table without the columns) is migrated by `_init_db`; add + read-back round-trips `rotation_owners`/`current_owner`; update changes them.
- [x] `test_task_service_rotating.py`: `add_task` rejects rotating with `<2` owners, unknown owner, non-household member, or non-empty recurrence; accepts a valid rotating task and defaults `current_owner` to the first owner; `update_task_metadata` validates owners.

### Sub-Phase B: Rotation behavior — reset advance, attribution, event, owner removal

Deliverable: completing a rotating task advances the owner at the next daily reset, an uncompleted one stays put, completions are attributed to the right person, the rotation event fires, and removing a member cleans up the rotation.

#### Events

- [x] `const.py`: add `EVENT_ROTATION_ADVANCED = "lucarne_family_rotation_advanced"`.

#### Daily reset (`reset_logic.py`)

- [x] In the per-list loop, add an `elif item_type == "rotating":` branch (the household list path; note rotating items only ever live there).
- [x] If the rotating item is **COMPLETED** today:
  - Build `known_slugs` from `store.get_members()`. Compute `owners = sanitize_owners(parse_owners(metadata["rotation_owners"]), known_slugs)`.
  - If `owners` is empty → delete the todo item + metadata, fire `lucarne_family_task_deleted`, continue.
  - Capture `prev = metadata["current_owner"]` first. Compute `nxt = next_owner(owners, prev, known_slugs)`.
  - **Order matters — flip the item BEFORE advancing the pointer.** Add the uid to `_RESET_PENDING_KEY`, then flip the item to `NEEDS_ACTION` (same try/except cleanup pattern as the routine branch) **while `current_owner` is still `prev`**. The completion_listener overrides the reset-log row's `member_slug` to `metadata["current_owner"]` (Sub-Phase B); if you advance `current_owner` first, the `action="reset"` row would be mis-attributed to the next owner instead of the person who actually completed it. Only after the flip, persist `current_owner = nxt` (and the sanitized `rotation_owners` if it changed) via `store.async_update_task_metadata`.
  - Fire `EVENT_ROTATION_ADVANCED` with `{"uid": uid, "summary": item.summary, "from": prev, "to": nxt}`.
- [x] If the rotating item is **NEEDS_ACTION** (not completed): leave it untouched — the turn does not pass. (The outer loop already `continue`s on non-COMPLETED items, so simply ensure rotating items are not deleted as chores. Verify the branch ordering so a rotating item never falls into the `chore` delete branch.)
- [x] Rotating items must **not** be counted in the function's `total_reset` return (that value is "routines flipped"); count them separately or not at all, and keep the return value's meaning stable.

#### Completion attribution (`completion_listener.py`)

- [x] When logging a completion/undo/reset, if `metadata.get("type") == "rotating"`, set `member_slug = metadata.get("current_owner") or member_slug` so the row (and the `lucarne_family_task_completed` event) is attributed to the **current owner**, not `"household"`.
- [x] Confirm `todo.lucarne_household` is in the listener's `managed_todo_entity_ids` set (it must be, for household completions to log at all). If it is not, that is a pre-existing gap — note it and ensure rotating completions are observed (the listener only logs entities it tracks).
- [x] Rotating completions must **not** trigger the all-routines-done logic — `_maybe_fire_all_routines_done` already filters to `type == "routine"`, so verify a rotating completion does not flip that event. Add a regression test.

#### Owner removal (`config_flow.py::async_step_remove_member`)

- [x] After a member is removed (immediately after `await self._save_members(remaining)` at line ~1052, before `return await self.async_step_manage_members()`), sanitize every rotating task against the **remaining** member slugs.
  - **Getting the store**: use the same accessor `_save_members` uses — `store: LucarneFamilyStore = self.hass.data[DOMAIN][self._entry.entry_id]["store"]` (see `config_flow.py` line ~183). The `remaining` list is already in scope; `remaining_slugs = {m.slug for m in remaining}`; `removed_slug = self._selected_member_slug`.
  - **Getting the household todo entity** (for item deletion): resolve it through the todo component the same way `reset_logic.py` does — `todo_component = self.hass.data.get(DATA_COMPONENT)` (`from homeassistant.components.todo.const import DATA_COMPONENT`), then `entity = todo_component.get_entity(HOUSEHOLD_ENTITY_ID)`; call `await entity.async_delete_todo_items([uid])`. Guard for `todo_component is None` / `entity is None` (mirror reset_logic's warnings) so removal still completes if the todo platform is mid-reload.
  - Enumerate rotating tasks via `await store.async_get_rotating_tasks()` (added in Sub-Phase A). For each rotating task: `owners' = sanitize_owners(parse_owners(row["rotation_owners"]), remaining_slugs)`.
  - If `owners'` is empty → `await entity.async_delete_todo_items([uid])`, `await store.async_delete_task_metadata(uid)`, then `self.hass.bus.async_fire("lucarne_family_task_deleted", {"uid": uid})`.
  - Else if `row["current_owner"]` was the removed member → `current_owner = next_owner(owners', removed_slug, remaining_slugs)` (returns the first remaining owner since `removed_slug` is gone). Persist via `await store.async_update_task_metadata(uid, rotation_owners=serialize_owners(owners'), current_owner=current_owner)`. If `current_owner` was **not** the removed member but `owners'` changed, still persist the sanitized `rotation_owners`.
- [x] The store methods above are already executor-wrapped (`async_add_executor_job` inside `store.py`), and `entity.async_delete_todo_items` is an HA coroutine — so awaiting them here is non-blocking. Do **not** add a bare `sqlite3.connect`/file write in the config flow; never block the event loop (`CLAUDE.md`).

#### Tests (Sub-Phase B)

- [x] `test_reset_rotating.py`: a COMPLETED rotating task advances `current_owner` to the next owner and flips to NEEDS_ACTION; an uncompleted rotating task is unchanged after reset; a rotating task with one owner stays with that owner; with zero valid owners the task is deleted; `EVENT_ROTATION_ADVANCED` fires with correct `from`/`to`; rotating items are not double-counted in `total_reset`; a completed one-off chore is still deleted (no regression).
- [x] `test_completion_rotating.py`: completing a rotating task logs a `completion_log` row under `current_owner` (not `household`) and fires `lucarne_family_task_completed` with `member == current_owner`; a rotating completion does **not** fire `lucarne_family_all_routines_done`; reset of a rotating task logs `action="reset"`.
- [x] `test_store_rotation.py` / streak regression: a rotating task does **not** contribute to a member's streak (no `type == "routine"` row → not in the recurrence evaluator's expected set).
- [x] `test_config_flow_remove_member.py`: removing a middle owner keeps the task and continues the rotation; removing the current owner advances `current_owner` to a remaining owner; removing the last owner deletes the task.

#### Documentation (End of Sub-Phase)

- [x] `docs/services.md` — document the new `rotation_owners` / `current_owner` params on `add_task` and `update_task_metadata`, the `rotating` type, and the household-only + min-2-owners + no-recurrence rules.
- [x] `docs/events.md` — document `lucarne_family_rotation_advanced` (`uid`, `summary`, `from`, `to`) and note that rotating completions fire `lucarne_family_task_completed` attributed to the current owner.
- [x] `docs/architecture.md` — describe rotating-task storage (household list + `rotation_owners`/`current_owner`), the rotation-advances-at-reset flow, and the streak-exclusion rationale.
- [x] `CLAUDE.md` — add a "rotating task" bullet to Common pitfalls: lives in the household list, advances at daily reset (not on completion instant), excluded from streaks, owners math in `rotation.py` (never hand-roll), completions attributed to `current_owner`.

### Build Verification (required before marking phase complete)

- [x] `ruff check custom_components/lucarne_family/` — clean
- [x] `mypy custom_components/lucarne_family/` — clean
- [x] `pytest tests/python/` — all pass; statement floor 86 met or exceeded
- [x] `npm run test:coverage && npm run lint && npm run typecheck && npm run build` — green (frontend untouched but must still build; **stage the bundle if `build` changes it**)
- [x] Scan pytest + ruff/mypy output for non-fatal warnings/deprecations — a zero exit code does not mean clean output
- [x] If `package-lock.json` or other lock files changed, stage them
- [x] Mark phase `status: done` only after all steps pass

> **This is a hard gate.** Do not mark complete until every step passes.

### Manual Verification with MCP Tools (optional, after automated tests pass)

- [x] Deploy (**ask first**), then via Developer Tools / `mcp__home-assistant__ha_call_service` create a rotating task on `household` with owners `[a, b]`, complete it, fire `lucarne_family.perform_daily_reset`, and confirm `current_owner` advanced (inspect with `ha_get_state` / the WS `get_family` data).
- [x] Use `mcp__home-assistant__ha_get_logs` to confirm no exceptions during reset/completion.

## Technical Details

### Schema (after change)

```sql
CREATE TABLE IF NOT EXISTS task_metadata (
    item_uid TEXT PRIMARY KEY NOT NULL,
    member_slug TEXT NOT NULL,                 -- 'household' for rotating tasks
    assignee_slug TEXT NOT NULL DEFAULT '',    -- unchanged; NOT reused for rotation
    type TEXT NOT NULL CHECK (type IN ('routine','chore','rotating')),
    recurrence TEXT NOT NULL DEFAULT '',       -- always '' for rotating
    icon TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','template','apple')),
    apple_uid TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    time_of_day TEXT NOT NULL DEFAULT 'anytime' CHECK (...),
    rotation_owners TEXT NOT NULL DEFAULT '',  -- new: JSON array of slugs, ordered
    current_owner TEXT NOT NULL DEFAULT '',    -- new: slug whose turn it is
    created_at TEXT NOT NULL
);
```

### `add_task` (rotating) request shape

```jsonc
{
  "member": "household",          // required for rotating
  "type": "rotating",
  "summary": "Pick up milk",
  "icon": "🥛",
  "time_of_day": "anytime",       // editable, defaults anytime
  "rotation_owners": ["alice", "bob", "cara"],  // ordered, >= 2 known slugs
  "current_owner": "alice"        // optional; defaults to rotation_owners[0]
  // recurrence MUST be absent/empty
}
```

### `lucarne_family_rotation_advanced` event

```jsonc
{ "uid": "<item_uid>", "summary": "Pick up milk", "from": "alice", "to": "bob" }
```

## Constraints

- Rotating tasks live **only** in `todo.lucarne_household` (`member_slug = 'household'`); never in a member's personal list.
- Rotation is **list-index math**, not date math — keep it in pure `rotation.py`. Do not touch `recurrence.py`.
- Do **not** reuse `assignee_slug` for the rotation pointer — use the explicit `current_owner` column.
- Rotation advances **only on completion**, applied **at the daily-reset window**; an uncompleted rotating task never changes owner.
- Rotating tasks must remain excluded from streaks — do not add them to `make_recurrence_evaluator`.
- No blocking I/O in async HA code — wrap SQLite/file work in `hass.async_add_executor_job` (`CLAUDE.md`).
- Schema CHECK changes apply to fresh installs only; the voluptuous validator is the runtime guard for existing DBs.
