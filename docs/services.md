# Lucarne Family — Service Reference

All services are in the `lucarne_family` domain and are callable from **Developer Tools → Services** or via `hass.callService()` / `hass.services.async_call()` in automations.

**Database errors apply to every service below.** A statement against Lucarne's own
SQLite database that fails — `database is locked`, a disk error, a constraint
violation — is reported as a `HomeAssistantError` naming the operation and what it
was for: the task's uid where the statement acts on one task, otherwise the member
slug, and neither for the whole-table reads. It carries the underlying SQLite or
filesystem exception as its cause. For example:

```text
Could not delete details for task '550e…' in Lucarne's database: database is locked
```

It is never re-raised raw, which HA would report to the caller as `unknown_error`
with an "Unexpected exception" traceback and no indication of which operation or
service it came from. This covers reads as well as writes; the per-service "Runtime
errors" sections below are about **todo-platform** failures, which are a separate
translation.

> **Phase 5 status**: Services documented here are fully implemented. The `lucarne-today-card` reads household tasks via the existing `lucarne_family/get_family` WebSocket command (no new services in Phase 5). Two additional services — `perform_daily_reset` and `evaluate_all_streaks` — are already registered and callable from Developer Tools → Services, but are not yet documented below (Phase 6 will add their reference entries). They take no fields; the in-process time-change listeners call them on schedule, and they can also be triggered manually to force an immediate reset or streak recompute.

---

## `lucarne_family.add_task`

Add a task to a family member's or household todo list.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member` | string | yes | Member slug, or `"household"` for the shared list |
| `summary` | string | yes | Task title (max 200 characters) |
| `type` | string | no | `"routine"`, `"chore"`, or `"rotating"` (default: `"chore"`) |
| `recurrence` | string | no | RRULE string (empty string = one-off), optionally prefixed with a `DTSTART:<YYYYMMDD>` line — see [Recurrence rules](integration.md#recurrence-rules). Must be empty for `rotating` tasks. |
| `icon` | string | no | Single emoji icon |
| `due` | datetime | no | Optional due date/time |
| `source` | string | no | Creation source: `"manual"`, `"template"`, or `"apple"` (default: `"manual"`) |
| `assignee` | string | no | Member slug to assign; only accepted when `member == "household"` |
| `time_of_day` | string | no | One of `"anytime"`, `"morning"`, `"afternoon"`, `"night"` (default: `"anytime"`). Display attribute only — does not affect reset/streak logic. |
| `rotation_owners` | list[string] | no | **Rotating tasks only.** Ordered list of member slugs (minimum 2 unique known slugs). Duplicates are removed preserving order. |
| `current_owner` | string | no | **Rotating tasks only.** Slug of the member whose turn it is. Defaults to `rotation_owners[0]` when not provided. Must be in `rotation_owners`. |
| `points` | integer | no | Points earned when the task is completed (0–1000). **Requires an HA administrator**, or a call with no user (automation/script); otherwise `Unauthorized`. Plain household tasks cannot carry points. |

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
| `points` | integer | no | Points earned on completion (0–1000). Requires an HA administrator or a userless call; a refused call adopts nothing. A plain household task cannot carry points, including after a `type` change. |

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
The converse *is* an error: a uid **with** a row whose item is gone reports the
outside removal (below), after reaping the row.

**Runtime errors**: no unwrapped *todo-platform* exception reaches the caller.
- the item is no longer in its list (removed outside Lucarne) → `ServiceValidationError`.
  The metadata row is still deleted first, so this is how a #116 orphan gets reaped.
- the list rejected the write for any other reason → `HomeAssistantError` naming the
  uid and entity, carrying the platform's own error as its cause
- a todo platform that raises its own `HomeAssistantError` passes through unchanged —
  it is already user-facing, and relabelling it would bury the real message

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

**Runtime errors**: unlike `delete_task`, this service looks the item up first, so
the two "item is gone" cases are reported differently.
- gone *before* the call (the #116 orphan) → the lookup rejects it with
  `HomeAssistantError` (`Todo item … not found in …`)
- gone *while the update is in flight* → `ServiceValidationError` naming the outside
  removal
- any other write failure → `HomeAssistantError` carrying the platform's own error as
  its cause; a platform's own `HomeAssistantError` passes through unchanged

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

## `lucarne_family.grant_points`

Give a member bonus points. Requires an HA administrator, or a call with no user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member` | string | yes | Member slug (`"household"` is rejected) |
| `points` | integer | yes | 1–10000 |
| `reason` | string | no | Trimmed, at most 200 characters |

Returns `{"balance": <new balance>}` when called with `return_response`. Fires
`lucarne_family_rewards_updated`. Unknown member → `ServiceValidationError`; non-admin →
`Unauthorized`.

---

## `lucarne_family.create_reward`

Add a reward to the catalog. Requires an HA administrator, or a call with no user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Trimmed, 1–60 characters |
| `cost` | integer | yes | 1–100000 |
| `description` | string | no | Trimmed, at most 500 characters |
| `poolable` | boolean | no | Default `false` |

Returns `{"id": <reward id>}` when called with `return_response`. Fires
`lucarne_family_rewards_updated`.

---

## `lucarne_family.update_reward`

Partial update of an active reward; existing claims keep their snapshot. Requires an HA
administrator, or a call with no user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reward_id` | integer | yes | |
| `name`, `cost`, `description`, `poolable` | | no | Same rules as `create_reward` |

An unknown or archived id → `ServiceValidationError`.

---

## `lucarne_family.archive_reward`

Hide a reward from the catalog. Its pending claims can still be approved or rejected.
Archiving an archived reward is a no-op that fires no event. Requires an HA administrator, or
a call with no user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reward_id` | integer | yes | |

---

## `lucarne_family.set_rewards_settings`

Family-wide streak bonuses; omitted fields stay unchanged. Requires an HA administrator, or a
call with no user. See [Streak computation](integration.md#streak-computation).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `streak_daily_bonus` | integer | no | 0–1000; 0 disables it |
| `streak_milestones` | list | no | At most 20 of `{days: 1–365, points: 1–10000}` with unique `days`; stored sorted by `days` |

---

## `lucarne_family.claim_reward`

Reserve the points for a reward. Any user may call it. Every contributor must afford their
own share or nothing is written. Pooling needs a poolable reward; `split_shares` gives each
of the `n` distinct contributors `cost // n` and the claimer the remainder.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member` | string | yes | Claimer slug (`"household"` is rejected) |
| `reward_id` | integer | yes | An active reward |
| `pool_with` | list of strings | no | Other member slugs sharing the cost |

Returns `{"claim_id": <id>, "shares": {<slug>: <points>}}` when called with `return_response`.
Errors are `ServiceValidationError` sentences ("Not enough points: Alice needs 3 more",
"This reward can't be shared", "This reward is no longer available", "Too many people for
this reward"). Fires `lucarne_family_rewards_updated`.

---

## `lucarne_family.cancel_claim`, `approve_claim`, `reject_claim`, `refund_claim`

Each takes `claim_id` (integer, required).

| Service | Moves | Who | Ledger |
|---------|-------|-----|--------|
| `cancel_claim` | `pending` → `cancelled` | any user | releases every share |
| `approve_claim` | `pending` → `approved` | admin | none: the reservation becomes the spend |
| `reject_claim` | `pending` → `rejected` | admin | releases every share |
| `refund_claim` | `approved` → `refunded` | admin | releases every share |

A claim already moved on → `ServiceValidationError` "This claim was already <status>". The
claim's own snapshot of name, cost and shares is what is released, whatever happened to the
reward since. Admin services raise `Unauthorized` for a non-admin.

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

### `lucarne_family/get_rewards`

Read balances. Open to any authenticated user.

**Request**: `{"id": 1, "type": "lucarne_family/get_rewards", "history_limit": 50}` —
`history_limit` (1–500) is optional; `history` is returned only when it is sent.
`include_archived` (default `false`) adds archived rewards to `rewards`. `claims` holds every
`pending` claim, plus the 50 newest resolved ones when `history_limit` is sent; each carries
its `contributors` (`member_slug`, `share`).

**Response**:
```json
{
  "is_admin": false,
  "balances": {"anna": 12, "bob": 0},
  "rewards": [],
  "claims": [],
  "settings": {"streak_daily_bonus": 0, "streak_milestones": []},
  "history": [
    {"id": 3, "created_at": "2026-06-10T08:00:00+00:00", "member_slug": "anna", "delta": 5,
     "kind": "earn", "summary": "Brush teeth", "reason": "", "claim_id": null,
     "actor_name": "Parent"}
  ]
}
```

`balances` lists every member (0 with no rows). `history` is newest first; `actor_name` is
`null` for an automation or the system. Earn and revoke rules: see
[Points ledger](architecture.md#points-ledger).
