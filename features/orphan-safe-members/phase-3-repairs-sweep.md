---
status: pending
---

# Phase 3: Repairs issue for residual orphans

Detect managed-shaped entities that **no current member references** (e.g. the live `counter.kid_1_streak` / `kid_2_streak` / `kid_3_streak` partial orphans) and surface a Home Assistant **Repairs** issue with a confirm fix flow that tears them down. The fix flow lists what it will remove and requires explicit user confirmation — it never auto-deletes.

## Context

Phases 1–2 prevent **new** orphans (clean uninstall) and let the add flow recover from a managed orphan **for the slug being added**. But residual orphans that nobody is re-adding (the `kid_*` counters, or a leftover after an aborted flow) still linger silently. `_async_reconcile_member_entities` already detects partial state during setup but only logs a WARNING — Phase 3 turns that into a user-actionable Repairs item.

Detection reuses `lifecycle` markers from Phase 2 but cannot rely on a member name (there is no member for an orphan). So sweep detection is **shape + unreferenced**: a `counter.*_streak` or a `local_todo`-backed `todo.*` whose slug matches no current member. Because shape-only detection is heuristic, the sweep **never auto-deletes** — it proposes a list and the user confirms in the fix flow. This keeps the strict-safety promise (foreign entities like `todo.test`, which is not a `*_streak` counter and whose slug is not a member, would only be listed if it matched managed shape — and the user sees the list before confirming).

Read [./README.md](./README.md) for Concepts (orphan, partial orphan, strict detection) and the Repairs requirement.

## Structure

```
custom_components/lucarne_family/
  lifecycle.py            # update: find_orphans(hass, members) -> list of orphan descriptors
  repairs.py              # new: RepairsFlow + async_create_fix_flow; issue create/delete helpers
  __init__.py             # update: after reconcile in async_setup_entry, raise/clear the issue
  strings.json            # update: issues.<issue_id> title/description + fix-flow step strings
  translations/en.json    # update: mirror issue + fix-flow strings
manifest.json             # verify: "repairs" is available via HA core (no dep change needed)
tests/python/
  test_repairs.py         # new: detection, issue lifecycle, fix-flow teardown tests
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [ ] Confirm Phases 1–2 merged/green (`lifecycle` detection + teardown exist).
- [ ] Run the full gate — all green.

### Sub-Phase A: orphan discovery in `lifecycle.py`

- [ ] `def find_orphans(hass, members: list[Member]) -> list[OrphanRef]` — `members` is the list of current `Member` dataclasses (from `.models`, as returned by `store.get_members()`); derive the set of live slugs as `{m.slug for m in members}`. Scan the entity registry for managed-shaped entities not referenced by any current member. Define `OrphanRef` as a small dataclass in `lifecycle.py` (`@dataclass` with fields `entity_id: str`, `kind: Literal["todo", "counter"]`). **Decisive rules (do not loosen):**
  - **Counter orphan:** a `counter` registry entry whose `unique_id` matches `^(?P<slug>.+)_streak$` where `slug` is not a current member slug. **Additionally require `entity_id == f"counter.{slug}_streak"`** (i.e. the registry-assigned entity_id matches the slug derived from the unique_id). This integration always creates the counter so its entity_id and unique_id agree (`entity_manager.py:172-173` verifies the registry assigned the canonical id). A user's own counter named, say, `Win Streak` would have `unique_id`/entity_id derived independently and is unlikely to satisfy both; requiring agreement narrows false positives. This residual risk is acceptable because the fix flow is confirm-gated and lists every entity before deleting — but DO apply the entity_id/unique_id agreement check; do not match on unique_id alone.
  - **Todo orphan:** a `local_todo`-backed `todo.<slug>` where (a) `slug` is not a current member slug, (b) the entity is not `todo.lucarne_household`, **AND (c) there is a matching managed counter orphan `counter.<slug>_streak` in the same sweep** (i.e. the todo only counts as an orphan if it has a managed streak-counter sibling). This pairing requirement is the safety gate that keeps a user's manually-created To-do list (which is ALSO `local_todo`-backed — a hand-made `todo.test` is a real `local_todo` config entry, NOT distinguishable from ours by platform alone) from ever being listed. A `local_todo` todo with NO `*_streak` sibling is treated as foreign and is **never** listed.
  - Each `OrphanRef` carries only `entity_id` and `kind` (`"todo"`/`"counter"`). It does **not** need to pre-resolve `config_entry_id`/`unique_id`, because teardown reuses `async_delete_member_entities(hass, todo_entity_id, counter_entity_id)`, which itself resolves the `config_entry_id` (for the todo) and the registry `unique_id` (for the counter) from the registry at delete time (see `entity_manager.py:204-209`). For the underlying mechanics: a **todo** is removed via its `local_todo` config entry (`hass.config_entries.async_remove(config_entry_id)`); a **counter** via the counter storage collection keyed by its registry `unique_id`. Pass each orphan's `entity_id` (use `None` for the side that has no orphan) to `async_delete_member_entities`; do not re-derive the handles in the fix flow.
- [ ] Exclude household + all active members. **Critical:** because a manual To-do list helper is indistinguishable from our member todos by `platform`/shape alone, the todo-orphan rule REQUIRES a sibling managed `counter.<slug>_streak`. Document this inline. The confirm gate is a second safety net, but the pairing rule is the primary defense — do not list a lone `local_todo` todo.

#### Tests (`tests/python/test_lifecycle.py`)
- [ ] `find_orphans` returns the `kid_1/2/3_streak` counters (no matching member) and excludes active members' counters and the household todo.
- [ ] `find_orphans` excludes a manual `todo.test` that is a real `local_todo` config entry with NO `counter.test_streak` sibling — assert it is NOT in the returned list (the todo-orphan rule requires a managed counter sibling). This is the hard safety gate; the test must create `todo.test` as an actual local_todo entry (not a non-local_todo entity) to prove the pairing rule, since platform alone does not distinguish it from member todos.
- [ ] `find_orphans` returns `[]` when every managed entity maps to a current member.
- [ ] `find_orphans` excludes a manual counter whose `unique_id` ends in `_streak` but whose registry `entity_id` does NOT equal `counter.<slug>_streak` (i.e. the entity_id/unique_id agreement check from the Decisive rule fails). Construct the registry entry so `unique_id == "win_streak"` but `entity_id == "counter.my_wins"` (a user-renamed or independently-assigned id), and assert it is NOT in the returned list. This is the concrete, mandated behavior of the agreement rule — do not substitute a softer "confirm gate would surface it" assertion. (A manual counter that happens to satisfy BOTH the `_streak` unique_id pattern AND id agreement is an accepted residual false-positive, caught by the confirm gate — that case need not be excluded by `find_orphans`.)

### Sub-Phase B: Repairs issue + fix flow

#### Issue lifecycle
- [ ] In `async_setup_entry`, after `_async_reconcile_member_entities` (currently `__init__.py:136`), compute `find_orphans` and call `ir.async_create_issue(...)` (from `homeassistant.helpers.issue_registry`) with `is_fixable=True`, a stable `issue_id` (e.g. `orphan_entities`), `severity=ir.IssueSeverity.WARNING`, and translation placeholders for the count. If no orphans, `ir.async_delete_issue(...)` to clear a stale issue.
  - **Re-read members from the store AFTER reconcile, not before:** `_async_reconcile_member_entities` may recreate entities and call `store.async_save_members` (`__init__.py:316`), so call `store.get_members()` again right before `find_orphans` to avoid a stale member set.
  - **Do NOT rewrite `_async_reconcile_member_entities`.** Its docstring comment "Phase 3 replaces this with an explicit seven-step setup order" (`__init__.py:252`) refers to an unrelated earlier plan, not THIS feature's Phase 3. This phase only ADDS an orphan-issue computation after reconcile; leave reconcile's recreate/warn behavior intact (optionally remove the stale comment, but no behavior change).
- [ ] Recompute on options update / member changes (so resolving via re-add or fix flow clears the issue) — at minimum on each `async_setup_entry`.

#### Fix flow (`repairs.py`)
- [ ] Implement a **module-level** `async def async_create_fix_flow(hass, issue_id, data) -> RepairsFlow` in `repairs.py` (exact name + signature — HA core imports `<domain>.repairs.async_create_fix_flow` by convention; subclass `homeassistant.helpers.repairs.RepairsFlow`). Do not register it anywhere; discovery is by module/function name.
- [ ] **`data` will be `None`** in this flow because `async_create_issue` in Sub-Phase B does not pass `data=` (only `translation_placeholders`). Therefore the fix flow MUST **recompute** the orphan list itself by calling `find_orphans(hass, members)` at confirm time — do NOT expect the orphan list to arrive via the `data` argument. Read current members the same way `async_setup_entry` does: from the single config entry's `entry.data[CONF_MEMBERS]`, converted to `Member` objects (`[Member.from_dict(m) for m in entry.data.get(CONF_MEMBERS, [])]`) since `find_orphans` expects `list[Member]`. Resolve the entry defensively: `entries = hass.config_entries.async_entries(DOMAIN); entry = entries[0] if entries else None`. If `entry is None` (the integration was removed after the issue was raised), delete the issue (`ir.async_delete_issue(hass, DOMAIN, "orphan_entities")`) and `return self.async_create_entry(title="", data={})` rather than indexing `[0]` (which would `IndexError`). Recomputing also guarantees you never delete an entity that became member-owned (via a Phase 2 re-add) between issue creation and confirm.
- [ ] Step 1 (`async_step_init` → `async_step_confirm`): show the list of orphan entity_ids that will be removed (pass them via `description_placeholders={"entities": ", ".join(...)}` on the `async_show_form`), `data_schema=vol.Schema({})` confirm form (an empty schema, not `None`, renders a bare confirm button).
- [ ] On confirm: recompute `find_orphans`, tear down each `OrphanRef` (todo → remove its `local_todo` config entry via `config_entry_id`; counter → storage-collection delete, reuse `entity_manager` primitives), then `async_delete_issue(hass, DOMAIN, "orphan_entities")`, then `return self.async_create_entry(title="", data={})`.
- [ ] The flow must list entities **before** deleting and only delete on explicit confirm (no silent deletion).

#### Strings
- [ ] Add the Repairs strings under a **top-level `"issues"` key** in `strings.json` — NOT under `config` or `options` (those existing roots are for the config/options flows). Structure:
  ```json
  "issues": {
    "orphan_entities": {
      "title": "...",
      "description": "...{count}...",
      "fix_flow": {
        "step": {
          "confirm": {
            "title": "...",
            "description": "...{entities}..."
          }
        }
      }
    }
  }
  ```
  The fix-flow step strings live under `issues.orphan_entities.fix_flow.step.<step_id>` (the RepairsFlow is a data-entry flow keyed by its step ids, e.g. `confirm`). The `{count}` placeholder is filled by `translation_placeholders` on `async_create_issue`; `{entities}` by `description_placeholders` on the fix-flow `async_show_form`.
- [ ] Mirror the entire `issues` block in `translations/en.json` (same nesting). If a strings-parity test exists, extend it to cover the `issues` keys too.

#### Tests (`tests/python/test_repairs.py`)
- [ ] Setting up an entry while `kid_*` orphan counters exist creates the `orphan_entities` Repairs issue.
- [ ] No issue is created when there are no orphans.
- [ ] Running the fix flow to confirmation deletes the listed orphans and deletes the issue.
- [ ] The fix flow's confirm step lists the exact orphan entity_ids (assert they appear in the flow description/placeholders) before any deletion.
- [ ] After re-adding a member that "owns" an orphan slug (Phase 2 path), the issue is cleared on next setup.

#### Documentation (End of Sub-Phase)
- [ ] `docs/integration.md` — document the Repairs item: what triggers it, what the fix flow removes, and that it requires confirmation.
- [ ] `docs/architecture.md` — note `repairs.py` and the `find_orphans` detection shared with the lifecycle service.
- [ ] `CLAUDE.md` — add a pitfalls note: residual orphans surface as a Repairs issue; detection is shape+unreferenced and the fix flow is confirm-gated.

### Build Verification (required before marking phase complete)

- [ ] `.venv/bin/ruff check custom_components tests/python` — zero errors
- [ ] `.venv/bin/mypy custom_components/lucarne_family` — clean
- [ ] `.venv/bin/python -m pytest tests/python/` — all pass, no regressions
- [ ] `npm test && npm run lint && npm run typecheck && npm run build` — green
- [ ] Mark phase `status: done` only after all verification steps pass.

### Manual Verification with MCP Tools

- [ ] On the live instance (which currently has `counter.kid_1/2/3_streak`): after deploying, confirm a Repairs issue appears (`mcp__home-assistant__ha_get_overview` → `repairs` / `repair_count`).
- [ ] Run the fix flow in the UI; confirm via `ha_search_entities(query="streak", domain_filter="counter")` that the `kid_*` counters are gone and the issue cleared.
- [ ] Confirm active members' counters and the manual `todo.test` are untouched.

## Technical Details

### Issue registry usage

```python
from homeassistant.helpers import issue_registry as ir

ir.async_create_issue(
    hass, DOMAIN, "orphan_entities",
    is_fixable=True, severity=ir.IssueSeverity.WARNING,
    translation_key="orphan_entities",
    translation_placeholders={"count": str(len(orphans))},
)
# ...or when none:
ir.async_delete_issue(hass, DOMAIN, "orphan_entities")
```

### Fix flow registration

HA core discovers `repairs.async_create_fix_flow` automatically for the domain; no manifest change is required (the `repairs` platform ships with HA core). The entry point is a **module-level function** `async_create_fix_flow(hass, issue_id, data)` in `custom_components/lucarne_family/repairs.py` returning a `RepairsFlow` subclass. Because `async_create_issue` is called WITHOUT `data=`, the `data` arg is `None` at flow time — the flow recomputes `find_orphans` instead of reading `data` (see Fix flow checklist).

## Constraints

- **Confirm-gated deletion only** — the fix flow lists entities and deletes solely on explicit user confirmation. No auto-sweep on setup.
- Detection reuses the `lifecycle` markers and is shape+unreferenced (no member name available); err toward NOT listing ambiguous entities.
- Reuse `entity_manager` deletion primitives for both kinds; do not re-implement removal.
- The issue must self-clear when orphans are gone (re-add via Phase 2, or fix flow) — recompute on `async_setup_entry`.
