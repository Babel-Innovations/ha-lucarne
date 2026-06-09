# Card options (YAML reference)

Every card has a **visual editor** — add a card, click **Edit**, and configure it
with form controls. You rarely need to touch YAML. This page is the full reference
for the options behind that editor, for anyone who prefers editing YAML directly.

## `lucarne-today-card`

```yaml
type: custom:lucarne-today-card
title: Today            # optional, default "Today"
calendars:
  # Display names come from each calendar's friendly_name in HA — rename via
  # Settings → Devices & services → Entities. The label: field is deprecated
  # and ignored; safe to remove from existing configs.
  - entity: calendar.family
    color: "#a8d8b9"    # any CSS color; shown as left-border dot on events
  - entity: calendar.ingrid
    color: "#c8b4e0"
weather: weather.forecast_home      # optional
tasks: todo.ingrid_tasks            # optional; shows task-count badge (raw todo entity mode)
presence:                           # optional; shows home/away pills in header
  - entity: binary_sensor.anton_home
    name: A
  - entity: binary_sensor.ingrid_home
    name: I
agenda_show_tomorrow: false         # optional, default false; agenda shows today only,
                                    #   set true to also include tomorrow (scrolls if long)
max_tasks: 5                        # optional, default 5; max tasks shown — extra tasks
                                    #   stay hidden (not scrollable)
refill_tasks_on_complete: false     # optional, default false; when false a completed task
                                    #   disappears and its slot is NOT refilled from the
                                    #   backlog. Set true for a rolling list.
section_order:                      # optional; drag to reorder in the visual editor
  - calendar
  - weather
  - tasks

# Lucarne Family integration toggles (both default false; require the integration)
household_tasks_from_integration: false   # if true, ignores tasks: and shows household tasks from integration
show_family_ready_pill: false             # if true, shows N/M ready pill in header
```

> **Backward compat**: `tasks: todo.ingrid_tasks` (raw entity mode) continues to work. Setting
> `household_tasks_from_integration: true` replaces it with the integration-backed household list.

## `lucarne-calendar-card`

```yaml
type: custom:lucarne-calendar-card
title: Calendar         # optional, default "Calendar"
calendars:
  - entity: calendar.family
    color: "#a8d8b9"
  - entity: calendar.ingrid
    color: "#c8b4e0"
  - entity: calendar.anton
    color: "#a8c5e8"
visible_hours:          # optional; crop the time grid to these hours
  start: "07:00"
  end:   "21:00"
# Rolling window options (all optional — defaults shown):
min_days: 3             # never show fewer day columns than this
max_days: 7             # cap at this many columns even on wide screens
min_col_width: 140      # refuse to make columns narrower than this (px)
max_col_width: 220      # show more days if columns would be wider than this (px)
show_create_button: true  # optional; shows a + button on empty slots
# NOTE: week_starts_on is deprecated and silently ignored
```

## `lucarne-chores-card`

> **Requires the Lucarne Family integration** to be set up. Without it the card shows
> an error block. Old YAML configs with a `kids:` array also show an upgrade block.

```yaml
type: custom:lucarne-chores-card
title: Chores           # optional, default "Chores"
members:                # slugs of members to show — must match integration members
  - anna
  - bob
  - household           # optional; shows the shared todo.lucarne_household list
show_routines: true     # optional, default true
show_tasks: true        # optional, default true
show_streak: true       # optional, default true
auto_scroll: true       # optional, default true — scroll each column to the
                        # section matching the current time of day
afternoon_start: '12:00' # optional, default 12:00 — local time the columns
                        # switch to the Afternoon section
night_start: '19:00'    # optional, default 19:00 — local time the columns
                        # switch to the Night section
```

Member slugs are derived from names entered in the integration (e.g. "Anna" → `anna`).
The visual editor populates and reorders the member list from the integration automatically.

When `auto_scroll` is on (the default), each member column starts scrolled to the
time-of-day section for the current local time, and re-scrolls as the clock crosses
`afternoon_start` and `night_start` — handy for a wall-mounted tablet left open all day.
Manually scrolling a column is preserved until the next threshold (toggling a task
does not jump it back). Set `auto_scroll: false` to keep every column at the top.

### Rotating tasks in the chores card

Rotating tasks are stored in the shared household list but the card routes each one into
the **current owner's column** — not the household column — so the person whose turn it
is always sees it alongside their own tasks.

Visual markers on a rotating task row:

| Element | Meaning |
|---------|---------|
| **↻** badge (right edge) | Indicates this is a rotating task |
| **"next: \<name\>"** hint (below the title) | Shows the next owner in the rotation order; hidden when only one owner is configured |

The **↻ badge** and **"next" hint** are display-only — the backend is authoritative for
actual ownership advancement (at the daily-reset window). The hint is computed client-side
from `rotation_owners` and `current_owner` using the same wrapping logic as the backend,
so it will always agree with what the reset produces.

**Column placement**: `show_tasks` controls whether rotating tasks are visible (same toggle as chores).
The `show_routines` toggle does not affect rotating tasks.
