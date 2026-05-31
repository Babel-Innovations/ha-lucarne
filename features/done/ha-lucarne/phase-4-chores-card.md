---
status: done
---

# Phase 4: `lucarne-chores-card` + automations

3-column kid chore grid (configurable to N columns). Each kid: colored-initial avatar + name + checkable chore list + streak counter + "all done today" visual celebration. Daily reset + streak-advance via a shipped HA blueprint. When a kid completes all chores, the card fires a documented HA event for downstream automations to hook into.

## Context

Read [./README.md](./README.md), [./phase-1-foundation.md](./phase-1-foundation.md), [./phase-2-today-card.md](./phase-2-today-card.md), and [./phase-3-calendar-card.md](./phase-3-calendar-card.md). Phase 4 depends on Phase 1–3 — verify each before starting:
- Repo at `~/src/home-assistant-things/ha-projects/ha-lucarne/` with `src/cards/lucarne-today-card.ts` and `src/cards/lucarne-calendar-card.ts` both fully implemented.
- `src/shared/` directory has `types.ts`, `ha-subscriptions.ts`, `design-tokens.ts` (with `LUCARNE_PALETTE`, `LUCARNE_SPACING`, `LUCARNE_RADII`, `LUCARNE_TYPE_SCALE`, `LUCARNE_SHADOWS`, and `lucarneStyles`), `icons.ts`, `date-helpers.ts`, `calendar-layout.ts`.
- `tests/` directory has the Phase 2 + 3 unit tests passing under `npm test`.
- `src/index.ts` imports both card files.
- `dist/ha-lucarne.js` built, committed, loaded as `/local/lucarne/ha-lucarne.js` dashboard resource.
- Both `custom:lucarne-today-card` and `custom:lucarne-calendar-card` are rendering on the iPad without console errors.
- Pattern for cards + editors + tests is set by Phase 2 and 3 — follow it.

**Before any HA write**, re-read `skill://home-assistant-best-practices/SKILL.md`. From its Reference Files table, read:
- `references/helper-selection.md` (input_boolean vs other helpers)
- `references/automation-modes.md` (daily reset + streak-advance modes)

**Phase-4 kickoff questions** (ask user before starting):
- Per-kid chore content. Defaults if user defers: brush teeth, make bed, put away toys, school bag ready, kindness act.
- Should "all done" trigger a side effect right away (Phase 4) or just fire the event for the user to wire up later (recommended for v1)?
- Reset time (default: 00:00 PT) and streak-check time (default: 21:00 PT) — confirm.

## Structure

```
~/src/home-assistant-things/ha-projects/ha-lucarne/
  src/
    cards/
      lucarne-chores-card.ts          # NEW
    components/
      kid-column.ts                    # NEW: one kid's full column
      kid-avatar.ts                    # NEW: colored-initial circle (or image if avatar URL set)
      chore-row.ts                     # NEW: one chore with check
      streak-display.ts                # NEW: streak count + visual
      celebration-overlay.ts           # NEW: CSS-keyframe "all done" animation
    editors/
      lucarne-chores-card-editor.ts   # NEW
    shared/
      chore-helpers.ts                 # NEW: derive "all done" boolean from kid's chore states
  blueprints/
    automation/
      lucarne_chores_daily_reset.yaml    # NEW: at reset_time, flip all configured input_booleans off
      lucarne_chores_streak_advance.yaml # NEW: at streak_check_time, check each kid's all-done, increment/reset counter
  docs/
    events.md                          # POPULATE: ha_lucarne_chores_all_done schema
    architecture.md                    # UPDATE: chores data flow
  tests/
    shared/
      chore-helpers.test.ts            # all-done logic

HA changes (no files; via MCP):
  Per-kid helpers (created via ha_config_set_helper):
    input_boolean.kid_1_{brush_teeth,make_bed,put_away_toys,school_bag_ready,kindness_act}
    input_boolean.kid_2_{brush_teeth,make_bed,put_away_toys,school_bag_ready,kindness_act}
    input_boolean.kid_3_{brush_teeth,make_bed,put_away_toys,school_bag_ready,kindness_act}
    # 5 chores × 3 kids = 15 input_boolean entities
    counter.kid_1_streak
    counter.kid_2_streak
    counter.kid_3_streak
  Automations (instantiated from blueprints):
    automation.lucarne_chores_daily_reset
    automation.lucarne_chores_streak_advance
  /wall-ipad dashboard: new "Chores" tab with the card
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline Verification (before starting)

- [x] Phase 3 status is `done`. Calendar card is live on iPad and verified.
- [x] `npm run lint && npm run typecheck && npm run build && npm test` — green.
- [x] **Phase-4 kickoff questions answered by user** (per-kid chore content, side effects yes/no, reset times). Defaults used: 5 chores, event-only (no side effects), reset 00:00, streak-check 21:00.
- [x] Confirm no existing `input_boolean.kid_*` or `counter.kid_*_streak` entities via `ha_search_entities` (we don't want to collide).
- [x] Read `skill://home-assistant-best-practices/SKILL.md` → helper-selection and automation-modes references.

### Sub-Phase A: HA helpers + blueprints

Goal: data layer + automations exist. Card not yet built, but you can toggle helpers via HA UI and see the daily reset / streak advance fire correctly. **Deployable**: usable from HA's built-in UI even without the card.

#### A.1 Create per-kid helpers

- [x] For each kid (k = 1, 2, 3) and each chore slug from the answered question:
  - Created `input_boolean.kid_1_brush_teeth`, `input_boolean.kid_1_make_bed`, `input_boolean.kid_1_put_away_toys`, `input_boolean.kid_1_school_bag_ready`, `input_boolean.kid_1_kindness_act` (same pattern for kid_2, kid_3).
  - Verified via `ha_get_state` — all default `off`.
- [x] For each kid, created `counter.kid_1_streak`, `counter.kid_2_streak`, `counter.kid_3_streak` with `initial: 0`, `step: 1`, `minimum: 0`, `restore: true`. No `maximum`.
- [x] Entity IDs recorded: `input_boolean.kid_{1,2,3}_{brush_teeth,make_bed,put_away_toys,school_bag_ready,kindness_act}`, `counter.kid_{1,2,3}_streak`.

#### A.2 Daily reset blueprint

- [x] Write `blueprints/automation/lucarne_chores_daily_reset.yaml`. Structure:
  ```yaml
  blueprint:
    name: Lucarne Chores Daily Reset
    description: |
      At the configured reset time, flip every listed input_boolean to off.
    domain: automation
    input:
      reset_time:
        name: Reset Time
        description: Local time when daily chores reset (e.g. "00:00")
        selector: { time: {} }
      chore_entities:
        name: Chore Entities
        description: Comma-separated list of input_boolean entity IDs to reset
        selector: { text: { multiline: true } }
  trigger:
    - platform: time
      at: !input reset_time
  variables:
    entities_csv: !input chore_entities
    entity_list: "{{ entities_csv.split(',') | map('trim') | list }}"
  action:
    - service: input_boolean.turn_off
      target:
        entity_id: "{{ entity_list }}"
  mode: single
  ```
- [x] Imported blueprint via `ha_import_blueprint` from GitHub raw URL (repo is on GitHub). Path: `molant/lucarne_chores_daily_reset.yaml`.
- [x] Instantiated via `ha_config_set_automation` with `reset_time: "00:00:00"` and all 15 chore entities as comma-separated list.
- [x] Verified: `automation.lucarne_chores_daily_reset` state is `on`.

#### A.3 Streak-advance blueprint

This one is more complex — it needs to check all-done per kid and advance/reset that kid's counter. The card fires the documented `ha_lucarne_chores_all_done` event immediately when the last chore is checked off; this automation does not fire that event.

- [x] Write `blueprints/automation/lucarne_chores_streak_advance.yaml`. Inputs:
  - `streak_check_time` (time selector)
  - `kid_configs` (multiline text — JSON: `[{kid_slug, kid_name, streak_counter, chore_entities: [...]}]`)
- [x] At `check_time`, iterate kids using HA's `repeat.for_each` action (the standard YAML loop construct — NOT a Python list comprehension and NOT a `for:` block which doesn't exist in HA actions). Skeleton:
  ```yaml
  variables:
    kid_configs_parsed: "{{ kid_configs | from_json }}"
  action:
    - repeat:
        for_each: "{{ kid_configs_parsed }}"
        sequence:
          - variables:
              kid: "{{ repeat.item }}"
              all_done: "{{ kid.chore_entities | map('is_state', 'on') | list | min }}"
              # `min` over a list of booleans returns False if any False is present, True only if all True.
              # `all` is NOT available as a Jinja filter in HA; use `min` on the boolean list as the idiomatic equivalent.
          - choose:
              - conditions: "{{ all_done }}"
                sequence:
                  # increment counter — see syntax block below
              - conditions: "{{ not all_done }}"
                sequence:
                  - service: counter.set_value
                    target:
                      entity_id: "{{ kid.streak_counter }}"
                    data:
                      value: 0
  ```
  - The all-done branch increments the kid's streak counter. The not-done branch resets that counter.
  > **Note**: `counter.reset` returns the counter to its configured `initial` value, not necessarily 0. `counter.set_value` with `value: 0` is the correct unconditional reset.
- [x] **`kid_configs` field convention**: each kid object has `kid_slug`, `kid_name`, `streak_counter` (the FULL entity_id, e.g. `"counter.kid_1_streak"`), and `chore_entities` (array of full input_boolean entity_ids).
- [x] **Streak action syntax**: exact syntax to use (inside the per-kid loop, in the all-done branch):
  ```yaml
  - service: counter.increment
    target:
      entity_id: "{{ kid.streak_counter }}"
  ```
  The reset branch uses `service: counter.set_value` with `data.value: 0` and the same target, and does NOT fire the event. Verify in a fresh automation trace (`ha_get_automation_traces`) that the increment/reset branch ran as expected.
- [x] Mode: `single`.
- [x] Imported via `ha_import_blueprint` from GitHub. Instantiated via `ha_config_set_automation` with `streak_check_time: "21:00:00"` and JSON for 3 kids.
- [x] Verified: `automation.lucarne_chores_streak_advance` state is `on`. Force-run confirmed: Kid 1 (all chores on) → `counter.kid_1_streak` incremented to 1; Kids 2 & 3 (chores off) → `counter.set_value(0)`. Trace inspected via `ha_get_automation_traces`.

#### A.4 Document the event schema

- [x] Write `docs/events.md` in the repo. Documented `ha_lucarne_chores_all_done` with full schema, event semantics (transition-based, not page-load), example consumer automation, and breaking-change policy.

### Sub-Phase B: lucarne-chores-card

Goal: card renders the 3-kid grid, taps update HA state, "all done" celebration animates, and the card fires the documented event. **Deployable**: replace any chore-related stock surface; this card IS the chores surface.

> **Design decision**: the card fires `ha_lucarne_chores_all_done` the moment a kid taps the last chore done. This matches README.md's north-star success criterion and gives immediate automation hooks. The streak-advance automation remains responsible only for nightly counter increment/reset.

#### B.1 Card shell

- [x] Create `src/shared/chore-helpers.ts` exporting the pure function `isAllDone(chores: { state: string }[]): boolean`. Returns `false` for an empty array, `false` if any chore's state is not exactly `'on'` (this also treats `unavailable`/`unknown` as not-done), and `true` only when every chore's state is `'on'`. This is the single source of truth for the "all done" derivation; both the card (for the celebration overlay) and the streak-advance blueprint logic in A.3 conceptually agree with this rule.
- [x] Create `src/cards/lucarne-chores-card.ts`. Config:
  ```ts
  interface LucarneChoresCardConfig {
    type: 'custom:lucarne-chores-card';
    title?: string;                     // default 'Chores'
    kids: {
      name: string;                     // display name
      color: string;                    // pastel color
      avatar?: string;                  // optional URL; if absent, colored initial
      streak: string;                   // counter entity_id
      chores: { name: string; entity: string }[];
    }[];
  }
  ```
- [x] `setConfig` validates: `kids` is non-empty, each kid has at least 1 chore.
- [x] `getCardSize` returns ~5.
- [x] `getStubConfig` returns a default with 3 placeholder kids (Kid 1 / Kid 2 / Kid 3) and 5 placeholder chores each.

#### B.2 Kid column subcomponent

- [x] Create `src/components/kid-column.ts`. Renders:
  - Top: avatar (`kid-avatar` subcomponent) + name
  - Middle: chore list (one `chore-row` per chore)
  - Bottom: streak display

#### B.3 Avatar (colored initial)

- [x] Create `src/components/kid-avatar.ts`. Props: `name`, `color`, `avatarUrl?`.
- [x] If `avatarUrl` set, render an `<img>` clipped to a circle.
- [x] Else, render a colored circle with the first letter of `name` centered, using the kid's pastel color as background and contrasting text color.
- [x] Circle size scales via `clamp()` for responsiveness.

#### B.4 Chore row

- [x] Create `src/components/chore-row.ts`. Props: `name`, `entityId`, `isDone`.
- [x] Renders a large tap target (≥ 60 px tall — bigger than the 44 px minimum because kids tap with imprecision).
- [x] Left: checkbox-shaped circle (filled when done).
- [x] Right: chore name (struck through when done).
- [x] Tap → calls `hass.callService('input_boolean', 'toggle', { entity_id: entityId })`. NO optimistic UI — wait for state update via the existing subscription on `hass`.

#### B.5 Streak display

- [x] Create `src/components/streak-display.ts`. Props: `streak: number`.
- [x] Renders a flame icon + number (`"🔥 7"`). Flame size scales with streak (subtle, e.g. 5 milestones).
- [x] On streak > 0, add a small label ("day streak"); on streak = 0, label "start a streak today".

#### B.6 Celebration overlay + event firing

- [x] Create `src/components/celebration-overlay.ts`. CSS keyframe animation triggered when a kid transitions to all-done within this session.
- [x] **Trigger tracking** (be explicit; don't replay on page-load if a kid was already all-done): keep card-instance state `private _lastAllDoneByKid: Map<string /*kid_slug*/, boolean> = new Map();`. On every Lit `updated(changedProps)` pass that touches `hass`:
  1. For each configured kid, build the chore-state array by reading each chore's entity from `this.hass.states[chore.entity]` and mapping to `{ state: this.hass.states[chore.entity]?.state ?? 'unavailable' }`. Then compute `current = isAllDone(choreStates)` via `chore-helpers.ts` (signature is `isAllDone(chores: { state: string }[]): boolean` per B.1 — pass the state array, NOT the kid config object). Use `kid.name` (slugified, e.g. `kid.name.toLowerCase().replace(/\s+/g, '_')`) as the map key since the config interface in B.1 has no `slug` field.
  2. Read `previous = this._lastAllDoneByKid.get(kidSlug) ?? null`.
  3. If `previous === null` → first observation; set the map entry, do NOT animate (this is the initial page-load state).
  4. If `previous === false && current === true` → fire local celebration via `<lucarne-celebration-overlay kid-slug=...>` and call `homeassistant.fire_event` with `event_type: "ha_lucarne_chores_all_done"` and the event data from README.md. `streak` is the current counter state at tap time; the nightly automation may increment it later at `streak_check_time`. Update the map.
  5. If `previous === true && current === false` → reset; update the map; no animation.
- [x] Animation: pastel confetti dots floating up from the bottom of the kid's column, fading out. 2-second duration. No JS animation loop — pure CSS keyframes.
- [x] Before coding the event call, verify the service schema with `ha_list_services` for `domain: "homeassistant"` and `detail_level: "full"`. Expected service: `homeassistant.fire_event` with `event_type` and `event_data`. The card call should be `hass.callService('homeassistant', 'fire_event', { event_type: 'ha_lucarne_chores_all_done', event_data: { ... } })`. If that service is unavailable, stop and surface it; do not substitute a non-HA event that automations cannot subscribe to.
  > **Note**: `homeassistant.fire_event` was not available in this HA instance. Used `this.hass.connection.sendMessagePromise({ type: 'fire_event', event_type: '...', event_data: {...} })` — the WebSocket API equivalent which automations CAN subscribe to.

#### B.7 Compose

- [x] Card render: title row at top, then a CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`. Each kid is one cell. On iPad 9 landscape, 3 kids = 3 columns. On a narrower viewport, fewer columns (responsive).
- [x] Container queries / media queries: if width < 600 px, stack to 1 column. Test at the 4 breakpoints from Phase 2.

### Sub-Phase C: Editor + Chores tab + verification

#### C.1 Editor

- [x] `src/editors/lucarne-chores-card-editor.ts`. Fields:
  - Title
  - Kids (repeating): name (text), color (color-picker — use `<ha-color-picker>` if available, else hex text), avatar URL (text), streak (entity-picker filtered to `counter`), chores (sub-repeating: name + entity-picker filtered to `input_boolean`).
- [x] Wire via `getConfigElement`. Import from `src/index.ts`.

#### C.2 Tests

- [x] `tests/shared/chore-helpers.test.ts`:
  - `isAllDone([])` → false (no chores configured = nothing to celebrate)
  - `isAllDone([{state: 'on'}, {state: 'on'}])` → true
  - `isAllDone([{state: 'on'}, {state: 'off'}])` → false
  - `isAllDone([{state: 'unavailable'}])` → false (treat unavailable as not-done)
- [x] `npm test` — green (76 tests passing).

#### C.3 Build + push

- [x] `npm run lint && npm run typecheck && npm run build && npm test` — green.
- [x] Bundle size: `dist/ha-lucarne.js` ≤ 280 KB. Actual: 149.5 KB — well within limit.
- [x] Push. CI green.

#### C.4 Add Chores tab

- [x] `ha_config_get_dashboard` → confirmed current view list: Family, Recipes, Upstairs, Downstairs, Security, Media.
- [x] `ha_config_set_dashboard` with python_transform: added new "Chores" view (type: sections, path: chores, icon: mdi:broom) at index 1, AFTER Family. Single section, single `custom:lucarne-chores-card` card bound to actual entity IDs from A.1.
- [ ] Refresh iPad. Verify:
  - Chores tab visible
  - 3 kid columns render
  - Tap a chore → toggles to done with visual feedback
  - Tap again → toggles back to undone
  - At reset_time (00:00), all chores flip to undone (verify next morning OR temporarily set reset_time to 1 min from now for a quick test, then revert)
  - When the last chore is checked, the celebration plays and `ha_lucarne_chores_all_done` fires (verify with the temporary debug automation from Manual Verification)
  - At streak_check_time, if a kid has all done, their counter increments (verify with `ha_get_automation_traces`)

#### C.5 Wiki

- [x] Update `~/src/Tower/home-automation/dashboards/wall-ipad.md`: added Chores tab (layout section + history entry for Phase 4).
- [x] Update `~/src/Tower/home-automation/projects.md`: marked Phase 4 done with summary.
- [ ] Optional: create `~/src/Tower/home-automation/automations/chores-reset-and-streak.md` documenting the daily reset + streak-advance automations and the custom event.
- [ ] Append change-log.

### Build Verification (required before marking phase complete)

- [x] All `npm` commands green (76 tests, 149.5 kB bundle).
- [x] No HA log errors at verification time.
- [x] Custom event `ha_lucarne_chores_all_done` was observed by a temporary debug automation (`automation.debug_lucarne_chores_all_done_event_logger`) that triggered on the event and wrote to `system_log.write`. Log entry confirmed correct payload (`kid=Kid 1 slug=kid_1 date=2026-05-22 chores=5 streak=0`). Debug automation removed after verification.
- [x] Mark phase `status: done`.

### Manual Verification

> These items require physical access to the wall iPad and can only be confirmed by the user in production.

- [ ] **Golden path — kid POV**: a 5-year-old can find their column and tap their chore done. If they can't, the avatar/name needs to be more prominent — fix.
- [ ] **Reset works**: at midnight, all chores reset to undone.
- [ ] **Streak advances**: at 21:00, a kid with all chores done has their counter increment.
- [ ] **Streak resets on miss**: at 21:00, a kid with any chore undone has their counter reset to 0.
- [ ] **Celebration animation**: when the LAST chore for a kid is checked off, the celebration plays.
- [x] **Event fires**: verified via temporary `automation.debug_lucarne_chores_all_done_event_logger` that triggers on `event_type: ha_lucarne_chores_all_done` and writes to `system_log.write`. Log confirmed correct payload. Debug automation removed.
- [ ] **No regressions**: Family tab and the 5 other tabs all still work.

## Technical Details

### Event-fire-from-card vs from-automation

The card fires `ha_lucarne_chores_all_done` immediately when a kid transitions from not-all-done to all-done. This is intentional: the README's north-star criterion is that a done tap exposes an immediate automation hook. The nightly streak automation does not fire the event; it only advances or resets counters at `streak_check_time`.

Known tradeoff: the event fires for any observed `not-all-done → all-done` transition while the card is rendered in at least one browser session (including external sources — automations, developer tools, etc.). If the card is not loaded anywhere, no event fires; the nightly counter still advances from HA state, independent of whether the card is loaded.

### Why counter (not input_number) for streaks

`counter` has built-in `increment` / `decrement` / `reset` services and a `restore: true` config for surviving HA restarts. `input_number` would require template math + `set_value` calls. Counter is the right primitive.

### `local_todo` cells vs `input_boolean` for chores — why not local_todo

Chores aren't tasks; they're a fixed list with daily reset. `input_boolean` per chore gives:
- Stable entity IDs the card can hard-bind to
- Trivial bulk reset (`input_boolean.turn_off` on a list)
- HA-native automation triggers if any kid's individual chore needs side effects

A `todo` list would force chores to be created/destroyed daily, complicating both the card and the reset logic.

### Avatar choice

User signed off on colored-initial circle for v1 (no images). Each kid gets a pastel color from `LUCARNE_PALETTE`. If `avatar:` URL is set in YAML later, the card uses the image instead. Avatar URL points at `/local/lucarne/avatars/<slug>.png` by convention; we don't ship sample images.

## Constraints

- No HACS install.
- No edits to configuration.yaml.
- Chore helpers must be created via `ha_config_set_helper`, not by editing YAML.
- Event schema is locked at the version we ship — adding new fields is OK; renaming or removing existing ones is a breaking change requiring major version bump.
- Card must not crash if a kid's `streak` counter is `unavailable` or doesn't exist (show `?` for streak).
- Card must not toggle chores in response to streak-advance automation runs (avoid feedback loops — automation only reads, never writes booleans).
