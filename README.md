# ha-lucarne — Family Calendar & Chores Dashboard for Home Assistant

<a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=Babel-Innovations&repository=ha-lucarne&category=integration"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Add to Home Assistant via HACS"></a>
&nbsp;
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
<a href="https://www.home-assistant.io/"><img src="https://img.shields.io/badge/Home%20Assistant-2026.3%2B-blue.svg" alt="Home Assistant 2026.3+"></a>

Turn a tablet into a family command center, driven entirely from Home Assistant.

You install **one thing** — the **Lucarne Family** integration — and it brings three
Lovelace cards with it:

- a rolling multi-day **calendar**,
- a **today** agenda with weather, and
- a per-member **chores & routines** tracker with streaks.

Add a family member and the integration does the plumbing for you — to-do lists,
streak counters, and starter routines — with no manual helpers and nothing to wire
up by hand. The cards register themselves, so there's a single install and no
Lovelace resource to add.

---

## Screenshots

**Today + Calendar** — daily agenda, current weather and tomorrow's forecast, and a rolling calendar
that auto-fits 3–7 days to the screen width with per-person color coding:

![Today and Calendar cards](images/today-and-calendar.png)

**Chores** — per-member routines and chores grouped by time of day, with emoji icons, one-tap
check-off, and a streak counter per person:

![Chores card](images/chores.png)

---

## Install

[![Add to Home Assistant via HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Babel-Innovations&repository=ha-lucarne&category=integration)

1. **Install** — click the button above, then **Download**. To add it by hand instead,
   in HACS open **Integrations → ⋮ → Custom repositories**, paste
   `https://github.com/Babel-Innovations/ha-lucarne`, set Type to **Integration**, then **Download**.
2. **Restart Home Assistant.** On restart the cards register themselves — there's no
   Lovelace resource to add.
3. **Set it up** — go to **Settings → Devices & Services → Add Integration**, search
   for **Lucarne Family**, and enter your family name.
4. **Add family members** from the integration's **Configure** dialog (see
   [Family setup](#family-setup)).
5. **Add the cards** to a dashboard in edit mode. Each card has a **visual editor** —
   add it and click **Edit**. For wall-tablet layouts see [Layout options](#layout-options);
   for the full YAML reference see [docs/cards.md](docs/cards.md).

> Prefer to install by hand? Copy `custom_components/lucarne_family/` into your HA
> config's `custom_components/` directory and restart.

### Optional — the Lucarne theme

The integration ships a pastel **Lucarne** theme and registers it automatically.
It's tuned for wall-mounted tablets and widens HA's `sections` columns so cards sit
side-by-side at full width. Select it per-user under **Profile → Theme → Lucarne**.
It's entirely optional — a [panel view](#layout-options) gives you the same full
width on any theme.

---

## What you get

### Family, managed for you

- **One config, no manual helpers** — add a member and you automatically get their
  to-do list, streak counter, and seeded starter routines.
- **Everything in one dialog** — name, color, avatar, and routine preset live under
  the integration's **Configure** dialog, not scattered across Helpers.
- **Avatars** — upload a photo and crop it square, or just pick an emoji.
- **Routine presets** — start members from built-in presets (school-age kid, toddler,
  adult), or create and reuse your own.
- **Managed daily reset & streaks** — routines reset each morning and streaks are
  checked each night, on a schedule you can change without restarting. Nothing to
  babysit.
- **Safe renames** — renaming a member shows which automations, scripts, and
  dashboards reference the old entity IDs before anything changes.

### The cards

- **Calendar** — rolling N-day window with swipe; auto-fits 3–7 day columns to the
  width, per-person colors, toggle pills, event details, and event creation.
- **Today** — agenda for the next few days, today's weather plus tomorrow's forecast
  and a "what to wear" hint, and a tap-to-check task list with owner avatars.
- **Chores** — per-member routines and chores grouped by time of day, friendly
  recurrence labels, one-tap add/check-off, and a per-member streak counter with a
  celebration when a member finishes their routines. Includes an optional shared
  **Household** column.

---

## Layout options

The three cards work on **any theme** — you don't need the Lucarne theme to use them. How much
horizontal room a card wants differs by card, so pick the layout that matches what you're building.

> **Why layout matters.** In a `type: sections` view each column is capped at
> `ha-view-sections-column-max-width` (HA default **500px**) and centered. A single card copes fine
> with that, but placing **Today + Calendar side-by-side** in one 500px column squeezes them. The
> wide "wall tablet" experience therefore needs a layout that gives the cards room — either escape
> the cap (panel view) or raise it (Lucarne theme).

### Recommended — panel view (widest, any theme)

A `type: panel` view ignores the sections column cap and renders edge-to-edge on whatever theme you
already use. It's the simplest way to get the full Today + Calendar wall layout without switching
themes. Wrap the two cards in a `horizontal-stack`.

This is a **view (dashboard) definition, not card YAML** — `type: panel` is the *view* type, so it
belongs in your dashboard config, not in an individual card's YAML editor. Add it via **Edit
dashboard → ⋮ → Raw configuration editor**, as one entry under the dashboard's `views:` list:

```yaml
# Under your dashboard's `views:` — this whole block is one view, not a card.
views:
  - type: panel
    title: Family
    cards:
      - type: horizontal-stack
        cards:
          - type: custom:lucarne-today-card
            # ...your today-card config (see docs/cards.md)...
          - type: custom:lucarne-calendar-card
            # ...your calendar-card config...
```

A panel view shows just this one stack (no badges or extra sections), which is usually exactly what
you want on a dedicated tablet.

### Built-in Lucarne theme (designed for wall-mounted tablets)

The integration ships and auto-registers a pastel **Lucarne** theme. It's tuned for
**wall-mounted / kiosk tablets**: a calm cream-and-pastel palette the cards were
designed against, plus it widens `type: sections` columns to 1200px
(`ha-view-sections-column-max-width`) so Today + Calendar sit side-by-side at full tablet width
*without* a panel view. Select it per-user under **Profile → Theme → Lucarne**. Choose this if you
want the look in the screenshots or prefer to keep building with `sections` views.

### Single card in an existing dashboard

Just want one card on a dashboard you already have? Drop any single card into your normal `sections`
or `masonry` view — no theme or panel needed. The calendar auto-fits to fewer day columns in a
narrow space, the chores card wraps, and the today card adapts to its container.

---

## Family setup

Open **Settings → Devices & Services → Lucarne Family → Configure** to manage members.

### Add a member

1. Choose **Manage members → Add member**
2. Fill in name, color, and routine preset:
   - **School-age kid** — brush teeth, make bed, pack school bag (weekdays), screen time off
   - **Toddler** — brush teeth, get dressed, put toys away
   - **Adult (none)** — empty
3. Click **Submit**. The integration creates the member's to-do list and streak
   counter, and seeds the preset routines.
4. Set the member's avatar (photo with crop, or emoji) from the chores-card editor.

### Edit schedule

Choose **Edit schedule** to adjust the daily reset time (default `04:00`) and streak check time
(default `21:00`). Changes take effect immediately — no HA restart needed.

### Routine presets

Choose **Routine presets** to view the built-in presets, or create / edit / delete your own custom
presets and reuse them when adding members.

See [docs/integration.md](docs/integration.md) for the full member management, rename, and
remove workflows, and [docs/cards.md](docs/cards.md) for the card YAML reference.

---

## Apple Reminders (optional)

The Home Assistant Companion app can mirror an Apple Reminders list into any Lucarne column,
in both directions, from one phone: Settings → Labs → Reminders sync, then map the list to
`todo.lucarne_household` or `todo.<member>`. See
[docs/reminders-bridge.md](docs/reminders-bridge.md).

---

## Custom events

The integration fires `lucarne_family_all_routines_done` when all of a member's
routines complete for the day.

See [docs/events.md](docs/events.md) for the full schema and a TTS example automation.

---

## Troubleshooting

**Cards show "Custom element not defined"**
The integration registers the cards on startup, so make sure you **restarted HA** after installing
and that the integration is set up. Then hard-refresh the browser (Cmd+Shift+R) to clear the
cached bundle. You can confirm the bundle is served by opening `/lucarne_family_frontend/ha-lucarne.js`
in your browser — it should return JavaScript, not a 404.

**Chores card shows "Lucarne Family integration not set up"**
Add and configure the integration (install step 3). The card requires it; other cards do not.

**Google Calendar polling delay (up to 15 min)**
HA's Google Calendar integration polls on a fixed schedule. This is a HA core limitation.

---

## License

[MIT](LICENSE)
