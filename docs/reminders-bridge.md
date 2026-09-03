# Apple Reminders bridge

Mirror Apple Reminders lists into Lucarne, and check reminders off in Apple when they are
completed or deleted in Home Assistant. Two pieces:

- **`lucarne-bridge`**, a small command-line app on any Mac signed in to the family's iCloud
  account. It reads Reminders through Apple's EventKit framework and runs every 5 minutes
  from `launchd`.
- **The integration's webhook receiver**, which does all the matching and writing on the HA
  side. There is no blueprint, no automation and no Shortcut to build.

Apple removed Reminders from iCloud's CalDAV service in iOS 13, so a Mac is the only place a
program can read them reliably. Nothing else needs to run on the Mac.

## Install (three steps)

1. **Install the app on the Mac.** Either

   ```sh
   brew install babel-innovations/lucarne/lucarne-bridge
   ```

   or, without Homebrew:

   ```sh
   curl -fsSL https://raw.githubusercontent.com/Babel-Innovations/ha-lucarne/main/bridge/install.sh | sh
   ```

   The release binary is signed and notarized. Install it with one of the commands above
   rather than downloading it in a browser: a browser download is quarantined by macOS.

2. **Copy the install command from Home Assistant.** Open Settings → Devices & services →
   Lucarne Family → Configure → **Apple Reminders bridge**. The dialog shows a line like

   ```sh
   lucarne-bridge install http://homeassistant.local:8123/api/webhook/6f1c…
   ```

   Run it in Terminal on the Mac. It stores the URL, installs the `launchd` agent and runs
   the first sync. macOS asks whether `lucarne-bridge` may access Reminders: click **Allow**.
   The command waits for that first sync and prints what it did.

   If the dialog says no URL is configured, set an internal URL under Settings → System →
   Network first. The URL must be reachable from the Mac; a Tailscale address is fine.

3. **Map lists.** In the same dialog, set the **household** Reminders list (default
   `Family`). Every reminder in it lands in the shared household column. To give a member
   their own list, open Manage members → Edit member and fill in **Apple Reminders list**.
   After the first sync the fields offer the list names the Mac actually has as
   suggestions; before that, type the name as Reminders shows it (case does not matter). A
   name the Mac does not have shows up as a Repairs issue after the next sync.

That is the whole setup. `lucarne-bridge status` on the Mac shows the last sync; the HA dialog
shows it too.

## What syncs, in both directions

| In Apple Reminders | In Home Assistant |
|---|---|
| New reminder in a mapped list | Task appears in that member's (or the household) column, with the reminder's notes and due date |
| Title, notes or due date edited (including clearing the due date) | Task updated in place — matched by Apple's identifier, never by title |
| Reminder completed or deleted | Task marked completed; the daily reset then removes it like any other completed chore |

| In Home Assistant | In Apple Reminders |
|---|---|
| Synced task completed | Reminder checked off on the next sync (within 5 minutes) |
| Synced task deleted — by hand, or by the daily reset | Reminder checked off. Lucarne never deletes a reminder |
| Completed task un-ticked before the next sync | Nothing sent; the reminder stays open |

A few consequences worth knowing:

- **Completing in HA sticks.** Until the Mac confirms the reminder is closed, a task
  completed in HA stays completed even though Apple still lists the reminder as open.
- **Reopening a reminder in Apple is not mirrored.** Once HA has completed a task, unchecking
  the reminder in Apple does not reopen it in HA.
- Only *incomplete* reminders are sent. Completed reminders never appear in HA.
- Reminders are routed by **list**. Apple does not expose shared-list assignees, tags or
  sections to programs, so "assign to Anna" inside one shared list cannot be read; give Anna
  her own list instead (it can be shared with the family in Reminders).
- Two mapped targets can never share one list; the options flow rejects it.

## On the Mac

- `lucarne-bridge status` — configuration, whether the agent is loaded, the last sync result.
- `lucarne-bridge sync` — run one sync now and print the outcome.
- `lucarne-bridge logs` — follow `~/Library/Logs/lucarne-bridge.log`.
- `lucarne-bridge uninstall` — remove the agent and its configuration.

The Mac must stay awake for the agent to fire. `lucarne-bridge install` warns when
System Settings → Energy (or Lock Screen) still lets the Mac sleep. `launchd` catches up on
wake, so a sleeping Mac loses nothing, it just syncs late.

The log is append-only and nothing rotates it (about 100k lines a year at the default
interval). Truncate it whenever you like, or add a `newsyslog.d` rule for it.

Configuration lives in `~/Library/Application Support/lucarne-bridge/` (the webhook URL, mode
0600, and the last sync state). The webhook URL is the credential: anyone who has it can post
reminders into your lists, so treat it like a password and use **Generate a new webhook URL**
in the HA dialog if it leaks. Re-run the install command afterwards.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Install prints "Reminders access denied" | System Settings → Privacy & Security → Reminders → enable `lucarne-bridge`. To make macOS ask again: `tccutil reset Reminders com.babel-innovations.lucarne-bridge` |
| Install prints an HTTP error | The URL is wrong or HA is unreachable from the Mac. Copy it again from the HA dialog; `curl <url>` from the Mac should return JSON |
| A Repairs issue says a list was not found | The Mac reported its list names and the mapped one is not among them. Rename the list in Reminders or fix the mapping; the issue clears on the next sync |
| Reminders sync but a member's column stays empty | That member has no **Apple Reminders list** set, or the list name differs. Check Edit member; after one sync the field is a dropdown |
| Items completed in HA come back | The bridge is not running. `lucarne-bridge status` should show a sync in the last 5 minutes; `launchctl list \| grep lucarne-bridge` should show exit code 0 |
| `lucarne-bridge status` shows `HTTP 400` | The integration rejected the payload; the message names the field. Usually a version mismatch between the app and the integration: update both |
| After a macOS upgrade nothing syncs | macOS may have reset the Reminders permission. `lucarne-bridge sync` in Terminal shows the prompt again |

### Upgrading from the old Shortcut-based bridge

Items the old blueprint created carry the same `[apple:…]` marker and are picked up as-is,
as long as the identifier Shortcuts reported matches the one EventKit reports. If it does
not, each open reminder appears once more after the first sync. Cleanest path: delete the old
`[apple:…]` items from the HA lists before running the install command, then let the first
sync repopulate them. Remove the old `lucarne_reminders_sync` automation and the
`ha-lucarne-sync` Shortcut and launchd agent; nothing uses them any more.

The former "Apple Reminders sync" options (webhook URL, secret, device name) and the
`lucarne_family_apple_writeback_requested` event are gone. The bridge learns what to check
off from the webhook's response, so there is nothing to subscribe to.

## Protocol (for developers)

One webhook per config entry, `GET` and `POST`, at `/api/webhook/<webhook_id>`. The id is a
64-hex token minted at setup and is the only credential; `local_only` is off so the Mac may
reach HA over Tailscale.

**`GET`** returns which lists to send (`sync_interval` is advisory; the launchd interval is
fixed at install time by `lucarne-bridge install --interval`):

```json
{"version": 1, "sync_interval": 300,
 "lists": [{"name": "Family", "target": "household", "entity_id": "todo.lucarne_household"},
           {"name": "Anna",   "target": "anna",      "entity_id": "todo.anna"}]}
```

**`POST`** carries every incomplete reminder of those lists plus the names of all lists on
the Mac:

```json
{"version": 1, "host": "mac-mini", "bridge_version": "1.6.0",
 "available_lists": ["Family", "Anna", "Groceries"],
 "lists": [{"name": "Family", "items": [
   {"id": "6B5B…", "title": "Buy milk", "due": "2026-09-04", "notes": "2 litres"}]}]}
```

`due` is a bare date when the reminder has no time, otherwise RFC 3339 with an offset. A
`due` the integration cannot parse is dropped (the reminder still syncs, without a date); an
`id` containing `]` or whitespace is skipped, since it could not be stored in the sentinel.

The response lists what the Mac must check off:

```json
{"ok": true, "complete": ["6B5B…"], "received": 12, "created": 1, "updated": 3,
 "completed_in_ha": 2, "skipped_lists": [], "unmapped_lists": ["Groceries"]}
```

`skipped_lists` names mapped lists whose HA entity could not be read this run (nothing was
written for them). Errors come back as `400 invalid_json` / `invalid_payload` or
`500 internal`, always with a JSON body. A stale or rotated URL does **not** error: Home
Assistant answers an empty `200` for any unknown webhook id on purpose, so the bridge reports
that as an unexpected (non-JSON) reply. `404 unknown_webhook` only covers the moment the
integration is reloading. The receiver lives in
`custom_components/lucarne_family/apple_bridge.py`.
