# Custom Events

## Integration events (lucarne_family)

The `lucarne_family` integration fires the following HA bus events. Subscribe to them in
automations via `trigger: event`.

### Frontend consumption — the `lucarne_family/subscribe` relay

The cards do **not** subscribe to these bus events directly. HA's WebSocket API forbids
**non-admin** clients (e.g. the always-on kiosk tablet, a read-only user) from
`subscribe_events` on arbitrary bus events — every attempt is rejected with `Unauthorized`,
and because the cards auto-resubscribe on each WebSocket reconnect, this produced a steady
flood of server-side errors (`Refusing to allow <user> to subscribe to event lucarne_family_*`).

Instead, the integration exposes a WebSocket command — `lucarne_family/subscribe` (registered in
`websocket_api.py`, **not** admin-gated) — that runs the bus listeners server-side and relays
each event in `LUCARNE_FRONTEND_EVENTS` to the subscribing client as `{ event_type }`. Only the
event name is relayed: the cards treat any relayed event purely as a refresh cue and never read a
payload, so the bus event's `data` is intentionally **not** forwarded to (potentially non-admin)
clients. The frontend (`src/shared/family-subscription.ts`) subscribes once — note
`subscribeMessage` takes the message handler as its **first** argument and the command as its
second:

```ts
connection.subscribeMessage(
  () => { /* re-fetch on any relayed event */ },
  { type: 'lucarne_family/subscribe' },
);
```

To relay a newly-added event to the cards, add its name to `LUCARNE_FRONTEND_EVENTS`.

---

### lucarne_family_task_completed

Fired when any managed todo item transitions from `needs_action` to `completed`, regardless of the
source (card tap, Developer Tools, voice command, another automation, etc.).

For **rotating tasks**, `member` is the `current_owner` slug (the person whose turn it was), not
the generic `"household"` slug — so the history accurately shows who completed it.

**Payload:**

```yaml
event_type: lucarne_family_task_completed
event_data:
  member: anna            # member slug (for rotating tasks: current_owner at time of completion)
  uid: "abc-123"          # todo item UID
  summary: "Brush teeth"  # item display name at time of completion
```

---

### lucarne_family_all_routines_done

Fired on every false-to-true transition of the all-routines-done gate per member. If a routine
is later un-completed and the member completes it again, the event fires again. Does not fire if
all routines were already complete before the most recent toggle.

**Payload:**

```yaml
event_type: lucarne_family_all_routines_done
event_data:
  member: anna    # member slug
```

**Example consumer:**

```yaml
alias: "All routines done — celebrate!"
trigger:
  - trigger: event
    event_type: lucarne_family_all_routines_done
    event_data:
      member: anna
action:
  - service: tts.speak
    target:
      entity_id: tts.google_translate_en_com
    data:
      media_player_entity_id: media_player.kitchen_homepod
      message: "Great job Anna! All routines done today!"
```

---

### lucarne_family_rotation_advanced

Fired when a rotating task's `current_owner` advances to the next owner. This happens at the daily
reset window when the task was completed by the previous owner.

**Payload:**

```yaml
event_type: lucarne_family_rotation_advanced
event_data:
  uid: "abc-123"           # rotating task UID
  summary: "Pick up milk"  # task display name
  from: alice              # previous owner slug
  to: bob                  # new owner slug
```

**Notes:**
- Only fires when the task was **completed** before reset. An uncompleted rotating task does not
  advance the owner and does not fire this event.
- If the previous owner was removed from the family (an edge case where the owner list is sanitized
  at reset time), `from` may reflect the slug that was removed.

---

### lucarne_family_task_added

Fired when `lucarne_family.add_task` successfully creates a new task.

**Payload:**

```yaml
event_type: lucarne_family_task_added
event_data:
  member: anna
  uid: "abc-123"
  type: routine       # "routine", "chore", or "rotating"
  summary: "Make bed"
```

---

### lucarne_family_task_deleted

Fired when `lucarne_family.delete_task` removes a task.

**Payload:**

```yaml
event_type: lucarne_family_task_deleted
event_data:
  uid: "abc-123"
```

---

### lucarne_family_task_metadata_updated

Fired when `lucarne_family.update_task_metadata` completes for a uid — including
when the call carried no updatable field and so modified nothing. Treat it as a
refresh cue, not proof a row changed.

**Payload:**

```yaml
event_type: lucarne_family_task_metadata_updated
event_data:
  uid: "abc-123"
```

---

### lucarne_family_task_toggled

Fired when `lucarne_family.toggle_task` flips a task's status. Note: the completion listener also
fires `lucarne_family_task_completed` for the same transition — this event is the service-call
signal, not a replacement for the completion event.

**Payload:**

```yaml
event_type: lucarne_family_task_toggled
event_data:
  uid: "abc-123"
  action: completed   # "completed" or "undone"
```

---

### lucarne_family_avatar_uploaded

Fired when `lucarne_family.upload_avatar` successfully writes an avatar file.

**Payload:**

```yaml
event_type: lucarne_family_avatar_uploaded
event_data:
  member: anna
  avatar: "/local/lucarne/avatars/anna.png"  # URL path served by HA
```

---

### lucarne_family_member_updated

Fired when a member's metadata field is changed via a service call. Currently fired by
`lucarne_family.set_member_avatar` after the avatar is updated.

**Payload:**

```yaml
event_type: lucarne_family_member_updated
event_data:
  member: anna    # member slug
  field: avatar   # which field changed (currently always "avatar")
```

The frontend `family-subscription.ts` subscribes to this event to refresh member state in cards
(avatar changes appear without a dashboard reload).

---

### lucarne_family_apple_writeback_requested

Fired when a task with `source == "apple"` **and a non-empty `apple_uid`** (set by the Apple
sentinel backfill when the item first appeared) flips to `completed` **and**
`round_trip.enabled == true` in the Options Flow config. Nothing consumes it: the Mac-side
receiver it was designed for was never built, and the Companion app's two-way Reminders sync
has superseded the idea — see
[`docs/reminders-bridge.md`](reminders-bridge.md#round-trip-writeback).

**Payload:**

```yaml
event_type: lucarne_family_apple_writeback_requested
event_data:
  apple_uid: "Apple-UUID-string"   # from [apple:UUID] sentinel embedded by the bridge
  status: "completed"
  timestamp: "2026-05-25T14:30:00+00:00"   # UTC ISO-8601
  device_name: "Mac mini"          # from Options Flow config (for receiver identification)
```

> **Security note**: `webhook_url` and `secret` are intentionally absent. HA bus events are
> visible to all integrations and any user with Developer Tools access. Secrets stay in
> `entry.data` only; retrieve them via `get_round_trip_config(hass)`.

---

## Legacy event — ha_lucarne_chores_all_done

> **Deprecated (Phase 3+)**: This event is no longer fired by the card. As of Phase 4 the
> card is a view over integration state and does not fire HA events. The `lucarne_family`
> integration fires a compatibility shim (see below) so existing automations continue to
> work without changes. Migrate to `lucarne_family_all_routines_done` (above) — it fires
> independent of card load state and is the canonical signal for Phase 3+.

Starting Phase 3, the `lucarne_family` integration fires this event as a compatibility shim
whenever all routines for a member transition to done. This fires independent of whether the
card is loaded. The payload is simplified compared to the original card-fired payload.

### Semantics

- **Integration shim only** (Phase 3+): fired by the integration's completion listener
  whenever all routine-type todo items for a member flip to `completed`. Fires independent
  of card load state.
- Prior to Phase 4, the card also fired this event with a richer payload (`kid_slug`,
  `kid_name`, `streak`, `chores_completed`). That card-side firing is removed in Phase 4;
  the card no longer emits HA events.

### Schema (integration — compatibility shim payload)

```yaml
event_type: ha_lucarne_chores_all_done
event_data:
  member: anna    # member slug (matches lucarne_family_all_routines_done payload)
```

### Example consumer automation

> **Integration shim only (Phase 3+).** Prior to Phase 4, the chores card carried
> `kid_name` and `streak` in this event. The card no longer fires HA events (Phase 4+).
> Only the integration's compatibility shim fires `ha_lucarne_chores_all_done`, with
> `member` as the only payload field. New automations should use `lucarne_family_all_routines_done`
> (see [Example consumer automation](#example-consumer-automation-1) above).

```yaml
alias: "Chores all done — celebrate! (integration shim payload)"
trigger:
  - trigger: event
    event_type: ha_lucarne_chores_all_done
action:
  - variables:
      member: "{{ trigger.event.data.member }}"
  - service: tts.speak
    target:
      entity_id: tts.google_translate_en_com   # replace with your TTS provider entity
    data:
      media_player_entity_id: media_player.kitchen_homepod
      message: "Great job {{ member }}! All routines done today!"
  # Or: send a push notification via the Companion app
  # - service: notify.mobile_app_iphone
  #   data:
  #     title: "🎉 {{ member }} finished their routines!"
```

**Recommended migration:**

```yaml
# Replace ha_lucarne_chores_all_done with:
trigger:
  - trigger: event
    event_type: lucarne_family_all_routines_done
    event_data:
      member: anna   # use the member slug
```

### Breaking-change policy

The fields above are locked in v1. Adding new fields is backwards-compatible.
Renaming or removing existing fields is a breaking change and requires a major
version bump (v2.0.0).

`ha_lucarne_chores_all_done` pre-dates this policy and is exempt from the v1
lock. It will be removed in the first stable release (v1.0.0).

---

## Migration table (legacy → new)

| Legacy event | Deprecated since | Replacement | Notes |
|---|---|---|---|
| `ha_lucarne_chores_all_done` | Phase 3 | `lucarne_family_all_routines_done` | Payload changed: legacy had `kid_slug`, `kid_name`, `streak`, `chores_completed`; compat shim only has `member` |

