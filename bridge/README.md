> **Superseded.** The Home Assistant Companion app (2026.8+) syncs Apple Reminders lists with
> to-do entities natively — see [`docs/reminders-bridge.md`](../docs/reminders-bridge.md).
> The Shortcut + launchd setup below is kept for reference only.

# MacOS Bridge — Install Instructions

Sets up the `ha-lucarne-sync` macOS Shortcut + launchd job that pushes Apple Reminders to HA every 5 minutes.

## Prerequisites

- macOS 13 (Ventura) or later
- Shortcuts.app launched at least once (required for `shortcuts run` CLI)
- iCloud account signed in to Reminders, with access to the Family and Groceries lists
- MacOS configured to **not sleep** (System Settings → Lock Screen → disable "Put computer to sleep when display is off")

## 1. Generate webhook secret + store in Keychain

On this MacOS (or any machine, then transfer):

```sh
openssl rand -hex 32
```

Copy the output. Then store it:

```sh
security add-generic-password -a "ha-lucarne" -s "ha-lucarne-webhook-secret" -w "<the-secret>"
```

To retrieve later (used by the Shortcut at runtime):

```sh
security find-generic-password -a "ha-lucarne" -s "ha-lucarne-webhook-secret" -w
```

## 2. Build and install the Shortcut

> **Note**: The `ha-lucarne-sync.shortcut` binary is not committed to the repo (it's user-specific and created locally). `bridge/ha-lucarne-sync.json` in the repo documents the Shortcut's logical structure. You must build it manually in Shortcuts.app following the steps below. The `.shortcut` file is exported after you build it and kept locally on the mini.

Open Shortcuts.app on the Mac mini and create a new Shortcut named `ha-lucarne-sync`. Build the following action sequence (refer to `bridge/ha-lucarne-sync.json` for the full logical structure):

1. **Run Shell Script** → `security find-generic-password -a 'ha-lucarne' -s 'ha-lucarne-webhook-secret' -w` → result: `WEBHOOK_SECRET`
2. **Get Reminders** from "Family" list, optionally filtered by Assignee = "Ingrid"
3. **Repeat with Each** → build `{id, title, due, completed, notes}` dict per reminder → accumulate to `family_items`
4. **Get Reminders** from "Groceries" list (all items)
5. **Repeat with Each** → build dict per reminder → accumulate to `groceries_items`
6. **Make Dictionary** → `{"lists": [{"apple_list_name": "Family", ...}, {"apple_list_name": "Groceries", ...}]}`
7. **Get Contents of URL** → POST to `http://homeassistant.local:8123/api/webhook/[WEBHOOK_SECRET]` with JSON body
8. **If** status ≠ 200 → log a notification

After building, update the list names if they differ from "Family" / "Groceries".

## 3. Test the Shortcut manually

In Shortcuts.app, click the Play (▶) button next to `ha-lucarne-sync`. Check HA — items should appear in the target `todo.*` entities within a few seconds.

Also test from Terminal:

```sh
shortcuts run "ha-lucarne-sync"
echo "Exit code: $?"
```

Exit code 0 = success.

## 4. Install the launchd agent

Copy the plist, substituting your macOS username:

```sh
sed 's/<USERNAME>/'"$(whoami)"'/g' com.molant.ha-lucarne-sync.plist \
  > ~/Library/LaunchAgents/com.molant.ha-lucarne-sync.plist

launchctl load ~/Library/LaunchAgents/com.molant.ha-lucarne-sync.plist
```

Verify it's loaded:

```sh
launchctl list | grep ha-lucarne-sync
```

Should show the label with exit code `0` (or `-` if not yet fired).

## 5. Monitor

```sh
tail -f ~/Library/Logs/ha-lucarne-sync.log
```

Successful runs are silent — the Shortcut only logs on HTTP non-200 errors. An empty or quiet log means the bridge is running correctly. To confirm syncs are firing: check HA's automation traces (`Developer Tools → Traces → automation.lucarne_reminders_sync`) or watch the `last_changed` timestamp on the target todo entity after a sync cycle.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `shortcuts run` hangs or errors | Launch Shortcuts.app manually once, then retry |
| HTTP 200 but HA items don't update | Check automation trace: HA → Settings → Automations & Scenes → `lucarne_reminders_sync` → Traces. If no trace: **Local only** may be rejecting the mini's Tailscale IP (100.x). Open the automation instance → set **Local only** to **off** → save. |
| Shortcut runs but Reminders list is empty | Confirm iCloud account is signed in on this Mac and the list is synced |
| launchd agent not firing | Check `launchctl list | grep ha-lucarne-sync` — non-zero exit code means the Shortcut errored. Check the log. |
| After macOS major upgrade | Re-launch Shortcuts.app manually — the `shortcuts run` CLI requires it |

---

## When using the Lucarne Family integration

The Lucarne Family integration creates `todo.<slug>` entities for each member (e.g. `todo.anna`,
`todo.bob`) and a shared `todo.lucarne_household`. The bridge can target these entities directly —
update the **List Mappings** in the `lucarne_reminders_sync` automation instance to point to the
integration-managed entities:

```json
{"Family": "todo.anna", "Groceries": "todo.lucarne_household"}
```

The key must exactly match the `apple_list_name` value the Shortcut sends. The integration's
Apple-sentinel backfill (`apple_sentinel_backfill.py`) reads `[apple:UUID]` sentinels from item
descriptions and writes `source=apple` metadata rows — so synced Reminders appear with integration
metadata in the chores card.

**Assigning Reminders to the chores card**: for a Reminder to surface in the chores card under a
specific member's column, it must land in that member's `todo.<slug>` entity. For it to appear in
the household column, map its Reminders list to `todo.lucarne_household`.

---

## Adapting to fewer or more Reminders lists

The Shortcut contains one "Get Reminders" + "Repeat with Each" step pair per list. To add a list:

1. Open Shortcuts.app → `ha-lucarne-sync` → edit
2. Duplicate an existing "Get Reminders" + "Repeat with Each" block
3. Change the list name in the "Get Reminders" step
4. Append the new list's items array to the JSON payload Dictionary under a new key
5. In the HA automation backed by `lucarne_reminders_sync`, open its instance and edit the
   **List Mappings** field — add a new key/value pair, e.g.:
   ```json
   {"Family": "todo.anna", "Groceries": "todo.lucarne_household", "NewList": "todo.new_list"}
   ```
   The key must exactly match the `apple_list_name` value the Shortcut sends in the payload.

To remove a list: delete the corresponding block from the Shortcut and remove the key/value pair
from the **List Mappings** JSON in the automation instance. The corresponding `todo.*` entity in HA
will retain its last-synced items until you clear it manually.

## Adapting to non-shared lists (individual, not family)

If a list is private (not shared with other family members) and you don't want assignee filtering:

1. In the "Get Reminders" step for that list, remove the Assignee filter (if one exists)
2. The Shortcut will sync all items in the list regardless of who added them

If you want per-person filtering on a shared list (e.g. only items assigned to "Ingrid"):

1. In the "Get Reminders" step, add filter: **Assignee** is **Ingrid**
2. Only Ingrid's assigned items from that list will sync to HA

## Extended troubleshooting matrix

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `launchctl list` shows non-zero exit code | Shortcut errored | Check `~/Library/Logs/ha-lucarne-sync.log`; re-run `shortcuts run "ha-lucarne-sync"` in Terminal |
| Shortcut runs but list is empty | iCloud not synced on this Mac | Open Reminders.app and confirm lists appear |
| HTTP 401 from HA | Wrong webhook secret in Keychain | Re-run `security add-generic-password` with correct secret |
| HTTP 400 from HA | Malformed JSON in Shortcut | Check the Dictionary step in Shortcuts.app for typos |
| Items sync but wrong todo entity | Mismatched key in List Mappings JSON | Open automation instance → check **List Mappings** key matches the Shortcut's `apple_list_name` exactly. When using the Lucarne Family integration, target entities are `todo.<slug>` or `todo.lucarne_household`. |
| Shortcut works manually but not via launchd | PATH or Keychain ACL issue | Load the agent with `launchctl load ~/Library/LaunchAgents/com.molant.ha-lucarne-sync.plist` and check log |
| After macOS major upgrade | `shortcuts run` CLI reset | Re-launch Shortcuts.app manually then test `shortcuts run "ha-lucarne-sync"` |
