# Lucarne Family — Integration Guide

## Install

### Via HACS (recommended)

[![Add to Home Assistant via HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Babel-Innovations&repository=ha-lucarne&category=integration)

The button above opens HACS and pre-fills this repository. To add it by hand instead:

1. Open HA → **HACS** → **Integrations** → **⋮** → **Custom repositories**
2. Paste `https://github.com/Babel-Innovations/ha-lucarne` and set Type to **Integration**
3. Search for **Lucarne Family** and click **Download**
4. Restart Home Assistant
5. Go to **Settings → Devices & Services → Add Integration** and search for **Lucarne Family**
6. Enter your family name (e.g. "The Smiths") and click Submit

### Manual / developer

Copy `custom_components/lucarne_family/` to your HA `config/custom_components/` folder and restart.
The deploy script `scripts/deploy-integration.sh` automates this for dev iteration (requires
`HA_SSH_HOST` + `HA_INTEGRATION_PATH` env vars; see `.env.example`).

Only one Lucarne Family integration can be installed per HA instance.

## First run

After install, the integration:
- Creates a config entry with an empty members list.
- Creates the shared `todo.lucarne_household` entity.
- Initialises the SQLite database (`lucarne_family_<entry_id>.db` in your config directory) with
  the task and completion-log schema.
- Registers in-process `async_track_time_change` listeners for daily reset and streak check
  (no `automation.*` HA entities are created — the integration uses in-process listeners).

Open **Settings → Devices & Services → Lucarne Family → Configure** to add family members.

## Member management

Open **Settings → Devices & Services → Lucarne Family → Configure** to manage members.

### Add a member

1. Choose **Manage members → Add member**.
2. Fill in:
   - **Name** — displayed in cards (e.g. "Anna"). Must be non-empty and ≤ 50 characters.
   - **Color** — hex color (e.g. `#f5c89c`). Used for visual identification in cards.
   - **Routine preset** — choose a starting set of daily routines:
     - **School-age kid** — brush teeth, make bed, pack school bag (weekdays), kindness act, screen time off
     - **Toddler** — brush teeth, get dressed, put toys away
     - **Adult (none)** — empty; adults typically only need household chores
3. Click Submit. The member is saved. A stable **slug** is derived from the name (e.g. "Anna" → `anna`).

> **Avatar (emoji or photo)** is set from the chores card editor (✏️ button next to the member). The Options flow no longer takes an avatar — see "Avatar upload" below.

### Edit a member

1. Choose **Manage members → Edit member**.
2. Select the member to edit.
3. Update name, color, or preset.
4. Click Submit.

To change the avatar, open the dashboard, edit the chores card, and click the ✏️ next to the member.

**Name-change and slug behavior**: If the new name produces the same slug as the old name (e.g. "Anna" → "ANNA"), only the display name changes — no entity rename occurs. If the slug would change (e.g. "Anna" → "Ana"), the flow shows an impact preview listing automations, scripts, scenes, and dashboards that reference the old entity IDs. You must check "I understand" before proceeding.

On confirm: the todo and streak-counter entity IDs are renamed, all SQLite rows (`task_metadata`, `completion_log`) are migrated to the new slug, and the config entry is updated. If entity rename fails, all SQLite changes are rolled back so member data stays consistent.

### Remove a member

1. Choose **Manage members → Remove member**.
2. Select the member.
3. Type the member's exact name to confirm. This is destructive and cannot be undone.

Removing a member deletes the `todo.<slug>` config entry (which removes the todo entity and its stored items) and the `counter.<slug>_streak` helper. The member entry is dropped from the config entry.

SQLite `task_metadata` and `completion_log` rows keyed to the removed member's slug are left in place — no member-level cleanup is performed.

> **Known limitation**: if you re-add a member with the same name (same slug), their orphaned task metadata resurfaces. The new todo list will be empty, but the WebSocket API will report the old task metadata, and preset seeding will be skipped if historical `source="template"` rows exist. A clean re-add flow (with explicit old-data cleanup) is deferred to a future phase.

## Task management

### Managed entities

When a member is added, the integration creates two managed helpers:

| Entity | Pattern | Purpose |
|--------|---------|---------|
| Todo list | `todo.<slug>` | Holds the member's tasks (routines and chores) |
| Counter | `counter.<slug>_streak` | Mirror of the computed streak for use in automations (Phase 3 writes the value; Phase 2 only creates/renames/deletes the helper) |

A shared household todo list (`todo.lucarne_household`) is created once at integration setup and is not tied to any specific member.

### Task types

Every task is one of three types. Pick the type by what the task **does next** after
you check it off, not by how often you do it.

| Behavior | `routine` | `chore` | `rotating` |
|---|---|---|---|
| Auto-reset at `reset_time` (flips `completed` → `needs_action` next day) | **yes** — by `reset_logic.py` | no, stays checked | **yes** — and advances `current_owner` if it was completed |
| Counts toward streak (`counter.<slug>_streak`) | yes — when its RRULE is due today | no | **no** — excluded from streak computation |
| RRULE has any runtime effect | yes — drives "is this due today?" via `recurrence.py` | no — silently ignored | no — no RRULE |
| Recurrence picker shown in **Add Task** UI | yes | no — hidden | no — hidden |
| Due-date field shown in **Add Task** UI | no | yes | no — hidden |
| Owner | per-member `todo.<slug>` | per-member or household | always `todo.lucarne_household` |
| Card visibility toggle (`lucarne-chores-card`) | `show_routines` (default true) | `show_tasks` (default true) | `show_tasks` (default true) |
| Default when `type` is omitted from `add_task` | — | yes (see `task_service.py`) | — |

#### Rotating tasks

A rotating task is a shared household chore that cycles through an ordered list of members — useful
for jobs like vacuuming or taking out the trash where you want turns to be fair.

**Creating a rotating task**

Open the Chores card, click **+** on any member's column (or the household column), and choose type **Rotating** in the Add Task dialog. You must select at least 2 owners in order — these define the rotation sequence. The task is always stored in the household list (`todo.lucarne_household`), regardless of which column's **+** button you used.

**How turns advance**

Ownership advances at the daily-reset window (configured as `reset_time` in the integration options), not at the moment of completion:

- If the task was **completed** by the reset window: ownership advances to the next member in the list, and the task flips back to `needs_action` in the new owner's column.
- If the task was **not completed**: ownership stays with the current member and the task flips back to `needs_action` (giving the same person another chance).
- The `lucarne_family_rotation_advanced` event fires when ownership advances; subscribers can use it for notifications or automations.

**Streak exclusion**

Rotating tasks are intentionally excluded from streak computation — completing a shared chore should not boost any individual member's streak counter.

**Editing owners**

Long-press a rotating task in the card and choose **Edit** to reorder, add, or remove owners (minimum 2 at all times). If you remove a member from the family entirely, the integration removes their slug from `rotation_owners` of all rotating tasks and advances `current_owner` if needed; if no valid owners would remain, the task is deleted.

**Completing a rotating task**

Tap the task in any column as you would any other task. The toggle is attributed to the current owner — `lucarne_family_task_completed` fires with the current owner's slug, not `"household"`. The task stays in its current position until the daily reset.

> **Household-list exemption.** Tasks on the shared `todo.lucarne_household`
> list are skipped by both `reset_logic.py` and `streak_logic.py`, which only
> iterate per-member lists. A `type: routine` task added to the household
> list won't auto-reset or count toward any streak (the UI doesn't prevent
> this combination — Add Task allows Household + Routine — but the runtime
> ignores it). Use `chore` for shared items.

> **Service contract vs. UI affordance.** The backend `add_task` service
> accepts `recurrence` *and* `due` for any `type` — there is no schema-level
> type-gate. (`update_task_metadata` only mutates metadata fields — `icon`,
> `recurrence`, `type`, `assignee`, `time_of_day` — and never touches the due date;
> due-date edits on existing items go through HA's built-in
> `todo.update_item`, which is what **Edit Task** calls when you change the
> Due field on a routine.) The differences above are: (a) which fields the
> **Add Task** popover exposes (Recurrence: routine-only; Due: chore-only),
> and (b) which fields the runtime actually consumes (RRULEs on chores are
> stored but never replayed). Developers calling `add_task` from Developer
> Tools can pass either field for either type.

**Rule of thumb.** Use `routine` for the daily-rhythm stuff your family does every
day or every weekday — brushing teeth, making the bed, packing bags. The auto-reset
+ streak loop is the whole point. Use `chore` for everything else: errands,
one-offs, occasional jobs ("clean the garage", "renew passport") — they stay
checked once done and you'll create another the next time it's due.

A `chore` that you also want on a schedule (e.g. "water plants weekly") is
currently a manual workflow — you'll re-add the chore each time. There is no
"regenerate chore on RRULE" logic today; the Add Task form intentionally hides
Recurrence when type is `chore` to avoid implying otherwise.

### Adding a routine to multiple members at once

When creating a **routine** from the chores card, an **"Also add to:"** checklist appears below the type selector. Tick any additional members to create one independent copy for each. This is only available for routines — the checklist is hidden when the type is `chore`.

Each copy is fully independent: it lives in that member's own `todo.<slug>` list, tracks its own completion and streak contribution, and is edited or deleted separately. Changing or deleting one copy has no effect on the others.

On submit, the popover issues one `lucarne_family.add_task` call per target member (the primary column member plus each ticked member). All copies share the same `summary`, `recurrence`, `icon`, and `time_of_day`. If any call fails, the popover stays open and shows the error — copies already created are kept (there is no rollback across independent service calls).

### Time-of-day buckets

Every task carries an optional `time_of_day` tag with one of four values:
`anytime` (the default), `morning`, `afternoon`, or `night`. This is purely
a display attribute — it does not change reset/streak logic or RRULE
evaluation. The chores card groups a member's routines into per-bucket
sub-sections (Morning → Afternoon → Night → Anytime, empty buckets hidden).
Chores currently keep their due-date-first sort; the tag is stored on chores
too for future filtering. Pre-existing rows from before this column existed
backfill to `anytime` via the schema migration in `store.py`.

### Recurrence rules

Routines use a strict subset of iCalendar RRULE syntax. Only these six modes are accepted:

| Mode | RRULE template | Example |
|------|---------------|---------|
| One-off | empty string | `""` |
| Daily | `FREQ=DAILY[;INTERVAL=N]` | `FREQ=DAILY` |
| Weekly | `FREQ=WEEKLY;BYDAY=<MO,TU,...>[;INTERVAL=N]` | `FREQ=WEEKLY;BYDAY=MO,WE,FR` |
| Monthly by date | `FREQ=MONTHLY;BYMONTHDAY=<1-31>[;INTERVAL=N]` | `FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6` |
| Monthly by Nth weekday | `FREQ=MONTHLY;BYDAY=<+/-N><DAY>[;INTERVAL=N]` | `FREQ=MONTHLY;BYDAY=1SA` |
| Yearly | `FREQ=YEARLY;BYMONTH=<1-12>;BYMONTHDAY=<1-31>[;INTERVAL=N]` | `FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15` |

Any RRULE outside this set is rejected at schema validation time (before the handler runs).

### Preset seeding

When a new member is added with a non-empty preset, the integration seeds their todo list with the preset's routine templates exactly once. A reload of the integration does not re-seed (the idempotency guard checks for existing `source="template"` metadata rows).

### Streak computation

The streak is computed by walking backward from today:
- Days where no routines are scheduled are skipped.
- Days where all scheduled routines are marked completed increment the streak.
- The first day where any scheduled routine is missing stops the walk.
- The walk is capped at 365 days.

**Known limitation**: streak computation uses the *current* routine set for all historical days. If a routine is added or removed, historical streak values may shift. This will be addressed in a future phase by snapshotting the routine set at reset time.

### Avatar upload

The chores card editor exposes an ✏️ button next to each member. Click it to open a modal where you can either pick an emoji or upload a photo with a square crop dialog (powered by Cropper.js). On Save the cropped JPEG is sent to the `lucarne_family.upload_avatar` service. The service:
- Accepts PNG, JPEG, or WebP; max 2 MB; max 16,777,216 total pixels (e.g. 4096 × 4096).
- Validates the file type via magic-byte check (independent of the declared `mime_type`).
- Writes to `<config>/www/lucarne/avatars/<slug>.<ext>` (served at `/local/lucarne/avatars/<slug>.<ext>`).
- Rejects path traversal — the filename is always derived from the member slug, never from user input.

The Options flow does **not** offer avatar editing, by design — there's no way to embed a crop dialog inside a config-flow form. Use the chores card editor instead.

### Rename behavior

**Display-name-only rename** (slug unchanged): only `member.name` is updated. No entity rename, no downstream impact.

**Slug-changing rename**: The options flow shows an impact preview before proceeding. Impact lists:
- YAML-based automations/scripts/scenes that reference the old entity ID.
- Lovelace dashboards (`.storage/lovelace*`) that reference the old entity ID.

> **Limitation (v1)**: UI-created automations stored in `.storage/` are not scanned. Only YAML-based resources are detected. This will be addressed in a future phase.

On confirm:
1. SQLite rows (task_metadata, completion_log) migrated to new slug atomically.
2. Todo entity renamed in entity registry (`todo.<old_slug>` → `todo.<new_slug>`).
3. Streak counter deleted and recreated under new slug (preserving current streak value in initial).
4. Config entry member data updated.

If the SQLite migration (step 1) or entity rename (step 2–3) fails, the partial changes are rolled back before returning. If the final config-entry save (step 4) fails after the entities have already been renamed, the entities remain under the new slug — the config entry will reflect the old slug until the next successful options-flow submission.

## Schedule settings and managed automations

Choose **Edit schedule** to adjust:

- **Daily reset time** (default `04:00`) — when routine tasks flip back to `needs_action`.
- **Streak check time** (default `21:00`) — when the streak counter is recomputed.

### How managed automations work

The integration registers in-process `async_track_time_change` listeners at the configured times.
There are no `automation.*` HA entities to view or edit — the behavior is driven entirely inside
the integration process.

**Daily reset** (`perform_daily_reset` service, fired at `reset_time`):

- For every member, iterates their `todo.<slug>` items.
- Items with `type=routine` that are in `completed` state are flipped back to `needs_action`.
- Idempotent: items already in `needs_action` are untouched (safe to trigger multiple times).
- The completion listener detects the resulting state changes and appends `action="reset"` rows
  to the completion log (distinct from `action="undone"` for user-initiated unchecks).
- Finally, reconciles task metadata against the lists: a task deleted from HA's own to-do panel
  (or by `todo.remove_item`, voice, the Companion app) removes the item but not Lucarne's row for
  it, and a leftover routine row would silently stop that member's "all routines done" event —
  and, if that routine repeats, hold their streak at 0. Rows whose item is in none of the lists
  are removed here. Lists that cannot be read at that moment — entity missing, unavailable, or
  still loading — are skipped entirely rather than treated as empty, so a list that is temporarily
  away never costs any rows. Calling the service by hand is the way to clean this up without
  waiting for the next reset time.

**Streak check** (`evaluate_all_streaks` service, fired at `streak_check_time`):

- For every member, recomputes the streak by walking backward through the completion log.
- Writes the result to `counter.<slug>_streak` via `counter.set_value`.
- No-routine days are skipped; all-complete days increment; any-missing day stops the walk.
- Cap: 365 days maximum walk.

**Changing the times**: open Settings → Devices & Services → Lucarne Family → Configure →
Edit schedule, enter the new times, and submit. The listeners are re-registered immediately — no
HA restart required.

## Card usage

Once the integration is installed and at least one member is added, drop the
`lucarne-chores-card` onto your dashboard:

```yaml
type: custom:lucarne-chores-card
title: Chores           # optional, default "Chores"
members:
  - anna                # member slug (derived from member name: "Anna" → "anna")
  - bob
  - household           # optional; shows todo.lucarne_household
hidden_members:         # optional; members kept in `members` ordering but hidden from the card
  - bob                 #   (bob holds its slot in the editor list but isn't rendered)
show_routines: true     # optional, default true; show routine-type tasks
show_tasks: true        # optional, default true; show chore-type tasks due today or overdue
show_streak: true       # optional, default true; show streak counter in column footer
hide_names: false       # optional, default false; hide member names (avatars only)
```

The visual editor (click **Visual editor** after adding the card) lists every family
member in one drag-to-reorder list. Each row has an **eye** toggle
(`mdi:eye-outline` / `mdi:eye-off-outline`) to show/hide that member on the card — a
hidden member keeps its position in the order. Members are hidden by default until you
show them.

### What the card does

- **Subscribes** to each member's `todo.<slug>` entity and to `counter.<slug>_streak` via
  the HA WebSocket — no polling.
- **Filters tasks** per column: routines are always shown (if `show_routines: true`); chores
  are shown only if their `due` date is today or earlier, or has no due date.
- **Groups tasks by time of day**: routines *and* chores are bucketed into Morning →
  Afternoon → Night → Anytime sections by their `time_of_day`. A chore tagged `morning`
  shows under **Morning** alongside routines (there is no separate "Tasks" section).
- **Pins the streak** to the bottom of every column (columns share a height) and scrolls
  an over-long list internally so the streak stays visible.
- **+ Add task**: a top-right **+** icon opens an inline popover that calls
  `lucarne_family.add_task`.
- **Tap a task**: calls `todo.update_item` to toggle `needs_action ↔ completed`.
- **Long-press a task**: opens the edit popover (update summary, type, recurrence, due date,
  assignee for household tasks; or delete with confirmation).

### Household column

The special slug `household` resolves to `todo.lucarne_household`, the shared todo list
created at integration setup. Household tasks may have an optional `assignee` (a member
slug) stored as metadata. The assignee is stored and surfaced in the edit popover but is not
displayed in the task row (planned for a future phase). The household column has no streak
subscription; if `show_streak` is enabled, it renders 0.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Integration not visible in Add Integration | Verify `custom_components/lucarne_family/` is in the right location and `manifest.json` is present. Restart HA after adding. |
| Setup errors or missing entities | Check HA logs (Settings → System → Logs) and filter for `lucarne_family`. |
| Member's todo entity missing after adding | Trigger a reload: Settings → Devices & Services → Lucarne Family → ⋮ → Reload. The reconciliation loop recreates missing entities. |
| Streaks not updating | Check HA logs (Settings → System → Logs) for `lucarne_family` entries around the configured `streak_check_time`. To force an immediate recompute, call `lucarne_family.evaluate_all_streaks` from Developer Tools → Services. Also confirm your HA timezone matches the `streak_check_time` value. |
| Chores card shows error block | The integration is either not installed or the `lucarne_family/get_family` WebSocket command failed. Check HA logs. |

## Round-trip readiness (v0.2)

The integration can fire a round-trip event when apple-synced items are completed in HA, so a
future subscriber can mark the corresponding Apple Reminder complete on the Mac mini.

### Enable round-trip config

**Settings → Devices & Services → Lucarne Family → Configure → Apple Reminders sync**

| Field | Description |
|-------|-------------|
| Enable round-trip | Toggle. Leave off until the future receiver is deployed. |
| Webhook URL | The URL the future subscriber will POST to (e.g. `http://mac-mini.local:9123/writeback`). |
| Shared secret | Min 32 characters. Used for HMAC-SHA256 signing by the future subscriber. |
| Sync device name | Displayed in the event payload for receiver identification. Default: "Sync device". |

### What happens when enabled

When `enabled == true` and an apple-sourced task with a non-empty `apple_uid` is marked complete,
the integration fires `lucarne_family_apple_writeback_requested` on the HA bus. The payload
contains `apple_uid`, `status`, `timestamp`, and `device_name`. **The webhook URL and secret are
never in the event.** Tasks without an `apple_uid` (e.g. added manually) do not trigger the event.

The actual POST to the bridge is deferred — no HTTP request is made in v0.2. Enable this now
to verify events appear in **Developer Tools → Events**, then wire the subscriber in the next spec.

### What is missing

The webhook POST and HMAC signing are not implemented yet. See
[`docs/reminders-bridge.md` — Round-trip writeback](reminders-bridge.md#round-trip-writeback)
for the full protocol and the subscriber accessor contract (`get_round_trip_config(hass)`).

---

## Deprecation notes

- **`ha_lucarne_chores_all_done`** event: fired as a compatibility shim alongside `lucarne_family_all_routines_done` in v0.x. Will be removed in v1.0. Migrate consumers:
  ```yaml
  # Old:
  trigger:
    - trigger: event
      event_type: ha_lucarne_chores_all_done
  # New:
  trigger:
    - trigger: event
      event_type: lucarne_family_all_routines_done
      event_data:
        member: anna  # member slug
  ```

- **`lucarne_chores_daily_reset` / `lucarne_chores_streak_advance` blueprints**: retired. Delete any instances — the integration handles these automatically.

- **`kids:` chores card config**: old YAML shape is not migrated. The card shows an upgrade message; configure via the integration instead.
