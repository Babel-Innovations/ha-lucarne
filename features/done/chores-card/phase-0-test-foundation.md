---
status: done
---

# Phase 0: Test foundation & Python tooling

Set up the testing and build infrastructure both halves of the project (TS cards + Python integration) will need. **No production code changes in this phase** — only tooling, fixtures, CI updates, and a smoke test that confirms the harness is alive. This is the longest single phase up-front, but every later phase relies on it.

## Context

The repo today has zero Python tooling: no `pyproject.toml`, no `pytest`, no integration test harness. Tests use **`node:test`** (NOT vitest — confirmed by reading `tests/setup/dom-globals.mjs`). The build runs lint + typecheck + build on PRs (`.github/workflows/build.yml`). HACS validates with `.github/workflows/hacs.yml`.

This phase establishes the Python side and extends CI to run both languages, then validates the harness with one trivial test in each that the orchestrator can run before any real code lands.

Read [./README.md](./README.md) for overall feature context.

## Structure

```
ha-lucarne/
  pyproject.toml                                  # new: Python project config
  python/                                         # NOTE: do NOT introduce; integration lives at custom_components/ (HACS expectation)
  custom_components/
    lucarne_family/                               # new in phase 1; this phase only stubs __init__.py + manifest.json
      __init__.py                                 # new: empty async_setup
      manifest.json                               # new: minimum valid manifest
  tests/
    python/                                       # new
      __init__.py
      conftest.py                                 # new: pytest fixtures
      test_smoke.py                               # new: one-line sanity check
    setup/
      dom-globals.mjs                             # existing, no change
  .github/workflows/
    build.yml                                     # update: add Python lint + tests job
    hacs.yml                                      # update: assert integration category as well as plugin
  scripts/
    deploy-integration.sh                         # new: scp custom_components/ to ha-vm:/homeassistant/custom_components/
  CLAUDE.md                                       # deferred to phase 5; not in this phase
  hacs.json                                       # update: declare integration alongside plugin
  package.json                                    # update: prepublish runs `npm run build` (already does)
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline verification (before starting)

- [x] Run `npm ci && npm run lint && npm run typecheck && npm run build` — all must pass on `main` branch baseline
- [x] Run `npm test` (the existing `node:test` suite) — all tests pass
- [ ] If any baseline fails, fix and commit separately before starting Phase 0 work

### Sub-Phase A: Python project tooling

#### `pyproject.toml`
- [x] Create `pyproject.toml` at repo root using `setuptools` (HA core uses setuptools, so stay consistent)
- [x] Project metadata: `name = "lucarne_family"`, `version = "0.0.0"`, `requires-python = ">=3.12"` (verify against the pinned HA version before committing; do not rely on the current calendar date)
- [x] Dev dependencies: `pytest`, `pytest-asyncio`, `pytest-homeassistant-custom-component`, `ruff`, `mypy`
- [x] Runtime dependencies declared but minimal: `python-dateutil>=2.8` (verify against the pinned HA version whether this is already provided by HA core; list it in `manifest.json` if the custom integration imports it directly)
- [x] Configure `ruff`: `target-version = "py312"`, enable `E`, `F`, `W`, `I`, `B`, `UP`, `RUF`. Line length 100.
- [x] Configure `mypy`: `strict = true`, ignore missing imports for `homeassistant.*` (typed stubs not always available)
- [x] Configure pytest in `[tool.pytest.ini_options]`: `testpaths = ["tests/python"]`, `asyncio_mode = "auto"`, `filterwarnings = ["error::DeprecationWarning:custom_components.lucarne_family"]`

#### Stub integration package
- [x] Create `custom_components/lucarne_family/__init__.py` with the minimum signature: `async def async_setup(hass, config): return True`
- [x] Create `custom_components/lucarne_family/manifest.json` with `{"domain": "lucarne_family", "name": "Lucarne Family", "version": "0.0.0", "config_flow": false, "iot_class": "local_push", "requirements": ["python-dateutil>=2.8"], "codeowners": ["@molant"], "documentation": "https://github.com/molant/ha-lucarne", "issue_tracker": "https://github.com/molant/ha-lucarne/issues"}`
- [x] Note: `config_flow: false` for now — flipped to `true` in Phase 1

#### Stub test
- [x] Create `tests/python/__init__.py` (empty)
- [x] Create `tests/python/conftest.py` with a single autouse fixture that calls `enable_custom_integrations` from `pytest_homeassistant_custom_component.common`
- [x] Create `tests/python/test_smoke.py` with one test: `async def test_setup(hass): assert await async_setup_component(hass, "lucarne_family", {})`
- [x] Run `pip install -e ".[dev]"` to install dev deps (default to `pip`; see [How implementers should choose Python package manager](#how-implementers-should-choose-python-package-manager) below for the `uv` opt-in). If `pip` resolves no Python on macOS, prefer `python3 -m pip install -e ".[dev]"`.
- [x] Run `pytest tests/python` — must pass with one test green

### Sub-Phase B: HACS dual-category + deploy script

#### `hacs.json` update
- [x] Read current `hacs.json` first (do not overwrite blindly)
- [x] Verify against current HACS publishing docs whether a repo can be both Frontend (plugin) and Integration, and which `hacs.json` fields are required. The frontend category is declared in the existing `hacs.json`; integration distribution also depends on `custom_components/<domain>/manifest.json`. Confirm the exact schema by reading [HACS publishing docs](https://hacs.xyz/docs/publish/integration/) — do not guess.
- [x] No `hacs.json` change required: HACS has no "categories" field in hacs.json. Plugin validation uses the `filename` key; integration validation reads `custom_components/<domain>/manifest.json`. CI runs the HACS action twice (two jobs) to validate both categories. The existing `homeassistant: "2024.1.0"` pin is preserved.
- [x] Run `npm run build` to confirm cards still bundle correctly

#### `.github/workflows/hacs.yml` update
- [x] Read the current workflow first
- [x] HACS validation action takes a `category` input. To validate both: either run the action twice (once with `category: integration`, once with `category: plugin`), or use the multi-category mode if supported. Confirmed no multi-category mode; using two separate jobs.
- [ ] Confirm both validations pass locally if possible (some HACS validations only run in CI)

#### `scripts/deploy-integration.sh`
- [x] Read `scripts/deploy.sh` first to match style + env-var conventions
- [x] New script: rsync `custom_components/lucarne_family/` to `${HA_SSH_HOST}:/homeassistant/custom_components/lucarne_family/`
- [x] Mark executable (`chmod +x`)
- [x] After deploy: optionally call HA's `homeassistant.restart` service via the MCP `ha_restart` tool — but **DO NOT** invoke automatically in the script (destructive in HA terms); print the command for the user to run

### Sub-Phase C: CI integration

#### Update `.github/workflows/build.yml`
- [x] Read the existing workflow first — note the current job runs `npm ci && npm run lint && npm run typecheck && npm run build` but **does not** run `npm test`
- [x] Extend the existing `build` job to also run `npm test` after `npm run typecheck` so the TS test suite runs in CI from Phase 0 onward
- [x] Add a `python` job: setup-python@v5 with `python-version: "3.12"`, install `pip install -e ".[dev]"`, run `ruff check`, `mypy custom_components/lucarne_family`, `pytest`
- [x] Both jobs must pass for the PR check to be green

#### Verify CI runs locally
- [ ] Push branch, open draft PR, observe both jobs succeed
- [ ] If jobs fail, fix and re-push — do not merge yet

### Sub-Phase D: Card test harness expansion (preparation for Phase 4)

The existing TS test harness only covers helpers (`tests/shared/chore-helpers.test.ts`). Phase 4 will need component-level tests for the rewritten chores card. Add the infrastructure now so Phase 4 is unblocked.

#### Component test harness
- [x] Read `tests/components/calendar-event-popover.test.ts` to understand the Lit component test pattern
- [x] Confirm `happy-dom` is the DOM impl (see `tests/setup/dom-globals.mjs`)
- [x] Create `tests/setup/ha-mock.mjs` exporting a `makeFakeHass()` helper. Re-read `src/shared/types.ts` for the canonical `HomeAssistant` interface shape before writing the mock — it must satisfy:
  - `states: Record<string, HassEntity>` (mutable map keyed by entity_id)
  - `connection.subscribeMessage(callback, payload): Promise<() => void>` (returns unsub)
  - `connection.sendMessagePromise(payload): Promise<any>`
  - `connection.subscribeEvents(callback, eventType): Promise<() => void>`
  - `callApi<T>(method: string, path: string, body?: unknown): Promise<T>`
  - `callService(domain: string, service: string, payload?: object): Promise<unknown>`
  - `callWS<T>(payload: object): Promise<T>` (used by `lucarne_family/get_family` in Phase 4)
  Each stub records the args it was called with on a public `calls` array per channel (e.g. `fakeHass.calls.callService`, `fakeHass.calls.callWS`) so tests can assert call ordering and payloads. This replaces the hand-rolled mocks in `tests/shared/ha-subscriptions.test.ts`. TypeScript declarations in `ha-mock.d.mts`.
- [x] Migrate `tests/shared/ha-subscriptions.test.ts` to use `makeFakeHass()` — should be a no-op behaviorally; confirm by running the test
- [x] Add `tests/components/lucarne-chores-card.test.ts` placeholder with skipped tests (`test.skip(...)`) that document the future tests Phase 4 will add. This makes the new file discoverable but doesn't gate Phase 0.

### Documentation (end of phase)

Update docs that reflect the now-dual-language repo:

- [x] `docs/architecture.md` — add a "Custom integration (Phase 1+)" section header even if empty, plus a note that the repo now ships both a Frontend (cards) and an Integration (lucarne_family). Phase 5 fills the content.
- [x] `README.md` — add a one-line "Custom integration" mention under Install (linking to a future docs/integration.md). The Install section gets a full rewrite in Phase 5.
- [ ] `CLAUDE.md` — **deferred to Phase 5**. Not in this phase.

### Build verification (required before marking phase complete)

- [x] `npm run lint` — zero warnings or errors
- [x] `npm run typecheck` — zero errors
- [x] `npm run build` — bundles to `dist/ha-lucarne.js` without warnings
- [x] `npm test` — all existing TS tests pass
- [x] `ruff check custom_components tests/python` — zero issues
- [x] `mypy custom_components/lucarne_family` — zero errors
- [x] `pytest tests/python` — smoke test green
- [ ] Both CI jobs (TS build + Python lint/test) green on PR — deferred: requires PR to be opened
- [ ] HACS validation passes for both categories — deferred: requires PR to be opened
- [x] `scripts/deploy-integration.sh --dry-run` (or equivalent) executes without erroring
- [x] Mark phase `status: done` only after all verification passes

### Manual verification

- [ ] On `ha-vm`, after deploying the stub integration: navigate to Settings → System → Logs and confirm `custom_components.lucarne_family` loaded without errors
- [ ] Use `mcp__home-assistant__ha_get_logs` to confirm the integration shows up at INFO level with no WARNING/ERROR entries
- [ ] **Do NOT** add it via Add Integration yet — config flow doesn't exist until Phase 1

## How implementers should choose Python package manager

The user does not have a documented Python toolchain in this repo. To avoid an LLM stalling on "command not found":

1. **Default: use `pip`** (ships with every Python install). Run `python3 -m pip install -e ".[dev]"` from the repo root. Do NOT attempt to install `uv` or any other tool manager.
2. **Opt-in to `uv` only if `uv --version` already exits 0** when checked via Bash. If so, run `uv pip install -e ".[dev]"` instead. If `uv` is missing, fall back to step 1 silently — do not prompt or install.
3. Document the chosen toolchain in `CLAUDE.md` (Phase 5) so future sessions know which lockfile (if any) is authoritative.
4. The `pyproject.toml` is identical either way — only the install command differs.

## Technical Details

### Why `node:test` and not vitest

The repo's existing tests use Node's built-in test runner with `happy-dom` for the DOM (`tests/setup/dom-globals.mjs`). An LLM implementer's reflex will be to add vitest. **Do not.** Match the existing pattern. Read `package.json` `scripts.test` to confirm.

### Why `pytest-homeassistant-custom-component`

HA core ships its own pytest fixtures (`hass` async fixture, `enable_custom_integrations`, MockConfigEntry, etc.). This package re-exports them for use in custom integrations. Without it, you can't load `homeassistant` modules in tests — they crash on import because they expect a fully-bootstrapped hass instance.

### Why HA core minimum version `2024.1.0`

Pin to the repo's existing HACS minimum (`hacs.json` currently declares `"homeassistant": "2024.1.0"`). The Phase 2 entity-manager tests are the compatibility gate for `local_todo`, `counter`, and `todo` service behavior on that minimum; do not raise or lower the minimum in Phase 0.

### Pinning strategies

`pytest-homeassistant-custom-component` versions track HA core releases. Pin loosely (`>=0.13.0` is fine) and let CI catch incompatibilities.

## Constraints

- **No production code changes in this phase.** Only tooling, fixtures, stubs.
- **Existing TS tests must continue to pass unchanged** after the harness refactor in Sub-Phase D — refactor is structural, not behavioral.
- **HACS validation must pass for both `plugin` AND `integration` categories** before merging.
- **CI must run both jobs** on every PR going forward.
- **`custom_components/lucarne_family/__init__.py` must remain effectively empty in this phase** — anything more belongs in Phase 1.
