# Apple Reminders

Use the Home Assistant Companion app's built-in **Reminders sync** (a Labs feature since app
version 2026.8). It maps an Apple Reminders list to a Lucarne to-do entity in either direction
or both, and needs nothing installed beyond the app already on your phone. Lucarne needs no
configuration for it: synced reminders land as ordinary to-do items and the cards render them
as Anytime chores (no icon or schedule unless you edit them — see the caveat below).

The Shortcut + launchd + blueprint bridge documented under `bridge/` and
`blueprints/automation/` predates that feature and is superseded; leave it uninstalled.

## Set up (on one iPhone or iPad signed in to the family's iCloud)

1. Open the Companion app → **Settings** → **Labs** → **Reminders sync** and enable it. Grant
   Reminders access when iOS asks.
2. Add a sync: pick the Reminders list, the Lucarne to-do entity it should mirror, and the
   direction.

   | Reminders list | Lucarne entity | Lands in |
   |---|---|---|
   | e.g. `Family` | `todo.lucarne_household` | the household column |
   | e.g. `Anna` | `todo.anna` | Anna's column |

   Use **Both ways** so completing or deleting a task on the wall tablet checks the reminder
   off, and vice versa. One list per member: Apple exposes no per-reminder assignee to apps,
   so a shared "Family" list cannot be split by who it is assigned to.
3. The Reminders sync settings also expose the **foreground** and **background** refresh
   intervals and a **conflict resolution** rule for edits made on both sides between syncs.

## What to expect

- **Title, notes, due date and completion** are what the sync tracks. Notes appear under the
  task on the Today card.
- **Latency.** While the Companion app is open the sync runs on the foreground interval. In
  the background it runs through iOS background refresh, which iOS schedules itself: often
  minutes, sometimes longer, and not while the phone is in Low Power Mode. Opening the app
  triggers a sync.
- **Deletions propagate** with "Both ways": deleting a task in Lucarne removes the reminder.
- **Don't edit synced tasks in Lucarne.** A synced item has no Lucarne metadata, so the daily
  reset leaves it alone: a completed one simply stops rendering after the next reset boundary
  while staying (checked off) in Reminders. Editing it in Lucarne (type, icon, recurrence)
  *adopts* it, and from then on the reset treats it like any Lucarne task: a completed chore is
  **deleted** at `reset_time` (a routine is flipped back to unchecked instead), and with "Both
  ways" a deletion removes the reminder too. If the
  Reminders list is the system of record, use "To Home Assistant" for that list, or leave
  synced tasks unedited.
- **Which phone.** Only the device running the sync needs the app; the list itself can be
  shared with the rest of the family in Reminders.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Nothing appears in Lucarne | Companion app → Settings → Labs → Reminders sync: the sync's history shows the last run and any error. Open the app to force a sync. |
| Items appear but completion does not come back | The sync direction is "To Home Assistant"; switch to "Both ways". |
| Duplicates after re-adding a sync | The app links reminders to to-do items per sync; a re-created sync may not recognise the old pairs. Delete the duplicates once on either side. |

## Round-trip writeback

The integration's "Apple Reminders sync" options (Settings → Devices & services → Lucarne
Family → Configure) and the `lucarne_family_apple_writeback_requested` event belong to the
superseded Shortcut bridge: they only ever fired an event for a receiver that was never built.
With the Companion app's two-way sync, completion reaches Reminders without them. Leave the
toggle off.
