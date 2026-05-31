---
status: done
---

# Phase 5: Today card update + documentation overhaul

Today card reads household tasks + per-member streaks from the integration. Add a CLAUDE.md to the repo. Rewrite `README.md` install + configuration sections to reflect dual distribution (Frontend + Integration). Update bridge/README.md for new entity names. Update architecture and events docs.

This is the docs phase but it also delivers a real product-facing feature: the today card surfaces household chores + a per-member "ready for the day" indicator.

## Context

Phases 0-4 deliver the integration + new chores card. The today card still uses the old per-card `tasks: todo.ingrid_tasks` config and doesn't know about the integration. This phase makes it integration-aware (optional) without breaking existing configs.

Read [./README.md](./README.md) for overall feature context.

## Structure

```
src/
  cards/
    lucarne-today-card.ts                  # update: optional household_tasks_from_integration support
  editors/
    lucarne-today-card-editor.ts           # update: add toggle for integration-mode household tasks
  components/
    tasks-summary.ts                       # update: handle both modes (raw todo entity OR integration household)
    family-ready-pill.ts                   # new: small pill showing N/M members ready
  shared/
    types.ts                               # update: add LucarneTodayCardConfig fields
README.md                                  # major rewrite (Install + Configuration sections)
CLAUDE.md                                  # NEW
docs/
  architecture.md                          # finalize
  integration.md                           # finalize
  services.md                              # finalize
  events.md                                # finalize
bridge/
  README.md                                # update: new entity names, integration-mode optional
tests/
  components/
    lucarne-today-card.test.ts             # update
    family-ready-pill.test.ts              # new
    tasks-summary.test.ts                  # update
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline verification (before starting)

- [x] Phase 4 verified on real HA: chores card works, integration installed, members configured
- [x] `npm test && npm run lint && npm run typecheck && npm run build` baseline green
- [x] `pytest tests/python` Phase 3 green

### Sub-Phase A: Today card integration support

#### Config schema update
- [x] In `lucarne-today-card.ts`, add to `LucarneTodayCardConfig`:
  ```ts
  household_tasks_from_integration?: boolean;   // default false; if true, ignores tasks: setting and reads from integration
  show_family_ready_pill?: boolean;             // default false; if true, shows N/M members ready pill
  ```
- [x] Backward compat: if neither flag is true, today card behaves exactly as before (reads `tasks: todo.ingrid_tasks` as raw entity)

#### `family-ready-pill.ts` (new component)
- [x] Props: `members: MemberSummary[]`, `tasksByMember: Map<slug, RenderableTask[]>`
- [x] Render: a small pill showing icon + "N/M ready" where M is count of members with at least one routine due today, and N is count of those members whose due-today routines are all `completed`. Do NOT compute readiness from `counter.<slug>_streak`; streaks are historical and can be stale until the configured streak check time.
- [x] Click → fires `family-ready-clicked` event (parent can open chores card)
- [x] Tests: variants (0/3, 2/3, 3/3, 0/0 → renders "no routines today")

#### `tasks-summary.ts` update
- [x] Existing behavior (read raw todo entity from `tasks: ...`) preserved
- [x] New mode: when `household_tasks_from_integration: true`, subscribe via `family-subscription` and render items from `todo.lucarne_household`
- [x] Item rendering: when from integration, use task metadata (icon, due) to render more richly than raw todo
- [x] Tests: both modes render correctly

#### `lucarne-today-card.ts` update
- [x] When `show_family_ready_pill: true`, mount `family-ready-pill` in the header area
- [x] When `household_tasks_from_integration: true`, mount `tasks-summary` in integration mode
- [x] Subscribe to `family-subscription` only if either flag is true (avoid extra WS traffic for users who don't use the integration)

#### Editor update
- [x] Add two new toggle fields in the visual editor
- [x] If integration not installed: gray out the toggles with helper text

#### Tests
- [x] `tests/components/lucarne-today-card.test.ts` (update existing): cover all 4 combinations of the two flags
- [x] `tests/components/family-ready-pill.test.ts`: render variants

### Sub-Phase B: README.md rewrite

This is the user-facing entry point. Treat as marketing + installation gospel.

#### Install section
- [x] HACS install path is a **verification gate**, not an assumption: confirm on a fresh HA instance whether `hacs.json` can declare both Frontend and Integration so HACS shows both downloads under a single repo entry. If HACS requires two URLs or separate category entries, update README + raise an issue against HACS.
- [x] Update install steps:
  1. Add HACS custom repository (single URL — both Frontend and Integration appear under it)
  2. Download Lucarne (cards) — installs the Lovelace plugin
  3. Add Lovelace resource (unchanged from prior version)
  4. Download "Lucarne Family" (integration) — copies `custom_components/lucarne_family/` into the HA config
  5. Restart Home Assistant
  6. Install Lucarne Family integration (Settings → Devices & Services → Add Integration → Lucarne Family)
  7. Configure family members in the integration's Configure dialog
  8. Add cards to dashboard
- [x] Add "What does the integration do?" subsection above install: explains the new architecture (one config place; auto-created helpers; managed automations)

#### Configuration section
- [x] Rewrite `lucarne-chores-card` config example to new schema (members array, show toggles)
- [x] Add small `lucarne-today-card` update note for the new integration-mode toggles
- [x] Remove `Settings → Helpers` instructions for chore booleans (no longer needed)
- [x] Update Blueprints section: only `lucarne_reminders_sync` remains
- [x] Add a "Family configuration" section explaining the integration's Options Flow

#### Features section
- [x] Update the chores card bullet: "Per-member chore + routine grid, with friendly recurrence (every Monday, every 6 months, ...), emoji icons, and one-click add via the card."
- [x] Add new bullet: "Lucarne Family integration: centralized family configuration. Add a member and the integration creates their todo list, streak counter, and managed automations."

### Sub-Phase C: CLAUDE.md (new)

Add a CLAUDE.md at the repo root. Target audience: future AI sessions (and humans new to the repo).

- [x] Sections:
  - **Project overview** — Lit cards + Python integration, two test runners, deploy targets
  - **Layout** — `src/` for cards, `custom_components/lucarne_family/` for integration, `blueprints/` for the remaining Reminders blueprint, `bridge/` for the Mac mini side
  - **Build & test** — TS commands (`npm run build`, `npm test`, `npm run typecheck`), Python commands (`ruff`, `mypy`, `pytest`), where to find each
  - **Deploy** — `scripts/deploy.sh` for cards (target: `ha-vm:/homeassistant/www/lucarne/`, NOT the HACS-managed path), `scripts/deploy-integration.sh` for integration (target: `ha-vm:/homeassistant/custom_components/lucarne_family/`). Both bypass HACS for fast iteration; HACS is the install path for end users only. Restart HA after deploying the integration (cards hot-reload via cache-busted URL).
  - **Test runner conventions** — Node `node:test` (NOT vitest), pytest with `pytest-homeassistant-custom-component`
  - **HACS distribution** — dual category (plugin + integration), exact files HACS expects at root
  - **Common pitfalls** — `node:test` not vitest; no blocking I/O in async code; entity rename has downstream impact preview; integration uses `lucarne_family.*` services and `lucarne_family_*` events; legacy `ha_lucarne_chores_all_done` event still fires during v0.x
  - **Don'ts** — don't edit `automation.lucarne_*` directly (overwritten by integration); don't hand-roll RRULE math (use `dateutil.rrule`); don't write to `<config>/www` outside `/local/lucarne/avatars/`
  - **Pointers** — link to `features/chores-card/README.md`, `docs/architecture.md`, `docs/integration.md`
- [x] Keep it ≤ 250 lines; deep details belong in `docs/`

### Sub-Phase D: docs/ overhaul

#### `docs/architecture.md`
- [x] Update section "Custom integration (Phase 1+)" (was placeholder from Phase 0) with the final architecture: config flow, storage split, managed entities, managed automations, completion listener, recurrence engine
- [x] Update card subscription model: chores card uses `family-subscription`; today card optionally uses it
- [x] Add data-flow diagram (mermaid or text): user action → card → integration service → store/entity → state change → listener → log/event → card re-render

#### `docs/integration.md`
- [x] Final user-facing doc: install, first-run, member management, task management, services, events, troubleshooting, deprecation notes
- [x] Include screenshots (placeholder note: take after Phase 4 + 5 verification; commit in this sub-phase)

#### `docs/services.md`
- [x] Complete reference: every `lucarne_family.*` service, payload schema, example call, returned events

#### `docs/events.md`
- [x] Event reference through Phase 5: legacy `ha_lucarne_chores_all_done` (deprecated, will be removed in v1.0) + all Phase 2-3 `lucarne_family_*` events. Phase 6 adds the deferred round-trip event and must update this doc again.
- [x] Migration table: legacy event → new event mapping

### Sub-Phase E: bridge/README.md update

- [x] Update entity name examples from `todo.ingrid_tasks`, `todo.groceries` to the new pattern. The bridge can still target arbitrary `todo.*` entities; the spec's recommended pattern is per-member `todo.<slug>` + `todo.lucarne_household` (the integration creates these for you).
- [x] Add a "When using the Lucarne Family integration" section: list mappings now target `todo.<slug>` entities created by the integration; the integration's apple sentinel backfill handles metadata
- [x] Add a note: "If you want a single Reminder to surface as a chore in the new chores card, it must be assigned to a member whose slug matches the target `todo.<slug>` entity OR be in the household list mapped to `todo.lucarne_household`."

### Documentation (end of phase, meta)

- [x] All docs cross-link correctly (no broken relative links)
- [x] CHANGELOG.md updated with a "v0.2.0 (unreleased) — Phase 5" entry summarizing this phase's changes. The full v0.2.0 release entry is finalized in Phase 6.

### Build verification

- [x] All previous build verification steps (TS lint/typecheck/build, Python ruff/mypy/pytest, HACS validation, CI green)
- [ ] On real HA: today card with `household_tasks_from_integration: true` renders household items correctly
- [ ] Today card with `show_family_ready_pill: true` shows accurate pill (manually test by completing all displayed members' routines and watching the pill)
- [x] All doc links resolve (no 404s on local navigation)
- [x] CLAUDE.md present at repo root
- [x] Mark phase `status: done`

> **Real-HA and MCP verification items above are deferred to Phase 6 sign-off.** Automated tests (214 Python + TypeScript component tests) pass; the real-HA walkthrough requires the deployed bundle and integration on a live instance.

### Manual verification with MCP tools

- [ ] Browser MCP: navigate to dashboard with today card in integration mode; verify household items render with metadata-driven icons; verify family-ready pill changes as routines complete
- [ ] `mcp__home-assistant__ha_get_state` for `todo.lucarne_household` to cross-check what the card displays
- [ ] Walk through README.md install steps in a clean HA dev instance (use a sandboxed HA container) to verify the docs match reality. If they diverge, fix the docs (not the code).

> **Note**: The three items above require a live HA instance with the integration deployed. Deferred to Phase 6 sign-off alongside the round-trip writeback feature.

## Constraints

- **Today card backward compat** — old `tasks: todo.ingrid_tasks` config keeps working
- **CLAUDE.md ≤ 250 lines** — deep details in `docs/`
- **All HACS install paths in README must be verified** by walking through a fresh install
- **Bundle size delta from this phase ≤ +5KB** (small components)

## Shortcut-resistance notes for LLM implementer

- **Don't claim the docs work without walking through a fresh install.** A doc that says "Step 3: click Configure" is wrong if Configure doesn't exist yet.
- **Don't break the existing today-card config** when adding integration support. The default for both new flags is `false`.
- **CLAUDE.md is a working document, not marketing.** Focus on "what an LLM session would get wrong without this": commands, paths, distinctions like `node:test` vs vitest.
- **Don't add a contributing.md or coc.md** unless the user asks. The user has already cautioned against generating unrequested docs.
