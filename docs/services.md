# Lucarne Family — Service Reference

All services are in the `lucarne_family` domain and are callable from **Developer Tools → Services** or via `hass.callService()` / `hass.services.async_call()` in automations.

> **Phase 5 status**: Services documented here are fully implemented. The `lucarne-today-card` reads household tasks via the existing `lucarne_family/get_family` WebSocket command (no new services in Phase 5). Two additional services — `perform_daily_reset` and `evaluate_all_streaks` — are already registered and callable from Developer Tools → Services, but are not yet documented below (Phase 6 will add their reference entries). They take no fields; the in-process time-change listeners call them on schedule, and they can also be triggered manually to force an immediate reset or streak recompute.

---

## `lucarne_family.add_task`

Add a task to a family member's or household todo list.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member` | string | yes | Member slug, or `"household"` for the shared list |
| `summary` | string | yes | Task title (max 200 characters) |
| `type` | string | no | `"routine"`, `"chore"`, or `"rotating"` (default: `"chore"`) |
| `recurrence` | string | no | RRULE string (empty string = one-off). Must be empty for `rotating` tasks. |
| `icon` | string | no | Single emoji icon |
| `due` | datetime | no | Optional due date/time |
| `source` | string | no | Creation source: `"manual"`, `"template"`, or `"apple"` (default: `"manual"`) |
| `assignee` | string | no | Member slug to assign; only accepted when `member == "household"` |
| `time_of_day` | string | no | One of `"anytime"`, `"morning"`, `"afternoon"`, `"night"` (default: `"anytime"`). Display attribute only — does not affect reset/streak logic. |
| `rotation_owners` | list[string] | no | **Rotating tasks only.** Ordered list of member slugs (minimum 2 unique known slugs). Duplicates are removed preserving order. |
| `current_owner` | string | no | **Rotating tasks only.** Slug of the member whose turn it is. Defaults to `rotation_owners[0]` when not provided. Must be in `rotation_owners`. |

**Rotating task rules:**
- `member` must be `"household"` — rotating tasks only live in the shared list.
- `rotation_owners` must have ≥ 2 unique, known member slugs.
- `recurrence` must be absent or empty.
- `current_owner` must be one of the `rotation_owners`.
- Rotation advances at the next daily-reset window, not instantly on completion.
- Rotating tasks are excluded from streaks.

**Fires event**: `lucarne_family_task_added` with `{member, uid, type, summary}`

**Validation errors**:
- `member` not in known slugs and not `"household"` → `ServiceValidationError`
- `recurrence` non-empty and not a valid RRULE in the supported set → schema error
- `source` not in `{"manual", "template", "apple"}` → schema error
- `assignee` on a non-household member → `ServiceValidationError`
- `assignee` not a known member slug → `ServiceValidationError`
- `type == "rotating"` and `member != "household"` → `ServiceValidationError`
- `type == "rotating"` and `rotation_owners` has < 2 unique known slugs → `ServiceValidationError`
- `type == "rotating"` and `recurrence` is non-empty → `ServiceValidationError`
- `type == "rotating"` and `current_owner` not in `rotation_owners` → `ServiceValidationError`

**Example call (Developer Tools)**:
```yaml
service: lucarne_family.add_task
data:
  member: anna
  summary: Brush teeth
  type: routine
  recurrence: FREQ=DAILY
  icon: 🦷
```

---

## `lucarne_family.update_task_metadata`

Update metadata fields on an existing task. Only the fields provided are changed.

Unlike `delete_task` / `toggle_task`, this service needs a row to write to, so a uid
with no `task_metadata` row is **adopted** first — a default `chore` row is inserted
for it (`source: apple` plus the extracted `apple_uid` when the description carries
an `[apple:UUID]` sentinel, `manual` otherwise) — and then the requested update is
applied on top.

`uid` is the only required field, so a call may legitimately carry no updatable
field at all. Such a call, on a uid that exists in a managed list, adopts
**nothing** and succeeds without error — there is
no update to apply, so there is no row to need — though the
`lucarne_family_task_metadata_updated` event still fires. Don't treat a successful
call as proof the uid was adopted: pass at least one field if adoption is what
you're after.

> **Adoption enrolls the item into the daily reset.** `reset_logic` deletes completed
> `chore` items at the reset window, and an un-adopted item is exempt from that sweep.
> Editing an item that was added outside Lucarne therefore makes it behave like any
> other Lucarne chore: once completed, it is removed at the next reset. This is the
> only path that adopts — deleting or toggling such an item leaves it un-adopted.
>
> Adoption is committed only after every validation above has passed. A call that
> returns a `ServiceValidationError` writes nothing, so a rejected request never
> arms that deletion.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | yes | The task's unique identifier (UUID) |
| `icon` | string | no | New emoji icon |
| `recurrence` | string | no | New RRULE string |
| `type` | string | no | New type: `"routine"`, `"chore"`, or `"rotating"` |
| `assignee` | string | no | New assignee member slug (household tasks only) |
| `time_of_day` | string | no | New bucket value (`"anytime"`, `"morning"`, `"afternoon"`, `"night"`). |
| `rotation_owners` | list[string] | no | **Rotating tasks only.** New ordered owner list (≥ 1 unique known slug; `current_owner` must remain in the list). |
| `current_owner` | string | no | **Rotating tasks only.** New current-owner slug. Must be in `rotation_owners`. |

**Fires event**: `lucarne_family_task_metadata_updated`

**Validation errors**:
- `uid` held by no managed todo list → `ServiceValidationError`
- `recurrence` non-empty and not a valid RRULE → schema error
- `type` not in `{"routine", "chore", "rotating"}` → schema error
- `assignee` on a non-household task → `ServiceValidationError`
- `assignee` not a known member slug → `ServiceValidationError`
- `rotation_owners` or `current_owner` on a non-rotating task → `ServiceValidationError`
- `rotation_owners` contains unknown slugs → `ServiceValidationError`
- `current_owner` not in the effective `rotation_owners` list → `ServiceValidationError`

**Example call**:
```yaml
service: lucarne_family.update_task_metadata
data:
  uid: "550e8400-e29b-41d4-a716-446655440000"
  recurrence: FREQ=WEEKLY;BYDAY=MO,WE,FR
  icon: 🏃
```

---

## `lucarne_family.delete_task`

Delete a task and its metadata row. Completion log rows are preserved for audit history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | yes | The task's unique identifier (UUID) |

**Fires event**: `lucarne_family_task_deleted`

**Validation errors**:
- `uid` held by no managed todo list → `ServiceValidationError`

A uid with no `task_metadata` row is **not** an error: an item added outside
`add_task` (HA's to-do panel, voice, the Companion app, the Reminders bridge) has
none, and the todo entity — not `task_metadata` — is the source of truth for whether
a task exists. The item is removed from its list and there is simply no row to drop.

**Example call**:
```yaml
service: lucarne_family.delete_task
data:
  uid: "550e8400-e29b-41d4-a716-446655440000"
```

---

## `lucarne_family.toggle_task`

Toggle a task's completion status (needs_action ↔ completed) and append a completion log entry.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | yes | The task's unique identifier (UUID) |

**Fires event**: `lucarne_family_task_toggled`

**Validation errors**:
- `uid` held by no managed todo list → `ServiceValidationError`

As with `delete_task`, a uid with no `task_metadata` row is resolved by scanning the
managed lists rather than rejected.

**Example call**:
```yaml
service: lucarne_family.toggle_task
data:
  uid: "550e8400-e29b-41d4-a716-446655440000"
```

---

## `lucarne_family.upload_avatar`

Upload an avatar image for a family member.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member` | string | yes | Member slug |
| `image_data` | string | yes | Base64-encoded image bytes |
| `mime_type` | string | yes | `"image/png"`, `"image/jpeg"`, or `"image/webp"` |

**Constraints**:
- Max file size: 2 MB
- Max pixel count: 16,777,216 total pixels (e.g. 4096 × 4096)
- File type is validated via magic bytes independent of `mime_type`
- Written to `<config>/www/lucarne/avatars/<slug>.<ext>`
- Served at `/local/lucarne/avatars/<slug>.<ext>`

**Fires event**: `lucarne_family_avatar_uploaded`

**Validation errors**:
- `member` not in known slugs → `ServiceValidationError`
- Decoded bytes exceed 2 MB → `ServiceValidationError`
- Declared `mime_type` doesn't match actual image magic bytes → `ServiceValidationError`
- Image exceeds 16,777,216 total pixels → `ServiceValidationError`

**Example call** (from Python/automation, base64-encode the file first):
```yaml
service: lucarne_family.upload_avatar
data:
  member: anna
  image_data: "iVBORw0KGgoAAAANSUhEUgAA..."
  mime_type: image/png
```

---

## WebSocket API

### `lucarne_family/get_family`

Read the full family state in one round-trip. Used by the chores card.

**Request**:
```json
{"id": 1, "type": "lucarne_family/get_family"}
```

**Response**:
```json
{
  "members": [
    {
      "slug": "anna",
      "name": "Anna",
      "color": "#f5c89c",
      "avatar": "/local/lucarne/avatars/anna.png",
      "created_at": "2024-09-01T08:00:00",
      "preset": "school-age",
      "todo_entity_id": "todo.anna",
      "streak_counter_id": "counter.anna_streak"
    }
  ],
  "task_metadata": [
    {
      "item_uid": "550e8400-...",
      "member_slug": "anna",
      "assignee_slug": "",
      "type": "routine",
      "recurrence": "FREQ=DAILY",
      "icon": "🦷",
      "source": "template",
      "apple_uid": "",
      "time_of_day": "morning",
      "created_at": "2024-09-01T08:00:00+00:00"
    }
  ],
  "reset_time": "04:00",
  "streak_check_time": "21:00",
  "household_entity_id": "todo.lucarne_household"
}
```

Auth: any logged-in HA user (no admin required).
