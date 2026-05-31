---
status: in_progress
---

# Phase 1: Foundation + Reminders bridge

Stand up the repo, wire the Mac mini → HA Reminders sync end-to-end, and surface both lists on a new "Family" tab on the wall iPad using **stock HA cards** (no custom cards yet). By the end of this phase, Ingrid can dictate a reminder to Siri and see it on the kitchen iPad within 5 minutes — Phase 1 alone delivers ~60% of the project's user value.

## Context

Read [./README.md](./README.md) first — especially:
- **North-star success criteria** (#1 is the reminders bridge)
- **Multi-list Reminders bridge** concept (per-list filter rules)
- **Project Memory Rules** (apply to every HA write)
- **Best-Practices Skill** (read before first HA write)

Phase 1 has no dependencies on prior phases. Subsequent phases all depend on this one being deployed.

**Before any HA config write**, read `skill://home-assistant-best-practices/SKILL.md` via the preferred access path documented in README.md → "Best-Practices Skill" section. Prefer `ha_get_skill_home_assistant_best_practices`; use `ha_read_resource` on the `skill://` URI when you need a specific reference file. From its Reference Files table, read:
- `references/helper-selection.md` (built-in helpers vs. template — needed when picking `local_todo` config)
- `references/automation-modes.md` (needed for the webhook sync automation)

## Structure

```
NEW repo: ~/src/home-assistant-things/ha-projects/ha-lucarne/
├── .github/workflows/build.yml          # CI: build + lint on PR
├── .gitignore
├── .nvmrc                               # pin Node version
├── hacs.json                            # HACS frontend metadata (used in Phase 5; created now)
├── package.json                         # Lit 3 + Vite + TS deps
├── tsconfig.json
├── vite.config.ts                       # builds 3 cards to dist/ (only 1 stub exists in Phase 1)
├── src/
│   ├── index.ts                         # bundle entry: imports each card so vite includes it
│   ├── cards/
│   │   └── lucarne-today-card.ts       # placeholder (real impl in Phase 2)
│   └── shared/
│       └── design-tokens.ts             # pastel palette from README
├── dist/                                # committed for HACS frontend installs; NOT gitignored (see A.2 .gitignore step)
├── blueprints/
│   └── automation/
│       └── lucarne_reminders_sync.yaml  # the HA-side webhook → todo upsert blueprint
├── bridge/
│   ├── ha-lucarne-sync.shortcut         # exported macOS Shortcut (binary, after creation)
│   ├── ha-lucarne-sync.json             # human-readable Shortcut export for diff/review
│   ├── com.molant.ha-lucarne-sync.plist # launchd plist template
│   └── README.md                        # Mac mini install instructions
├── docs/
│   ├── architecture.md                  # data flow + WebSocket subs (stub in Phase 1; populated each later phase)
│   ├── reminders-bridge.md              # end-to-end Reminders flow + failure modes
│   └── events.md                        # ha_lucarne_* custom event schemas (populated in Phase 4)
├── LICENSE                              # MIT
├── README.md                            # value-prop + install (populated more in Phase 5)
└── CHANGELOG.md

HA changes (no files; via MCP):
├── User: `lucarne` (non-admin) with long-lived access token
├── Webhook secret: 32-byte hex, stored in macOS Keychain on mini
├── todo.ingrid_tasks                    # local_todo
├── todo.groceries                       # local_todo
├── automation.lucarne_reminders_sync    # instantiated from the blueprint above
└── /wall-ipad dashboard: new "Family" tab with 2 stock todo-list cards

Mac mini changes:
├── Shortcuts.app: "ha-lucarne-sync" Shortcut (configured for 2 lists)
├── ~/Library/LaunchAgents/com.molant.ha-lucarne-sync.plist
└── ~/Library/Logs/ha-lucarne-sync.log

Wiki updates:
├── ~/src/Tower/home-automation/projects/ha-lucarne.md (NEW project page)
├── ~/src/Tower/home-automation/integrations/apple-reminders-sync.md (NEW)
├── ~/src/Tower/home-automation/dashboards/wall-ipad.md (UPDATE: add Family tab to layout section)
└── ~/src/Tower/change-log.md (APPEND newest at top)
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline Verification (before starting)

This project has no existing test suite. Baseline = confirm the existing HA system is healthy before touching it.

- [x] Read `~/.claude/projects/-Users-molant-src-home-assistant-things/memory/MEMORY.md` index — note any feedback rules tagged with "HA", "dashboard", "presence", or "automation".
- [x] Read `skill://home-assistant-best-practices/SKILL.md` via the preferred path in README.md (`ha_get_skill_home_assistant_best_practices`; `ha_read_resource` for specific reference files). Then read the specific reference files listed in Context above.
- [ ] Confirm existing `/wall-ipad` dashboard renders on iPad — ask user to confirm visually. **USER ACTION REQUIRED**
- [ ] Confirm existing 5 tabs work (Upstairs / Downstairs / Security / Media / Recipes). User confirmation. **USER ACTION REQUIRED**
- [x] Confirm via `ha_get_state` that `weather.forecast_home`, `input_boolean.molant_home`, `input_boolean.gridou_home` all report sane values. (weather.forecast_home: clear-night, molant_home: on, gridou_home: on ✓)
- [x] **Discover and record the actual calendar entity IDs.** Calendars found: `calendar.family`, `calendar.birthdays_2` (birthdays), `calendar.gridou_molant_s_inn`, `calendar.holidays_in_united_states`, `calendar.ingrid_babel_gmail_com`, `calendar.les_lilas`. Note: `calendar.birthdays` (no suffix) is unavailable — use `calendar.birthdays_2`. Phase 2 must use these exact IDs.
- [ ] Confirm Mac mini is reachable from this MacBook (e.g., `ping <mini-hostname>.local` or via Tailscale). Get the user to share the mini's hostname/SSH access if needed. **USER ACTION REQUIRED**
- [x] Confirm `~/src/home-assistant-things/ha-projects/` exists and `ls` shows `device-monitor-card/` and `ha-blueprints/` as siblings. The new `ha-lucarne/` will join them. ✓

### Sub-Phase A: Repo scaffold + Lit/Vite/TS skeleton

Goal: a buildable repo with one placeholder card. CI runs build + lint on PR. **Deployable**: someone can `git clone`, `npm install`, `npm run build`, and get `dist/ha-lucarne.js` — empty card but registers the custom element without errors.

#### A.1 Create the GitHub repo

> **No MCP tool creates GitHub repos.** Use `gh` via Bash. Use `gh repo create` with --public, MIT license. If the user prefers to create it manually first, ask and wait.

- [x] Ask the user to confirm the GitHub repo name `molant/ha-lucarne` is acceptable and that no repo with that name already exists. Wait for confirmation. (Repo already exists — confirmed via `gh repo view molant/ha-lucarne`)
- [x] Run `gh repo create molant/ha-lucarne --public --license=MIT --description "DIY Skylight Calendar replacement for Home Assistant"`. Do NOT use `--clone` — we'll set up the local directory manually to match the project's `ha-projects/` layout. (Already created: `https://github.com/molant/ha-lucarne`, visibility: PUBLIC)
- [x] Create local dir: `mkdir -p ~/src/home-assistant-things/ha-projects/ha-lucarne && cd ~/src/home-assistant-things/ha-projects/ha-lucarne && git init -b main && git remote add origin git@github.com:molant/ha-lucarne.git`. (Directory and git already initialized with remote `https://github.com/molant/ha-lucarne.git`)

#### A.2 Toolchain: Node + Vite + Lit + TypeScript

- [x] Write `.nvmrc` with `20` (LTS as of project start).
- [x] Write `package.json` with:
  - `"name": "ha-lucarne"`, `"version": "0.0.1"`, `"private": false` (so it can be published if we ever go to npm), `"type": "module"`, `"main": "dist/ha-lucarne.js"`
  - `scripts`: `build` (`vite build`), `dev` (`vite build --watch`), `lint` (`eslint src --ext .ts`), `typecheck` (`tsc --noEmit`)
  - `devDependencies`: `vite ^5`, `typescript ^5`, `@types/node ^20`, `eslint ^9`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
  - `dependencies`: `lit ^3`, `home-assistant-js-websocket ^9`, `custom-card-helpers ^1.9`
- [x] Write `tsconfig.json` with strict mode, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `experimentalDecorators: true`, `useDefineForClassFields: false` (Lit requires this), `lib: ["ES2022", "DOM", "DOM.Iterable"]`.
- [x] Write `eslint.config.js` (flat-config format, required by eslint 9). Wire `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`'s recommended ruleset for `src/**/*.ts`; ignore `dist/`, `node_modules/`. Without this file, `npm run lint` fails immediately with "no configuration found". Also update the `package.json` lint script to `eslint src` (eslint 9 flat config infers extensions; the `--ext .ts` flag from above is a legacy eslint-8 flag and emits a warning under eslint 9).
- [x] Write `.gitignore`: `node_modules`, `.DS_Store`, `*.log`. **Do NOT gitignore `dist/`** — HACS frontend installs require the built artifact in the repo.
- [x] Write `LICENSE` (MIT, year 2026, copyright holder "Anton Molleda Moros").
- [x] Write a minimal `README.md` placeholder (one paragraph + "see Phase 5 for full docs" — Phase 5 expands this).
- [x] Write `CHANGELOG.md` with "## v0.0.1 — Project scaffolded".
- [x] Run `npm install`. Confirm no peer-dep warnings worth investigating. (2 moderate vulnerabilities in custom-card-helpers dependency chain — dev tool, not security-critical)

#### A.3 Stub the first card

- [x] Write `src/shared/design-tokens.ts` exporting the pastel palette from the README as a typed const (e.g. `export const LUCARNE_PALETTE: Record<string, string> = { family: '#a8d8b9', anton: '#a8c5e8', ... }`).
- [x] Write `src/cards/lucarne-today-card.ts` as a minimal Lit element extending `LitElement`, with `@customElement('lucarne-today-card')`. Card renders `<div>ha-lucarne · Today (placeholder)</div>`. Must register with `window.customCards`.
- [x] Write `src/index.ts` that imports `./cards/lucarne-today-card`. (Future cards: same pattern, one import per card.)
- [x] Run `npm run build`. Confirm `dist/ha-lucarne.js` exists and is < 100 KB. (22.76 kB ✓)
- [x] Run `npm run lint` and `npm run typecheck` — must pass cleanly. (Both clean ✓)

#### A.4 hacs.json (used fully in Phase 5; created now)

- [x] Write `hacs.json` (match the project precedent at `~/src/home-assistant-things/ha-projects/device-monitor-card/hacs.json` — same shape, no `zip_release` field, include `homeassistant` minimum). `content_in_root: false`, no `zip_release`. ✓

#### A.5 CI: build on PR

- [x] Write `.github/workflows/build.yml` running on `pull_request` to `main`: checkout, setup-node@v4 with `node-version-file: .nvmrc`, `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`. Cache npm cache via setup-node's `cache: npm`.
- [ ] Commit everything: `git add . && git commit -m "Scaffold ha-lucarne: Lit + Vite + TS + stub card"`. (pending commit)
- [ ] Push: `git push -u origin main`. (pending push)
- [ ] Confirm GitHub Actions run is green on the initial push (if GHA fires on main commits; otherwise verify in a PR after sub-phase B). (CI fires on PR only)

### Sub-Phase B: HA-side wiring (todo entities + user + blueprint + Family tab)

Goal: HA can receive a webhook payload and update the todo entities. The Family tab on the iPad shows both lists via stock `todo-list` cards. **Deployable**: an operator can POST a hand-crafted JSON to the webhook and see items appear on the iPad.

#### B.1 Generate webhook secret + store on mini

> **The Mac mini is the secret host, not this MacBook.** If we're prototyping from the MacBook, generate the secret here BUT also write it to the Keychain on the mini before sub-phase C.

- [ ] Run `openssl rand -hex 32` — copy the output. This is the webhook ID/secret combined (HA webhook URLs are `https://ha/api/webhook/<id>`; using the secret AS the id gives us shared-secret-in-URL auth).
- [ ] Tell the user: SSH to the Mac mini and run `security add-generic-password -a "ha-lucarne" -s "ha-lucarne-webhook-secret" -w "<the-secret>"`. Wait for confirmation. (Document the retrieval command for sub-phase C: `security find-generic-password -a "ha-lucarne" -s "ha-lucarne-webhook-secret" -w`.)
- [ ] Note the secret in passing memory for later sub-phases — do NOT commit it to the repo, do NOT write it to any file in `~/src/home-assistant-things/`.

#### B.2 Create the `lucarne` HA user

> **No direct MCP tool creates HA users.** This is a user-action step.

- [ ] Tell the user: HA → Settings → People → Users → Add user. Username `lucarne`, display name "Lucarne (Reminders bridge)", a long random password (the user generates it; we don't need it). Local-network-only access: leave "Local only" UNCHECKED for now since the Mac mini may be on Tailscale (we don't know yet). NOT an admin. Wait for confirmation.
- [ ] Tell the user: under that user's profile → Long-lived access tokens → Create token "ha-lucarne-bridge". They paste it; we receive it once. Tell them to also store it on the Mac mini: `security add-generic-password -a "ha-lucarne" -s "ha-lucarne-bridge-token" -w "<token>"`. v1 (v0.1.0) doesn't use it (the webhook secret is the auth), but the v0.2 round-trip will need it. Wait for confirmation.

#### B.3 Create the local_todo entities

> **`local_todo` is configured per-list via the UI integration flow.** `ha_set_integration_enabled` only toggles the integration domain on/off; it does not create individual list entries (each list is its own config-entry needing the UI flow's name input). Per-list creation goes through Settings → Devices & Services → Add Integration → Local To-do List. This is a user-action step; the implementer surfaces the walkthrough and waits for confirmation.

- [ ] Use `ha_search_entities` with `domain_filter: "todo"` to confirm the current todo entities (we expect the 5 mealie ones, no others).
- [ ] Tell the user: HA → Settings → Devices & Services → Add Integration → "Local To-do List". Name: "Ingrid's Tasks". After save, repeat for name "Groceries". Wait for confirmation.
- [ ] Verify via `ha_search_entities` with `domain_filter: "todo"` that `todo.ingrid_s_tasks` (or `todo.ingrid_tasks` depending on slugification) and `todo.groceries` now exist. Record the exact entity IDs.
- [ ] If the slugified ID differs from `todo.ingrid_tasks` (e.g., HA chose `todo.ingrid_s_tasks`), note it. The blueprint and dashboard config below must use the REAL entity ID — do NOT assume the slug.

#### B.4 Write the sync blueprint

The blueprint is the HA-side automation that receives the webhook payload and upserts items. It's parameterizable so other households can use it with their own webhook ID and todo entity mapping.

- [ ] Create `~/src/home-assistant-things/ha-projects/ha-lucarne/blueprints/automation/lucarne_reminders_sync.yaml`. Structure:
  ```yaml
  blueprint:
    name: Lucarne Reminders Sync
    description: |
      Receives a multi-list reminders payload via webhook and upserts items into
      the corresponding HA todo entities. Items are matched by stable Apple
      Reminder ID stored as the todo item's `uid`.
    domain: automation
    input:
      webhook_id:
        name: Webhook ID
        description: The HA webhook ID (= the shared secret). Generate via openssl rand -hex 32.
        selector: { text: { type: password } }
      list_mappings:
        name: List Mappings
        description: |
          JSON mapping of incoming Apple list names to HA todo entity IDs.
          Example: {"Family": "todo.ingrid_tasks", "Groceries": "todo.groceries"}
        selector: { text: { multiline: true } }
  trigger:
    - platform: webhook
      webhook_id: !input webhook_id
      allowed_methods: [POST]
      local_only: true  # IMPORTANT: this rejects requests from non-RFC1918 sources.
      # If the Mac mini reaches HA via Tailscale (100.x.y.z), the webhook will return
      # 200 but the automation will silently NOT fire. Verify the mini's source IP
      # to HA is RFC1918 (192.168.x.x / 10.x.x.x / 172.16-31.x.x) BEFORE relying on
      # local_only. If the mini is on Tailscale-only, set local_only: false AND
      # require the secret-in-URL pattern (already used here) as the sole auth.
      # See B.1 troubleshooting and verify the path with curl from the mini in B.6.
  variables:
    mappings: "{{ iif(list_mappings | string, list_mappings | from_json, {}) }}"
  action:
    # ... per-list diff + upsert logic; see implementation guidance below
  ```
- [ ] Implement the action body. Per incoming list (from the payload), do the following. **YAML structure**: use HA's `repeat.for_each` for iteration (NOT Jinja `{% for %}` blocks — those only work inside `{{ }}` templates, not as a control structure for actions). The outer loop iterates `trigger.json.lists`; the inner loops iterate items. See Phase 4 A.3 for a concrete `repeat.for_each` skeleton — apply the same pattern here.
  1. Resolve target todo entity from `mappings`. If not found, call `system_log.write` with `level: warning` and skip via a `choose:` / `default:` branch.
  2. Call `todo.get_items` on the target entity (action returns response → use `response_variable: existing` to capture). Existing items live at `{{ existing[target_entity].items }}` (verify the response shape against `ha_list_services` `domain: todo detail_level: full`).
  3. Build a set of incoming non-completed item `uid`s into a `variables:` block.
  4. For each incoming item with `completed: false` (use `repeat.for_each` over the items list):
     - If existing has same `uid` → call `todo.update_item` if `summary` or `due` changed.
     - If not → call `todo.add_item` with `summary`, `due`, and the `uid` set to the Apple Reminder ID.
  5. For each existing non-completed item whose `uid` is NOT in the incoming non-completed set → call `todo.update_item` with `status: completed` (it was completed or deleted on the Apple side).
- [ ] **Verify `todo.add_item` / `todo.update_item` / `todo.get_items` accept the `uid` field.** This is a HARD gate — if skipped and the field isn't supported, the dedupe key will be lost and items will duplicate on every 5-min sync. Steps:
  1. Run `ha_list_services` with `domain: "todo"` and `detail_level: "full"`. Print the full schema for the three actions.
  2. Look for `uid` as a top-level field in the schemas for `add_item` and `update_item`. As of HA 2024.x, `local_todo` stores `uid` internally on the iCalendar VTODO but the public action schema may NOT expose `uid` as a writable input.
  3. **Decision tree** — pick ONE path and apply throughout:
     - If `uid` IS in the schema for both `add_item` and `update_item` → use it directly. Match incoming items to existing items by `uid`.
     - If `uid` is NOT in the schema → fall back to the sentinel-prefix pattern. Store the Apple ID in the `description` field with prefix `[apple:<id>] `, e.g. `[apple:abc-123] Pick up dry cleaning`. Match by stripping the prefix and comparing; the `summary` carries the human-readable title without the prefix.
  4. Document which path is in use in TWO places:
     - The blueprint YAML's `description:` field (so installers see it).
     - The wiki page `apple-reminders-sync.md` (Sub-Phase D).

  > **Path chosen (implementation)**: `uid` is NOT in the `todo.add_item` or `todo.update_item` schemas (confirmed via `ha_list_services domain:todo detail_level:full`). The **sentinel-prefix path** was chosen: Apple ID stored as `[apple:<id>]` prefix in the HA item's `description` field. See blueprint `description:` block for v1 limitations (due-date clearing, same-title collision risk). Verification step below ("Verify the test item's `uid` matches `test-apple-1`") should be interpreted as: verify the sentinel `[apple:test-apple-1]` prefix is present in the item's `description` field, not the `uid` field.
- [ ] Test the blueprint YAML parses by importing it locally first: copy to a HA-accessible location (e.g. via `ha_import_blueprint` with the file URL pointing to the GitHub raw URL after pushing — chicken-and-egg; alternative: tell user to drop the file into `<config>/blueprints/automation/molant/` manually for v1; we'll automate the import after the repo is published).

#### B.5 Instantiate the automation from the blueprint

- [ ] **Preferred path** if the repo is already pushed to GitHub: use `ha_import_blueprint` with the GitHub raw URL of the blueprint file. This avoids the manual file-drop step.
- [ ] **Fallback path** (used if the repo isn't pushed yet, or `ha_import_blueprint` fails for any reason): tell the user to put the blueprint YAML at `<config>/blueprints/automation/molant/lucarne_reminders_sync.yaml` via Samba/SFTP/File Editor. Wait for confirmation. Then reload automations via `ha_reload_core` (or equivalently `ha_call_service` with `domain="automation", service="reload"`). `automation.reload` alone is sufficient for blueprint pickup.
- [ ] Use `ha_config_set_automation` to create an automation from the blueprint, with inputs:
  - `webhook_id`: the secret from B.1
  - `list_mappings`: `{"Family": "todo.<actual_ingrid_entity>", "Groceries": "todo.groceries"}` (use exact IDs from B.3)
- [ ] Verify via `ha_get_state` that `automation.lucarne_reminders_sync` exists and is `on`.

#### B.6 Smoke-test the webhook from the MacBook

- [ ] Build a minimal test payload:
  ```bash
  curl -X POST http://homeassistant.local:8123/api/webhook/<the-secret> \
    -H "Content-Type: application/json" \
    -d '{
      "lists": [
        { "apple_list_name": "Family", "items": [
            { "id": "test-apple-1", "title": "Test reminder from curl", "due": null, "completed": false }
        ]}
      ]
    }'
  ```
- [ ] Confirm HTTP 200. Then `ha_get_state` on `todo.<ingrid_entity>` — `state` attribute should be `1` (one item). **If HTTP is 200 but the todo state did NOT change**, the webhook fired but the automation did not — most likely cause is `local_only: true` rejecting a non-RFC1918 source IP. Inspect via `ha_get_automation_traces` on `automation.lucarne_reminders_sync`; if there are zero traces, flip the blueprint instance to `local_only: false` (or move the mini onto the LAN) and retry.
- [ ] **Also test from the Mac mini's own shell** (not just the MacBook): SSH in and run the same curl. If the LAN test passes but the mini test does NOT trigger the automation trace, that's the `local_only` issue — proceed as above.
- [ ] Read the items either via `ha_eval_template` (e.g. `{{ state_attr('todo.<ingrid_entity>', 'all_items') }}`) OR via `ha_call_service` with `domain="todo", service="get_items"`, `target={entity_id: "todo.<ingrid_entity>"}`, and `return_response: true`. The service-call path returns a stable schema; the template path is quicker for ad-hoc checks. Inspect the entity's attributes with `ha_get_state` if you need to confirm the response shape either way.
- [ ] Verify the test item's `uid` matches `test-apple-1`. If not, the blueprint isn't honoring uid — fix.
- [ ] Send a second payload with the same item ID but `completed: true`. Confirm the HA item's `status` flips to `completed`.
- [ ] Use `ha_get_automation_traces` on `automation.lucarne_reminders_sync` to inspect the run trace. No errors expected.

#### B.7 Add Family tab to /wall-ipad

> **Editing the wall-ipad dashboard config** uses `ha_config_set_dashboard` with `python_transform=…`. Per `~/src/Tower/home-automation/dashboards/wall-ipad.md`, the dashboard is server-side (no file on disk).

- [ ] First, `ha_config_get_dashboard` for the `wall-ipad` dashboard to capture the CURRENT config (we need to know the exact `views` structure and `kiosk_mode` block before mutating).
- [ ] Use `ha_config_set_dashboard` with `python_transform`: insert a new view BEFORE the existing first view (or at a position the user prefers — ask if unclear). View structure:
  ```yaml
  title: Family
  path: family
  icon: mdi:account-group
  type: sections
  max_columns: 3
  sections:
    - type: grid
      cards:
        - type: heading
          heading: "Ingrid's Tasks"
        - type: todo-list
          entity: todo.<ingrid_entity_id>
    - type: grid
      cards:
        - type: heading
          heading: Groceries
        - type: todo-list
          entity: todo.groceries
  ```
  Use exact entity IDs captured in B.3.
- [ ] Verify the dashboard config hash changed via `ha_config_get_dashboard` (compare before/after).
- [ ] Ask user to refresh the iPad (or hard-reload Safari) and confirm:
  - Family tab visible
  - Both todo-list cards render
  - Tap-to-add and tap-to-complete on the iPad work for both lists (stock todo-list card supports both)
  - No regressions on the other 5 tabs

### Sub-Phase C: Mac mini — Shortcut + launchd

Goal: every 5 minutes, the mini reads the configured Apple Reminders lists, applies filters, and POSTs to the HA webhook. **Deployable**: real Reminders flow from Siri capture to iPad without manual intervention.

#### C.1 Build the macOS Shortcut

> **Shortcuts can only be authored interactively in Shortcuts.app.** No CLI for authoring. We give the user step-by-step instructions, then export.

- [ ] SSH (or remote-desktop) the user into the Mac mini. Confirm Shortcuts.app has been launched at least once (required for `shortcuts run` CLI to work).
- [ ] Tell the user to open Shortcuts.app and create a new Shortcut named `ha-lucarne-sync`. Wait for confirmation.
- [ ] Walk the user through the Shortcut's actions. Logical flow:
  1. **Dictionary**: `LIST_CONFIG` = `[{ "apple_list": "Family", "filter": "assigned_to_ingrid" }, { "apple_list": "Groceries", "filter": "all" }]`
  2. **Get Reminders** action, filtered by list name "Family". Filter further by Assignee = "Ingrid" (Apple's shared-list assignee field — verify it appears as a filterable attribute in Shortcuts; if not, fall back to a name-prefix filter).
  3. **For Each** → build a dictionary `{id, title, due, completed, list_name: "Family"}`. Accumulate into `family_items` variable.
  4. **Get Reminders** filtered by list "Groceries", no further filter.
  5. **For Each** → build dictionary, accumulate into `groceries_items`.
  6. **Combine** into payload: `{"lists": [{"apple_list_name": "Family", "items": <family_items>}, {"apple_list_name": "Groceries", "items": <groceries_items>}]}`.
  7. **Get text from input** to JSON-encode the payload.
  8. **Get contents of URL**: `http://homeassistant.local:8123/api/webhook/<secret>` (retrieve from Keychain via a shell-script action: `security find-generic-password -a "ha-lucarne" -s "ha-lucarne-webhook-secret" -w`). POST, Content-Type `application/json`, body = the JSON.
  9. **If** HTTP status ≠ 200 → log a notification to the Reminders bridge log.
- [ ] **Important**: the assignee-filter step in Apple Reminders shared lists is the riskiest unknown. If Shortcuts can't filter shared-list items by assignee, fall back to: send ALL "Family" items in the payload and let HA filter (add a `filter_rule` field per list in the payload; blueprint reads it; rule `assigned_to: <name>` is honored in the blueprint's action body). Either way, the result on the iPad is the same.
- [ ] Test the Shortcut manually from Shortcuts.app → "Play" button. Verify items appear in HA via `ha_get_state` on the todo entities.
- [ ] Test from CLI: `shortcuts run "ha-lucarne-sync"` from a Terminal on the mini. Same verification.

#### C.2 Export the Shortcut for the repo

- [ ] In Shortcuts.app: File → Export → Save as `.shortcut` file. Save to a path on the MacBook (not the mini) so we can commit it: `~/src/home-assistant-things/ha-projects/ha-lucarne/bridge/ha-lucarne-sync.shortcut`.
- [ ] Use `shortcuts dump-action <id>` (if available on the mini's macOS version) to also export a JSON view: `ha-lucarne-sync.json`. If the CLI doesn't support it, skip; the `.shortcut` binary alone is enough.

#### C.3 launchd plist

- [ ] Write `~/src/home-assistant-things/ha-projects/ha-lucarne/bridge/com.molant.ha-lucarne-sync.plist`:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>Label</key><string>com.molant.ha-lucarne-sync</string>
    <key>ProgramArguments</key>
    <array>
      <string>/usr/bin/shortcuts</string>
      <string>run</string>
      <string>ha-lucarne-sync</string>
    </array>
    <key>StartInterval</key><integer>300</integer>
    <key>RunAtLoad</key><true/>
    <key>StandardOutPath</key><string>/Users/<USERNAME>/Library/Logs/ha-lucarne-sync.log</string>
    <key>StandardErrorPath</key><string>/Users/<USERNAME>/Library/Logs/ha-lucarne-sync.log</string>
  </dict>
  </plist>
  ```
  Use a placeholder for `<USERNAME>` — the user substitutes during install. Note in bridge/README.md.
- [ ] Tell the user to copy the file to `~/Library/LaunchAgents/com.molant.ha-lucarne-sync.plist` on the mini, substituting their username. Then `launchctl load ~/Library/LaunchAgents/com.molant.ha-lucarne-sync.plist`. Wait for confirmation.
- [ ] Verify the agent is loaded: `launchctl list | grep ha-lucarne-sync`. Should show the label with no failure code.
- [ ] Tail the log: `tail -f ~/Library/Logs/ha-lucarne-sync.log`. Wait up to 5 minutes for the first scheduled fire. Confirm HTTP 200 response logged.

#### C.4 Write bridge/README.md

- [ ] Document install steps for the Mac mini side:
  1. Prerequisites (macOS 13+, Shortcuts.app launched once, Reminders signed into iCloud account that owns/joins the Family + Groceries lists)
  2. Generate webhook secret + store in Keychain
  3. Open `ha-lucarne-sync.shortcut` to install
  4. Edit the Shortcut's `LIST_CONFIG` to match your Apple list names
  5. Copy launchd plist + substitute username + `launchctl load`
  6. Verify via log tail
  7. Troubleshooting: Shortcuts.app must be launched once after every macOS major upgrade; Shortcut won't fire from launchd if it's not in the user's Shortcuts library; etc.

### Sub-Phase D: End-to-end verification + wiki

Goal: real Siri capture → iPad surface confirmed working. Wiki updated as the new source of truth.

#### D.1 End-to-end smoke test

- [ ] Ask the user (or do this themselves on Ingrid's behalf) to dictate a new reminder to Siri: "Hey Siri, remind me to test ha-lucarne. Family list. Assign to Ingrid."
- [ ] Wait up to 5 minutes.
- [ ] Confirm the item appears on the iPad's Family tab in Ingrid's Tasks card.
- [ ] Tap to complete on the iPad. Confirm the item flips to completed (stock todo-list card supports this locally).
- [ ] Wait for next sync cycle (≤ 5 min). The item should remain in completed state on the iPad (HA side) but stay uncompleted in Apple Reminders (v1 is one-way). Document this in the wiki — v0.2 will round-trip.
- [ ] Repeat with a Groceries item: "Hey Siri, add bananas to Groceries." Confirm.

#### D.2 Wiki updates

- [ ] Create `~/src/Tower/home-automation/projects/ha-lucarne.md` using the project page format (see `~/src/Tower/home-automation/projects/` for siblings, e.g. the HomeKit-Bridge-refactor page). Frontmatter, problem statement, design, current phase status, link to GitHub repo, link to other wiki pages.
- [ ] Create `~/src/Tower/home-automation/integrations/apple-reminders-sync.md`. Cover:
  - Mac mini setup (Shortcut + launchd)
  - HA webhook + blueprint
  - Payload schema
  - How "assigned to Ingrid" filtering was actually implemented (Shortcut-side vs HA-side fallback)
  - Known failure modes (mini sleep, Shortcuts.app not launched, network drop)
  - Log locations
  - Wikilink to `[[../projects/ha-lucarne]]`
- [ ] Update `~/src/Tower/home-automation/dashboards/wall-ipad.md`: add the Family tab to the Layout section, list the 2 todo-list cards, link to `[[../integrations/apple-reminders-sync]]`. Update `last_updated` frontmatter to today's date.
- [ ] Append `~/src/Tower/change-log.md` with a newest-at-top entry:
  ```
  ### YYYY-MM-DD — ha-lucarne Phase 1 complete
  Reminders bridge live: Mac mini → HA → iPad Family tab. ~5 min latency. v1 is one-way; v0.2 will round-trip. See [[home-automation/projects/ha-lucarne]] for the project tracker.
  ```
- [ ] Tower vault auto-commits via Obsidian Git plugin. Verify a commit landed (`cd ~/src/Tower && git log -1 --oneline`).

### Build Verification (required before marking phase complete)

- [ ] In `~/src/home-assistant-things/ha-projects/ha-lucarne/`: `npm run lint` — zero warnings.
- [ ] `npm run typecheck` — zero errors.
- [ ] `npm run build` — `dist/ha-lucarne.js` exists, < 100 KB. Inspect the Vite output for any `[WARN]` lines.
- [ ] GitHub Actions CI green on the PR (or on `main` if pushed directly).
- [ ] Commit all final files (Shortcut export, plist, blueprint, scaffold). `git push`.
- [ ] No new entries in HA logs (`ha_get_logs`) classified as `ERROR` or `WARNING` for the new `lucarne_reminders_sync` automation over the past hour.
- [ ] Tail `~/Library/Logs/ha-lucarne-sync.log` on the mini — at least 3 successful 5-minute cycles. No HTTP non-200, no Shortcut exit code ≠ 0.

### Manual Verification (golden path + edge cases)

- [ ] **Golden path** (D.1 covers this): Siri dictation → iPad surface within 5 min.
- [ ] **Edge case — Reminder deleted in Apple**: complete an item directly in Apple Reminders (not on iPad). Within 5 min, the iPad's HA todo item should flip to completed.
- [ ] **Edge case — empty Family list**: clear all items in Apple Reminders Family list temporarily. Within 5 min, the iPad's Ingrid Tasks card should be empty. Re-add an item; it should reappear.
- [ ] **Edge case — webhook auth failure**: from the MacBook, POST to `http://homeassistant.local:8123/api/webhook/wrong-secret`. Confirm HA returns 401 or 405 (HA's default for unknown webhooks). Confirm no automation trace fired.
- [ ] **No regressions**: refresh the 5 existing tabs on the iPad. All cards render, no console errors.

> **This is a hard gate.** Phase 1 isn't done until the smoke test (D.1) works end-to-end TWICE in a row from independent Siri captures.

## Technical Details

### Payload schema (Mac mini → HA)

```json
{
  "lists": [
    {
      "apple_list_name": "Family",
      "filter_applied": "assigned_to_ingrid",
      "items": [
        {
          "id": "apple-reminder-uuid-string",
          "title": "Pick up dry cleaning",
          "due": "2026-05-22T17:00:00Z",
          "completed": false,
          "notes": "Optional notes from Reminders"
        }
      ]
    },
    {
      "apple_list_name": "Groceries",
      "filter_applied": "all",
      "items": [
        { "id": "...", "title": "Bananas", "due": null, "completed": false }
      ]
    }
  ]
}
```

Field rules:
- `id` is the Apple Reminder's stable identifier — survives edits, used as the dedupe key.
- `due` is ISO 8601 UTC, or `null` for no due date.
- `completed` is the Reminder's current state in Apple. If a sync cycle sees an item flip to `true`, HA marks the corresponding todo item complete.
- `notes` is optional; surfaced in the todo item's description.

### Blueprint config example (user's actual instantiation)

```yaml
# automation.lucarne_reminders_sync (inserted via ha_config_set_automation)
alias: Lucarne Reminders Sync
use_blueprint:
  path: molant/lucarne_reminders_sync.yaml
  input:
    webhook_id: "<32-byte-hex-secret>"
    list_mappings: |
      {"Family": "todo.ingrid_s_tasks", "Groceries": "todo.groceries"}
```

(Use the actual todo entity IDs captured in B.3 — do not assume slugs.)

### Why `local_todo` and not `caldav` or `todoist`

- `local_todo` is HA-native, no external dependency, stores on the HA instance's disk.
- `caldav` requires a CalDAV server (iCloud is not standards-compliant; Radicale would need self-hosting).
- `todoist` requires a Todoist account, which the household doesn't use.
- Local-todo state survives HA restarts and shows up in stock `todo-list` cards as well as future custom cards.

## Constraints

- **5-minute latency cap** for the Siri-to-iPad path is acceptable to the user; document it in the README.
- **Mac mini must stay awake** — pin "prevent computer sleep when display is off" in System Settings → Lock Screen. Sleep would silently break the bridge.
- **No third-party HACS card installs** in v1 (project memory rule). Lucarne's own HACS custom-repo install happens in Phase 5.
- **No edits to configuration.yaml** (project memory rule).
- **No new HA entities beyond what's listed in B.3** (todo.ingrid_*, todo.groceries) — chores helpers come in Phase 4.
- **Webhook secret is NOT committed**. The blueprint file in the repo uses a placeholder; the actual deployment binds the secret at automation instantiation time.
