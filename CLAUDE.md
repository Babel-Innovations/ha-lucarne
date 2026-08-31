# CLAUDE.md — ha-lucarne

Working guide for AI sessions. Covers what you'd get wrong without it.

## Project overview

Single-distribution HACS repo (one `integration` install ships both halves):

- **Integration** (`custom_components/lucarne_family/`) — Python HA integration that owns family members, managed entities (`todo.<slug>`, `counter.<slug>_streak`), SQLite task/completion storage, and in-process time-change listeners for daily reset and streak check.
- **Frontend** (`custom_components/lucarne_family/frontend/ha-lucarne.js`) — three Lit-based Lovelace cards: `lucarne-today-card`, `lucarne-calendar-card`, `lucarne-chores-card`. Single ESM bundle; no code splitting. The integration's `async_setup` **serves** this file at `FRONTEND_URL` (`/lucarne_family_frontend/ha-lucarne.js`) but does **not** register it as a frontend module — the loader shim below is the only importer (#101). No HACS plugin, no manual Lovelace resource.
- **Loader shim** (`frontend/ha-lucarne-loader.js`, ~4 kB) — the **only** module registered with the frontend. It waits for HA's legacy build to finish replacing `window.customElements`, then imports the bundle with a `.catch` attached. Both halves are the fix for #101; see the loader pitfall below and the file header in `src/loader/boot.ts`.

Two test runners (node:test + pytest), one deploy target.

## Layout

```
src/                          TypeScript sources (Lit cards + components)
  index.ts                    bundle entry; FIRST import must stay install-reporter (see #101)
  loader.ts + loader/boot.ts  the ~3 kB loader shim built to frontend/ha-lucarne-loader.js
  cards/                      lucarne-today-card.ts, lucarne-calendar-card.ts, lucarne-chores-card.ts
  components/                 Lit sub-components (member-column, task-row, family-ready-pill, avatar-upload-modal, ...)
  editors/                    Visual editor elements for each card
  shared/                     types, design-tokens, ha-subscriptions, recurrence, family-subscription, ...
custom_components/
  lucarne_family/             Python integration
    manifest.json             HACS integration metadata
    config_flow.py            Config + Options flow (family name → add/edit/remove members)
    store.py                  SQLite access layer (task_metadata, completion_log tables)
    entity_manager.py         Creates/renames/deletes todo + counter entities
    rename.py                 Slug-changing rename: entity rename + SQLite migration + rollback
    task_service.py           Implements lucarne_family.* HA services
    recurrence.py             RRULE engine (dateutil.rrule wrapper; use it, never hand-roll)
    completion_listener.py    State-change listener → logs completions + fires events
    automation_writer.py      Registers async_track_time_change listeners (daily reset + streak check)
    reset_logic.py            Performs the daily routine reset (flips routine items → needs_action)
    reconcile.py              Reaps task_metadata rows whose todo item is gone; runs at daily reset (#116)
    streak_logic.py           Recomputes per-member streaks from completion_log
    avatar_service.py         Avatar upload: validates, writes to /local/lucarne/avatars/, fires event
    member_service.py         set_member_avatar service: emoji or path avatar, fires member_updated
    websocket_api.py          WS handler for lucarne_family/get_family command
    apple_sentinel_backfill.py Extracts [apple:UUID] from item descriptions → source=apple metadata
    task_locks.py             Per-uid asyncio lock shared by every task_metadata INSERT + delete_task (#114)
    presets.py                Routine preset definitions (school-age kid, toddler, adult)
    models.py, const.py       Dataclasses and constants
    frontend/ha-lucarne.js    Built card bundle (committed; SERVED by async_setup, never registered)
    frontend/ha-lucarne-loader.js  Built loader shim (committed; the ONLY registered frontend module)
blueprints/automation/
  lucarne_reminders_sync.yaml Only remaining blueprint (webhook receiver for Reminders bridge)
bridge/                       Mac mini launchd bridge setup instructions
docs/                         Architecture, integration, services, events docs
tests/                        Node test suites (components + shared), pytest suites (Python)
  setup/ha-mock.mjs           Shared HA stub for Lit component tests
scripts/
  lib/version.sh              shared conventional-commit version derivation (both release scripts)
  deploy-integration.sh       build cards + rsync custom_components/lucarne_family/ to ha-vm
  create-release.sh           bump version + changelog + commit + tag + GitHub release
  create-prerelease.sh        tag an already-pushed commit as a pre-release (no bump)
  delete-prerelease.sh        remove pre-releases + their tags (stable releases untouched)
vite.config.ts                card bundle build
vite.loader.config.ts         loader shim build (separate config on purpose — see Build & test)
```

## Build & test

### TypeScript (cards)

```bash
npm run build         # TWO Vite builds → frontend/ha-lucarne.js + frontend/ha-lucarne-loader.js (both committed)
npm test              # node:test runner (NOT vitest — see pitfalls)
npm run test:coverage # same suite + Node coverage, fails under line 88 / branch 80 / funcs 73 (CI gate)
npm run typecheck     # tsc --noEmit
npm run lint          # eslint src
```

CI runs `test:coverage`, not `test`. The thresholds are floored from the
current numbers — raise them as coverage improves, never lower to make a PR
pass. `npm test` stays coverage-free for fast local iteration.

Both built artifacts are **committed** — HACS ships repo files for an integration and does not
run a build. Rebuild and commit `frontend/ha-lucarne.js` *and* `frontend/ha-lucarne-loader.js`
whenever card or loader sources change.

`npm run build` runs two single-entry Vite builds. The loader has its own config
(`vite.loader.config.ts`) rather than being a second `lib.entry`: with more than one entry,
Rolldown may hoist shared code into a third chunk file, and `async_setup` registers one static
path per artifact, so a surprise chunk would simply 404 at runtime. The card bundle is still a
single self-contained ESM file — **do not code-split it.**

`vite.config.ts` pins `build.target` to `["es2020", "safari15", "ios15", "chrome85"]` —
the floor for the iPadOS 15 wall tablet and the Tizen 6.5 TV. `tests/build/bundle-syntax.test.ts`
parses the committed bundle at ES2020 and fails the build if anything newer ships.

### Python (integration)

```bash
# From repo root (pyproject.toml is here)
ruff check custom_components/lucarne_family/
mypy custom_components/lucarne_family/
pytest tests/python/   # coverage on by default (addopts); fails under statement floor 86
```

Coverage is wired into pytest `addopts`, so a bare `pytest` reports it and
enforces `fail_under = 86` (statement coverage) from `[tool.coverage.report]`.

pytest requires `pytest-homeassistant-custom-component`. Install dev deps:
```bash
pip install -e ".[dev]"
```

### Both (baseline gate before any commit)

```bash
npm run build && npm run test:coverage && npm run lint && npm run typecheck
pytest tests/python/
```

`build` runs **first** so `tests/build/bundle-syntax.test.ts` parses the bundle you
are about to commit rather than the previous one — same reason CI orders it this way.

Use `test:coverage` here (not `test`) so the local gate matches CI's coverage
floors. Bare `pytest` already enforces the Python floor via `addopts`.

## Deploy

One script bypasses HACS for fast iteration. HACS is the install path for end users only.

```bash
# Builds the card bundle into frontend/, then rsyncs the whole integration.
# Requires: HA_SSH_HOST, HA_INTEGRATION_PATH (must end in /custom_components/lucarne_family)
./scripts/deploy-integration.sh                # build + rsync
./scripts/deploy-integration.sh --skip-build   # rsync existing frontend/ as-is
```

Set env vars in `.env` at the project root (see `.env.example`). A card-only change still requires an
HA **restart** for the new bundle to be served — a config-entry reload is not enough, because
`async_setup` (not `async_setup_entry`) registers the versioned URL, and the cards no longer
hot-reload from a standalone `/www/lucarne` path. A normal browser reload then picks the new bundle
up: that URL is content-hashed (`?v=<version>.<digest>`), so changed bytes bust their own cache.
Force-quit the iPad Companion app if the app shell itself looks stale.

## Releases

Two release paths, and they are not interchangeable.

```bash
./scripts/create-release.sh                        # stable: bump + changelog + commit + tag
./scripts/create-prerelease.sh -m "what to test"   # pre-release: tag only, no bump
./scripts/delete-prerelease.sh --dry-run           # list what a delete would remove
./scripts/delete-prerelease.sh                     # delete every pre-release + tag
```

Both derive the next version the same way, through `scripts/lib/version.sh`
(`commits_since_last_bump` / `derive_bump_type` / `next_version`). Keep that
derivation in the lib — if the two scripts forked, a pre-release could sort
*above* the stable release meant to supersede it.

`create-release.sh` derives the next version from conventional commits since the
last `bump:` commit — or, in a repo that has none, since the newest **stable**
tag; `-pre-` tags are skipped so a pre-release can't shrink the range — syncs
`package.json` + `manifest.json`, prepends a
`CHANGELOG.md` entry, commits, tags, and publishes. It briefly lifts required
status checks to push, restoring them via an EXIT trap.

`create-prerelease.sh` exists for device verification before a stable cut. It
bumps **nothing** — no version edit, no changelog, no commit, no branch push. The
only ref it creates is the release tag. It tags an already-pushed commit as
`v<next-version>-pre-<YYYYmmdd-HHMM>` — where `<next-version>` is the version
this build is **currently heading for**, not the one sitting in `package.json` —
and marks the GitHub release `prerelease=true`, which is what puts it behind
HACS's "show beta versions" toggle. Testers restart HA and reload —
`async_setup` serves the bundle at a content-hashed `?v=<version>.<digest>` URL (`_bundle_digest` in
`custom_components/lucarne_family/__init__.py`), so changed bundle bytes bust
their own cache even though a pre-release bumps no version. On iPad, force-quit
the Companion app too (the app shell is service-worker cached). Clearing Safari
website data is a last-resort fallback, not a routine step — it signs the kiosk
device out of HA.

**Never write a pre-release string into `package.json` / `manifest.json`.**
The bump parses the stored version with `IFS='.' read -r MAJOR MINOR PATCH` —
now inside `next_version` (`scripts/lib/version.sh`), formerly inline in
`create-release.sh`. Against `1.5.0-beta.1` that parse made a patch bump die with
`bash: 0-beta.1: syntax error: invalid arithmetic operator` and a minor bump
*silently* yield `1.6.0`, skipping `1.5.0` entirely. `next_version` now rejects
any non-bare `X.Y.Z` before the parse runs, so a stray suffix fails loudly — but
keeping the suffix on the tag alone is still why `create-prerelease.sh` bumps
nothing.

Why the tag carries the *next* version rather than the stored one: a tag like
`v1.4.3-pre-…` cut while `package.json` reads `1.4.3` claims to be a pre-release
of a version that already shipped, and semver ranks it **below** the stable
`1.4.3` the tester already has installed. `v1.5.0-pre-…` sorts correctly — above
`1.4.3`, below the eventual `1.5.0`. With nothing release-worthy since the last
bump, `derive_bump_type` falls back to `patch`, so a docs-only device build still
outranks the installed stable.

The derived base is a moving target, not a promise — say "heading for", never
"will be", in anything user-facing. A later `feat:` raises it from `1.4.4` to
`1.5.0`, and on a docs-only tree it names a version `create-release.sh` will
decline to cut at all (that script stops at its "nothing release-worthy" gate;
`create-prerelease.sh` deliberately does not, since a device-test build of a
refactor is a legitimate thing to want). Ordinarily the *ordering* still holds —
above the installed stable, below the release that supersedes it — but only
while the commits behind the tag stay in history. Cut `v2.0.0-pre-…` from a
`breaking:` commit, then drop that commit out of history (rebase, reset,
force-push), and the next stable is `1.5.0`, which the published `2.0.0-pre-…`
now outranks — so HACS keeps offering the stale tag. Run `delete-prerelease.sh`
on the orphan. Note a `git revert` does **not** cause this: it appends a
`Revert "…"` commit and leaves the original `breaking:` in range, so
`derive_bump_type` still returns `major`. The script header says the same; keep
the two in step, and don't let either claim ordering unconditionally.

Consequence to expect: with no bump, HACS shows the pre-release tag (`1.5.0-pre-…`)
while HA's integration page reads `manifest.json` and still shows the stored
stable version (`1.4.3`). That mismatch is harmless and is called out in the
generated release notes.

Neither script uploads assets — `hacs.json` sets no `zip_release`, so HACS pulls
repo source at the tag and the card bundle ships committed inside the
integration. `create-prerelease.sh` therefore aborts if a fresh `npm run build`
changes any tracked file: that means the committed bundle is stale and the
tester would receive the old cards while every local check passed. It also
re-runs the bundle-syntax floor guard, which matters most here — a beta could
otherwise ship the exact parse bug it was cut to verify (#101).

## Test runner conventions

- **TypeScript**: `node:test` (Node's built-in). Import: `import { describe, it, afterEach } from 'node:test'`. **Not vitest** — `import { describe } from 'vitest'` will fail silently.
- **Run a single TS test file**: `TZ=America/Los_Angeles node --import tsx --import ./tests/setup/dom-globals.mjs --test tests/path/file.test.ts`. The `TZ`, `tsx` loader, and `dom-globals.mjs` are load-bearing; bare `node --test` will fail.
- **Python**: `pytest` with `pytest-homeassistant-custom-component`. Fixtures: `hass`, `enable_custom_integrations`. Tests live in `tests/python/`.

## HACS distribution

Single HACS item — `integration` category only. The cards ride along inside the integration package; `async_setup` serves them and registers the loader shim, which imports them; there is **no** `plugin` category and **no** separate Dashboard registration.

| Surface | Category | Source |
|---------|----------|--------|
| Integration + cards | `integration` | `custom_components/lucarne_family/` (cards at `frontend/ha-lucarne.js`) |

`hacs.json` carries only integration-level keys (`name`, `render_readme`, `homeassistant`) — the plugin-only `filename`/`content_in_root` keys were removed.

## Common pitfalls

- **`node:test` not vitest**: Writing vitest imports silently prevents tests from running.
- **No HA automation entities from this integration**: `automation_writer.py` registers in-process `async_track_time_change` listeners — it does **not** create `automation.*` HA entities. There are no `automation.lucarne_*` entities in the UI. To change reset/streak times, use the integration's Options flow (`CONF_RESET_TIME`, `CONF_STREAK_CHECK_TIME`), not the Automations UI.
- **No blocking I/O in async HA code**: Use `hass.async_add_executor_job(...)` for blocking calls (heavy SQLite migrations, file I/O). Never block the event loop. The one exception is `store._async_write`, which submits via `hass.loop.run_in_executor` on purpose — see the uid-lock cancellation pitfall below (#118).
- **Entity rename has downstream impact**: Slug-changing renames go through `rename.py` which shows an impact preview before proceeding; never rename entities outside that flow.
- **Integration uses `lucarne_family.*` services and `lucarne_family_*` events**: The older `ha_lucarne_chores_all_done` event is a deprecated compat shim still fired by `completion_listener.py` in v0.x alongside `lucarne_family_all_routines_done`. Migrate consumers to the new event; see `docs/events.md`.
- **Browser floor is pinned in `vite.config.ts`**: never remove or raise `build.target`. Vite's
  default (`baseline-widely-available` = safari16.4/chrome111) emits ES2022 class static blocks,
  which iPadOS 15 WebKit cannot **parse** (the Frame TV measured as Chrome 108 and parses them
  fine; `chrome85` is a conservative floor, not the deployed engine) — the whole module dies, no
  card registers, and every card becomes HA's generic red "Configuration error" panel with
  `debug: true` unable to report anything. The pin is the fix for *that* failure mode; with it in
  place a Vite bump is safe. **It did not fix issue #101** — the pinned bundle parses cleanly at
  ES2020 on both failing devices and they still show the red panel, so keep the pin on its own
  merits and don't treat #101 as evidence for or against it (see the #101 pitfall below).
  `tests/build/bundle-syntax.test.ts` is the alarm that fails if the pin is ever
  removed, raised, or stops being honoured — keep both. The guard parses whichever artifacts are on
  disk, so CI runs it twice: once before `npm run build` (the committed bytes HACS ships) and again
  inside `test:coverage` after it (proof the pin holds in fresh output). `create-release.sh` re-runs
  it after its own build. Don't drop either CI step or move `test:coverage` above the build.
  Note it proves the committed bundle *parses*, not that it is *current* — rebuilding after card
  source changes is still on you. es2020 is a chosen floor, not a tool limit — Vite 8 (Rolldown) builds lower targets
  fine, it just buys nothing below Chromium 85. Runtime APIs newer than the floor still need a
  `typeof` guard — syntax lowering does not polyfill them.
- **NEVER register the card bundle as an `extra_module_url`. This is the #101 fix.**
  `async_setup` must register **only** `LOADER_URL`. HA's app entrypoint imports
  `@webcomponents/scoped-custom-element-registry`, whose last statement is
  `Object.defineProperty(window, "customElements", {value: new CustomElementRegistry, ...})` —
  it installs a **brand-new registry and discards everything defined before it**. A
  directly-registered bundle evaluated first, registered all 31 elements into the native
  registry, and lost them all: `define()` returns cleanly, nothing throws, and every card
  becomes HA's `Custom element doesn't exist: lucarne-…` panel.
  **This is not es5-only** — the polyfill is in `frontend_latest/app.js` too. What differs is
  *ordering*: `index.html` preloads the latest core/app (`<link rel="modulepreload">`) so they
  swap before our bundle, while the es5 pair is loaded by `_ls(...)` from a script block *after*
  ours. That accident is why it looked device-specific and intermittent — don't mistake it for
  immunity, and don't add a `latestJS` fast path. The loader delays the import until after the
  swap on **every** path (`whenRegistryIsFinal` in `src/loader/boot.ts`); it cannot do that if
  HA is also importing the bundle itself. `tests/python/test_frontend.py` pins this.
- **A failure during bundle *evaluation* is invisible unless you keep the two guards that
  see it** (issue #101). Home Assistant renders every `extra_module_url` as a bare
  `import(...)` with **no `.catch`**, so a bundle that fails to parse or throws while
  evaluating dies in total silence: nothing registers, HA substitutes its generic red panel,
  and no `debug: true` notification appears because `LucarneCardBase`'s boundaries need an
  *instance*. Two things close that, and both are load-bearing:
  1. `src/index.ts`'s **first** import must stay `'./shared/install-reporter.js'`. ESM hoists
     imports above the module body, so the old arrangement — a bare
     `installGlobalErrorReporter()` call at the top of the file — ran **dead last**, after all
     31 registrations. Moving it back into the body silently disarms `window.onerror` for the
     entire evaluation phase.
  2. `frontend/ha-lucarne-loader.js` is the **sole importer** of the bundle, so its `.catch`
     is the only thing that can observe a parse or evaluation failure. On failure it registers
     the three card tags with an element that renders the exception on the dashboard; on both
     outcomes it re-fires `ll-rebuild` at any `hui-error-card` still standing in for one of our
     cards. It resolves the bundle relative to its own URL so the `?v=<version>.<digest>`
     cache-buster carries across, and the digest covers **both** artifacts so editing either
     one busts the cache. `window.__lucarneBoot` carries `stage` / `registryWait` / `error` /
     `marks` / `registered` / `healed`.
- **Never ship a regex *literal* using `\p{...}`, lookbehind, or the `v` flag.** A regex
  literal is an *early error*: an engine that does not recognise a Unicode property **name**
  rejects the whole enclosing module at parse time — same blast radius as a class static block,
  but `build.target` cannot help (it lowers syntax level only) and acorn validates names
  against the latest spec, not against Safari 15's ICU. Build the pattern with
  `new RegExp(pattern, flags)` inside a try/catch with a fallback, as
  `src/components/member-avatar.ts` does; `tests/build/bundle-syntax.test.ts` walks both
  shipped artifacts' ASTs and fails on any offender.
- **`window.customCards` is not evidence that our bundle ran.** It is a shared global every
  custom card writes to, and our bundle pushes to it three separate times spread across the
  module graph — so a partial abort still leaves it non-empty. Reading it as "the bundle ran
  fine" is what sent the first pass at #101 down a dead end. Ask about our own tags
  (`customElements.get('lucarne-chores-card')`) and `window.__lucarneBoot` instead.
- **Cards implement `applyConfig()` / `renderContent()`, never `setConfig()` / `render()`**:
  `LucarneCardBase` owns both error boundaries. Throw `LucarneConfigError` for invalid user config
  (it is deliberately re-thrown so HA shows the message); any other throw is contained and
  reported. See `src/shared/card-base.ts` and `docs/ipad-debugging.md`.
- **RRULE math**: Use `dateutil.rrule` via `recurrence.py` (Python) and `parseRRule`/`isRoutineDueToday` from `src/shared/recurrence.ts` (JS). Never hand-roll date arithmetic.
- **Avatar writes**: Only permitted write path under `<config>/www/` is `/local/lucarne/avatars/`. `avatar_service.py` enforces this; tests must cover path-traversal cases.
- **SQLite file in `<config>/` root**: Name pattern: `lucarne_family_<entry_id>.db`. Never hardcode the entry ID.
- **Avatar center-square crop is deferred**: The upload modal accepts any aspect ratio; `avatar_service.py` stores raw uploaded bytes. A future spec should add `PIL ImageOps.fit` centering in `_write_avatar`. Do not add it without a spec.
- **Round-trip event vs POST**: `completion_listener.py` fires `lucarne_family_apple_writeback_requested` when `round_trip.enabled == true` but does **not** POST to the webhook. The POST is deferred to a future spec. Future subscribers **must** call `get_round_trip_config(hass)` from `__init__.py` — never read `entry.data["round_trip"]` directly, to survive storage layout changes.
- **`set_member_avatar` emoji validation**: Uses explicit Unicode block ranges (U+1F000–U+1FAFF, U+2300–U+27FF, U+2B00–U+2BFF, U+1F1E0–U+1F1FF). Requires at least one base-emoji codepoint; allows ZWJ-joined compound emoji (e.g., family/profession glyphs); rejects ASCII text, invisible-only strings, and unjoined back-to-back emoji.
- **A task exists because the todo item exists, not because `task_metadata` has a row**:
  anything added outside `lucarne_family.add_task` — HA's to-do panel, voice, the Companion
  app, an agent/MCP `todo.add_item` call, the Reminders bridge — lands in `local_todo` with no
  metadata row, and the cards render it anyway because `buildRenderableTasks`
  (`src/shared/family-subscription.ts`) synthesizes fallback metadata for unknown uids. Never
  gate a write service on `async_get_task_metadata(uid) is not None` — that is what made
  `delete_task` reject visible rows (#111). Use `find_managed_item` / `async_adopt_item` from
  `task_adoption.py`: `delete_task` and `toggle_task` resolve the owning list by scanning,
  `update_task_metadata` adopts first because it needs a row to write to. Tell-tale sign of an
  un-adopted item: the uid is a **UUID1** (`…-9db6-11f1-…`, what `local_todo` mints);
  `add_task` mints UUID4.
- **Every caller of `store.async_add_task_metadata` must hold that uid's lock** (`async_task_uid_lock`
  in `task_locks.py`), and so must `delete_task` across its item delete *and* its metadata delete.
  The INSERT is an executor hop, so without the lock a concurrent `delete_task` completes
  entirely inside it and the row lands on an item that no longer exists — nothing in the reset
  loop reaps it (`reset_logic`'s deletes all sit inside a loop over `entity.todo_items`, so they
  can never reach a row with no item), and `reconcile.py`, which does, runs only at the
  daily-reset window. A routine-typed orphan (what `update_task_metadata {type: routine}`
  leaves, since it applies the caller's fields straight after adopting) then sits in
  `routine_uids` forever, silently suppressing that member's `all_routines_done`, and with an
  RRULE it pins the streak at 0 (#114). No check *before* the INSERT helps — the window is the
  await itself. Holders: `async_adopt_item`, `async_backfill_apple_sentinel`,
  `handle_delete_task`, and both create-then-INSERT paths (`add_task`, preset seeding) across
  the create as well — a fresh uuid4 is **not** private, because `async_create_todo_item`
  publishes the item to WS subscribers before it returns. Two of Lucarne's other `task_metadata`
  DELETE paths (`reset_logic`, `config_flow`'s member removal) need no lock — they delete only rows
  they have already read, so no inserter can be mid-flight on one; the third, `reconcile.py`, takes
  it for the opposite reason (see the reconciliation pitfall below).
  **The lock alone does not survive cancellation of its holder** — a started
  `async_add_executor_job` worker cannot be cancelled, so a cancelled holder used to unwind and
  release with its INSERT still in flight, letting a parked delete run first (#118). That is
  closed in `store._async_write`, which every per-item `task_metadata` add/update/delete goes
  through, plus the
  completion-log insert. The two bulk writes stay out, on purpose: `async_init` (runs before any
  service is registered) and `async_rename_member_slug` — #118 asks nothing of it (no uid lock is held
  across it, and draining orders a write against its own caller's cancellation, which is not what the
  rename is exposed to), and draining it would *hurt*, because the config flow rolls that migration
  back in a later step that a `CancelledError` skips. It waits on the executor
  job (`asyncio.wait`) instead of awaiting it — `await job` cancels the job — and on cancellation
  drains it before re-raising, so the caller's frame, and the lock, stay open until the row lands.
  Three things there are load-bearing. **It submits via `hass.loop.run_in_executor`, never
  `hass.async_add_executor_job`** — that helper registers the future in `hass._tasks` /
  `hass._background_tasks`, and `async_stop` cancels *those futures directly* (stage 2 for
  background, and again at stage 4 for what is left of the pre-stage-2 `_tasks` snapshot — a bare
  future has no `cancelling()`, so stage 4's skip doesn't spare it); a cancelled executor future
  is `done()` immediately while
  the worker runs on, so a tracked job sails through the drain and reopens #118 on the shutdown
  path, which is the commonest one (`async_response` dispatches each WS command as a background
  task). Same thread pool either way — HA installs its executor as the loop default.
  **The drain loops** (shutdown delivers more than one cancellation; a single `await` would be
  abandoned by the next), and it deliberately does **not** hand those swallowed cancellations
  back with `task.uncancel()` — asyncio can't attribute a cancellation, so an enclosing
  `asyncio.timeout` would report a real external cancellation as its own `TimeoutError`;
  leaving the count inflated yields `CancelledError`, which is truthful.
  **It waits with `asyncio.wait`, never `asyncio.shield`** — since 3.12 a cancelled shield
  attaches `_log_on_exception` to the inner future, so a failed drained write reaches HA's loop
  exception handler as well as our own log line, which the suite's cleanup check treats as a hard
  failure. Don't route reads through it either (abandoning a `SELECT` is free).
  Two consequences worth knowing. The skipped `uncancel()` is also what keeps the drain clear of
  shutdown: `cancelling()` stays at 1, `async_block_till_done` filters
  its wait set with `not cancelling(task)`, and stage 4 opens with
  `if task.done() or cancelling(task): continue`, so `async_stop` never awaits a draining task.
  After it returns, `runner`'s `_cancel_all_tasks_with_timeout(loop, 5)` and then
  `shutdown_default_executor` (which drops still-*queued* jobs via `cancel_futures=True`, and
  gives a running worker a 10s join before interrupting it) bound the rest. And nothing times the
  drain itself out — the wait is executor queue time plus the statement, and sqlite's 5s busy
  timeout bounds a lock acquisition, not the drain — but it is not a poll and cannot spin: a
  delivered `CancelledError` is consumed and a non-zero `cancelling()` is an inert counter that
  does not re-interrupt later awaits, so the loop makes one blocking wait plus one more turn per
  *further* `cancel()` (measured across a one-second write: one iteration with no further
  cancellation, two with one).
  `handle_delete_task` deletes metadata *before* the item so that a
  cancellation between its halves fails safe — the metadata DELETE can no longer be split, so
  between the halves is the only split left (the item removal is `local_todo`'s own executor hop,
  which no store-level drain reaches) — and holds the lock across *both* —
  narrowing it to the metadata DELETE alone reopens #114 from the other side.
  `test_delete_task_removes_metadata_before_the_item` pins the order;
  `test_item_removal_stays_inside_the_uid_lock`,
  `test_add_task_rollback_delete_stays_inside_the_uid_lock`, and
  `test_apple_backfill_re_read_stays_inside_the_uid_lock` each pin one holder's scope.
  `tests/python/test_write_cancellation.py` pins the drain — it is the only place in the suite
  that gates a **real** executor job (patching `store._db_connect` so the block happens *in the
  worker thread*) and cancels a real task awaiting it; patching the store coroutine, which every
  other race test does, models the drain instead of exercising it.
  `test_cancelling_an_adoption_mid_insert_leaves_no_orphan_row` is the same thing end to end.
- **`task_service.py` is the translation boundary for todo-entity writes made on a
  caller-named uid** (#119): a todo
  platform may raise anything, and `local_todo` lets ical's `TodoStoreError` out unwrapped —
  it is *not* a `HomeAssistantError`, so HA reports it as `unknown_error` with an "Unexpected
  exception" traceback and the raw `No existing item with uid/recurrence_id: <uid>/None`
  reaches the user. The two writes that act on a **caller-named** uid are wrapped —
  `delete_task`'s removal and `toggle_task`'s update; `add_task`'s create is not, since a
  freshly minted uuid4 cannot be missing. `_todo_write_error` picks the message by
  re-reading `todo_items` **after** the failure —
  never before, which would be the check-then-act #114 removed. It follows reconcile's
  `None` (not loaded) vs `[]` (genuinely empty) rule: only a *loaded* list missing the uid
  proves an outside removal. Catch `Exception`, never `BaseException` — a `CancelledError`
  must keep unwinding (#118), and `handle_add_task`'s rollback relies on `pytest.fail`'s
  `BaseException` escaping it. `handle_add_task`'s rollback logs and swallows its own failure
  so the bare `raise` still surfaces the INSERT error the caller can act on.
- **`store.py` is the translation boundary for Lucarne's own SQLite** (#127), the other
  half of the same problem: `sqlite3.Error` and `OSError` are not `HomeAssistantError`
  either, so a `database is locked` used to leave a handler raw and arrive as
  `unknown_error` + "Unexpected exception". `_async_write` and `_async_read` wrap into
  `StoreError`, naming the operation and the uid with the driver's exception as
  `__cause__` — HA sends `str(err)` on the wire, so the driver's own words survive only by
  being interpolated. **Reads translate too**: nearly every handler reads first
  (`_resolve_task_target`), so wrapping writes alone would leave the symptom reachable on
  the commonest path. Three constraints. Only the `job.result()` path is wrapped — the
  `except asyncio.CancelledError` / `_async_drain` arm stays exactly as #118 left it, and
  catching `BaseException` there would strand the caller's uid lock. `sqlite3.IntegrityError`
  becomes the `StoreIntegrityError` subclass, which is what `async_adopt_item` and
  `async_backfill_apple_sentinel` catch to retreat quietly from a lost `item_uid` PRIMARY KEY
  race — they caught the bare `sqlite3` class before, and collapsing the subclass away turns
  a benign race back into an error out of a service call. And the two bulk writes outside
  `_async_write` are deliberately **not** translated: `async_init` fails into HA's own
  config-entry setup (which names the integration, and nothing is registered yet), and
  `async_rename_member_slug`'s only caller already catches `Exception` and re-renders the
  options form with `entity_rename_failed`. Neither can reach a user raw; each docstring
  says so.
- **Orphaned `task_metadata` is reaped by reading the lists, never by diffing snapshots**
  (#116): every removal path except `lucarne_family.delete_task` — HA's to-do panel,
  `todo.remove_item` from an automation/voice/agent, the Companion app — deletes the todo item
  and leaves the row, and a routine-typed leftover permanently suppresses that member's
  `all_routines_done` (it joins `routine_uids`, which is compared against a `completed` set built
  from the entity's own items) and — with an RRULE — pins the streak at 0 (no recurrence means
  never due, so it costs only the event). `reconcile.async_reconcile_task_metadata` runs at the
  end of `async_perform_daily_reset` — so at the configured `reset_time` (04:00 by default), or on
  demand via the `lucarne_family.perform_daily_reset` service. **Do not move it onto the
  completion listener's disappeared branch**: `_read_entity_snapshot` returns `{}` for an entity
  missing from `DATA_COMPONENT`, so a `local_todo` reload diffs a full list to `{}` and every uid
  in it looks deleted at once — a reaper there drops the whole list's metadata on every reload,
  strictly worse than the bug. Reading the lists is immune only because a list that cannot be read
  is **skipped** rather than treated as empty: no entity, an unavailable state, or `todo_items is None` (not yet
  loaded, as against `[]` for genuinely empty) means that slug is never reconciled at all. Each of
  those three guards has a test that fails without it. The delete then re-checks the lists under
  `async_task_uid_lock` before dropping a row, because `add_task` and preset seeding hold that lock
  across item creation *and* the INSERT — without the re-check, a task created after the scan is
  indistinguishable from an orphan and loses the row it just wrote
  (`test_a_task_created_after_the_list_scan_keeps_its_row`). That re-check re-runs the same
  readability pass rather than a bare "is this uid listed" scan, so a list that stops being
  readable in between is skipped there too
  (`test_a_list_that_stops_being_readable_mid_pass_keeps_its_rows`). Not covered, and not coverable
  here: rows left behind by *removing a member*. Their list is gone, so the slug is never
  readable again and the pass refuses to act on it, while the only rows `config_flow`'s removal
  cleanup ever deletes are household `rotating` rows that lost their last owner — so re-adding the
  same slug hits `seed_preset_routines`' `source == "template"` early return and the new member's
  list is never seeded. That fix belongs in the removal path, which knows the slug is going away.
- **A completed row is cleared by two mechanisms, and neither covers the other's set**:
  `reset_logic.async_perform_daily_reset` deletes completed chores / flips completed
  routines at `reset_time`, but skips any item with no `task_metadata` row — so it does
  nothing for anything created outside `lucarne_family.add_task`. The chores card's
  `isCompletionStale` (`src/shared/date-helpers.ts`) covers that set — and any other
  completed chore — hiding one whose HA `TodoItem.completed` timestamp predates the last
  `reset_time` boundary. **Chores only**: an un-adopted item is always synthesized as a
  chore, so every reset-skipped row lands in that branch, and the reset *deletes* completed
  chores anyway. The narrowing is there to protect **routines**, which the reset flips back
  to `needs_action` instead — a stale-completed one can only mean the reset never ran (HA
  down across the window; there is no startup catch-up), so keep rendering it crossed out
  where the user can untick it rather than stranding a task about to be due again. Rotating
  tasks are protected by *routing*, not by this check: the household column excludes them and
  the owner column pulls them from `householdTasks`, which never reaches `passesOwnFilter`. The boundary is `reset_time`, **not** local midnight — a routine ticked
  off at 20:00 is still "done today" at 01:00, and midnight would blank it for the whole
  pre-reset gap. An absent/unparseable timestamp **keeps** the row: nothing in the
  frontend can date a completion HA did not stamp, and hiding one would make a fresh tap
  vanish on a backend that omits the field. The gate deliberately runs on the *server's*
  status, before `applyOptimistic`, and allows 60 s of browser-vs-HA clock skew, so a
  just-tapped row can never be filtered by its own not-yet-written timestamp. Note the
  symptom this fixed reads as an Anytime-only bug:
  `buildRenderableTasks` synthesizes `chore` + `anytime` for un-adopted uids, so every row
  the reset skips lands in the Anytime bucket (one-directional — an adopted chore or routine
  can sit there too). Separately,
  `sortWithinBucket` (`src/components/member-column.ts`) sinks completed rows **within
  their bucket**, not to the bottom of the column — and the split is what stops a ticked
  routine pinning itself to the *top* of its section, since routines sort ahead of chores.
- **Never adopt a todo item automatically**: `reset_logic` deletes completed `type="chore"`
  items at the daily-reset window, and `if metadata is None: continue` is the *only* thing
  keeping items Lucarne didn't create out of that sweep. Adopting on appearance would mean a
  task ticked off in HA's own to-do panel silently vanishes at 04:00. `update_task_metadata` is
  the sole adopter — reaching it means the user edited the task in Lucarne. The completion
  listener's appeared branch still runs `apple_sentinel_backfill` only. Two tests pin this:
  `test_orphan_survives_daily_reset_after_completion` and `test_adopted_orphan_is_swept_by_daily_reset`.
  For the same reason `update_task_metadata` **defers** its adoption until every validation has
  passed, validating against `default_task_metadata()` in the meantime: adopting up front meant a
  call the user got a `ServiceValidationError` back from still armed the 04:00 deletion.
- **The listener's "item appeared" branch is not a first-sight signal**: `_read_entity_snapshot`
  returns `{}` for an entity missing from `DATA_COMPONENT`, so reloading a `local_todo` config
  entry diffs `{}` → full list and replays every item as an appearance. (HA restart is safe —
  `_on_ha_started` re-snapshots first.) Anything hooked there must be idempotent and must not
  have destructive downstream consequences.
- **`todo.lucarne_household` has no `Member` row**: resolving a todo entity_id → member slug by
  scanning `store.get_members()` returns `""` for the household list, and callers that gate on a
  truthy slug then silently skip every household item. Use `resolve_member_slug` from
  `task_adoption.py`, which special-cases it to `"household"`.
- **Rotating tasks** live in the household list (`member_slug = "household"`) with two extra metadata columns: `rotation_owners` (JSON array of slugs) and `current_owner` (whose turn it is). Ownership **advances at the daily-reset window**, not at the moment of completion — do not advance it manually. Rotating tasks are **excluded from streaks** (the recurrence evaluator filters by `type == "routine"`). Completions are **attributed to `current_owner`**, not `"household"`. All rotation math lives in `rotation.py`; never import or hand-roll it elsewhere.
- **Today-card completed-row state is module-global on purpose**: `src/shared/completed-window.ts`
  keeps crossed-out completions keyed by entity + local day at *module* scope, not on
  `lucarne-tasks-summary`. Lovelace destroys card DOM on a view switch, so element fields reset on
  the very event that is meant to sink crossed rows to the bottom. Consequence for tests: call
  `resetWindows()` in `afterEach` or the window leaks between cases and rows appear in unrelated
  assertions. `lucarne-today-card` sinks via `disconnectedCallback` + `visibilitychange → hidden`.
- **Task notes are read-only and sentinel-stripped**: the note line under a Today-card row renders
  `taskNote(task.description)` (`src/shared/task-notes.ts`), which strips the Reminders bridge's
  `[apple:UUID]` sentinels — mirror of `APPLE_SENTINEL_RE` in `apple_sentinel_backfill.py`; keep the
  two in step. A description that is only a sentinel is *no note*. Nothing in Lucarne authors a
  description (no field in the add/edit popovers, no service field, no `task_metadata` column), so
  don't add writing without a spec. The note renders **inside `.middle`**, next to `.label`, so its
  indent tracks whatever leads the row (check circle, emoji icon, owner avatar) with no hand-computed
  margin — an earlier version sat outside `.row` with a hard-coded one and broke the moment the
  avatar moved in. Being inside `.row` means it is a descendant of the `role="checkbox"`, so its
  `click` and `pointerdown` handlers **must** keep calling `stopPropagation()` (reading a note would
  otherwise complete the task), and it is deliberately **not** focusable and has no `role` — ARIA
  treats checkbox children as presentational. Screen readers get the note through the row's
  `aria-describedby` instead; expanding is a pointer affordance only. Expand/collapse animates an
  explicit px height (`_startNoteAnimation`) because the collapsed/expanded difference is a
  `white-space` flip, which is not animatable — the `.animating` class holds the wrapped, clipped
  layout for the run in **both** directions, and the animation is started from the toggle handler,
  never from `updated()`, so nothing sets reactive state inside an update cycle. An in-flight
  animation is cancelled *before* the two shapes are measured: `fill: forwards` outranks inline
  style, so measuring first returns the animating height for both shapes and a re-toggle inside the
  window would silently do nothing while the note spills unclipped.
  URLs in a note are linkified by `noteSegments()` (same module): **only** `http`/`https` (and bare
  `www.`, promoted to `https://`) ever become an anchor — a note is user content off the bridge, so
  `javascript:`/`data:` must stay text. Concatenating the segments must reproduce the note exactly;
  the row's accessible description and the collapsed ellipsis both read the rendered text. A press
  that starts on a link deliberately skips the note's `setPointerCapture` (capture retargets the
  click and the link would never open) and skips the toggle, while still stopping propagation — and
  the row's own `keydown` skips link events too, or Enter on a focused link would `preventDefault()`
  the anchor and complete the task instead. The anchors are the one focusable thing inside the
  presentational subtree; that is accepted rather than `tabindex="-1"`, which would take the URL
  away from keyboard users entirely.
- **Optimistic UI is mandatory for every user-initiated mutation**: cards live-update only via WebSocket pushes, which stall on the always-on iOS WKWebView kiosk while it's idle — so a mutation that waits for the server round-trip + push leaves the acting device's screen stale until the user interacts. Update the UI locally on the spot and reconcile when the authoritative push/poll arrives. Toggles flip-then-revert-on-error; add/delete/edit dispatch the optimistic change only *after* the service call succeeds. See **Optimistic UI** in `docs/architecture.md` for the four mechanisms (`_optimistic`, `_optimisticAdds`/`_pendingEvents`, `_deletedUids`, `_optimisticEdits`) and reconcile/TTL discipline. Avatar editing is the one documented exception (editor-only, interactive surface).

## Don'ts

- **Don't** add a card mutation (service call from a card/component) without optimistic UI + reconcile — see the Optimistic UI pitfall above and `docs/architecture.md`.
- **Don't** write HA automations for the time-based triggers — the integration's listeners own these.
- **Don't** let a todo-entity write out of a service handler unwrapped, and don't add a
  pre-check to decide the message — classify after the failure (#119).
- **Don't** let a `sqlite3` error out of the store, and don't collapse
  `StoreIntegrityError` into `StoreError` — the adoption paths key their retreat on it (#127).
- **Don't** hand-roll RRULE date math — use `recurrence.py` (Python) or `recurrence.ts` (JS).
- **Don't** write files to `<config>/www/` outside `/local/lucarne/avatars/`.
- **Don't** add `contributing.md`, `code_of_conduct.md`, or other meta docs unless asked.
- **Don't** generate vitest imports in test files.
- **Don't** remove `build.target` from `vite.config.ts` / `vite.loader.config.ts`, or delete `tests/build/bundle-syntax.test.ts`.
- **Don't** add `FRONTEND_URL` back to `add_extra_js_url` — only the loader may be a frontend module (#101).
- **Don't** move `installGlobalErrorReporter()` back into `src/index.ts`'s body, or drop the loader shim — see the #101 pitfall above.
- **Don't** write a regex literal using `\p{...}`, lookbehind, or the `v` flag — use `new RegExp` with a fallback.
- **Don't** override `setConfig()` or `render()` in a card — use `applyConfig()` / `renderContent()`.
- **Don't** split the ESM bundle or re-introduce a separate HACS `plugin` distribution — the integration serves the single bundle and registers only the loader shim that imports it.
- **Don't** implement the round-trip webhook POST without a spec — only the HA event is fired in v0.2.
- **Don't** add server-side center-square crop to `avatar_service.py` without a spec — the deferred design is documented in CLAUDE.md and the phase-6 spec.

## Pointers

- Feature spec and phase files: `features/chores-card/README.md` + `features/chores-card/phase-*.md`
- Architecture overview: `docs/architecture.md`
- Integration user guide: `docs/integration.md`
- Service reference: `docs/services.md`
- Event reference: `docs/events.md`
- Reminders bridge setup: `bridge/README.md`
- Issue #101 root cause (read before touching the loader or the build target): the file header in `src/loader/boot.ts`, plus PR #115 and the issue thread
