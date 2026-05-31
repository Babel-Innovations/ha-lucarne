---
status: done
---

# Phase 1: Integration scaffold + config flow + people

Build the `lucarne_family` integration's foundation: config flow, options flow, storage (config_entry + SQLite skeleton), and family-member CRUD. By end of phase, a user can install the integration from Add Integration, add members with names + colors + avatars + presets, and edit/remove them. **No HA entities are created yet** (that's Phase 2). No tasks. No automations. Just member metadata.

## Context

Phase 0 stubbed `__init__.py` and `manifest.json`. This phase fleshes them out: implement `async_setup_entry`, define the config flow (with the schema-builder pattern that HA's developer docs recommend), wire the options flow, and initialize the SQLite database with the `schema_version` table for future migrations.

The user pattern for the integration is: install once, then use Options Flow ("Configure" button) for ongoing edits. The config flow itself only runs once and collects the family name.

Read [./README.md](./README.md) for overall feature context. Read Phase 0 verification steps to confirm the harness works.

## Structure

```
custom_components/lucarne_family/
  __init__.py                     # update: async_setup_entry, async_unload_entry, hass.data setup
  manifest.json                   # update: config_flow = true
  config_flow.py                  # new: ConfigFlow + OptionsFlow
  const.py                        # new: DOMAIN, STORAGE_VERSION, default times, preset definitions
  store.py                        # new: thin wrapper around sqlite3 + config_entry.data
  models.py                       # new: dataclasses for Member, RoutinePreset
  presets.py                      # new: built-in routine preset definitions
  schema.sql                      # new: SQLite DDL (loaded at integration setup)
  strings.json                    # new: HA-translated UI strings for config flow
  translations/                   # new
    en.json                       # new: English translations
tests/python/
  test_const.py                  # new
  test_models.py                 # new
  test_config_flow.py             # new
  test_store.py                   # new
  test_options_flow.py            # new
  test_presets.py                 # new
  fixtures/
    sample_members.py             # new: pytest fixtures for member data
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline verification (before starting)

- [x] Run `pytest tests/python` — Phase 0 smoke test passes
- [x] Run `npm test && npm run lint && npm run typecheck && npm run build` — TS side green
- [x] If any baseline fails, fix and commit separately before proceeding

### Sub-Phase A: Constants, models, presets

#### `const.py`
- [x] Define: `DOMAIN = "lucarne_family"`, `STORAGE_VERSION = 1`, `DEFAULT_RESET_TIME = "04:00"`, `DEFAULT_STREAK_CHECK_TIME = "21:00"`
- [x] Define: `CONF_FAMILY_NAME`, `CONF_MEMBERS`, `CONF_RESET_TIME`, `CONF_STREAK_CHECK_TIME`, `CONF_ROUND_TRIP`, `CONF_ROUND_TRIP_ENABLED`, `CONF_ROUND_TRIP_WEBHOOK_URL`, `CONF_ROUND_TRIP_SECRET`, `CONF_ROUND_TRIP_DEVICE_NAME` (round-trip keys reserved for Phase 6; declared now so the config-entry shape is stable)
- [x] Define preset slugs: `PRESET_SCHOOL_AGE`, `PRESET_TODDLER`, `PRESET_ADULT_NONE`, `PRESET_CUSTOM`
- [x] Define avatar constraints: `AVATAR_MAX_BYTES = 2 * 1024 * 1024`, `AVATAR_MAX_PIXELS = 4096 * 4096`, `AVATAR_ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}`

#### `models.py`
- [x] `@dataclass(frozen=True, slots=True) class Member` with fields: `slug: str`, `name: str`, `color: str`, `avatar: str | None`, `created_at: datetime`, `preset: str`, `todo_entity_id: str = ""`, `streak_counter_id: str = ""` (the latter two stay empty in Phase 1; populated in Phase 2 when entity_manager creates the entities)
- [x] `@dataclass(frozen=True, slots=True) class RoutinePreset` with fields: `slug: str`, `display_name: str`, `routines: list[RoutineTemplate]`
- [x] `@dataclass(frozen=True, slots=True) class RoutineTemplate` with fields: `summary: str`, `icon: str`, `recurrence: str` (RRULE)
- [x] `to_dict()` / `from_dict()` for each — serialization is what gets stored in `config_entry.data`

#### `presets.py`
- [x] Define `BUILTIN_PRESETS: dict[str, RoutinePreset]` with at least the 3 named presets:
  - `school-age`: brush teeth (`🪥`, daily), make bed (`🛏️`, daily), pack school bag (`🎒`, daily on school days `MO,TU,WE,TH,FR`), kindness act (`💗`, daily), screen time off (`📵`, daily)
  - `toddler`: brush teeth (`🪥`, daily), get dressed (`👕`, daily), put toys away (`🧸`, daily)
  - `adult-none`: empty list (adults often only need household chores)
- [x] Test in `tests/python/test_presets.py`: each preset's RRULE parses with `dateutil.rrule.rrulestr`

### Sub-Phase B: SQLite schema + store

#### `schema.sql`
- [x] Define tables (Phase 1 only creates the empty tables — Phases 2+ populate):
  ```sql
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS task_metadata (
    item_uid TEXT PRIMARY KEY NOT NULL,
    member_slug TEXT NOT NULL,
    assignee_slug TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('routine','chore')),
    recurrence TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','template','apple')),
    apple_uid TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_task_metadata_member ON task_metadata(member_slug);
  CREATE TABLE IF NOT EXISTS completion_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    member_slug TEXT NOT NULL,
    item_uid TEXT NOT NULL,
    summary TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('completed','undone','reset')),
    recurrence_at_time TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_completion_log_member_ts ON completion_log(member_slug, timestamp DESC);
  ```

#### `store.py`
- [x] Class `LucarneFamilyStore` initialized with `(hass, entry_id, db_path)`
- [x] `async def async_init()` — opens SQLite and applies `schema.sql` by wrapping all stdlib `sqlite3` and file-read work in `hass.async_add_executor_job`. **No direct `sqlite3.connect`, cursor execution, or `Path.read_text()` on the event loop.** Do not add `aiosqlite` in Phase 1; keeping stdlib SQLite avoids a new runtime dependency.
- [x] `async def async_migrate(from_version, to_version)` — stub for Phase 2+ migrations. In Phase 1, only version 1 exists.
- [x] `def get_members() -> list[Member]` — returns from `config_entry.data["members"]` (NOT from SQLite — config_entry is the source of truth for member metadata)
- [x] `async def async_save_members(members: list[Member])` — updates `config_entry.data["members"]` via `hass.config_entries.async_update_entry`
- [x] **Member storage location is `config_entry.data`, NOT SQLite.** SQLite is for task_metadata + completion_log only.

#### Tests
- [x] `test_const.py`: required constants exist and default times / avatar limits match the spec
- [x] `test_models.py`: dataclass `to_dict()` / `from_dict()` round-trip for `Member`, `RoutinePreset`, and `RoutineTemplate`
- [x] `test_store.py`: init creates schema, schema_version row present, idempotent on re-init
- [x] `test_store.py`: get_members returns empty list initially, save_members → get_members round-trip preserves all fields
- [x] Use `pytest_homeassistant_custom_component.common.MockConfigEntry` for the config_entry fixture

### Sub-Phase C: Config flow (first-time setup)

#### `config_flow.py` — ConfigFlow
- [x] Class `LucarneFamilyConfigFlow(config_entries.ConfigFlow, domain=DOMAIN)`, `VERSION = 1`
- [x] `async def async_step_user(user_input)`:
  - First step: prompt for `family_name` (text, default "Family"). Validation: non-empty, < 50 chars.
  - On submit, check `_async_current_entries()` — reject if any entry exists (single-family v1 constraint). Show error `single_family_only`.
  - Create entry with `title=family_name`, `data={"family_name": ..., "members": [], "reset_time": DEFAULT_RESET_TIME, "streak_check_time": DEFAULT_STREAK_CHECK_TIME, "round_trip": {"enabled": false, "webhook_url": "", "secret": "", "device_name": "Sync device"}, "custom_presets": []}`.
- [x] Test in `test_config_flow.py`: happy path creates entry; duplicate install blocked with error.

#### `__init__.py` — async_setup_entry
- [x] `async def async_setup_entry(hass, entry) -> bool`:
  - Initialize `LucarneFamilyStore`, call `async_init()`
  - Stash in `hass.data[DOMAIN][entry.entry_id] = {"store": store}`
  - Register options-flow update listener: `entry.async_on_unload(entry.add_update_listener(async_options_updated))`
  - Return True
- [x] Preserve this Phase 1 order when later phases extend setup: store first, then `hass.data`, then the current phase's registrations/listeners. Phase 2 appends entity reconciliation + service/WS registration; Phase 3 replaces the short list with its explicit seven-step order.
- [x] `async def async_unload_entry(hass, entry) -> bool`:
  - Close store
  - Remove from `hass.data[DOMAIN]`
  - Return True
- [x] `async def async_options_updated(hass, entry)` — stub for now; just `_LOGGER.debug("Options updated: %s", entry.entry_id)`. Phase 3 wires this to re-write managed automations (see `phase-3-managed-automations.md` Sub-Phase B → "Wire into setup + options-flow listener"). Keep the function signature `(hass, entry) -> None` exactly so Phase 3 only has to fill the body.

#### Translations
- [x] `strings.json` — keys for `config.step.user.title`, `config.step.user.data.family_name`, `config.error.single_family_only`
- [x] `translations/en.json` — English copies of the above

#### Tests
- [x] `test_config_flow.py`: full user flow with `pytest_homeassistant_custom_component` — assert entry created, store initialized, hass.data populated

### Sub-Phase D: Options flow (ongoing edits)

#### `config_flow.py` — OptionsFlow
- [x] Class `LucarneFamilyOptionsFlow(config_entries.OptionsFlow)`
- [x] `async def async_step_init(user_input)` — menu step: choose `manage_members`, `edit_schedule`, `edit_round_trip` (last shown but reserved for Phase 6)
- [x] `async def async_step_manage_members(user_input)` — list current members, options: add / edit / remove
- [x] `async def async_step_add_member(user_input)`:
  - Fields: `name` (text, required), `color` (text, hex validated), `avatar` (text — emoji OR path; Phase 2 wires upload), `preset` (select from BUILTIN_PRESETS keys)
  - On submit: derive slug from name (`re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')`); check uniqueness against existing members; show error `slug_conflict` if dup
  - Save via `store.async_save_members([...existing, new])`; return to `manage_members`
  - **Member entities are NOT created here.** That's Phase 2. Phase 1 just stores metadata.
- [x] `async def async_step_edit_member(user_input)`:
  - Pre-populated form with current values
  - On rename: **DO NOT** rename slug. Slug is frozen at creation. Phase 2 wires the entity-rename-on-display-name-change flow with downstream-impact preview.
  - Validation as in add_member
- [x] `async def async_step_remove_member(user_input)`:
  - Confirmation step (text: "Type the member's name to confirm removal")
  - On confirm: remove from members list; **DO NOT** delete entities (Phase 2 manages entity lifecycle)
- [x] `async def async_step_edit_schedule(user_input)`:
  - Fields: `reset_time` (time selector), `streak_check_time` (time selector)
  - Save to entry.data

#### Translations
- [x] Add all step titles, labels, descriptions, errors to `strings.json` + `translations/en.json`

#### Tests
- [x] `test_options_flow.py`:
  - Add member: assert members list grows, slug generated correctly
  - Slug conflict: two members with names that produce the same slug → error
  - Edit member: name change preserved, slug unchanged
  - Remove member: confirmation works, member removed from data
  - Edit schedule: times saved to entry.data
- [x] Edge cases: empty name, invalid color, name producing empty slug (e.g. all-emoji name → fallback)

### Sub-Phase E: Manifest flip + integration discoverability

#### `manifest.json` update
- [x] Flip `config_flow: false` → `config_flow: true`
- [x] Verify against the pinned HA manifest schema that `iot_class: "local_push"` is correct for this integration (it pushes state changes to HA and does no polling)
- [x] Verify against the pinned HA manifest schema that `integration_type: "service"` is valid and appropriate for a domain-level service integration

#### Logo / icon
- [x] No logo work in Phase 1. Track Home Assistant Brands submission separately after the integration name and icon are final; Phase 5 documentation may mention the missing brand icon if it remains absent.

### Documentation (end of phase)

- [x] Add `docs/integration.md` skeleton: install, first-run, member management. Phase 2+ fills task management.
- [x] Update `docs/architecture.md` — fill the "Custom integration" section header from Phase 0 with: config flow shape, storage split (config_entry vs SQLite), members are first-class, no entities yet
- [x] `CLAUDE.md` deferred to Phase 5

### Build verification (required before marking phase complete)

- [x] `ruff check custom_components tests/python` — zero issues
- [x] `mypy custom_components/lucarne_family` — zero errors
- [x] `pytest tests/python -v` — all tests pass (smoke + store + config_flow + options_flow + presets)
- [x] `npm test && npm run lint && npm run typecheck && npm run build` — TS side unchanged, still green
- [x] CI both jobs green
- [x] HACS validation passes
- [x] On a real HA instance: deploy via `scripts/deploy-integration.sh`, restart HA, install via Add Integration → Lucarne Family, add 2 members with different presets, edit one, remove one
- [x] Use `mcp__home-assistant__ha_get_logs` to verify no warnings/errors during the above
- [x] Mark phase `status: done` only after all verification passes

### Manual verification with MCP tools

- [x] `mcp__home-assistant__ha_get_logs` → filter `lucarne_family` → confirm setup logs at INFO, no WARNING/ERROR
- [x] `mcp__home-assistant__ha_search_entities` → confirm NO `todo.<slug>` or `counter.<slug>_streak` entities exist yet (that's Phase 2)
- [x] Browser MCP: navigate to Settings → Devices & Services → Lucarne Family card visible. Open Configure → menu shows manage_members + edit_schedule + edit_round_trip (reserved). Walk through add member flow, screenshot each step for review.

## Technical Details

### Why `config_entry.data` for members, SQLite for tasks

Members are bounded (~5 per family). Storing them in `config_entry.data` makes them visible in HA's `.storage/core.config_entries` JSON dump (good for debugging), survives HA backups natively, and avoids SQLite for state HA already manages.

Tasks are unbounded (could be thousands over time). Storing them in `config_entry.data` would bloat the JSON file and slow `async_update_entry`. SQLite handles this cleanly.

### Why slug does not change in Phase 1

The slug appears in entity IDs (`todo.<slug>`, `counter.<slug>_streak`) once Phase 2 creates entities. Phase 1 display-name edits must not change slug. Phase 2 adds the explicit rename flow that can change slug and entity IDs after showing downstream impact.

### Why options flow has sub-steps instead of one big form

HA's options-flow UI handles step-by-step navigation well but is awkward with deeply nested forms. Two-level menu (init → action) keeps each form focused. Trade-off: more clicks for the user, less complex per-form validation.

### Single-family constraint

The chores card and today card both read from "the family." With one config entry per family, cards don't need a family selector. Multi-family deferred — would require: per-card family picker, namespaced services (`lucarne_family.add_task` → `lucarne_family.add_task` with family arg), more complex SQLite (per-family DB or family_id column).

### Async + SQLite

HA forbids blocking I/O on the event loop. Phase 1 uses stdlib `sqlite3` and wraps every file/database operation in `hass.async_add_executor_job`. This includes opening the connection, reading `schema.sql`, executing DDL, committing, and closing.

## Constraints

- **Single config entry per family** — second install attempt rejected with clear error
- **Slug stable in Phase 1** — display name freely editable; slug changes only through Phase 2's explicit rename flow
- **No entities created in Phase 1** — Phase 2 owns entity lifecycle
- **All SQLite I/O off the event loop** — use `hass.async_add_executor_job` around stdlib `sqlite3` and file reads
- **All forms typed via voluptuous schemas** — match HA core convention; don't roll dataclass-only validation
- **Translations: at minimum English** — Phase 6 may add more; not in scope here

## Shortcut-resistance notes for LLM implementer

An LLM doing this phase cold is most likely to:

1. **Forget the config-flow vs options-flow distinction** and put everything in ConfigFlow → user can't reconfigure after install. The pattern is: `async_step_user` runs once at install; `async_get_options_flow` returns an `OptionsFlow` instance that handles ongoing edits.
2. **Use blocking sqlite3 calls directly** in async code → HA logs "Detected blocking call to ..." warnings. Wrap each store operation in `hass.async_add_executor_job`.
3. **Skip the slug-uniqueness check** and break when two members are named "Sam." Check before save.
4. **Conflate `data` and `options`** on config entry. This spec intentionally stores all Lucarne Family configuration in `entry.data` and has the options flow update `entry.data` via `hass.config_entries.async_update_entry`. Do not use `entry.options` for this feature.
5. **Translate inconsistently** — strings.json keys must match exactly what `voluptuous` raises and what step methods return. Test the translations by loading the integration and reading the UI strings via WebSocket `translations/get`.
