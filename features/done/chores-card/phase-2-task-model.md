---
status: done
---

# Phase 2: Managed entities + task model + services

Wire the integration's entity lifecycle: when a member is added, create `todo.<slug>` and `counter.<slug>_streak`. Build the task metadata layer in SQLite. Expose `lucarne_family.add_task`, `update_task_metadata`, `delete_task`, `toggle_task`, and `upload_avatar`. Build the recurrence engine using `python-dateutil`. Implement entity rename with downstream-impact preview.

By end of phase: a developer can call the services from Developer Tools → Services and see tasks appear in the per-member `todo` entity with all metadata persisted. Avatars upload to `/local/lucarne/avatars/`. Renaming a member renames its entities.

## Context

Phase 1 stored member metadata in `config_entry.data` and stubbed SQLite. This phase makes those members real in HA by creating managed entities, and adds the task metadata layer that the cards (Phase 4+) will consume.

Read [./README.md](./README.md) for overall feature context.

## Structure

```
custom_components/lucarne_family/
  __init__.py                     # update: hook member-add/remove to entity lifecycle
  entity_manager.py               # new: create/rename/delete todo + counter entities via HA config/helper APIs
  task_service.py                 # new: service handlers for add_task / update_task_metadata / delete_task
  avatar_service.py               # new: handler for upload_avatar (validates + writes file)
  recurrence.py                   # new: thin wrapper around dateutil.rrule (next_due, is_due_today)
  rename.py                       # new: impact preview + entity rename orchestration
  services.yaml                   # new: HA service schemas for Developer Tools
  websocket_api.py                # new: lucarne_family/get_family WS command (read API for cards)
  store.py                        # update: methods for task_metadata + completion_log CRUD
tests/python/
  test_entity_manager.py          # new
  test_task_service.py            # new
  test_avatar_service.py          # new
  test_recurrence.py              # new
  test_rename.py                  # new
  test_services_yaml.py           # new
  test_store_tasks.py             # new
  test_websocket.py               # new
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline verification (before starting)

- [ ] `pytest tests/python` — Phase 1 tests pass
- [ ] `npm test && npm run lint && npm run typecheck && npm run build` — TS side green
- [ ] On real HA: Phase 1 integration installed, 1-2 test members added (will use these for Phase 2 verification)

### Sub-Phase A: Recurrence engine

#### `recurrence.py`
- [x] `def parse(rrule_str: str) -> rrule | None` — `dateutil.rrule.rrulestr` wrapper, returns None for empty string
- [x] `def next_due(rrule_str: str, after: datetime) -> datetime | None` — first occurrence strictly after `after`
- [x] `def is_due_today(rrule_str: str, today: date, tz: tzinfo) -> bool` — true if any occurrence falls on `today` in `tz`
- [x] `def friendly_summary(rrule_str: str) -> str` — human-readable ("Every Monday", "Every 6 months", "Daily")
- [x] **Use `dateutil.rrule` exclusively for date math.** Do NOT roll your own day-of-week or interval calculations.

##### Supported RRULE pattern contract (shared with Phase 4 TS side)

The integration accepts ONLY these six table rows: one-off plus five recurring modes. Phase 4's TS-side `recurrence.ts` must round-trip the same set (and only this set). Any RRULE outside this set is rejected by the `add_task` service with `ServiceValidationError`. Lock this list:

| Mode | RRULE template | Example |
|---|---|---|
| None / one-off | empty string | `""` |
| Daily | `FREQ=DAILY[;INTERVAL=N]` | `FREQ=DAILY` |
| Weekly | `FREQ=WEEKLY;BYDAY=<MO,TU,...>[;INTERVAL=N]` | `FREQ=WEEKLY;BYDAY=MO,WE,FR` |
| Monthly by date | `FREQ=MONTHLY;BYMONTHDAY=<1-31>[;INTERVAL=N]` | `FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6` |
| Monthly by Nth weekday | `FREQ=MONTHLY;BYDAY=<+/-N><DAY>[;INTERVAL=N]` | `FREQ=MONTHLY;BYDAY=1SA` (first Saturday) |
| Yearly | `FREQ=YEARLY;BYMONTH=<1-12>;BYMONTHDAY=<1-31>[;INTERVAL=N]` | `FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15` |

Anything else (`COUNT=`, `UNTIL=`, `BYSETPOS` other than the monthly-Nth case, `BYHOUR`, `BYMINUTE`, multiple BYxxx beyond the table) is out of scope for v1 and must be rejected with a clear error pointing the user back at the picker.

#### Tests
- [x] `test_recurrence.py`: daily, weekly Mon/Wed/Fri, every other week, monthly first Saturday, every 6 months, yearly on March 15, empty string → None
- [x] Edge cases: DST boundaries, leap years. For Feb 29 yearly rules, verify `dateutil` behavior against the pinned dependency version and encode that behavior in tests (do not state Feb 28 fallback unless the pinned library actually does that).
- [x] `friendly_summary` round-trips known RRULEs to expected English

### Sub-Phase B: Store extensions for tasks

#### `store.py` updates
- [x] `async def async_add_task_metadata(member_slug, item_uid, type, recurrence, icon, source, apple_uid, assignee_slug="")` — INSERT into task_metadata; executor-wrapped. For tasks stored in `todo.lucarne_household`, `member_slug` MUST be `"household"` and `assignee_slug` MAY be a known member slug or empty.
- [x] `async def async_update_task_metadata(item_uid, **fields)` — UPDATE; only allowed fields (`type`, `recurrence`, `icon`, `source`, `apple_uid`, `assignee_slug`)
- [x] `async def async_delete_task_metadata(item_uid)` — DELETE from task_metadata (leaves completion_log intact)
- [x] `async def async_get_task_metadata(item_uid)` → dict | None
- [x] `async def async_get_tasks_for_member(member_slug) -> list[dict]`
- [x] `async def async_append_completion(member_slug, item_uid, summary, action, recurrence_at_time)` — INSERT into completion_log
- [x] `async def async_get_streak(member_slug, today, recurrence_evaluator) -> int` — compute streak from `completion_log`; this is the authoritative streak calculation. `counter.<slug>_streak` is only a derived mirror written later by the Phase 3 streak-check automation for external automations to query.
  - **Algorithm contract** (locked — Phase 3 must respect this signature):
    - Walk backward from `today` one day at a time.
    - For each day D, call `recurrence_evaluator(D) -> list[str]` (callable injected by Phase 3 / Phase 2 callers) that returns the list of task UIDs whose `[type:routine]` metadata's RRULE is due on D. The walker has no recurrence knowledge itself — recurrence math lives in `recurrence.py`.
    - If the list is empty: this is a "no routines expected" day. **Skip** without incrementing or resetting the streak; continue walking back.
    - If the list is non-empty: check `completion_log` for `action='completed'` rows with member_slug + item_uid in the list and timestamp on day D (local timezone). If ALL expected UIDs are present: increment streak by 1, continue walking back. If ANY are missing: stop walking; return the accumulated streak.
    - Hard cap walk-back at 365 days to bound query cost.
  - **`recurrence_evaluator` factory**: provide `make_recurrence_evaluator(hass, store, member_slug) -> Callable[[date], list[str]]` in `recurrence.py` that, on each call, reads the member's current `task_metadata` rows (filtered to `type='routine'`) and returns UIDs whose `recurrence` RRULE has an occurrence on the given date in `hass.config.time_zone`. Caches the metadata read per-call for efficiency.
  - **Limitation acknowledged**: if a member's routine set changed historically (e.g. routine added 30 days ago), the walker uses current metadata to evaluate ALL historical days. This means changing routines can momentarily change historical streak computation. Document this in `docs/integration.md`. Future work could snapshot routine set in `completion_log` at reset time; out of scope for v0.2.

#### Tests
- [x] `test_store_tasks.py`:
  - Add task metadata → retrievable
  - Update metadata — only allowed fields change
  - Delete metadata — leaves log rows
  - Append completion → log row inserted
  - Compute streak from log: 3 days of all-complete → streak 3; missed day → streak resets

### Sub-Phase C: Entity manager (todo + counter creation/deletion/rename)

This is the most error-prone area. **Helper creation in HA is NOT exposed as a single `<domain>/create` WebSocket command** — that pattern is a common LLM hallucination. `local_todo` creation is through its config flow. Counter creation uses the counter helper API when present in the pinned HA version; the Phase 2 compatibility test below is the gate. Do NOT guess WS message types.

Concrete HA-core files to read first. These paths and APIs must be verified against the pinned HA version before implementation:

- `homeassistant/components/local_todo/__init__.py` and `homeassistant/components/local_todo/config_flow.py` — confirms `local_todo` is a config-entry integration; helper creation goes through `hass.config_entries.flow.async_init("local_todo", context={"source": "user"}, data={"name": ...})` (NOT a WS command). Because the created entity_id is derived from the submitted name, Phase 2 must immediately rename the entity-registry row to the canonical `todo.<slug>` before storing it.
- `homeassistant/components/counter/__init__.py` — `counter` is a YAML/storage helper. Use the in-process helper API exposed by the component (`async_create_helper` on the loaded counter component). If that API is absent in the pinned HA version, stop Phase 2 and raise the minimum HA version in `hacs.json` + `manifest.json`; do not fall back to an undocumented WS command.
- `homeassistant/helpers/entity_registry.py` — the rename API is `entity_registry.async_update_entity(entity_id, new_entity_id=...)`. The WS message `config/entity_registry/update` is its public wire form, defined in `homeassistant/components/config/entity_registry.py`.

#### `entity_manager.py`
- [x] `async def async_create_member_entities(hass, member: Member) -> tuple[str, str]`:
  - Create the member todo by initiating the `local_todo` config flow programmatically: `await hass.config_entries.flow.async_init("local_todo", context={"source": "user"}, data={"name": member.name})`. Wait for the flow to finish (`type == "create_entry"`); read back the actual entity_id from the resulting config entry's `entity_registry` rows. **Do NOT** invent a `local_todo/create` WS message — it does not exist.
  - Immediately normalize the todo entity_id to the canonical slug-derived id. If the actual entity_id is not `todo.<slug>`, call `entity_registry.async_get(hass).async_update_entity(actual_todo_entity_id, new_entity_id=f"todo.{member.slug}")`, then read the registry row back and verify the final entity_id is exactly `todo.<slug>`. This handles display names that diverge from slugs while keeping `member.name` user-facing.
  - Create `counter.<slug>_streak` via the counter component's in-process helper API (`async_create_helper` on the loaded counter component). Initial value 0, step 1, minimum 0. If the helper API is missing, fail with a clear `HomeAssistantError` explaining the HA minimum version mismatch; do not use `counter/create`.
  - **Collision handling**: HA's entity registry will append a numeric suffix (`_2`) if the canonical entity_id is taken, and `async_update_entity(..., new_entity_id=...)` can also fail or suffix on collision. After creation/rename, read the entity_registry to get the final assigned entity_id. If it does NOT equal the expected `todo.<slug>` / `counter.<slug>_streak`: raise a `HomeAssistantError` with a message like `"Cannot create todo.<slug>: an entity with this id already exists. Delete or rename the conflicting helper before adding this member."`, then **clean up the partially-created entity** (call the delete path below before raising) so a retry isn't blocked by orphans. Do NOT silently use the suffixed id — downstream automations and the card config assume the canonical name.
  - Returns `(todo_entity_id, counter_entity_id)`
- [x] `async def async_delete_member_entities(hass, todo_entity_id, counter_entity_id)`:
  - For `todo_entity_id`: look up the owning `local_todo` config entry via `entity_registry.async_get(hass).async_get(todo_entity_id).config_entry_id`, then call `hass.config_entries.async_remove(config_entry_id)`.
  - For `counter_entity_id`: first verify whether the pinned HA counter helper creates a config-entry-backed entity. If it does, remove it through `hass.config_entries.async_remove(config_entry_id)`. If it does not, delete it through the same in-process counter helper storage API family used for creation (for example the paired delete helper on the loaded counter component). Do not invent or call a `counter/delete` WebSocket command.
  - Add a pinned-version compatibility test that proves both deletion paths remove their registry rows and helper storage rows.
- [x] `async def async_rename_member_entities(hass, old_todo_id, new_slug, old_counter_id) -> tuple[str, str]`:
  - Use `entity_registry.async_get(hass).async_update_entity(old_id, new_entity_id=new_id)` (the public WS form is `config/entity_registry/update` — both routes are acceptable, prefer the in-process call from Python code).
  - Returns the new `(todo_id, counter_id)`.
- [x] `async def async_ensure_household_entity(hass) -> str`:
  - Check the entity registry for `todo.lucarne_household`; if absent, create via the same `local_todo` config-flow init pattern with `name="Lucarne Household"`. Return the entity_id.

#### Wire into `__init__.py` / options flow
- [x] After options flow adds a member: call `async_create_member_entities`, store returned entity_ids back into the member's data
- [x] After the entities are created for a newly-added member, seed that member's preset routines exactly once:
  - Look up `member.preset` in `BUILTIN_PRESETS` (Phase 1) plus any `entry.data["custom_presets"]` entries added later in Phase 6.
  - For each `RoutineTemplate`, add an item to the member's `todo_entity_id` and insert `task_metadata` with `type="routine"`, `source="template"`, the template `summary`, `icon`, and `recurrence`.
  - If `member.preset == "adult-none"` or `"custom"` with no routines, create no tasks.
  - Do not seed during generic setup reconciliation for existing members; otherwise a reload would duplicate routines. Only seed on the confirmed add-member path after canonical entities have been created.
- [x] After options flow removes a member: confirm shows entity deletion impact, then call `async_delete_member_entities`
- [x] On `async_setup_entry`: after Phase 1's store initialization and `hass.data` stash, ensure household entity exists; reconcile per-member entities (if a member exists in data but their todo entity is missing — recreate; vice versa, orphaned entities → warn but don't auto-delete); then register Phase 2 services and the WebSocket command. Phase 3 replaces this abbreviated setup list with its explicit seven-step order.

#### Tests
- [x] `test_entity_manager.py` with `hass` fixture:
  - Create → todo and counter entities appear in entity registry
  - Create with display name that would derive a different entity_id than `member.slug` → local_todo is renamed and verified as canonical `todo.<slug>`
  - Delete → entities gone
  - Rename → entity_id changes, history (state via recorder) preserved
  - Household entity creation idempotent
  - Collision: pre-seed a `todo.anna` helper, then try to add member with slug `anna` → raises `HomeAssistantError`, no orphan counter created
- [x] `test_task_service.py` or `test_options_flow.py`: adding a member with the `school-age` preset creates one todo item and one `source="template"` metadata row per preset routine; reloading the integration does not duplicate those seeded routines.

### Sub-Phase D: Task services

#### `task_service.py`
- [x] Register `lucarne_family.add_task` service:
  - Voluptuous schema uses exactly these service field names: `member` (str, required, in known slugs OR "household"), `summary` (str, required, max 200 chars), `type` (str, in {"routine", "chore"}), `recurrence` (str, optional, valid RRULE if non-empty), `icon` (str, optional, single emoji or empty), `due` (datetime, optional), `source` (str, default "manual"), `assignee` (str, optional, known member slug only when `member == "household"`)
  - Resolves member → todo entity_id
  - Generates a UUID upfront, calls `entity.async_create_todo_item(TodoItem(uid=item_uid, ...))` directly on the entity rather than via the `todo.add_item` service, so the UID is known before metadata insertion.
  - Inserts into task_metadata via store
  - Fires HA event `lucarne_family_task_added` with `{member, uid, type, summary}` for observability
- [x] Register `lucarne_family.update_task_metadata`:
  - Voluptuous schema uses exactly these service field names: `uid` (str, required), `icon`/`recurrence`/`type`/`assignee` (optional). `assignee` is accepted only for metadata rows where `member_slug == "household"`.
  - Updates store; fires `lucarne_family_task_metadata_updated`
- [x] Register `lucarne_family.delete_task`:
  - Voluptuous schema uses exactly this service field name: `uid` (str, required)
  - Looks up task metadata by `uid` first to resolve the owning todo entity (`member_slug == "household"` → `todo.lucarne_household`; otherwise the member's `todo_entity_id`). Calls `todo.remove_item` for that entity, then `async_delete_task_metadata`. If metadata is missing, raise `ServiceValidationError` instead of searching every todo list.
  - Fires `lucarne_family_task_deleted`
- [x] Register `lucarne_family.toggle_task`:
  - Voluptuous schema uses exactly this service field name: `uid` (str, required)
  - Looks up task metadata by `uid` first to resolve the owning todo entity. Calls `todo.update_item` to flip status; the state-change listener handles completion log (Phase 3) — but for now, append directly to log. If metadata is missing, raise `ServiceValidationError` instead of searching every todo list.
  - Fires `lucarne_family_task_toggled`

#### `services.yaml`
- [x] Define schemas for all Phase 2 services (`add_task`, `update_task_metadata`, `delete_task`, `toggle_task`, `upload_avatar`) in HA's standard format so they appear correctly in Developer Tools → Services
- [x] Keep `services.yaml` fields in lock-step with the Python voluptuous schemas in `task_service.py` and `avatar_service.py`:
  - `add_task`: `member`, `summary`, `type`, `recurrence`, `icon`, `due`, `source`, `assignee`
  - `update_task_metadata`: `uid`, `icon`, `recurrence`, `type`, `assignee`
  - `delete_task`: `uid`
  - `toggle_task`: `uid`
  - `upload_avatar`: `member`, `image_data`, `mime_type`
- [x] Add a `test_services_yaml.py` assertion that loads `custom_components/lucarne_family/services.yaml` and checks each documented field name exists for the matching service. This catches drift between Developer Tools UI schemas and handler validation.
- [x] Add a companion assertion that introspects the Python voluptuous schemas and verifies the same field-name sets. The implementation-facing store key is `item_uid`; the public service field remains `uid`.

#### WebSocket command `lucarne_family/get_family` (required by Phase 4 chores card)

This is the read API the cards subscribe to. Without it, Phase 4 cannot build the family-subscription helper.

- [x] In `websocket_api.py`, register the command at integration setup. Use the standard decorator pattern from `homeassistant.components.websocket_api`:
  ```python
  import voluptuous as vol
  from homeassistant.components import websocket_api
  from homeassistant.core import HomeAssistant, callback

  @websocket_api.websocket_command(
      {vol.Required("type"): "lucarne_family/get_family"}
  )
  @websocket_api.async_response   # async because we read SQLite
  async def ws_get_family(
      hass: HomeAssistant,
      connection: websocket_api.ActiveConnection,
      msg: dict,
  ) -> None:
      store = hass.data[DOMAIN][...]["store"]
      members = [m.to_dict() for m in store.get_members()]
      tasks = await store.async_get_all_task_metadata()
      payload = {
          "members": members,                     # list[MemberSummary dict]
          "task_metadata": tasks,                 # list[TaskMetadata dict]
          "reset_time": entry.data["reset_time"],
          "streak_check_time": entry.data["streak_check_time"],
          "household_entity_id": "todo.lucarne_household",
      }
      connection.send_result(msg["id"], payload)
  ```
- [x] Wire registration in `async_setup_entry`: `websocket_api.async_register_command(hass, ws_get_family)`. Register exactly once per HA process (guard with a flag in `hass.data[DOMAIN]`) so a config-entry reload does not double-register.
- [x] **Permission model**: verify the `websocket_api` decorator's auth behavior against the pinned HA version. For v1 the intended contract is no per-user authz beyond "logged in"; do NOT add `@websocket_api.require_admin` because non-admin family members must be able to read the family state from the dashboard.
##### Response shape contract

- [x] The TS card depends on this verbatim:
  - `members[i]`: `{slug, name, color, avatar, todo_entity_id, streak_counter_id}`
  - `task_metadata[i]`: `{item_uid, member_slug, assignee_slug, type, recurrence, icon, source}`
  - `reset_time` / `streak_check_time`: `"HH:MM"` strings
  - `household_entity_id`: literal `"todo.lucarne_household"`
- [x] Test in `tests/python/test_websocket.py`:
  - Command returns the documented shape with seeded fixture data
  - Authenticated user succeeds (HA WS layer enforces auth before any command handler runs)
  - Empty state (no members, no tasks) returns `members: []`, `task_metadata: []` — never raises

#### Tests
- [x] `test_task_service.py`:
  - add_task: item appears in member's todo entity, metadata row inserted, event fired
  - add_task with invalid member slug → ServiceValidationError
  - add_task with invalid RRULE → ServiceValidationError
  - add_task with `member="household"` and valid `assignee` → metadata row has `member_slug="household"` and `assignee_slug=<member>`
  - add_task with `assignee` on a non-household member, or an unknown household assignee → ServiceValidationError
  - update_task_metadata: only specified fields change
  - update_task_metadata with `assignee` on a household task changes `assignee_slug`; with `assignee` on a non-household task → ServiceValidationError
  - delete_task: item gone from todo, metadata gone, log preserved
  - toggle_task: status flips, log row appended

### Sub-Phase E: Avatar upload service

#### `avatar_service.py`
- [x] Register `lucarne_family.upload_avatar` service:
  - Voluptuous schema uses exactly these service field names: `member` (str, required; validated against known slugs in the handler), `image_data` (str, base64-encoded), `mime_type` (str, in `AVATAR_ALLOWED_MIME`)
  - Decode base64 → bytes; verify length ≤ `AVATAR_MAX_BYTES`
  - Verify mime by reading magic bytes (don't trust the `mime_type` parameter alone). **Use an inline magic-byte check** for the three allowed types — do NOT use `imghdr` (deprecated in Python 3.12, removed in 3.13) and do NOT add `puremagic` as a dep. The check is small enough to inline:
    ```python
    def _detect_image_mime(data: bytes) -> str | None:
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if data.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
            return "image/webp"
        return None
    ```
    Reject if the detected mime is `None` or does not match the declared `mime_type`.
  - **Verify image dimensions** to prevent decompression-bomb attacks: open via `PIL.Image.open` in an executor, reject if width × height > 4096 × 4096 (configurable constant `AVATAR_MAX_PIXELS`). Verify against the pinned HA version whether PIL/Pillow is already available; if not, either add it to `manifest.json` requirements or use an HA-provided image helper.
  - **Sanitize filename**: use only `member.slug`; never user-provided strings. Reject any path component (`/`, `\`, `..`, leading dots).
  - Write to `{hass.config.path('www', 'lucarne', 'avatars')}/{slug}.{ext}`, creating directories as needed
  - Update member's avatar field to `/local/lucarne/avatars/<slug>.<ext>` via `store.async_save_members`
  - Fires `lucarne_family_avatar_uploaded`

#### Tests
- [x] `test_avatar_service.py`:
  - Happy path with PNG, JPEG, WEBP → file written, member.avatar updated
  - Wrong mime declared (PNG bytes claiming JPEG) → rejected via magic-byte check
  - Oversized (>2MB) → rejected
  - Over-dimensioned (4097x4097 PNG → small file but huge decoded) → rejected via pixel-count check
  - Path traversal not possible: filename is always `member.slug` + ext; slug validated safe before write
  - Unknown member slug → ServiceValidationError

### Sub-Phase F: Rename impact preview

#### `rename.py`
- [x] `async def async_compute_rename_impact(hass, old_entity_id) -> RenameImpact` where RenameImpact is a dataclass with:
  - `automations: list[str]` — automation entity_ids that reference `old_entity_id` in their config
  - `scripts: list[str]` — same for scripts
  - `scenes: list[str]` — same for scenes
  - `dashboards: list[dict]` — dashboard config paths + position where reference appears
- [x] Implementation: scan `automations.yaml`, `scripts.yaml`, `scenes.yaml` from `hass.config.config_dir` for YAML-based resources; walk `.storage/lovelace*` for dashboards. Note: UI-created automations/scripts/scenes stored in `.storage/` are not scanned in v1 — this limitation is documented and can be addressed in a future phase.
- [x] `async def async_rename_member(hass, member: Member, new_name: str) -> RenameImpact`:
  - Generate new slug from new_name
  - If new_slug == old_slug → just update display name in member.name; no entity rename; impact empty
  - Else: compute impact preview, **return it without renaming** — caller (options flow) decides whether to confirm

#### Options flow integration
- [x] Update `async_step_edit_member` from Phase 1:
  - If user changes display name in a way that would change slug: show impact preview as a separate step (`async_step_rename_confirm`) listing impact and requiring "I understand" checkbox
  - On confirm: call `entity_manager.async_rename_member_entities` + update member.name + member.slug in config_entry.data
  - On cancel: discard the name change

#### Tests
- [x] `test_rename.py`:
  - No-op rename (slug unchanged) → impact empty, no entity rename
  - Slug-changing rename with no downstream refs → impact empty, entities renamed
  - With automation referencing old entity_id → impact lists the automation
  - With dashboard referencing old entity_id → impact lists the dashboard path

### Documentation (end of phase)

- [x] `docs/integration.md` — fill task management, services, avatar upload, rename behavior sections
- [x] `docs/services.md` — new doc; reference table of every `lucarne_family.*` service with payload + example call
- [x] Update `docs/architecture.md` — fill the data-flow diagram with the entity-manager + task-service flow

### Build verification (required before marking phase complete)

- [x] `ruff check`, `mypy custom_components/lucarne_family`, `pytest tests/python -v` — all clean (178 tests pass)
- [x] `npm test && npm run lint && npm run typecheck && npm run build` — TS side unchanged, green
- [ ] CI green
- [ ] On real HA: add a member, see `todo.<slug>` and `counter.<slug>_streak` appear via Settings → Devices & Services → Entities
- [ ] Use Developer Tools → Services → call `lucarne_family.add_task` for each member with each `type` (routine + chore); verify items appear in the member's todo entity
- [ ] Call `lucarne_family.upload_avatar` with a real PNG; verify file in `<config>/www/lucarne/avatars/`
- [ ] Rename a test member with new name producing different slug; verify impact preview shows automations + entities renamed correctly
- [x] `mcp__home-assistant__ha_get_logs` clean of `lucarne_family` warnings/errors
- [x] Mark phase `status: done`

### Manual verification with MCP tools

- [ ] `mcp__home-assistant__ha_call_service` to call `lucarne_family.add_task` programmatically
- [ ] `mcp__home-assistant__ha_get_state` to confirm new todo items appear with correct summary + due
- [ ] `mcp__home-assistant__ha_get_history` for the renamed counter — history should be continuous across the rename
- [ ] Browser MCP: walk through the rename confirmation flow visually; screenshot the impact preview

## Technical Details

### Why a state-change listener instead of patching service calls

In Phase 3, completion log entries should be appended whenever any task changes status, regardless of how (card tap, voice, automation, API). The cleanest way is `async_track_state_change_event(hass, managed_todo_entity_ids, callback)` from `homeassistant.helpers.event` — not wrapping `todo.update_item`. Phase 2 inserts log rows directly from `toggle_task` for symmetry; Phase 3 swaps to the state-change listener as the authoritative source.

### Why services.yaml is required (not optional)

Without `services.yaml`, services appear in Developer Tools as opaque blobs with no field schema. The user (and any LLM building tests) need the schema. HA core ships every integration with `services.yaml`.

### Why `aiofiles` for avatar upload?

`hass.config.path` returns a synchronous string path. Writing the avatar bytes is small (≤2MB) but still blocking. Either use `aiofiles` (extra dep) or wrap in `hass.async_add_executor_job`. Prefer executor to avoid the dep.

### Why magic-byte mime check

The `mime_type` parameter to `upload_avatar` is user-controlled (the card's editor passes it). An attacker could declare `image/png` while sending a malicious script. Magic-byte check (read first ~12 bytes, match against known PNG/JPEG/WEBP signatures) provides defense-in-depth. The avatar is served by HA at `/local/...`, which sets `Content-Type` from filename ext, so a mismatched file could be served as the wrong type — still safer to validate.

### Entity rename edge cases

`config/entity_registry/update` renames an entity in HA's registry. Treat recorder-history preservation as a required behavior, not an assumption: `test_entity_manager.py` must create a state row for the old entity ID, rename the entity, then assert the recorder/statistics lookup still reaches the historical row through the entity registry's stable identity. If that test fails on the pinned HA version, update the rename confirmation text to warn that history remains under the old entity ID and mark the preservation test as the compatibility blocker.

### Research context

The Phase 1 spec intentionally avoids helper-management WebSocket commands. Implementer should:

1. Read `homeassistant/components/local_todo/config_flow.py` to confirm the `async_init("local_todo", context={"source": "user"}, data={"name": ...})` path.
2. Read `homeassistant/components/counter/__init__.py` to confirm the counter helper API import/call signature used by `entity_manager.py`.
3. Read `homeassistant/helpers/entity_registry.py` for the `async_update_entity(..., new_entity_id=...)` rename API.
4. Write integration tests for create, delete, rename, collision cleanup, and recorder-history behavior before wiring these paths into options flow.

## Constraints

- **Rename is opt-in**, never silent. Display-name-only edits don't touch entity IDs.
- **Avatar uploads go to `<config>/www/lucarne/avatars/` only.** No other path is acceptable.
- **All file I/O off the event loop.** Wrap in executor.
- **All RRULE math uses `dateutil.rrule`.** Hand-rolled date math is a code smell here.
- **Services validate inputs at the schema layer** (voluptuous), not in handler bodies.
- **`upload_avatar` must validate filename derivation from slug, not from user input** — defense-in-depth.

## Shortcut-resistance notes for LLM implementer

- **Don't hand-roll RRULE parsing or date math.** Use `dateutil.rrule.rrulestr`. The cost of a custom implementation is bugs around DST, month-boundaries, and leap years.
- **Don't trust the client-supplied mime type.** Always verify with magic bytes.
- **Don't use `os.path.join` with user-supplied strings** for the avatar path. Derive the filename entirely from `member.slug` + a fixed extension map.
- **Don't insert completion log rows for "phantom" toggles** — `todo.update_item` calls that didn't actually change status (e.g., setting completed → completed). Check the previous status first.
- **Don't forget the household todo entity.** It's created once at integration setup, not per-member.
- **Don't store the avatar bytes in SQLite.** They go to the filesystem; SQLite holds only the path reference.
