---
status: done
---

# chores-card — Lucarne Family integration + chores card rewrite

> **Progress Tracking**: Update checkboxes in phase files as you complete tasks. Run `/spec-implement features/chores-card/phase-0-test-foundation.md` to begin implementation.

## Goal

Replace the current placeholder `lucarne-chores-card` with a family task management system built on a small custom Home Assistant integration (`custom_components/lucarne_family/`). The integration owns family members, task metadata, managed entities, and managed automations. Cards become thin views that consume integration state and call integration services. A non-technical parent can add a family member, pick a preset of routines, upload an avatar, and have working chore tracking without ever opening Settings → Helpers. The maintainer can rename a member in 2026 and have all underlying entity IDs renamed in lock-step, with downstream impact preview.

## Why this exists

The current `lucarne-chores-card` is a placeholder. Configuring it requires:
1. Manually creating one `input_boolean.*` per chore per family member in Settings → Helpers
2. Manually creating one `counter.*` per member for streak tracking
3. Manually editing the `lucarne_chores_daily_reset` blueprint instance with a comma-separated list of entity IDs (re-edit on every chore add/remove)
4. Manually editing the `lucarne_chores_streak_advance` blueprint instance with a JSON array of member configs
5. Picking an inscrutable URL for each member's avatar (no upload UI)

Calendars are configured twice (Today + Calendar cards), proving that per-card config doesn't scale. This spec extracts shared family state into a config entry owned by a new integration.

The model is also broadened to cover **household chores** (e.g. "wash towels every Monday", "clean dryer vents every 6 months") not just members' daily routines. Apple Reminders synced via the existing bridge feed the same surface, with metadata that the integration uses to decide where each item appears.

## Concepts

### Family member

A family member tracked by the integration. Can be a child (column in chores card) or an adult (column or summary). Each member has:

- `slug` — lowercase identifier (`anna`, `ingrid`); set at creation, used in entity IDs, and changed only by the explicit Phase 2 rename flow with downstream-impact confirmation
- `name` — display name (`Anna`, `Ingrid`); free to change
- `color` — hex color for visual identification (e.g. `#f5c89c`)
- `avatar` — either an emoji (`🧒`) or a relative path under `/local/lucarne/avatars/`
- `todo_entity_id` — `todo.<slug>` (managed by integration)
- `streak_counter_id` — `counter.<slug>_streak` (managed)

Stored in the integration's `config_entry.data["members"]` so HA's Configure dialog can render and edit them.

### Task

A todo item that lives in a member's `todo.<slug>` entity (or `todo.lucarne_household`). Every task has integration-owned metadata (stored in SQLite, keyed by the item's `uid`):

- `type` — `routine` (daily habit) or `chore` (one-off / weekly / monthly / longer)
- `recurrence` — RRULE string, or empty for one-off
- `icon` — emoji shown on the card row
- `source` — `manual`, `template`, or `apple` (synced from Apple Reminders)
- `apple_uid` — set when `source == "apple"`; used for round-trip
- `assignee_slug` — for items in `todo.lucarne_household`, the member responsible (or empty for unassigned)

The standard HA `TodoItem` fields (`summary`, `due`, `status`, `description`) carry the user-facing content. Sentinels in the description field (e.g. `[apple:UUID]`) are tolerated for compatibility with the existing Reminders bridge, but the integration prefers its own SQLite metadata.

### Routine vs Chore (Skylight-inspired distinction)

- **Routine** — a daily habit ("brush teeth", "make bed"). `type == "routine"` and `recurrence == "FREQ=DAILY"`. Soft-reset to `needs_action` at the configured reset time (default 04:00). Listed in the routines section of a member's column.
- **Chore** — one-off or longer-interval task ("schedule dentist", "wash towels weekly", "clean dryer vents every 6 months"). `type == "chore"`. Recurrence varies (none, weekly-by-day, monthly, yearly, with INTERVAL). Listed in the tasks section of a member's column (when due today or overdue) or in the today card's household pane.

### Completion history

Every status change (needs_action → completed, or undone) is appended to the integration's SQLite `completion_log` table with `{timestamp, member_slug, item_uid, summary, action, recurrence_at_time}`. This is the foundation for future rewards/stars work and is the authoritative source for streak computation. `counter.<slug>_streak` is only a derived mirror: the streak-check automation recomputes streaks from `completion_log`, writes the latest value to the counter, and leaves the counter queryable from external automations.

### Managed entities

The integration creates, owns, and lifecycle-manages these entities. Users should not edit them directly:

- `todo.<member_slug>` — one per family member
- `todo.lucarne_household` — single shared list
- `counter.<member_slug>_streak` — one per member

When a member is added, the integration creates the member todo by starting the `local_todo` config flow in-process, immediately normalizes the entity registry row to `todo.<slug>`, and creates `counter.<slug>_streak` through the counter helper API defined in Phase 2. When renamed, entities are renamed via `entity_registry.async_update_entity(..., new_entity_id=...)`. When removed, the integration resolves each entity's owning config entry and removes that entry with `hass.config_entries.async_remove(...)` after showing a confirmation.

> Verify the `local_todo`, `counter`, entity-registry rename, and config-entry removal APIs against the pinned Home Assistant version before implementing. Phase 2 tests are the compatibility gate for these helper paths.

### Managed automations

The integration writes/updates two HA automations and keeps them in sync with config changes. They are persisted as standard HA automations (so users can see them in Settings → Automations) but are owned by the integration — re-writing them on every config change.

- `automation.lucarne_daily_reset` (alias `Lucarne Daily Reset`, internal id `lucarne_family_daily_reset`) — at the configured reset time, for each member, flips status of all `type=routine` items from `completed` → `needs_action`, then appends `reset` events to the completion log.
- `automation.lucarne_streak_check` (alias `Lucarne Streak Check`, internal id `lucarne_family_streak_check`) — at the configured streak check time (default 21:00), for each member, recomputes the streak from `completion_log` and writes the resulting mirror value to `counter.<slug>_streak`.
- (Designed-for, deferred) Apple writeback — when a task with `source == "apple"` flips to `completed`, Phase 6 fires the HA event `lucarne_family_apple_writeback_requested`. A future spec subscribes to that event and performs the webhook POST.

> Verify automation entity-id derivation against the pinned Home Assistant version. The intended contract is that `automation.lucarne_daily_reset` / `automation.lucarne_streak_check` stay stable; Phase 3 must read back the entity registry after writing and fail loudly on suffixes.

The existing blueprints (`lucarne_chores_daily_reset`, `lucarne_chores_streak_advance`) are retired by this work.

### Reminders round-trip (designed, not built)

The integration reserves config fields and storage columns for round-trip writeback to Apple Reminders via a generic "sync device" webhook (not Mac mini-specific). This spec does **not** POST to the webhook. Phase 6 only fires `lucarne_family_apple_writeback_requested` with `{apple_uid, status, timestamp, device_name}` and exposes `get_round_trip_config(hass)` for a future subscriber to retrieve `webhook_url` and `secret`. The future spec performs the POST with an HMAC signature and the receiving device flips the corresponding Apple Reminder.

## Requirements

### Integration foundation

- New `custom_components/lucarne_family/` Python package
- Config flow at Settings → Devices & Services → Add Integration → Lucarne Family
- Single config entry per family (multi-family deferred)
- Storage versioning via `config_entry.version` and SQLite schema migrations
- All async patterns; no blocking I/O on the HA event loop
- Python deps: `python-dateutil` (used for RRULE; verify whether the pinned HA version already provides it before deciding whether to list it in `manifest.json`)

### Family member management

- Add/edit/remove members via Options Flow
- Member fields: name, color, avatar (emoji OR uploaded image), routine preset
- Built-in routine presets: `School-age kid`, `Toddler`, `Adult (none)`, `Custom`
- Rename a member → renames `todo.<slug>` and `counter.<slug>_streak` via entity_registry; shows downstream-impact preview (list of automations / scripts / dashboards referencing the old IDs) and requires user confirmation
- Remove a member → confirmation dialog shows what gets deleted (todo entity, counter, all tasks, history rows); destructive, cannot be undone

### Task model & services

- Service `lucarne_family.add_task(member, summary, type, recurrence, icon, due, source, assignee)` — adds an item to the member's todo list and records metadata; `assignee` is optional and only applies to household tasks
- Service `lucarne_family.update_task_metadata(uid, **fields)` — updates icon, recurrence, type, etc.
- Service `lucarne_family.delete_task(uid)` — removes from todo + metadata + leaves completion history intact
- Service `lucarne_family.toggle_task(uid)` — flips todo status and records the Phase 2 direct completion-log row until Phase 3's state-change listener becomes authoritative
- Service `lucarne_family.upload_avatar(member, image_data)` — copies image to `/local/lucarne/avatars/<slug>.<ext>` and updates member config
- All services exposed via standard HA service registry (visible in Developer Tools → Services)

### Recurrence (using python-dateutil)

- v1 UI supports: daily, weekly (multi-select days, with INTERVAL), monthly (by date or by Nth weekday, with INTERVAL), yearly (with INTERVAL)
- Stored as RRULE strings (e.g. `FREQ=MONTHLY;INTERVAL=6` for "every 6 months")
- Integration uses `dateutil.rrule` to compute next-due times; never hand-rolls date math
- Test cases include: every day, every Monday/Wednesday/Friday, first Saturday of month, every 6 months, every year on March 15

### Routine reset & streak

- Configurable reset time (default `04:00`); soft-reset (`status: needs_action`)
- Reset writes `reset` rows to the completion log (so the log shows the day boundary)
- Streak check time configurable (default `21:00`); recomputes each member's streak from `completion_log` and updates the derived `counter.<slug>_streak` mirror
- Both automations are auto-rewritten on any config change

### Chores card rewrite (in-place, breaking config change)

- New config schema:
  ```yaml
  type: custom:lucarne-chores-card
  title: Chores      # optional, default "Chores"
  members:           # subset of integration's members to display
    - anna
    - ben
    - household       # special slug for the shared todo.lucarne_household
  show_routines: true     # default true
  show_tasks: true        # default true
  show_streak: true       # default true; auto-false if member is an adult
  ```
- Card subscribes to each member's todo entity via WebSocket
- Per-member column shows: avatar, name, today's routines (with checkmarks), today's tasks (with checkmarks), streak (if applicable)
- "+ Add task" button in column header opens a popover (reusing `create-event-popover` overlay pattern). Popover collects summary, type, icon, recurrence, due date → calls `lucarne_family.add_task` service
- Tap a row to toggle complete (calls `todo.update_item`)
- Long-press a row to edit (opens popover prefilled) or delete
- Card editor shows: title field, multi-select member picker (populated from integration), display toggles
- Old YAML config (with `kids:` array) renders an error block with link to integration setup

### Today card update

- Today card reads `todo.lucarne_household` for the household tasks pane
- Today card reads per-member streak counters and surfaces a "ready for the day" pill if all displayed members' routines are done
- Today card editor adds optional `household_tasks_from_integration: true` and `show_family_ready_pill: true` toggles
- Existing `tasks: todo.ingrid_tasks` config still works (read raw todo entity, no metadata interpretation)

### Apple Reminders bridge compatibility

- The existing `lucarne_reminders_sync` blueprint continues to upsert items into `local_todo` entities, including the new `todo.<member_slug>` entities the integration creates
- When the bridge syncs an item, the integration's add/update hook (a state-change listener) inspects the item's description, extracts `[apple:UUID]` if present, and writes a `source=apple` metadata row
- Items with `[apple:UUID]` keep the sentinel in description for round-trip compatibility; integration metadata is supplementary

### Authorization

- All integration services use HA's built-in service permission model
- File upload service validates: max 2MB, MIME type in `{image/png, image/jpeg, image/webp}`, filename sanitized to `<slug>.<ext>`
- No authorization beyond HA's user auth (same trust boundary as Settings → Helpers)

## Phases

| Phase | Title | Description |
|-------|-------|-------------|
| 0 | Test foundation & Python tooling | Set up `pyproject.toml`, pytest, ruff, `pytest-homeassistant-custom-component`, CI changes (matrix TS + Python). Extend the existing `node:test` harness with a Lit-component smoke test placeholder for cards. No production code. |
| 1 | Integration scaffold + config flow + people | Create `custom_components/lucarne_family/`, manifest, config flow, options flow, storage (config_entry + SQLite with schema versioning). Add/edit/remove members. No tasks or entities yet. |
| 2 | Managed entities + task model + services | Member add creates `todo.<slug>` + `counter.<slug>_streak`. SQLite tables for task_metadata + completion_log. Services: add_task, update_task_metadata, delete_task, toggle_task, upload_avatar. WebSocket read command `lucarne_family/get_family` (used by Phase 4 cards). Recurrence engine (`dateutil.rrule`). Rename with downstream-impact preview. |
| 3 | Managed automations | Integration writes/updates `automation.lucarne_daily_reset` and `automation.lucarne_streak_check`. Retire the old chores blueprints. State-change listener that backfills metadata from `[apple:UUID]` sentinels when the bridge syncs new items. |
| 4 | Chores card rewrite | Replace `lucarne-chores-card` and its editor. New config schema. Per-member columns with routines + tasks sections. "+ Add task" popover wired to `lucarne_family.add_task`. Long-press edit/delete. Card subscribes to integration state. |
| 5 | Today card update + docs | Today card reads household tasks + per-member streaks. Update README, docs/architecture.md, docs/events.md. Write CLAUDE.md. Update bridge/README.md to reflect new entity names. |
| 6 | Polish & designed-for round-trip | Avatar upload UX polish. Default-template editor in Options Flow. Reserved config fields and storage columns for round-trip Reminders writeback. Documented round-trip protocol in docs/reminders-bridge.md. Build verification across all phases. |

## Related Documentation

- [Phase 0: Test foundation & Python tooling](./phase-0-test-foundation.md)
- [Phase 1: Integration scaffold + config flow + people](./phase-1-integration-foundation.md)
- [Phase 2: Managed entities + task model + services](./phase-2-task-model.md)
- [Phase 3: Managed automations](./phase-3-managed-automations.md)
- [Phase 4: Chores card rewrite](./phase-4-chores-card.md)
- [Phase 5: Today card update + docs](./phase-5-today-card-docs.md)
- [Phase 6: Polish & designed-for round-trip](./phase-6-polish-roundtrip.md)
- [HA architecture doc (existing)](../../docs/architecture.md)
- [Reminders bridge (existing)](../../bridge/README.md)
- [Events (existing)](../../docs/events.md)

## Testing Tools

> Discovered during spec creation. Use these for manual verification after automated tests pass.

| MCP Server | Tool Prefix | Use For |
|---|---|---|
| Home Assistant | `mcp__home-assistant__*` | Read/write helpers, fire services, check entity state, inspect logs in the real HA instance at host `ha-vm`. Use `ha_get_state`, `ha_call_service`, `ha_get_logs`, `ha_eval_template`, `ha_config_list_helpers`. Especially valuable for verifying the integration's managed entities and managed automations after Phase 3. |
| Browser MCP | `mcp__browsermcp__*` | Manual UI verification of cards in the live HA dashboard. Use `browser_navigate`, `browser_screenshot`, `browser_click` to validate the chores card popover, member picker, and end-to-end flows. |

**IMPORTANT for implementers**: The user has a deploy script (`scripts/deploy.sh`) that scp's `dist/` to `ha-vm:/homeassistant/www/lucarne/`. Cards must be deployed via this path. The custom integration deploys to `ha-vm:/homeassistant/custom_components/lucarne_family/` — extend the deploy script (or add `scripts/deploy-integration.sh`) before Phase 1 ships.

## Logging & Diagnostics

> Discovered during spec creation. Check these after every test run and build — a zero exit code does not mean clean output.

| Log Source | Location | Format | What to Check |
|---|---|---|---|
| HA core logs (live instance) | via `mcp__home-assistant__ha_get_logs` | Structured (JSON-ish) | After deploying integration: filter for `custom_components.lucarne_family` — verify no `ERROR` or `WARNING` rows during setup, member add, automation rewrite. |
| Vitest / node:test runs | Console (rtk-compacted) | Plain | Any test marked `skip` or `todo` must be intentional. Stack traces from `unhandled rejection` indicate Lit render bugs in the cards. |
| pytest runs | Console (no current compaction) | Plain | Deprecation warnings from `pytest-homeassistant-custom-component` are tolerable; from our integration code are not. The `filterwarnings` config in `pyproject.toml` already escalates `DeprecationWarning` originating from `custom_components.lucarne_family` to errors (set in Phase 0). |
| HA automation traces | `Developer Tools → Traces → automation.lucarne_*` | HA UI / WS API | After Phase 3: every triggered run of `lucarne_daily_reset` / `lucarne_streak_check` should succeed with no `system_log.write` warnings. |

## Access Control

> Discovered during spec creation. Update rules alongside application code — never ship data model changes without corresponding rule updates.

- **System**: Home Assistant's built-in user / service authentication. No external rule system.
- **Rule files**: None (HA service permissions are configured per-user via the UI, not files).
- **Rule tests**: None. Integration tests should cover service schema validation and any explicit admin-only paths if one is added later.
- **Current patterns**: Most HA integrations expose services with no per-user authz beyond "authenticated user". This integration follows that: any authenticated user can call `lucarne_family.add_task`, etc.
- **Deployment**: N/A (no rule deployment step).

**Special concern**: The avatar upload service writes to `<config>/www/lucarne/avatars/`. The integration must validate filename and reject path-traversal attempts (anything containing `..`, `/`, `\`). Tests must cover the path-traversal cases.

## Constraints & non-goals

- **Single family only** in v1 — multi-family is deferred. Hardcoded assumption that one config entry exists.
- **No rewards/stars/redemption** in v1 — completion log captures data for future rewards, but no UI or redemption logic.
- **No round-trip Reminders writeback** in v1 — designed for, not built. Spec must reserve the config fields and storage columns.
- **No migration from old chores card config** — pre-1.0 release, clean break. Old YAML configs render a helpful error pointing to integration setup.
- **iPad landscape (1080×810 @ 200% zoom)** is the primary target — all visual changes verified at that breakpoint first.
- **Cards must remain bundled in a single ESM** — `dist/ha-lucarne.js`. No code-splitting; HACS Frontend distribution expects single-file.
- **Integration must work without the cards** — if a user installs only the integration, services and entities still function; only the chores card UI is missing.

## Glossary

- **HACS** — Home Assistant Community Store. The plugin manager that distributes both this card pack and (after this spec) the integration.
- **Config entry** — HA's container for an integration's configuration. Stored in `<config>/.storage/core.config_entries`.
- **Options flow** — HA's reconfiguration UI for an existing config entry. The button labeled "Configure" on the integration's card in Settings → Devices & Services.
- **`local_todo`** — HA's built-in todo list integration backed by an in-config `.ics` file. The entity domain we manage per-member.
- **RRULE** — iCalendar recurrence rule string (RFC 5545). Library: `python-dateutil.rrule`.
- **pytest-homeassistant-custom-component** — Maintained by HA core; provides fixtures (`hass`, `enable_custom_integrations`, etc.) for integration testing.
