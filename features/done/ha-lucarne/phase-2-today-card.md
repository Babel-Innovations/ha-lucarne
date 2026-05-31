---
status: in_progress
---

# Phase 2: `lucarne-today-card`

Replace the bare `todo-list` cards on the Family tab with a single designed hero panel: agenda strip + weather + Ingrid's tasks summary + presence. First custom Lit card — sets the visual/architectural pattern for Phase 3 and 4. By the end of this phase, walking past the iPad gives a clear answer to "what's next?" without tapping.

## Context

Read [./README.md](./README.md) and [./phase-1-foundation.md](./phase-1-foundation.md) first. Phase 2 depends on Phase 1 being deployed and the following artifacts existing — verify each before starting:
- Repo at `~/src/home-assistant-things/ha-projects/ha-lucarne/` with the `lucarne-today-card` placeholder (`src/cards/lucarne-today-card.ts`).
- `dist/ha-lucarne.js` built and committed (Phase 1 Build Verification).
- `todo.<ingrid_entity>` exists and receives Reminders sync — record the EXACT entity ID (HA may have used `todo.ingrid_s_tasks`). Confirm via `ha_search_entities` with `domain_filter: "todo"`.
- `automation.lucarne_reminders_sync` exists and is `on` (via `ha_get_state`).
- Family tab on `/wall-ipad` exists with stock `todo-list` cards (this phase replaces the first one). Verify via `ha_config_get_dashboard` for dashboard `wall-ipad`.
- **Calendar entity IDs from Phase 1 baseline discovery**: re-run `ha_search_entities` with `domain_filter: "calendar"` if you don't have the list handy. Phase 1 Sub-Phase D.2 wiki updates should have recorded them in `~/src/Tower/home-automation/dashboards/wall-ipad.md` — check there first.
- `weather.forecast_home`, `input_boolean.molant_home`, `input_boolean.gridou_home` all return non-`unavailable` states.

**Before any HA write**, re-read `skill://home-assistant-best-practices/SKILL.md`. From its Reference Files table, read:
- `references/dashboard-cards.md` (custom card YAML conventions)

This phase is largely repo work (Lit/TS), not HA config. The HA-side change is one dashboard mutation that swaps the cards on the Family tab.

## Structure

```
~/src/home-assistant-things/ha-projects/ha-lucarne/
  src/
    cards/
      lucarne-today-card.ts          # REWRITE: placeholder → real impl
    components/                       # NEW dir
      agenda-strip.ts                 # subcomponent: next N events
      weather-block.ts                # subcomponent: today + tomorrow + dressing tip
      tasks-summary.ts                # subcomponent: count + top 3
      presence-pills.ts               # subcomponent: who's home
    editors/                          # NEW dir
      lucarne-today-card-editor.ts   # Lovelace UI editor for card config
    shared/
      ha-subscriptions.ts             # NEW: WebSocket helpers (calendar/state subs)
      design-tokens.ts                # EXTEND: add semantic tokens (spacing, radii, type)
      icons.ts                        # NEW: mdi subset (sun, cloud, etc.)
      types.ts                        # NEW: TS interfaces for HA Calendar, Weather, Todo, etc.
    index.ts                          # UPDATED: imports card + editor
  docs/
    architecture.md                   # UPDATE: add today-card section
  tests/                              # NEW dir
    components/
      dressing-tip.test.ts            # pure-function tests for the dressing-tip derivation
      agenda-sort.test.ts             # event sort/merge logic

HA changes (no files; via MCP):
  /wall-ipad Family tab: replace 2 stock todo-list cards with one `custom:lucarne-today-card`
  Optional: a 2nd row preserving the stock Groceries todo-list (so the iPad still surfaces groceries while the today-card focuses on Ingrid's tasks)
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline Verification (before starting)

- [ ] Phase 1 status is `done` per its frontmatter.
- [ ] Confirm the iPad still renders the Family tab with the stock todo-list cards. User confirmation.
- [x] `npm run build && npm run lint && npm run typecheck` in `ha-projects/ha-lucarne/` — all pass cleanly.
- [ ] Pull latest: `git pull origin main` to make sure the working tree matches GitHub.
- [ ] Confirm `weather.forecast_home`, the actual calendar entity IDs captured during Phase 1 baseline (do NOT assume `calendar.family` — verify via `ha_search_entities` with `domain_filter: "calendar"` per Phase 1's placeholder warning), `input_boolean.molant_home`, `input_boolean.gridou_home`, and `todo.<ingrid_entity>` (the exact slug from Phase 1 B.3) all return real values via `ha_get_state`.

### Sub-Phase A: HA subscription primitives + types

Goal: a tiny shared library that future cards reuse. **Deployable**: the existing placeholder card still works; new helpers are exported but unused.

#### A.1 TypeScript types

- [x] Create `src/shared/types.ts` with TS interfaces for the HA data shapes we consume. At minimum:
  - `HassEntity` (re-export from `home-assistant-js-websocket`)
  - `CalendarEvent { start: string; end: string; summary: string; description?: string; location?: string; uid?: string }`
  - `WeatherForecast { datetime: string; temperature: number; templow?: number; condition: string; precipitation?: number; precipitation_probability?: number }`
  - `TodoItem { uid: string; summary: string; status: 'needs_action' | 'completed'; due?: string; description?: string }`
  - `PersonPresence { entity_id: string; name: string; is_home: boolean }`
  - `CalendarConfig { entity: string; color: string; label: string }` — the YAML shape

#### A.2 WebSocket subscription helpers

- [x] Create `src/shared/ha-subscriptions.ts` with:
  - `subscribeEntityState(hass, entityId, callback)` — wraps the existing `hass.connection.subscribeMessage` pattern; returns an unsubscribe function. Use this for `weather.*`, `input_boolean.*`, etc.
  - `fetchCalendarEvents(hass, entityIds: string[], start: Date, end: Date): Promise<Map<string, CalendarEvent[]>>` — calls the WS API `calendar/list_events` (or batches via `calendar.get_events` action — verify which is available; the WS message type `calendar/list_events` returns events for a single entity per call, so we'll fan out in parallel via Promise.all).
  - `subscribeTodoItems(hass, entityId, callback)` — subscribes to state changes for the todo entity, then `todo.get_items` to fetch the full list on each change. Callback receives a `TodoItem[]`.
- [x] All subscribers return an unsubscribe function. All connection-bound state is stored on the card instance, not module-global, so multiple instances don't collide.

#### A.3 Design tokens — semantic layer

- [x] Extend `src/shared/design-tokens.ts`:
  - Already has `LUCARNE_PALETTE`. Add `LUCARNE_SPACING` (4/8/12/16/24/32px), `LUCARNE_RADII` (4/8/16px), `LUCARNE_TYPE_SCALE` (clamp-based: e.g. `--lucarne-fs-sm: clamp(0.75rem, 0.5vw + 0.5rem, 1rem)`), and `LUCARNE_SHADOWS` (1 elevation level — pastel cards don't need many).
- [x] Export a `lucarneStyles` Lit `css` tagged-template that defines `:host` CSS variables for all of the above. Cards import it and apply via `static styles = [lucarneStyles, css\`...own styles...\`]`.

#### A.4 Icons

- [x] Create `src/shared/icons.ts` with a small inline-SVG subset (sun, cloud, rain, snow, partly-cloudy, person, chevron-right, check). Each exported as a Lit `svg\`...\`` template. Bundling mdi's full font is overkill.

### Sub-Phase B: lucarne-today-card — agenda + weather + tasks + presence

Goal: the card renders all 4 sections, configurable via YAML, responsive at iPad-9 landscape baseline. **Deployable**: drop the card on the Family tab; replaces stock todo.

#### B.1 Card shell + YAML config

- [x] Rewrite `src/cards/lucarne-today-card.ts`. Card class extends `LitElement`. `@customElement('lucarne-today-card')`.
- [x] Define config interface:
  ```ts
  interface LucarneTodayCardConfig {
    type: 'custom:lucarne-today-card';
    title?: string;                          // default: 'Today'
    calendars: CalendarConfig[];             // required, non-empty
    weather?: string;                        // entity_id, default: weather.forecast_home if present
    tasks?: string;                          // todo entity_id; if absent, hide tasks block
    presence?: { entity: string; name: string }[];  // input_boolean entity ids
    agenda_limit?: number;                   // default: 5
  }
  ```
- [x] Implement `setConfig(config)` that validates: `calendars` is a non-empty array, each entry has `entity` + `color` + `label`. Throw on invalid config (HA shows the error in the card editor).
- [x] Implement `static getConfigElement()` returning the editor element (sub-phase C).
- [x] Implement `getCardSize()` returning `4` (rough vertical units for HA's stacking).
- [x] Implement `static getStubConfig(hass)` returning a default config that auto-discovers the first 3 `calendar.*` entities and `weather.forecast_home` if present.

#### B.2 Agenda strip subcomponent

- [x] Create `src/components/agenda-strip.ts`. `@customElement('lucarne-agenda-strip')`.
- [x] Props: `events: CalendarEvent[]`, `calendarColors: Map<string, string>` (entity_id → color), `limit: number`.
- [x] Sort events by start time; filter to events ending after `now`; take first `limit`.
- [x] Render each row: `[time-pill] [colored-bar] [summary on top, secondary line below]`. Time-pill is the relative or absolute start (`"in 2h"` if same day, `"tomorrow 09:00"` otherwise).
- [x] The currently-happening event (now is between start and end) gets a pulsing dot in the time-pill (CSS keyframe).
- [x] Empty state: `"Nothing on the calendar today"` centered text.
- [x] Layout: vertical stack (flex column) at all widths; `container-type: inline-size` declared so Phase 3 can add container-query–driven variants. Horizontal row scrolling was considered but dropped in favour of the cleaner agenda-style list for v1 — the 2fr column gives enough horizontal room.

#### B.3 Weather block subcomponent

- [x] Create `src/components/weather-block.ts`.
- [x] Props: `weatherEntity: HassEntity`, `forecast: WeatherForecast[]` (today + tomorrow).
- [x] Fetch the daily forecast via the `weather.get_forecasts` action. **Required arguments**: `type: "daily"` (NOT `"hourly"` or `"twice_daily"` — daily gives today + N days each with `temperature` (high) and `templow`). Target: `entity_id: weather.forecast_home`. Verify exact schema via `ha_list_services` with `domain: "weather"` and `detail_level: "full"` BEFORE coding the call. Subscribe to weather entity changes; re-fetch forecast when condition changes.
- [x] **Implementation note**: in HA 2024.4+ `weather.get_forecasts` is invoked via `hass.callServiceRaw('weather', 'get_forecasts', { type: 'daily' }, { entity_id: 'weather.forecast_home' }, undefined, true)` so the response is returned (the `return_response: true` flag). Verify the exact JS-side helper signature against the live `home-assistant-js-websocket` version in your `package-lock.json` — the signature changed in v8 → v9.
- [x] Render: big condition icon, current temp, today's high/low, tomorrow's condition + high. Below that, a single line "dressing tip" (B.4).
- [x] Empty state: if `weatherEntity` is undefined, render `"Add a weather entity to show forecast"`.

#### B.4 Dressing tip (pure function)

- [x] Create `src/components/dressing-tip.ts` exporting `dressingTip(forecast: WeatherForecast[]): string`. Pure function (no Lit). Rules:
  - Below 5 °C → "Heavy coat + hat"
  - 5–12 °C → "Coat + scarf"
  - 12–18 °C → "Light jacket"
  - 18–24 °C → "T-shirt"
  - Above 24 °C → "Shorts weather"
  - If precip probability > 50% → append " + umbrella"
  - If snow condition → "Boots + heavy coat"
  - Use today's max temp (or "Check the weather" if no forecast available — v1 implementation falls back to the generic message rather than current sensor temp).
- [x] Write unit tests in `tests/components/dressing-tip.test.ts` covering each branch. Use Node's built-in `node:test` runner (matches `device-monitor-card`'s pattern).

#### B.5 Tasks summary subcomponent

- [x] Create `src/components/tasks-summary.ts`.
- [x] Props: `items: TodoItem[]`.
- [x] Render: header `"Ingrid's Tasks · {count}"`, then up to 3 items as rows (`summary`, optional `due` chip). If `count > 3`, append a `"+ N more"` row that fires a `hass-more-info` event for the todo entity (HA's stock dialog).
- [x] Empty state: `"All done!"` with a checkmark icon.
- [x] Items are subscribed-to via `subscribeTodoItems` (A.2); state updates re-render the subcomponent without a full card re-render (Lit `@property` reactivity handles this).

#### B.6 Presence pills subcomponent

- [x] Create `src/components/presence-pills.ts`.
- [x] Props: `entries: { name: string; isHome: boolean }[]`.
- [x] Render a horizontal row of small pills: each pill shows the name, colored green if home / grey if away, with a small dot indicator.
- [x] No interactivity (this is a display).

#### B.7 Compose into the card

- [x] In `lucarne-today-card.ts`, render method assembles:
  ```
  ┌─────────────────────────────────────────────┐
  │ Today                          [presence]   │  ← header row
  ├─────────────────────┬───────────────────────┤
  │ Agenda (left, 2fr)  │ Weather (right, 1fr)  │
  │                     │   condition icon      │
  │                     │   temp + high/low     │
  │                     │   dressing tip        │
  │                     ├───────────────────────┤
  │                     │ Tasks summary         │
  └─────────────────────┴───────────────────────┘
  ```
  CSS Grid: `grid-template-columns: 2fr 1fr` on landscape; `1fr` (stacked) on portrait. `@media (max-width: 700px)` for the portrait switch.
- [x] All section spacing uses `LUCARNE_SPACING` tokens; all radii use `LUCARNE_RADII`; all colors use `LUCARNE_PALETTE` or per-calendar colors from config.

#### B.8 Subscriptions lifecycle

- [x] In `connectedCallback`: subscribe to todo entity (`subscribeTodoItems`) and start a 5-min periodic poll for calendars + forecast. Weather and presence are read directly from `hass.states` on each Lit render — no explicit subscription needed.
- [x] In `disconnectedCallback`: call each unsubscribe.
- [x] Re-fetch calendar events on a 5-min interval (cheap, calendar polling cadence is ~15 min anyway). Use `setInterval` cleared on disconnect.
- [x] On weather state change: re-fetch the forecast (since forecast attributes don't always trigger state change).

### Sub-Phase C: Lovelace UI editor

Goal: the user can configure the card via HA's standard UI editor, not just YAML. **Deployable**: open the card editor in the dashboard, see fields, save updates without YAML.

- [x] Create `src/editors/lucarne-today-card-editor.ts`. `@customElement('lucarne-today-card-editor')`. Extends `LitElement`. Implements the HA editor protocol (set `hass` and `config`, fire `config-changed` event on edits).
- [x] Fields:
  - `title` (text)
  - `calendars` (repeating: each row is entity-picker + color-picker + label text)
  - `weather` (entity-picker filtered to `domain: weather`)
  - `tasks` (entity-picker filtered to `domain: todo`)
  - `presence` (repeating: entity-picker filtered to `input_boolean` + name)
  - `agenda_limit` (number 1–10)
- [x] Use `<ha-entity-picker>` and `<ha-textfield>` from HA's component library (they're globally registered when the editor is in a HA context).
- [x] Register in card class: `static getConfigElement() { return document.createElement('lucarne-today-card-editor'); }`.
- [x] Import the editor file from `src/index.ts` so it's bundled.

### Sub-Phase D: Tests + build + dashboard swap

#### D.1 Tests

- [x] `tests/components/dressing-tip.test.ts` — see B.4.
- [x] `tests/components/agenda-sort.test.ts` — pure-function tests for the event sort/merge/filter logic. Move the sorting logic out of the agenda-strip's render into a pure helper if needed for testability.
- [x] Add `"test": "TZ=America/Los_Angeles node --import tsx --test 'tests/**/*.test.ts'"` to package.json scripts. Install `tsx` (v4+) as devDependency. **Note**: the loader must come before `--test` and the spec is `--import tsx` (NOT `--import tsx/esm` — that subpath does not register the loader in tsx 4.x and Node will fail to parse TypeScript). The deprecated `--loader tsx/esm` form also works but emits an experimental-loader warning under Node 20; prefer `--import tsx`. Keep `TZ=America/Los_Angeles` because Phase 3 date-helper tests assert local week/DST behavior for the deployment timezone.
- [x] `npm test` — all tests pass.

#### D.2 Build + commit + push

- [x] `npm run lint && npm run typecheck && npm run build && npm test` — all green.
- [x] Confirm `dist/ha-lucarne.js` < 150 KB (Lit + components). (60.57 kB — well within budget.)
- [x] Commit and push. CI green.

#### D.3 Swap cards on the Family tab

- [x] `ha_config_get_dashboard` for `wall-ipad` — capture current Family tab structure.
- [x] **First, re-discover live calendar entity IDs**. Run `ha_search_entities` with `domain_filter: "calendar"`. The example YAML below uses PLACEHOLDER slugs — they will almost certainly differ in the live HA. Replace every `calendar.*` line with an entity ID from the live result. If a logical calendar (e.g. "Birthdays") doesn't exist, drop the line — don't invent it.
- [x] `ha_config_set_dashboard` with `python_transform`: in the Family tab, replace the first section's `todo-list` card with:
  ```yaml
  - type: custom:lucarne-today-card
    title: Today
    calendars:
      # PLACEHOLDERS — replace with actual slugs from ha_search_entities domain_filter:"calendar"
      - { entity: calendar.family, color: "#a8d8b9", label: Family }
      - { entity: calendar.gridou_molant_s_inn, color: "#a8c5e8", label: Anton & Ingrid }
      - { entity: calendar.ingrid_babel_gmail_com, color: "#c8b4e0", label: Ingrid }
      - { entity: calendar.holidays_in_united_states, color: "#d4cfc4", label: Holidays }
      - { entity: calendar.les_lilas, color: "#b8b4e8", label: Les Lilas }
      - { entity: calendar.birthdays, color: "#f0dca0", label: Birthdays }
    weather: weather.forecast_home
    tasks: todo.<ingrid_entity_id>  # from Phase 1 B.3
    presence:
      - { entity: input_boolean.molant_home, name: Anton }
      - { entity: input_boolean.gridou_home, name: Ingrid }
    agenda_limit: 5
  ```
  Use the actual `<ingrid_entity_id>` captured in Phase 1 B.3 AND the actual calendar slugs from the search above. Do NOT paste the YAML as-is.
- [ ] Keep the second section (Groceries `todo-list`) unchanged — groceries stay surfaced via the stock card; the today-card focuses on Ingrid's tasks.
- [ ] **User-action step: copy the built JS onto the HA host.** No MCP tool writes files into HA's `<config>/www/...` folder. Options the user can use:
  - **Samba share add-on** (`HA → Settings → Add-ons → Samba share`) — mount the HA config share from MacBook, drag-drop `dist/ha-lucarne.js` into `<config>/www/lucarne/`.
  - **File Editor add-on** — upload via the web UI.
  - **`scp` / `rsync`** if the HA host has SSH enabled.
  Provide all three options; let the user pick. Wait for confirmation the file is in place.
- [ ] **User-action step: add the resource to the dashboard.** HA → Settings → Dashboards → top-right kebab → Resources → Add `/local/lucarne/ha-lucarne.js` as JavaScript Module type. (Phase 5 swaps this to the HACS-managed `/hacsfiles/...` path; for Phases 2–4 dev we use `/local/lucarne/...`.) Wait for confirmation.
- [ ] Restart-on-resource-change: HA may need a hard refresh on the iPad after adding the resource. Tell the user.
- [ ] Refresh the iPad. Verify the today-card renders:
  - Agenda shows next events with correct colors
  - Weather shows current condition + today/tomorrow
  - Dressing tip is reasonable for the current weather
  - Tasks summary shows the count + top 3 from `todo.<ingrid_entity>`
  - Presence pills show Anton + Ingrid with correct state
- [ ] Open browser DevTools (Safari Inspector via Mac + iPad cable) — no console errors.
> NOTE: Steps above (copy JS, add resource, iPad verification, DevTools check) require physical user action. Phase is deployed from the HA side; awaiting user deployment confirmation.

#### D.4 Wiki

- [x] Update `~/src/Tower/home-automation/dashboards/wall-ipad.md`: update the Family tab description with the new card.
- [x] Update `~/src/Tower/home-automation/projects.md`: added ha-lucarne Phase 2 section (no separate `projects/ha-lucarne.md` exists — projects are tracked in the flat `projects.md`).
- [x] Append `~/src/Tower/change-log.md`: "ha-lucarne Phase 2 — today-card implemented and deployed to wall-ipad config; awaiting JS/resource deployment."

### Build Verification (required before marking phase complete)

- [x] `npm run lint && npm run typecheck && npm run build && npm test` — green.
- [x] `dist/ha-lucarne.js` committed and pushed.
- [ ] No HA log errors for the dashboard or any new state subscriptions. (Requires user to deploy JS + verify on iPad.)
- [ ] No browser console errors on the iPad. (Requires user to deploy JS + verify on iPad.)
- [ ] Mark phase `status: done`.

### Manual Verification

- [ ] **Golden path**: walk to the kitchen. Can you understand "what's next today" without tapping? If not, the card is failing its primary purpose — iterate before marking done.
- [ ] **Responsive sanity**: open the dashboard in Safari on the MacBook, resize the window. Card should reflow gracefully from ~600px wide up.
- [ ] **Live update**: dictate a new reminder to Siri. Within 5 min, the today-card's tasks block updates without manual refresh.
- [ ] **Calendar event creation**: add an event in Google Calendar that starts in 30 minutes. Within 15 min (Google polling cadence), it appears on the iPad's agenda strip with a "in X min" pill.
- [ ] **Weather update**: weather entity changes condition — card icon updates within seconds.

## Technical Details

### Lit lifecycle gotchas

- `hass` is set as a property on the card element by HA on every state change in the global hass object — re-renders trigger automatically via Lit's reactive props. **Don't** subscribe to every entity via `subscribeEntityState` for entities that are already in `hass.states` — just read from `hass.states[entityId]` in the `render()` method.
- Only subscribe explicitly for things NOT in entity state: calendar event fetching (separate API), forecast fetching (separate API).
- Todo items: `hass.states[todoEntityId]` only gives the count; the items list requires `todo.get_items`. Subscribe to state changes on the entity and re-fetch items only when the state count changes.

### Calendar fetch performance

- Fetch a 7-day window (today + 6) on mount; refetch every 5 min.
- For 6 calendars × 7 days, payload is typically < 50 KB.
- Cache by `entityId` keyed map; merge on render.

### Bundle size budget

- Phase 2 target: `dist/ha-lucarne.js` ≤ 150 KB minified.
- If it exceeds, audit imports — most likely culprit is bundling unused `custom-card-helpers` modules. Tree-shaking should handle it; verify with `npx vite build --report` if needed.

## Constraints

- No new HA entities created in this phase (Phase 1 created what's needed).
- No HACS install.
- Card must work for users who don't have ALL config fields set (e.g. no tasks entity, no presence list).
- Card must not crash when an entity is `unavailable` — show "—" or a placeholder, never throw.
- All text content must be translatable in the future; for v1 use English strings but keep them in a single `strings.ts` for easy extraction later.
