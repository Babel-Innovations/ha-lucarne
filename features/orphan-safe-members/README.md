---
status: pending
issue:
---

# Orphan-Safe Member Entity Lifecycle

> **Progress Tracking**: Update checkboxes in phase files as you complete tasks. Run `/spec-implement [phase-file]` to begin implementation.

## Goal

Make the `lucarne_family` integration own the full lifecycle of the helper entities it creates, so that removing the integration leaves no leftovers and re-adding a member never dead-ends on a stale `todo.<slug>` / `counter.<slug>_streak` it created earlier.

## Background (why this exists)

Verified on the live HA instance on 2026-05-28:

- The integration creates two helpers per member: a `local_todo` config entry (surfacing `todo.<slug>`) and a `counter.<slug>_streak` helper. It also owns `todo.lucarne_household` and a SQLite db file `lucarne_family_<entry_id>.db`.
- `async_unload_entry` only stops listeners. There is **no `async_remove_entry`**, so removing/resetting the integration orphans every per-member `local_todo` entry and counter helper.
- `entity_manager.async_create_member_entities` guards canonical IDs with `if er.async_get(canonical_todo_id) is not None: raise HomeAssistantError(...)`. Once orphans exist, re-adding **any** member with the same slug dead-ends with the UI error `entity_create_failed` ("Failed to create the member's entities. Check the logs and try again.").
- Live evidence: the current `lucarne_family` "Family" entry (ULID `01KSRX6…`) is newer than the leftover `local_todo` entries for Eric/Nico/Susie (`01KSP11…`) and Gridou (`01KSH6J…`), proving those belong to a previously-deleted family. There are also **partial orphans** — `counter.kid_1_streak` / `kid_2_streak` / `kid_3_streak` with no matching todo. A manual, unrelated `todo.test` also exists and **must never be touched**.

## Concepts

### Managed entity
A helper this integration created for a member or the household:
- **Managed todo** — a `local_todo` config entry whose todo entity is `todo.<slug>` and whose config-entry **title** equals the member's display name (case-insensitive). Use the config-entry title, not the registry `original_name` — `original_name` can be `None` for `local_todo` entries (see Strict detection below). Plus the household todo `todo.lucarne_household`.
- **Managed counter** — a `counter` helper whose registry `unique_id` is exactly `<slug>_streak`.

### Orphan
A managed-shaped entity that **no current member references** (the member record was deleted, or the whole family entry was removed). Two kinds:
- **Full orphan** — both `todo.<slug>` and `counter.<slug>_streak` survive (e.g., Gridou).
- **Partial orphan** — only one side survives (e.g., `counter.kid_N_streak` with no `todo.kid_N`). `_async_reconcile_member_entities` already detects and warns about partial state today.

### Strict detection (never clobber user entities)
Detection uses **managed shape markers only**, but the marker set differs by call site because the available inputs differ:

- **Counter (both call sites):** registry `unique_id == "<slug>_streak"`. This is reliable — the integration is the only thing that mints `<x>_streak` counter unique_ids.
- **Todo, slot-level (Phase 2 add flow, a member name IS available):** `local_todo` backing AND the backing config-entry **title** case-insensitively equals the member's name. (Title — not `original_name`, which can be `None` for local_todo entries.)
- **Todo, registry-wide sweep (Phase 3, NO member name available):** a `local_todo`-backed `todo.<slug>` is only treated as managed if it has a sibling managed `counter.<slug>_streak`. A lone `local_todo` list with no `*_streak` sibling is **foreign**.

The critical subtlety: a user's hand-made `todo.test` is **also** a real `local_todo` config entry — it is NOT distinguishable from a member todo by platform alone. The name-match (Phase 2) and the counter-sibling pairing (Phase 3) are what keep it safe. An entity that does not match these markers is treated as **foreign** and is never deleted or adopted. No persistent tagging is introduced in this feature.

### Auto-replace on add (chosen behavior)
When adding a member whose slot is occupied by a **managed orphan**, the integration silently tears it down and recreates fresh — no prompt. `seed_preset_routines` then re-seeds the member's preset routine items, so routines return; any **ad-hoc** (non-routine) items the old list held are lost. This trade-off was chosen deliberately for a simpler, prompt-free flow. A **foreign** collision is never replaced — it surfaces a clear error telling the user which entity to rename/remove.

## Requirements

### Cascade cleanup on removal (Phase 1)
- Implement `async_remove_entry` so removing the config entry deletes every member's `local_todo` entry + `counter.<slug>_streak` helper, the household todo, and the SQLite db file.
- Reuse the existing `entity_manager.async_delete_member_entities`. Tolerate already-missing entities (idempotent, no raise).

### Auto-replace on add (Phase 2)
- When `todo.<slug>` and/or `counter.<slug>_streak` already exist and are **managed orphans**, tear them down and recreate fresh, then re-seed preset routines.
- A **foreign** collision must not be touched — surface a distinct, actionable error (new error key) naming the conflicting entity.
- Handle partial orphans (only one side present) without raising.

### Residual orphan cleanup (Phase 3)
- Surface a Home Assistant **Repairs issue** when shape-matching, member-unreferenced entities are detected (e.g. `kid_*` counters).
- Provide a confirm **fix flow** that tears down the listed orphans and resolves the issue. The fix flow must require explicit user confirmation (it lists entities before deleting); it never auto-deletes.

### Authorization
- All flows run inside HA's config/options flow and Repairs, which are already gated by HA's authenticated admin UI. No additional auth layer. The integration is single-instance / single config entry.

## Phases

| Phase | Title | Description |
|-------|-------|-------------|
| 1 | Cascade cleanup on removal | `lifecycle.py` teardown service + `async_remove_entry`; clean uninstall, no orphans going forward |
| 2 | Detect & auto-replace orphans on add | Strict managed-orphan detection + auto-replace in add-member flow; foreign collisions get a clear error |
| 3 | Repairs issue for residual orphans | Detect member-unreferenced managed-shaped entities and offer a confirm-to-clean Repairs fix flow |

## Related Documentation

- [Phase 1: Cascade cleanup on removal](./phase-1-cascade-cleanup.md)
- [Phase 2: Detect & auto-replace orphans on add](./phase-2-auto-replace.md)
- [Phase 3: Repairs issue for residual orphans](./phase-3-repairs-sweep.md)
- Architecture overview: [../../docs/architecture.md](../../docs/architecture.md)
- Integration user guide: [../../docs/integration.md](../../docs/integration.md)
- Project working guide: [../../CLAUDE.md](../../CLAUDE.md)

## Testing Tools

> Discovered during spec creation. Use these for manual verification after automated tests pass.

| MCP Server | Tool Prefix | Use For |
|-----------|-------------|---------|
| Home Assistant | `mcp__home-assistant__*` | Verify on the live instance: `ha_get_integration` (entry state + list `local_todo` entries), `ha_search_entities` (find `todo.*` / `counter.*_streak`), `ha_get_todo` (list items), `ha_get_logs` (`source="error_log"`, search `lucarne`), `ha_get_overview` (Repairs count). Use to confirm a removed family leaves zero orphans, and that the Repairs issue appears/clears. |

## Logging & Diagnostics

> The integration has no structured log files; it logs through HA's standard logger as `custom_components.lucarne_family.*`.

| Log Source | Location | Format | What to Check |
|-----------|----------|--------|---------------|
| HA error log | `home-assistant.log` (or `mcp__home-assistant__ha_get_logs source="error_log"`) | raw text | `WARNING`/`ERROR` from `custom_components.lucarne_family.config_flow` / `.entity_manager` / `.lifecycle` / `.repairs`. The current failure logs `Failed to create entities for member 'X': Cannot create todo.X: an entity with this id already exists.` After Phase 2 that should disappear for managed orphans. |

The integration does **not** implement the HA diagnostics platform (`ha_get_integration(include_diagnostics=True)` returns "Diagnostics not available"). Verify state via entity/todo/counter inspection instead.

## Access Control

Not applicable. This is a local custom integration with no infrastructure-level access control (no Firebase/Supabase/RLS). All access is gated by HA's authenticated admin UI. Path-safety rules (avatars under `/local/lucarne/avatars/` only) are unrelated to this feature.

## Constraints

- **No blocking I/O on the event loop.** SQLite + file deletes must go through `hass.async_add_executor_job` (see existing `store.py` pattern). The db-file delete in Phase 1 must be executor-wrapped.
- **Never touch foreign entities.** Only entities matching strict managed markers may be deleted/adopted. `todo.test` (and any non-`*_streak` counter / non-member-named local_todo) must be left intact. This is a hard security/safety gate — cover it with explicit tests.
- **Reuse existing primitives.** `async_delete_member_entities` already removes a `local_todo` config entry + counter via storage collection — Phase 1/2 must reuse it, not re-implement deletion.
- **Single source of truth for detection.** Shape-based detection (`classify_slot` / `is_managed_*` / `find_orphans`) lives only in `lifecycle.py` and is shared by the **add flow** (Phase 2) and the **Repairs sweep** (Phase 3). No duplicated heuristics. Note: `async_remove_entry` / `teardown_family` (Phase 1) do **not** use shape detection — they tear down by **member record** (members are known from `entry.data`), which is exact, not heuristic. Do not add shape-matching to the removal path.
- **Counter helpers are created/deleted via the storage collection**, reached through the `counter/create` WS handler (`_get_counter_storage_collection`) — there is no public Python API. Follow the existing pattern; do not hand-roll counter config entries.
- **Slug-changing renames stay in `rename.py`.** This feature does not change the rename flow; it only adds creation/teardown/sweep paths.
- **Idempotency + rollback.** Teardown tolerates partially-missing entities. Auto-replace must not leave a half-created member if creation fails after teardown (reuse the existing rollback in `async_create_member_entities`).
