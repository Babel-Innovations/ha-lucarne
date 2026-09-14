# Configuration Recipes

Per-household examples for common setups. Start from the closest recipe and adapt.

---

## Recipe 1: 2-adult, no-kids household

**Skip the chores card.** Use Today + Calendar only.

### Helpers to create

None required (no chores tracking).

### Dashboard YAML

```yaml
# /wall-ipad dashboard — Family tab only (no Chores tab needed)
views:
  - title: Family
    path: family
    cards:
      # Calendar display names come from each calendar entity's friendly_name in HA.
      # The `label:` field is deprecated and ignored — rename via Settings →
      # Devices & services → Entities.
      - type: custom:lucarne-today-card
        title: Today
        calendars:
          - entity: calendar.family
            color: "#a8d8b9"
          - entity: calendar.partner_a
            color: "#a8c5e8"
          - entity: calendar.partner_b
            color: "#c8b4e0"
        weather: weather.forecast_home
        tasks: todo.shared_tasks
        presence:
          - entity: binary_sensor.partner_a_home
            name: A
          - entity: binary_sensor.partner_b_home
            name: B

      - type: custom:lucarne-calendar-card
        title: Calendar
        calendars:
          - entity: calendar.family
            color: "#a8d8b9"
          - entity: calendar.partner_a
            color: "#a8c5e8"
          - entity: calendar.partner_b
            color: "#c8b4e0"
        visible_hours:
          start: "07:00"
          end:   "22:00"
        # Rolling window options (all optional — defaults shown):
        min_days: 3        # never show fewer columns than this
        max_days: 7        # cap at this many columns even on wide screens
        min_col_width: 140 # refuse to make columns narrower than this (px)
        max_col_width: 220 # show more days if columns would be wider than this (px)
```

---

## Recipe 2: Large family (5+ kids)

The chores card uses `auto-fit minmax(200px, 1fr)` columns. At 1080 px wide, 5 kids fill 5×200 px
= 1000 px comfortably on a single row; a 6th kid wraps to a second row (no horizontal scroll — the
grid reflowing is the default browser behavior). Options:

**Option A — accept the wrap**: The default. At 1080 px wide, `minmax(200px, 1fr)` yields 5
columns; 6 kids → 5 on row 1, 1 on row 2. Slightly uneven but functional. The lone kid on row 2
may be partially below the fold at 810 px viewport height.

**Option B — split into two chores cards**: Put 3 kids in one card, 2+ in a second, and stack
them vertically. Each card has its own title ("Morning Chores — Group A", etc.).

**Option C — use a wider display**: iPad Pro 12.9" at 1366 CSS px wide shows 6 columns of 200 px
each comfortably, so 6 kids fit on one row.

### Example: 5-member split layout

> **Requires the Lucarne Family integration.** Add members via Settings → Devices & Services →
> Lucarne Family → Configure. The integration creates `todo.<slug>` entities and manages
> daily reset + streak automatically. Member slugs are derived from names (e.g. "Kid A" → `kid_a`).

```yaml
- type: custom:lucarne-chores-card
  title: "Chores — A B C"
  members:
    - kid_a
    - kid_b
    - kid_c

- type: custom:lucarne-chores-card
  title: "Chores — D E"
  members:
    - kid_d
    - kid_e
```

Add tasks (routines and chores) via the "+ Add task" button in each column, or via
Settings → Devices & Services → Lucarne Family → Configure. If a member keeps an Apple
Reminders list, map it to `todo.<slug>` in the Companion app (see
[reminders-bridge.md](reminders-bridge.md)).

---

## Recipe 3: Apartment without a Mac — HA todo only

**No bridge needed.** Use HA's built-in `local_todo` directly, or the Companion app's
Reminders sync if the family already lives in Apple Reminders.

Create todo lists in HA: Settings → Helpers → + (plus) → To-do list. Name them (e.g.
"Shared Tasks", "Groceries"). Add items via the HA app, the iOS Companion widget, or a voice
assistant.

The `lucarne-today-card` can show any `todo.*` entity in its task badge:

```yaml
type: custom:lucarne-today-card
calendars:
  - entity: calendar.personal
    color: "#a8c5e8"
tasks: todo.shared_tasks    # any local_todo entity — no bridge needed
```

The `lucarne-calendar-card` has no dependency on the bridge at all.

### Adding items via iOS Companion

1. Open HA Companion → choose the todo list → tap +
2. Or say "Hey Siri, add milk to Groceries" if you have a Siri shortcut set up that calls
   `ha_call_service` for `todo.add_item`

### Groceries from Apple Reminders

The Companion app's Reminders sync (Settings → Labs) maps a Reminders list such as "Groceries"
to any to-do entity, in either direction, with no Mac involved — see
[reminders-bridge.md](reminders-bridge.md).

---

## Recipe 4: Rolling-window presets

The calendar card's four `*_days` / `*_col_width` options control how many day columns are shown
and how the card auto-fits to the container. Two common starting points:

### Tight 5-day window (desk display / narrow pane)

Use when the calendar pane is narrower than the iPad landscape full width (e.g. the card is
in a 5-column span of a 12-column layout, leaving ~450 px).

```yaml
type: custom:lucarne-calendar-card
title: Calendar
calendars:
  - entity: calendar.family
    color: "#a8d8b9"
  - entity: calendar.partner_a
    color: "#a8c5e8"
visible_hours:
  start: "08:00"
  end: "20:00"
min_days: 3         # always show at least 3 columns
max_days: 5         # cap at 5 — avoids tiny columns on narrow panes
min_col_width: 100  # allow denser layout in portrait orientation
max_col_width: 160  # show more days before widening past this
```

At 450 px pane width, with a 40 px time gutter and `min_col_width: 100`, the formula yields
`min(5, floor((450 - 40) / 100)) = min(5, 4) = 4` columns — comfortable on a narrower display.

### Auto-fit (loose defaults)

Use when you want the card to decide everything based on container width.

```yaml
type: custom:lucarne-calendar-card
title: Calendar
calendars:
  - entity: calendar.family
    color: "#a8d8b9"
visible_hours:
  start: "07:00"
  end: "21:00"
# Defaults: min_days=3, max_days=7, min_col_width=140, max_col_width=220
# At 720 px (iPad 9 Family-tab right pane): visibleCount = 4
# At 1080 px (full-width on same iPad):      visibleCount = 7
```

Omit all four options to accept the defaults. The card will show 3–7 columns depending on
how wide the pane is, always fitting within the `min_col_width` / `max_col_width` band.
