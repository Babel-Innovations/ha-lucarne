---
status: pending
---

# Phase 1: Cascade cleanup on removal

Introduce a dedicated lifecycle service (`lifecycle.py`) and wire `async_remove_entry` so that removing the `lucarne_family` config entry deletes every managed helper it created — all member `local_todo` entries + `counter.<slug>_streak` helpers, the household todo, and the SQLite db file — leaving zero orphans. This fixes the root cause of orphan accumulation going forward.

## Context

Today `async_unload_entry` (in `__init__.py`) only unsubscribes listeners and closes the store; there is **no `async_remove_entry`**. HA calls `async_remove_entry` when the user deletes the integration. Without it, the per-member `local_todo` config entries and counter helpers survive as orphans (this is exactly how the live instance accumulated Eric/Nico/Susie/Gridou/kid_* leftovers).

`entity_manager.async_delete_member_entities(hass, todo_entity_id, counter_entity_id)` already removes a member's `local_todo` config entry (via the todo entity's `config_entry_id`) and deletes the counter via the storage collection. Phase 1 **reuses** it; it does not re-implement deletion.

Read [./README.md](./README.md) for overall feature context, the Concepts (managed entity, strict detection), and Constraints (no blocking I/O, reuse primitives, single detection source).

> **Line numbers in this spec are advisory.** Citations like `store.py:81-85`, `entity_manager.py:113`, `config_flow.py:744`, `__init__.py:136` were captured during spec authoring and may have drifted. Always locate the referenced code by symbol/function name (grep/LSP for `async_delete_member_entities`, `async_create_member_entities`, `get_members`, `async_step_add_member`, `_async_reconcile_member_entities`) before editing — do not edit by line number alone. If a cited symbol or behavior is absent, stop and reconcile with the actual source rather than guessing.

## Structure

```
custom_components/lucarne_family/
  lifecycle.py            # new: lifecycle service — teardown_member(), teardown_household(), teardown_family()
  __init__.py             # update: add async_remove_entry(); keep async_unload_entry as-is
  entity_manager.py       # (reused: async_delete_member_entities) — no change expected
  store.py                # reference only: get_members() reads entry.data (no member rows in SQLite); db path = lucarne_family_<entry_id>.db. No change expected.
tests/python/
  test_lifecycle.py       # new: teardown_member / teardown_family unit + integration tests
  test_init_remove_entry.py  # new: async_remove_entry integration tests
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [ ] Run the full gate and confirm green before touching anything:
  - [ ] `npm test && npm run lint && npm run typecheck && npm run build`
  - [ ] `.venv/bin/python -m pytest tests/python/`
  - [ ] `.venv/bin/ruff check custom_components tests/python` and `.venv/bin/mypy custom_components/lucarne_family`
- [ ] If anything fails, fix and commit separately before proceeding.

> Use the project `.venv` for Python tooling — system python3 has different deps and gives false failures (see CLAUDE.md / memory).

### Sub-Phase A: `lifecycle.py` teardown service

Create the service module that owns managed-entity teardown. Keep `entity_manager` as low-level CRUD; `lifecycle` orchestrates (Approach 2 — Clean).

#### Service functions
- [ ] `async def teardown_member(hass, member) -> None` — resolve the member's `todo_entity_id` (fallback `todo.<slug>`) and `streak_counter_id` (fallback `counter.<slug>_streak`), then call `entity_manager.async_delete_member_entities`. Swallow/condense "already gone" cases so it is idempotent (no raise when an entity is already absent).
- [ ] `async def teardown_household(hass) -> None` — remove the `todo.lucarne_household` `local_todo` config entry if present (via its `config_entry_id`). Idempotent.
- [ ] `async def teardown_family(hass, entry) -> None` — read members from `entry.data` (`[Member.from_dict(m) for m in entry.data.get(CONF_MEMBERS, [])]`, NOT from SQLite — see Sub-Phase B note), `teardown_member` each; then `teardown_household`; then delete the SQLite db file at `os.path.join(hass.config.config_dir, f"lucarne_family_{entry.entry_id}.db")` via `hass.async_add_executor_job` (executor-wrapped `os.remove`, ignore `FileNotFoundError`). Log a one-line summary of what was removed. Note: `teardown_family` takes `entry` (not a `store`) — it does not need a `LucarneFamilyStore` because members come from `entry.data` and the db path is derived from `entry.entry_id`.
- [ ] Each teardown logs WARNING (not raise) on a per-entity failure so one bad entity does not abort the whole sweep.

#### Tests (`tests/python/test_lifecycle.py`)
- [ ] `teardown_member` removes both the local_todo config entry and the counter helper for a member that has both.
- [ ] `teardown_member` is idempotent — calling it when the todo and/or counter are already gone does not raise.
- [ ] `teardown_household` removes `todo.lucarne_household`'s config entry; no-op when absent.
- [ ] `teardown_family` removes all members' entities + household + db file; asserts the db file no longer exists on disk. Build the entry with members in `entry.data[CONF_MEMBERS]` (e.g. via `MockConfigEntry(domain=DOMAIN, data={CONF_MEMBERS: [member.to_dict(), ...], ...})`) — do not expect members to be read from SQLite. To assert the db delete, first create the file on disk (e.g. `LucarneFamilyStore(...).async_init()` against `lucarne_family_<entry_id>.db` under `hass.config.config_dir`, or simply `Path(...).write_bytes(b"")`) so there is a real file for `teardown_family` to remove, then assert `not os.path.exists(db_path)` after.
- [ ] `teardown_family` continues past a member whose entities are missing (partial orphan) and still removes the rest.

### Sub-Phase B: wire `async_remove_entry`

#### Integration
- [ ] Add `async def async_remove_entry(hass, entry) -> None` to `__init__.py`. It must work even though `async_unload_entry` has already run and popped `hass.data[DOMAIN][entry.entry_id]`. **Read members from `entry.data` — NOT from SQLite.** Member records live in `config_entry.data[CONF_MEMBERS]`; `LucarneFamilyStore.get_members()` just reads `entry.data` (see `store.py:81-85`), and the SQLite db only holds `task_metadata` / `completion_log`, never member rows. The `entry` object passed to `async_remove_entry` is still registered at this point (HA removes it from the registry *after* this callback returns), so `entry.data[CONF_MEMBERS]` is fully available. Do **not** try to query members from the db file. Construct `Member` records via `Member.from_dict(m) for m in entry.data.get(CONF_MEMBERS, [])` (import `CONF_MEMBERS` from `.const`, `Member` from `.models`).
- [ ] Do **not** change `async_unload_entry` semantics (unload != remove — reload must not delete data).
- [ ] Ensure ordering: read members → teardown each member → household → delete db file.

#### Tests (`tests/python/test_init_remove_entry.py`)
- [ ] Setting up an entry with N members, then removing the entry, deletes all N `todo.<slug>` + `counter.<slug>_streak`, the household todo, and the db file — `ha`'s entity registry has no `todo.*`/`counter.*_streak` left for those slugs.
- [ ] `async_remove_entry` works after `async_unload_entry` (simulate the real HA remove sequence: unload then remove).
- [ ] A foreign entity that happens to share a slug-like name but is **not** managed (e.g. a pre-existing `todo.test` / a non-`*_streak` counter) is **not** deleted by `teardown_family` (it only tears down entities belonging to actual member records / household).
- [ ] Removing an entry whose db file is already missing does not raise.

#### Documentation (End of Sub-Phase)
- [ ] `CLAUDE.md` — update the "Common pitfalls"/"Don'ts" area to note that the integration now cascade-deletes member helpers + db on `async_remove_entry` (so uninstall is clean), and that `async_unload_entry` still must NOT delete data.
- [ ] `docs/architecture.md` — document the lifecycle service and the unload-vs-remove distinction.
- [ ] `docs/integration.md` — note that removing the integration removes its todo lists, streak counters, and stored history.

### Build Verification (required before marking phase complete)

- [ ] `.venv/bin/ruff check custom_components tests/python` — zero errors
- [ ] `.venv/bin/mypy custom_components/lucarne_family` — clean
- [ ] `.venv/bin/python -m pytest tests/python/` — all pass, no regressions
- [ ] `npm test && npm run lint && npm run typecheck && npm run build` — green (no card changes expected, but keep the bundle/gate honest)
- [ ] Scan pytest output for new warnings/exceptions beyond the known `ical` `utcnow` deprecation.
- [ ] Mark phase `status: done` only after all verification steps pass.

### Manual Verification with MCP Tools

- [ ] On a dev instance (or after deploy), add a couple of throwaway members, then remove the integration; use `mcp__home-assistant__ha_search_entities` (`todo.*`, `counter.*_streak`) and `ha_get_integration(domain="local_todo")` to confirm no leftover entries remain and the db file is gone.

## Technical Details

### `async_remove_entry` shape

```python
# custom_components/lucarne_family/__init__.py
async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Cascade-delete all managed helpers + the SQLite db when the family is removed."""
    from .lifecycle import teardown_family
    # Members come from entry.data, NOT from SQLite — do not open/init a store here.
    # Calling LucarneFamilyStore.async_init() would re-apply the schema and RECREATE
    # the very db file we are about to delete. teardown_family reads entry.data and
    # deletes the db file (lucarne_family_<entry.entry_id>.db) as its last action.
    await teardown_family(hass, entry)
```

> Resolved (do NOT re-litigate): members are read from `entry.data[CONF_MEMBERS]` (the store is just a thin wrapper over `entry.data` for members — see `store.py:81-85`). Do not instantiate or `async_init()` a `LucarneFamilyStore` in `async_remove_entry`; `async_init()` re-creates the db file. The db-file delete lives inside `teardown_family` and is the **last** action, executor-wrapped (`os.remove`, ignore `FileNotFoundError`).

## Constraints

- Idempotent teardown — never raise on an already-missing entity; log WARNING and continue.
- Executor-wrap the db-file delete; never `os.remove` on the event loop.
- Reuse `async_delete_member_entities`; do not re-implement local_todo / counter deletion.
- `async_unload_entry` must remain non-destructive (reload safety).
- Only entities belonging to member records / the household are torn down — foreign entities are out of scope here (strict detection of stray orphans is Phase 3).
