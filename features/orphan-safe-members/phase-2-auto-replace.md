---
status: pending
---

# Phase 2: Detect & auto-replace orphans on add

Add strict managed-orphan **detection** to `lifecycle.py` and use it in the add-member flow: when a member's slot (`todo.<slug>` / `counter.<slug>_streak`) is occupied by a **managed orphan**, silently tear it down and recreate fresh, then re-seed preset routines. A **foreign** collision (e.g. the user's `todo.test`) is never touched — it surfaces a clear, actionable error. This unblocks rebuilding a family after a previous one was deleted.

## Context

`entity_manager.async_create_member_entities` currently hard-fails on any canonical-id collision:

```python
if er.async_get(canonical_todo_id) is not None:
    raise HomeAssistantError(
        f"Cannot create {canonical_todo_id}: an entity with this id already exists. ..."
    )
```

`config_flow.async_step_add_member` catches that and sets `errors["base"] = "entity_create_failed"` → the UI shows "Failed to create the member's entities." This is the exact dead-end the user hit re-adding Gridou/Eric/Nico/Susie.

Phase 2 inserts a **prepare-slot** step before creation: detect whether the occupant is a managed orphan (strict markers) and, if so, tear it down so creation can proceed fresh. Detection lives only in `lifecycle.py` (shared with Phase 1 teardown and Phase 3 sweep).

Read [./README.md](./README.md) for Concepts (managed entity, strict detection, auto-replace) and Constraints (never clobber foreign entities — hard gate).

## Structure

```
custom_components/lucarne_family/
  lifecycle.py            # update: add detection + prepare_member_slot()
  config_flow.py          # update: async_step_add_member calls prepare_member_slot before create
  entity_manager.py       # reference: async_create_member_entities (keep its guard as a safety net)
  strings.json            # update: add a distinct error key for foreign collisions
  translations/en.json    # update: mirror the new error key
tests/python/
  test_lifecycle.py       # update: detection + prepare_member_slot tests
  test_config_flow.py     # update: add-member-with-orphan / add-member-with-foreign-entity tests
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [ ] Confirm Phase 1 is merged/green (this phase builds on `lifecycle.teardown_member`).
- [ ] Run the full gate (see Phase 1 baseline) — all green before changes.

### Sub-Phase A: strict detection in `lifecycle.py`

Pure, unit-testable detection functions — the single source of truth for "is this ours?".

#### Detection functions
- [ ] `def is_managed_counter(hass, entity_id, slug) -> bool` — true iff a `counter` registry entry exists at `counter.<slug>_streak` with `unique_id == f"{slug}_streak"`. (This integration creates the counter with `name == f"{slug}_streak"`, and for counter helpers the registry `unique_id` equals the storage item id — see `entity_manager.py:151-158` and the deletion path `entity_manager.py:204-209` which deletes by `er_counter.unique_id`. So a matching `unique_id` is both the managed marker AND the handle teardown needs.)
- [ ] `def is_managed_todo(hass, entity_id, member_name) -> bool` — true iff the registry entry for `todo.<slug>` exists AND `entry.platform == "local_todo"` AND the backing config entry's title case-insensitively equals `member_name`. Resolve the title via the registry entry's `config_entry_id`: `ce = hass.config_entries.async_get_entry(reg_entry.config_entry_id)` then compare `(ce.title or "").casefold() == member_name.casefold()`. Note the config-entry title is set from the member name when created (`_create_local_todo(hass, member.name)` in `entity_manager.py:120`). Fall back to `reg_entry.original_name` only if `config_entry_id`/`ce.title` is missing — do NOT rely on `original_name` alone, as local_todo registry entries may have `original_name == None`. (On the live data, `todo.gridou`'s backing config-entry title is `"Gridou"`.)
- [ ] `def classify_slot(hass, member) -> SlotState` — returns one of: `FREE` (neither side present), `MANAGED_ORPHAN` (present side(s) all match managed markers), `FOREIGN` (a present side does NOT match managed markers). Calls `is_managed_counter(hass, f"counter.{member.slug}_streak", member.slug)` and `is_managed_todo(hass, f"todo.{member.slug}", member.name)` for the present sides. Document the rule: if **any** occupying entity is foreign, the slot is `FOREIGN` (fail-safe — never delete).
  - **Scope note (avoids a false "single source of truth" expectation):** `classify_slot`/`is_managed_todo` here are the **slot-level** check used by the add flow and CAN use `member.name` (a real member is being added). Phase 3's `find_orphans` is a **registry-wide sweep** with NO member name available, so it uses a different (name-free) rule: a `local_todo` todo only counts as managed if it has a sibling `counter.<slug>_streak`. Both rules live in `lifecycle.py` and share `is_managed_counter`, but `is_managed_todo` (name-based) is NOT reused by `find_orphans`. Do not try to force one todo-detection function to serve both — they have different available inputs. README's "single source of truth" means shared module + shared `is_managed_counter`, not one identical todo predicate.

#### prepare-slot
- [ ] `async def prepare_member_slot(hass, member) -> None` — call `classify_slot`; if `MANAGED_ORPHAN`, call `await lifecycle.teardown_member(hass, member)` (do NOT write a separate targeted-teardown path — `teardown_member` is already idempotent per Phase 1, so it cleanly handles a partial orphan where only one side is present) so the slot becomes `FREE`; if `FOREIGN`, raise a dedicated exception type (e.g. `ForeignEntityCollision`) carrying the conflicting entity_id; if `FREE`, no-op. `prepare_member_slot` must fully `await` the teardown before returning so the entity registry entries are gone before `async_create_member_entities` runs its own collision guard (`entity_manager.py:113`). `async_delete_member_entities` removes the local_todo via `hass.config_entries.async_remove(config_entry_id)`, which synchronously unregisters the entity — do not add an `async_block_till_done` (it can stall inside the options flow, mirroring the comments in `entity_manager._create_local_todo`).
- [ ] **Define `ForeignEntityCollision` in `lifecycle.py`** (subclass `HomeAssistantError` from `homeassistant.exceptions` so existing `except HomeAssistantError` paths still behave) with an `entity_id: str` attribute. Import it into `config_flow.py`. Catch it specifically BEFORE the generic `except HomeAssistantError` in `async_step_add_member` (`config_flow.py:744`) — order matters, since it IS a `HomeAssistantError`; a generic catch first would swallow it into `entity_create_failed`.

#### Tests (`tests/python/test_lifecycle.py`)
- [ ] `classify_slot` → `MANAGED_ORPHAN` for a full orphan (todo+counter both managed-shaped), and for partial orphans (only counter, only todo).
- [ ] `classify_slot` → `FOREIGN` when `todo.<slug>` exists but is NOT `local_todo` / name mismatch (simulate `todo.test`-style), or when `counter.<slug>_streak` has a non-matching `unique_id`.
- [ ] `classify_slot` → `FREE` when nothing occupies the slot.
- [ ] `prepare_member_slot` clears a managed orphan (slot becomes FREE) and raises `ForeignEntityCollision` for a foreign occupant **without deleting it**.

### Sub-Phase B: wire add-member flow + foreign-collision error

#### Flow integration
- [ ] In `config_flow.async_step_add_member`, call `await prepare_member_slot(hass, member)` **before** `async_create_member_entities`.
- [ ] On `ForeignEntityCollision`, set a new error key (e.g. `errors["base"] = "entity_conflict_foreign"`) — do NOT fall through to auto-replace.
- [ ] Keep the existing `entity_create_failed` path as a fallback for genuine creation failures (storage collection errors, etc.).
- [ ] After successful create, the existing `seed_preset_routines` call re-seeds routine items (unchanged) — confirm it still runs so routines reappear on a replaced member.
- [ ] Keep `async_create_member_entities`'s own collision guard as a safety net (defense in depth): prepare_member_slot should have cleared managed orphans, so the guard only fires for races / foreign entities.

#### Strings
- [ ] Add `entity_conflict_foreign` to `strings.json` under the same `error` block as `entity_create_failed` (the `options.error` block — this flow is an Options flow, see `strings.json:151-165`). Message: `"An entity '{entity_id}' already exists that Lucarne didn't create. Rename or remove it, then try again."`
  - **Placeholder rendering is supported — do this, don't hedge:** HA interpolates `{...}` tokens in error strings using the `description_placeholders` dict passed to the *same* `async_show_form(...)` result that carries `errors`. So to render `{entity_id}`, the `async_step_add_member` form return that sets `errors["base"] = "entity_conflict_foreign"` MUST also pass `description_placeholders={"entity_id": <conflicting_entity_id>}`. The current `async_step_add_member` calls `self.async_show_form(step_id="add_member", data_schema=schema, errors=errors)` with no placeholders (`config_flow.py:800`) — add `description_placeholders` (built from the `ForeignEntityCollision.entity_id`) to that call. Stash the conflicting entity_id on `self` (e.g. `self._foreign_conflict_entity_id`) when the exception is caught, then thread it into the final `async_show_form`. Add a test asserting the rendered placeholder (see Tests below).
- [ ] Mirror the new key in `translations/en.json`.
- [ ] Add an explicit parity assertion in a test (e.g. `tests/python/test_config_flow.py` or a small `tests/python/test_strings_parity.py`): load both `custom_components/lucarne_family/strings.json` and `custom_components/lucarne_family/translations/en.json`, and assert the set of keys under `options.error` is identical in both files (so `entity_conflict_foreign` must exist in both). Do NOT make this conditional on a pre-existing parity test — write the assertion regardless. (No `test_services_yaml.py` parity helper is assumed to exist; if one does, extend it instead of duplicating.)

#### Tests (`tests/python/test_config_flow.py`)
- [ ] Add member when a **managed orphan** occupies the slot (todo+counter present, managed-shaped) → flow succeeds, fresh `todo.<slug>` + `counter.<slug>_streak` exist, preset routine items are seeded, and the member record is saved. (Mirrors the live Gridou/Eric/Nico/Susie scenario.)
- [ ] Add member when a **partial orphan** occupies the slot (only `counter.<slug>_streak`) → succeeds; counter replaced.
- [ ] Add member when a **foreign** entity occupies the slot (e.g. a manual `todo.<slug>` not from local_todo, or a `counter.<slug>_streak` with a foreign unique_id) → flow returns the form with `errors["base"] == "entity_conflict_foreign"`, the result carries `description_placeholders` containing the conflicting `entity_id`, and the foreign entity is **still present** in the registry afterward (asserted — hard safety gate). Assert on the flow result dict: `result["errors"]["base"] == "entity_conflict_foreign"` and `result["description_placeholders"]["entity_id"] == "todo.<slug>"`.
- [ ] Auto-replace discards old ad-hoc todo items but routines return: seed a managed-orphan todo with one ad-hoc + the preset routines, re-add the member, assert the ad-hoc item is gone and routine items exist.

#### Documentation (End of Sub-Phase)
- [ ] `docs/integration.md` — document add-member behavior with leftovers: managed leftovers are auto-replaced (ad-hoc items lost, routines re-seeded); foreign same-named entities block the add with a clear message.
- [ ] `docs/architecture.md` — document the strict slot detection (`classify_slot` / `is_managed_counter` / `is_managed_todo`), the `prepare_member_slot` step inserted before `async_create_member_entities`, and the `ForeignEntityCollision` exception type that `lifecycle.py` now exports.
- [ ] `CLAUDE.md` — note in pitfalls that `async_create_member_entities` is now preceded by `prepare_member_slot`, and that foreign entities are never auto-deleted.

### Build Verification (required before marking phase complete)

- [ ] `.venv/bin/ruff check custom_components tests/python` — zero errors
- [ ] `.venv/bin/mypy custom_components/lucarne_family` — clean
- [ ] `.venv/bin/python -m pytest tests/python/` — all pass, no regressions
- [ ] `npm test && npm run lint && npm run typecheck && npm run build` — green
- [ ] Confirm the foreign-entity safety test is present and passing (this is the highest-risk behavior).
- [ ] Mark phase `status: done` only after all verification steps pass.

### Manual Verification with MCP Tools

- [ ] On the live/dev instance: add a member whose slug matches an existing managed orphan; confirm via `mcp__home-assistant__ha_get_todo` that the new list has the seeded routines and via `ha_search_entities` that exactly one `counter.<slug>_streak` exists.
- [ ] Confirm `mcp__home-assistant__ha_get_logs(source="error_log", search="lucarne")` no longer shows the "Cannot create todo.<slug>" warning for managed orphans.
- [ ] Confirm a foreign `todo.test`-style entity is untouched after a (blocked) add attempt with that slug.

## Technical Details

### Slot classification (fail-safe)

```
classify_slot(member):
  occupied_sides = [side for side in (todo, counter) if registry_has(side)]
  if not occupied_sides: return FREE
  if all(is_managed(side) for side in occupied_sides): return MANAGED_ORPHAN
  return FOREIGN            # any foreign side ⇒ never delete
```

### Error keys (config_flow `errors["base"]`)

| Key | When | Message intent |
|-----|------|----------------|
| `entity_conflict_foreign` (new) | slot occupied by a non-managed entity | names the conflicting entity via `{entity_id}`; rendered by passing `description_placeholders={"entity_id": ...}` on the same `async_show_form` that sets `errors["base"]` |
| `entity_create_failed` (existing) | genuine creation failure after slot prepared | unchanged generic message |

## Constraints

- **Hard safety gate:** a `FOREIGN` slot is never deleted or adopted. The foreign-entity test must assert the entity survives a blocked add.
- Detection is the single source of truth in `lifecycle.py`; the add flow, Phase 1 teardown, and Phase 3 sweep all use it.
- Auto-replace reuses `teardown_member` + `async_create_member_entities` (+ existing rollback) — no new deletion/creation code paths.
- Preset re-seeding behavior is unchanged; do not duplicate seeding logic.
