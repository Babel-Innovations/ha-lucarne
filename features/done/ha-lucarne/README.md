---
status: pending
---

# ha-lucarne — DIY Skylight Calendar replacement

> **Progress Tracking**: Update checkboxes in phase files as you complete tasks. Run `/spec-implement-auto features/ha-lucarne/phase-1-foundation.md` (or the orchestrator) to begin implementation.

## Goal

Replace the Skylight Calendar's value proposition (always-on family calendar + chores + reminders surface) with a custom HA-native solution that runs on the wall-mounted kitchen iPad, surfaces Ingrid's Apple Reminders within minutes of capture, gives the family a glanceable per-person-colored unified calendar, and lets the 3 kids check off chores with streak tracking — packaged as a public HACS-installable Lit-card collection (`ha-lucarne`) so others can deploy it.

## Why "lucarne"

French for "skylight" (the architectural feature). Project name disambiguates from Skylight Inc.'s product and signals this is a DIY, household-driven build.

## North-star success criteria

1. **Ingrid's #1 ask**: a reminder she dictates to Siri (in the "Family" shared list, assigned to her) appears on the iPad within 5 minutes, with no action from her.
2. **Family glance**: at-a-walk-by, anyone can see "what's next today" and "who has what today" without tapping.
3. **Kid usability**: a 5-year-old can find their column and tap their chore done. A "done" tap fires a documented HA event so future automations (TTS, push) can hook in.
4. **Public deployability**: another household can install via HACS custom-repo (URL paste), point at their own calendar entities, edit one YAML block, and have a working dashboard within an hour.
5. **Polish ≥ 85% of Skylight**. The cards must look designed, not assembled. Stock-HACS-card-with-card-mod won't clear this bar — hence the custom Lit cards.

## Concepts

### Multi-list Reminders bridge (Mac mini → HA)

Apple Reminders is the source of truth for both Ingrid's tasks and the family Groceries list. Sync happens entirely on the Mac mini (24/7 box):

- A macOS Shortcut `ha-lucarne-sync` reads N configured lists, applies per-list filter rules (`all` items, or `assignee:Ingrid`, or `tag:<x>`), builds a JSON payload, and POSTs to a single HA webhook.
- `launchd` plist fires the Shortcut every 5 minutes.
- HA-side automation (shipped as a parameterizable blueprint) receives the payload, diffs against existing `todo.*` entities, and upserts.
- v1 (= released as v0.1.0) is one-way (Reminders → HA). v0.2 adds completion write-back. Out of v1 scope, but the blueprint is structured to make it additive.

Per-list config in the Shortcut maps each Apple list to a target `todo.*` entity + filter rule:

| Apple list | Filter | HA todo entity |
|---|---|---|
| `Family` | items assigned to Ingrid | `todo.ingrid_tasks` |
| `Groceries` | all items | `todo.groceries` |

Extensible: add a row to the Shortcut's list array, add a corresponding `todo.*` entity in HA, redeploy.

### Custom Lit cards (the product)

Three Lit web components packaged as a HACS-installable repo:

- **`lucarne-today-card`** — hero panel. Agenda strip (next N events across configured calendars, person-colored) + weather (today + tomorrow + dressing tip derived from temp + precip) + Ingrid's tasks summary (count + top 3) + presence (who's home).
- **`lucarne-calendar-card`** — week view (Mon–Sun), configurable visible-hours band (default 7am–9pm) with out-of-band events collapsed into per-day `+earlier` / `+later` stubs. Per-calendar inline visibility pills in the header. Tap event → details popup. Tap empty slot → create-event flow bound to HA's `calendar.create_event` action.
- **`lucarne-chores-card`** — N-column kid grid (default 3). Each column: colored-initial avatar + name + checkable chore list + streak counter + "all done today" visual celebration. Card subscribes to `input_boolean.chore_*` states; doesn't own the daily reset (that's an automation blueprint).

All three cards are configurable via standard Lovelace YAML (calendar entity IDs, kid names, palette, visible hours, etc.) and ship UI editors (`getConfigElement`).

### Visible-hours band (calendar card)

Skylight's flagship week view shows an hourly grid for awake hours only; sleep-time events collapse to per-day stubs. We replicate: configurable `visible_hours: { start: "07:00", end: "21:00" }` per card config. Events fully outside the band don't get a grid slot — they're aggregated into a small `+N earlier` (top of day column) or `+N tonight` (bottom) chip. Tap the chip → popup listing those events.

Why this over Google's "compress the night" approach: simpler visual hierarchy, fewer pixels wasted, kid-readable.

### Chore-done event (extensibility hook)

When all of a kid's chores for the day are toggled `on`, the chores card fires a custom HA event:

```yaml
event_type: ha_lucarne_chores_all_done
event_data:
  kid_slug: kid1
  kid_name: "Kid 1"
  date: "2026-05-21"
  chores_completed: 5
  streak: 7
```

The card does **not** ship any consumer for this event — it's a documented extensibility point. Users wire up TTS announcements, push notifications, dashboard celebrations, etc., via their own HA automations subscribing to this event. The event schema is documented in the repo's `docs/events.md`.

### Pastel palette (per-person color)

Skylight-inspired soft pastels, single source of truth in `src/shared/design-tokens.ts`:

| Person/calendar role | Default color | Hex |
|---|---|---|
| Family / shared | Soft sage green | `#a8d8b9` |
| Anton | Dusty blue | `#a8c5e8` |
| Ingrid | Lavender | `#c8b4e0` |
| Kid 1 | Peach | `#f5c89c` |
| Kid 2 | Mint | `#b8e0d2` |
| Kid 3 | Rose | `#f0b8c8` |
| Holidays | Warm grey | `#d4cfc4` |
| Birthdays | Buttery yellow | `#f0dca0` |
| Les lilas (Anton's family) | Periwinkle | `#b8b4e8` |

Reference: Skylight's product palette (Pinterest moodboard provided by user). Cards default to these but every color is overridable per calendar in YAML.

### Kid identity model

Kids do NOT get HA `person` entities (avoids polluting the presence system with always-`unknown` people). Per-kid representation:

| Concern | Primitive |
|---|---|
| Display name | YAML `name:` field in card config (no HA helper needed) |
| Visual identity | Colored initial circle (no image needed for v1; `avatar:` URL optional in YAML, card uses initial if absent) |
| Daily chore state | `input_boolean.chore_<kid_slug>_<chore_slug>` (one per kid×chore) |
| Streak count | `counter.streak_<kid_slug>` |
| Per-kid color | YAML `color:` field in card config |

The card is told the entity IDs via YAML; helpers are created via `ha_config_set_helper` during Phase 4.

### Responsive layout

Cards target landscape iPad 9 (~1080×810 usable after kiosk chrome) as baseline. CSS uses `clamp()` for typography and CSS Grid `auto-fit` with `minmax()` for layouts, so cards scale gracefully across these four verification widths (tested in Phase 3 D.2 and Phase 5 B.1):
- iPad 9 portrait (~700 px wide — graceful collapse only, not a primary surface)
- iPad 9 landscape (~1080 px wide — PRIMARY target)
- iPad Pro 12.9" landscape (~1366 px wide)
- iPad Pro 11" landscape (~1440 px wide)

Cards must also degrade reasonably on any larger HA-running tablet the user upgrades to. No hard pixel widths; no separate mobile/desktop layouts. Cards must look right at all four widths above during Phase 5 verification.

### HACS distribution: custom repo for v1

In v1, users install ha-lucarne by adding the GitHub URL as a HACS custom repository (HACS → kebab menu → Custom repositories → URL + type/category: Dashboard; HACS validation still calls this `plugin`). Submission to the HACS default index is deferred until v1 has shipped and stabilized.

The repo must satisfy HACS frontend-category requirements: `hacs.json` at root, `dist/*.js` committed (so users don't need a build step), README with install instructions, MIT license, tagged GitHub releases.

## Requirements

### Reminders bridge (Phase 1)

- macOS Shortcut iterates a configurable list of Apple Reminders lists, applies per-list filter rules, builds a deterministic JSON payload, POSTs to HA webhook with shared-secret auth.
- launchd plist runs every 300 seconds (5 min). Logs stderr + stdout to `~/Library/Logs/ha-lucarne-sync.log`.
- HA automation blueprint accepts: webhook ID, per-list-to-todo mapping. Diffs incoming items by stable Apple Reminder ID (uses Reminders' `identifier` field), upserts into target todo entities.
- Created todo entities: `todo.ingrid_tasks` and `todo.groceries` (via `local_todo` integration).
- Dedicated HA user `lucarne` with a long-lived token; webhook automation uses the token only for the write-back path (planned for v0.2); v1 webhook auth is the shared secret in URL path.

### Cards (Phases 2–4)

- All three cards built with Lit 3+ + TypeScript + Vite.
- All three cards configurable via standard Lovelace YAML; all three ship `getConfigElement` UI editors.
- Cards subscribe to HA WebSocket for entity state changes; agenda/calendar cards use the `calendar/list_events` WS API (per-entity; fan out via `Promise.all`).
- Cards must render correctly at the 4 responsive breakpoints listed in [Responsive layout](#responsive-layout).
- Cards must hit 44+px minimum tap targets per accessibility guidelines.
- Cards must not throw console errors on missing-but-optional config (e.g. card with no `calendars: []` renders an empty-state, not an error).

### Dashboard integration (Phase 5)

- New "Family" tab on `/wall-ipad` dashboard (sections view, matches existing tab style).
- Today + Calendar cards on Family tab.
- New "Chores" tab on `/wall-ipad` (kids' surface, separate from Family for tap-target room on iPad 9).
- Existing 5 tabs (Upstairs / Downstairs / Security / Media / Recipes) untouched.
- Decision (deferred to Phase 5 kickoff after week of use): should Family or Today be the default landing tab?

### HACS publication (Phase 5)

- Repo `molant/ha-lucarne` on GitHub, MIT license.
- GitHub repo has a description and topics before release.
- `hacs.json` configured for frontend category.
- `dist/` committed (built artifacts) — HACS expects this for frontend.
- README with screenshots, install steps (custom-repo flow), per-card YAML config examples, link to blueprints, link to Mac mini bridge setup.
- Tagged release `v0.1.0` at end of Phase 5.

### Authorization & permissions

- HA `lucarne` user: regular non-admin, granted access to the webhook automation + the `todo.*` entities the sync writes. No dashboard, no devices.
- Existing `tablet` user (unchanged): renders the cards on the wall iPad via trusted-networks auto-login.
- Mac mini webhook auth: shared secret in URL path (HA webhook native support). Secret stored in macOS Keychain on the mini; never committed.

## Phases

| Phase | Title | Description |
|-------|-------|-------------|
| 1 | Foundation + Reminders bridge | Create `~/src/home-assistant-things/ha-projects/ha-lucarne/` with Lit+Vite+TS scaffold. Build Mac mini Shortcut + launchd + HA webhook + blueprint. Create `todo.ingrid_tasks` + `todo.groceries`. Add Family tab to `/wall-ipad` with stock todo-list cards. **Ships Ingrid's #1 ask using stock cards.** |
| 2 | `lucarne-today-card` | First custom Lit card. Replaces stock todo-list with hero panel: agenda + weather + tasks summary + presence. Ships responsive at iPad-9 landscape baseline. |
| 3 | `lucarne-calendar-card` | Week view Mon–Sun, configurable visible-hours band, pastel per-person color, inline visibility pills, tap-to-create event via `calendar.create_event`. |
| 4 | `lucarne-chores-card` + automations | 3-column kid grid, colored-initial avatars, per-kid streaks, daily-reset + streak-advance blueprint, custom `ha_lucarne_chores_all_done` event. Adds "Chores" tab. |
| 5 | Polish + HACS custom-repo publication | Responsive layout pass at 4 breakpoints, dashboard ergonomics, README + screenshots + per-card config docs, hacs.json validation, GitHub tag v0.1.0, HA community forum post (link from threads user found). |

## Related Documentation

- [Phase 1: Foundation + Reminders bridge](./phase-1-foundation.md)
- [Phase 2: lucarne-today-card](./phase-2-today-card.md)
- [Phase 3: lucarne-calendar-card](./phase-3-calendar-card.md)
- [Phase 4: lucarne-chores-card + automations](./phase-4-chores-card.md)
- [Phase 5: Polish + publication](./phase-5-polish-publication.md)
- Tower wiki: `~/src/Tower/home-automation/dashboards/wall-ipad.md` (existing 5-tab dashboard as-built reference)
- Tower wiki: `~/src/Tower/home-automation/integrations/mealie.md` (the Recipes tab, untouched by this project)
- Project precedent: `~/src/home-assistant-things/ha-projects/device-monitor-card/` (HACS card conventions, release flow)

## Project Memory Rules (apply to every phase)

Six rules apply to every helper/automation/dashboard config touched in any phase. Source citations in `~/.claude/projects/-Users-molant-src-home-assistant-things/memory/MEMORY.md`:

**HA config rules:**

1. **`not_from: [unavailable, unknown]`** on every state trigger that watches an entity that could transiently report those values (Reminders bridge automation, chore-related automations).
2. **`entity_id` (never `device_id`)** in any service target — including in card-generated service calls.
3. **`person.*` (never `device_tracker.*`)** for presence references. AND `input_boolean.<adult>_home` is the authoritative "is X home" signal, NOT `person.*` directly — per the household-presence-blueprint pattern. Cards reading presence MUST bind to `input_boolean.*_home`.

**Project guardrails:**

4. **No third-party HACS card installs in v1.** This project ships its OWN HACS cards; we do not install any new third-party HACS cards. If a phase needs a third-party card, the spec is wrong — flag and fix the spec before installing.
5. **No edits to `configuration.yaml`** for helpers/automations/dashboards. Use `ha_config_set_*` MCP tools. The only existing entry in that file is the `trusted_networks` block (unchanged).
6. **Plan approval ≠ install authorization** (memory · `feedback_plan_approval_not_install_authorization.md`). If a phase ever needs a third-party HACS install or a system-level install (Homebrew package, macOS app), stop and surface to the user; do not silently install. Lucarne's own HACS custom-repo install is still a user-action step in Phase 5.

## Best-Practices Skill (read before each phase's first HA write)

Before any HA config write in any phase, read the best-practices skill via MCP resource: `skill://home-assistant-best-practices/SKILL.md`. From the SKILL's Reference Files table, follow the pointers to specific reference files matching the task. Examples that will recur in this project:

- Phase 1 (helpers + automation blueprint): `references/helper-selection.md`, `references/automation-modes.md`
- Phase 3 (dashboard tab edit): `references/dashboard-cards.md`
- Phase 4 (chore automation + custom event): `references/automation-modes.md`, `references/templates-vs-helpers.md`

Preferred access path (in order; use the exact allowlisted names from the tool list below):
1. `ha_get_skill_home_assistant_best_practices` (the dedicated tool — simplest interface).
2. `ha_read_resource` on `skill://home-assistant-best-practices/SKILL.md` (use if you need to read a specific reference file by URI).
3. `ha_list_resources` if you need to enumerate available skill URIs first.
4. `read_resource` (MCP-native) as a last-resort fallback.

Whichever path you use, then follow the SKILL's Reference Files table to fetch only the specific reference docs your current task matches — do NOT bulk-load all references.

## Testing Tools

Discovered during spec creation. Use these for verification at each phase boundary.

| MCP Server | Tool Prefix | Use For |
|-----------|-------------|---------|
| home-assistant | `mcp__home-assistant__ha_*` | HA state inspection, entity search, service calls (including `return_response: true` actions like `todo.get_items` for read-back), template eval (`ha_eval_template`), dashboard config writes, helper creation, log fetching, automation traces, blueprint import, integration enable/disable, core reload, resource read. Primary verification toolset. See the explicit allowlist below. |
| home-assistant (best-practices skill) | `ha_get_skill_home_assistant_best_practices`, `ha_read_resource skill://home-assistant-best-practices/*` | Reference patterns for helpers, automations, dashboards. Read BEFORE each phase's first HA write. |

### Confirmed-available HA MCP tools (from `.claude/settings.local.json`)

Use these exact tool names. Tools NOT on this list are not allowed and will fail or block on a permission prompt:

- `ha_get_overview`, `ha_search_entities`, `ha_deep_search`, `ha_get_state`, `ha_get_entity`, `ha_get_device`, `ha_get_integration`
- `ha_call_service`, `ha_list_services`
- `ha_config_get_dashboard`, `ha_config_set_dashboard`
- `ha_config_get_automation`, `ha_config_set_automation`, `ha_config_remove_automation`
- `ha_config_set_script`, `ha_config_set_helper`
- `ha_set_entity`, `ha_remove_entity`
- `ha_get_logs`, `ha_get_history`, `ha_get_automation_traces`
- `ha_eval_template`
- `ha_import_blueprint`
- `ha_reload_core`
- `ha_set_integration_enabled`
- `ha_manage_energy_prefs`
- `ha_get_skill_home_assistant_best_practices`, `ha_list_resources`, `ha_read_resource`, `read_resource`

**Reload pattern**: `ha_reload_core` is the direct route for a full HA reload. `ha_call_service` with the domain-specific reload service (`automation.reload`, `script.reload`, `input_boolean.reload`, `template.reload`, etc.) is finer-grained and avoids restarting everything. For blueprint pickup after a YAML drop, `automation.reload` alone is sufficient — prefer it over a full `ha_reload_core` when you only changed an automation YAML.

**Genuinely unavailable**: `ha_get_logbook` is NOT registered as an MCP tool on this server (don't try to call it — it'll fail "unknown tool"). For event inspection, use `ha_get_automation_traces` (returns `result.events`) or `ha_get_logs`.

**HA user creation**: there is no MCP tool that creates HA users. User-creation steps in this spec are always user-action steps (UI walkthrough).

**File writes onto the HA host (`/config/...`, `/config/www/...`)**: no MCP tool writes arbitrary files to the HA host. Whenever this spec asks for a file at `<config>/...`, that is a user-action step — typically Samba share, SSH/SFTP, or the HA File Editor add-on. The implementer must surface this as a user step, not attempt it silently.

No browser MCP is currently installed for visual card verification. Manual verification: hard-refresh the dashboard in Safari/Chrome (Cmd+Shift+R), open DevTools console, watch for errors. iPad verification: physically walk to the kitchen.

## Logging & Diagnostics

Two log surfaces. Check both after each phase before marking it complete.

| Log Source | Location | Format | What to Check |
|-----------|----------|--------|---------------|
| HA logs | `ha_get_logs` MCP tool | structured | Filter for `ha-lucarne` / `lucarne` / new entity IDs. No `ERROR` or `WARNING` rows for touched components. Watch especially for the webhook automation's trace on first run. |
| Mac mini Reminders sync log | `~/Library/Logs/ha-lucarne-sync.log` (on the mini) | plain text (stderr+stdout of `shortcuts run`) | Cadence (should be a line every ~5 min during awake hours), HTTP response code from HA webhook (should be 200), Shortcut exit code (0 = success), any JSON parse errors. |

A zero exit code from `npm run build` does NOT mean clean output — scan for warnings (Vite reports them inline). HA automation trace via `ha_get_automation_traces` shows step-by-step run details for the webhook automation; check after every Reminders test event.

## Access Control

- **System**: HA's built-in user/permission model (no Firebase, no Supabase, no RLS). Webhooks support a shared-secret-in-URL pattern that needs no user auth.
- **HA users involved**:
  - `lucarne` (NEW in Phase 1): non-admin, long-lived token for any future HA→Reminders write-back. v1 webhook does not need this user; the secret is the auth.
  - `tablet` (EXISTING): non-admin, trusted-networks auto-login from `192.168.1.250`. Renders cards. Unchanged by this project.
  - `molant` (EXISTING): admin. Performs all config changes during implementation.
- **Webhook secret**: generated by `openssl rand -hex 32` during Phase 1; stored in macOS Keychain on the mini (`security add-generic-password`). Never committed to repo. The blueprint takes the secret as an input parameter; the user's actual deployment binds it.
- **GitHub repo**: public from creation. No secrets in the repo. The `bridge/com.molant.ha-lucarne-sync.plist` template uses a placeholder for the Mac mini username; the webhook URL + secret are retrieved at runtime from the Mac mini's Keychain by the Shortcut. Nothing secret is committed.
- **No new firewall rules**, no port-forwarding, no external exposure required for v1.
