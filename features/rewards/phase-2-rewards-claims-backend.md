---
status: done
---

# Phase 2: Rewards, claims & streak bonuses backend

This phase completes the backend. It adds the reward catalog (create, update, archive), the claim lifecycle (claim alone or pooled, cancel, approve, reject, refund) with atomic reservation, member-removal and rename handling for claims, the family-wide rewards settings, and the streak bonuses awarded at the existing streak check. After this phase every rewards feature can be driven from Developer Tools → Actions. Phases 3 and 4 only add UI.

## Context

Read [./README.md](./README.md) first: **Concepts → Claims**, **Streak bonuses**, **Authorization** and **Events** are normative.

### What Phase 1 produced (verify before starting)

| Artifact | Where | Take from it |
|---|---|---|
| `points_ledger` table + `ux_ledger_claim`, `ux_ledger_idem` indexes | `custom_components/lucarne_family/schema.sql` | Claim and streak rows use the `claim_id` / `idem_key` columns. **No DDL change to this table in this phase.** |
| `LucarneFamilyStore.rewards_lock` + `_async_rewards_write(func, operation)` | `store.py` | Every write in this phase is one `_async_rewards_write` call made while holding `rewards_lock`. `func` receives a connection that is already inside `BEGIN IMMEDIATE`. |
| `async_get_balances()` | `store.py` | Balance = `SUM(delta)`. For the in-transaction affordability check, re-run the `SUM` on `func`'s connection instead of calling this method. |
| `async_require_admin(hass, context)` | `rewards.py` | The only admin check. |
| `async_setup_rewards_services` / `async_unload_rewards_services` | `rewards.py` | Register and remove this phase's services here and extend their name tuple. |
| `EVENT_REWARDS_UPDATED` | `const.py` | Fire it after every committed write, with the lock released. |
| `ws_get_rewards` with the full `GetRewardsResponse` shape | `websocket_api.py`, shape in Phase 1 → Technical Details | Fill `rewards`, `claims` and `settings`. Do not change the shape. |
| Ledger `UPDATE` inside `async_rename_member_slug._rename` | `store.py` | Add this phase's tables to the same `with` block. |

If any of these is missing or has a different shape, Phase 1 is not done. Stop and finish it.

### Existing code this phase touches

Open each symbol before relying on it.

- **Streak check.** `automation_writer.async_write_managed_automations` schedules a **userless** `lucarne_family.evaluate_all_streaks` call at `CONF_STREAK_CHECK_TIME` (default `"21:00"`). `task_service.handle_evaluate_all_streaks` loops `store.get_members()`, calling `streak_logic.async_evaluate_streak(hass, store, member, as_of)` and then `async_apply_streak(...)`. There is **no per-member `try/except`** today, so one failure skips every later member.
- **Streak computation.** `store.async_get_streak(member_slug, today, recurrence_evaluator, tz)` → `int`. Its inner `_compute()` walks back from `today` at most 365 days. A day whose `recurrence_evaluator(day)` is empty is **skipped**: it neither counts nor breaks. The walk breaks at the first day with an incomplete expected routine, so an incomplete today gives a streak of 0. This is why the run start is **not** `today - streak + 1`.
- **Member removal.** `config_flow.LucarneFamilyOptionsFlow.async_step_remove_member` calls `self._save_members(remaining)` first, then clears issues and deletes entities, then calls `_sanitize_rotating_tasks_after_removal`. It touches no rewards data today.
- **Rename.** `store.async_rename_member_slug._rename`. See its docstring for why it bypasses `_async_write`. Keep it that way.

## Structure

```
custom_components/lucarne_family/
  schema.sql                 # update (ALREADY EXISTS, Phase 1 added points_ledger): rewards, claims, claim_contributors,
                             #   rewards_settings, streak_bonus_state
  store.py                   # update (ALREADY EXISTS): reward CRUD, claim create/transition, member claim release,
                             #   settings get/set, streak bonus write, async_get_streak_run, _rename for new tables
  rewards.py                 # update (ALREADY EXISTS, from Phase 1): split_shares, milestones_to_award, effective_prev_streak;
                             #   9 service handlers + schemas; async_release_member_claims; async_award_streak_bonus
  streak_logic.py            # update (ALREADY EXISTS): async_evaluate_streak_run returning StreakRun
  task_service.py            # update (ALREADY EXISTS): per-member try/except + bonus call in handle_evaluate_all_streaks
  config_flow.py             # update (ALREADY EXISTS): release claims in async_step_remove_member
  websocket_api.py           # update (ALREADY EXISTS): ws_get_rewards fills rewards/claims/settings; include_archived
  services.yaml              # update (ALREADY EXISTS): 9 new services
docs/
  services.md                # update: 9 new service sections; get_rewards fields
  integration.md             # update: "### Remove a member" (claims released); "### Streak computation" (bonuses)
  architecture.md            # update: "### Points ledger" gains claims + bonuses (links to the README Concepts)
tests/python/
  test_rewards_math.py       # update (from Phase 1): split_shares, milestones_to_award, effective_prev_streak
  test_rewards_catalog.py    # new: reward CRUD + validation + admin
  test_rewards_claims.py     # new: claim lifecycle, pooling, atomicity, concurrency
  test_rewards_streak.py     # new: async_get_streak_run, daily bonus, milestones, no backpay, idempotency
  test_config_flow_remove_member.py  # update (ALREADY EXISTS): pending claims released on removal
  test_rename.py             # update (ALREADY EXISTS): claims/contributors/streak state follow a rename
  test_websocket.py          # update (ALREADY EXISTS): rewards/claims/settings populated
  test_services_yaml.py      # update (ALREADY EXISTS): _EXPECTED_FIELDS for 9 services
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] Run the full baseline gate (CLAUDE.md "Both (baseline gate before any commit)", plus `.venv/bin/ruff` and `.venv/bin/mypy`). All must be green; Phase 1's tests must be in the suite and passing.
- [x] If anything fails, fix it and commit separately before proceeding.

### Sub-Phase A: Reward catalog and settings

Deliverable: admins can create, update and archive rewards and set the streak bonuses, and `get_rewards` returns both.

- [x] `schema.sql`: add `rewards`, `rewards_settings` and `streak_bonus_state` from [Technical Details → DDL](#ddl).
- [x] `store.py`: `async_create_reward`, `async_update_reward`, `async_archive_reward`, `async_get_rewards(include_archived: bool)`, `async_get_rewards_settings()`, `async_set_rewards_settings(...)`. Writes go through `_async_rewards_write`. `async_get_rewards_settings` returns the defaults (`0`, `[]`) when the singleton row is absent.
- [x] `rewards.py` handlers. All are admin-gated, with schemas as in [Technical Details → Services](#services):
  - `create_reward`, which returns `{"id": int}`
  - `update_reward`, a partial update; an unknown or archived id raises `ServiceValidationError`
  - `archive_reward`, which is idempotent: archiving an archived reward is a no-op that fires no event
  - `set_rewards_settings`

  Each one fires `EVENT_REWARDS_UPDATED` after commit.
- [x] Validation in the schemas, before the store is reached:
  - `name`: stripped, then 1–60 characters
  - `cost`: 1–100000
  - `description`: at most 500 characters, stripped
  - `streak_daily_bonus`: 0–1000
  - `streak_milestones`: at most 20 entries, each `{days: 1–365, points: 1–10000}`, with unique `days`. Store them sorted by `days`.
- [x] `ws_get_rewards`: add `vol.Optional("include_archived", default=False): bool` to its `websocket_command` schema (Phase 1 declared only `history_limit`, and HA rejects a message carrying an undeclared key, so the admin card's request would fail without it). Fill `rewards` (active only; all of them when the request sends `include_archived: true`) and `settings`.
- [x] `services.yaml` + `_EXPECTED_FIELDS` for the 4 services. Add a `docs/services.md` section for each.

#### Tests
- [x] `test_rewards_catalog.py`:
  - non-admin → `Unauthorized` for each of the 4 services;
  - `name="   "` → invalid;
  - a 61-character name → invalid;
  - `cost=0` → invalid;
  - duplicate milestone `days` → invalid;
  - an archived reward is absent from `get_rewards` and present with `include_archived: true` (sent over `hass_ws_client` together with `history_limit`, exactly as the admin card sends it, and answered with `success: true`);
  - `update_reward` on an archived id → `ServiceValidationError`;
  - a settings round-trip comes back sorted.

### Sub-Phase B: Claims and pooling

Deliverable: the full claim lifecycle with atomic reservation.

> **Shortcut warning:** the affordability check is **not** a pre-check in the handler followed by a separate write. It is the `SUM(delta)` inside the same `_async_rewards_write` transaction that inserts the reservation. Anything else lets two taps on two tablets both spend the same points.

- [x] `schema.sql`: add `claims` and `claim_contributors` from [Technical Details → DDL](#ddl).
- [x] `rewards.split_shares(cost: int, claimer: str, others: list[str]) -> dict[str, int]`. Pure.
  - Contributors are `[claimer, *others]`, deduplicated with order kept.
  - Each share is `cost // n`; the claimer also gets `cost % n`.
  - Raise `ValueError` when `n > cost`.
- [x] `store.async_create_claim(reward_id, claimer, shares, actor_user_id) -> int`. One transaction:
  1. load the reward and raise "reward not available" if it is missing or archived;
  2. if `len(shares) > 1` and the reward is not poolable, raise "this reward can't be shared";
  3. `SELECT member_slug, SUM(delta) … WHERE member_slug IN (…) GROUP BY member_slug`, and for any contributor with `balance < share` raise "Not enough points: <name> needs N more";
  4. insert the `claims` row (snapshotting `reward_name` and `cost`), the `claim_contributors` rows, and one `claim_reserve` ledger row of `-share` per contributor, with `summary` set to the snapshotted `reward_name` (the History tab labels claim rows from it, so claims older than the ones `get_rewards` returns still show a name);
  5. return the claim id.

  Store errors raised **inside** `func` for these domain failures are a new `RewardsRuleError(HomeAssistantError)`. Define it in `store.py` next to `StoreError`. The handler re-raises it as `ServiceValidationError(str(err))`.
- [x] `store.async_transition_claim(claim_id, from_status, to_status, actor_user_id) -> list[str]`. One transaction:
  1. `UPDATE claims SET status=?, resolved_at=?, resolved_by=? WHERE id=? AND status=?`. If `rowcount != 1`, raise `RewardsRuleError("This claim was already <current status>")`, reading the current status for the message.
  2. If `to_status` is `rejected`, `cancelled` or `refunded`, insert one `claim_release` row of `+share` per contributor, with `summary` set to the claim's `reward_name`.

  Return the contributor slugs. Allowed pairs: `pending → approved | rejected | cancelled`, and `approved → refunded`. Any other pair is a programming error (`ValueError`).
- [x] `rewards.py` handlers:
  - **`claim_reward`**: fields `member` (claimer), `reward_id`, `pool_with` (optional list of slugs, default `[]`). Any user may call it. Every slug must be a member; `"household"` is rejected. Call `split_shares`, translating its `ValueError` into `ServiceValidationError("Too many people for this reward")` (a raw `ValueError` would reach the card as "Unknown error", the #119 symptom), then `async_create_claim`. Return `{"claim_id": int, "shares": {slug: int}}` (`SupportsResponse.OPTIONAL`).
  - **`cancel_claim`**: field `claim_id`; any user. `pending → cancelled`.
  - **`approve_claim`**: admin. `pending → approved`.
  - **`reject_claim`**: admin. `pending → rejected`.
  - **`refund_claim`**: admin. `approved → refunded`.

  Every handler takes `rewards_lock` around its store call and fires `EVENT_REWARDS_UPDATED` after commit.
- [x] `store.async_get_claims(statuses, limit) -> list[dict]`, each claim with its `contributors`. `ws_get_rewards` returns all `pending` claims, plus the 50 most recent non-pending ones when `history_limit` is sent (the admin card's History refund button needs `approved` ones).
- [x] `services.yaml` + `_EXPECTED_FIELDS` for the 5 services, and a `docs/services.md` section for each.

#### Tests
- [x] `test_rewards_math.py`, `split_shares`:
  - `(10, "a", [])` → `{a: 10}`
  - `(10, "a", ["b", "c"])` → `{a: 4, b: 3, c: 3}`
  - `(10, "a", ["a", "b"])` deduplicates to `{a: 5, b: 5}`
  - `(2, "a", ["b", "c"])` → `ValueError`
- [x] `test_rewards_claims.py` lifecycle. Seed balances with `grant_points` called with `Context(user_id=None)`:
  - a claim reserves the points and lowers the balance;
  - a cancel restores them;
  - approve keeps them spent, and a later refund restores them;
  - a reject restores them;
  - a second transition on the same claim raises `ServiceValidationError` containing "already";
  - a non-admin approve, reject or refund → `Unauthorized`;
  - a non-admin `claim_reward` and `cancel_claim` succeed.
- [x] `test_rewards_claims.py` pooling:
  - a poolable reward costing 10 with three contributors reserves 4/3/3;
  - a non-poolable reward with `pool_with` → error;
  - if one contributor is short, nothing is written (no claim row, no ledger rows), and the message names that member;
  - a claim on an archived reward → error, but approving a claim that was **already pending** when its reward got archived succeeds.
- [x] `test_rewards_claims.py` snapshot: change a reward's cost after a claim; the claim's `cost`, shares and release amounts are unchanged.
- [x] `test_rewards_claims.py` concurrency, **the test that proves atomicity**:
  - A member with balance 10 fires two `claim_reward` calls for a cost-10 reward together (`asyncio.gather`). Exactly one succeeds, the other raises "Not enough points", and the balance ends at 0, not -10.
  - Then the same with `rewards_lock` replaced by a no-op async context manager whose `locked()` returns `True` (so `_async_rewards_write`'s assertion still passes) **and** `store._db_connect` gated so both executor jobs have opened their connections before either runs `BEGIN IMMEDIATE`, as `tests/python/test_write_cancellation.py` gates a real job. When the gate opens, the second job must block on `BEGIN IMMEDIATE` until the first commits (or fail with `StoreError` "database is locked" after the 5 s busy timeout), never double-reserve. Assert balance ≥ 0.
- [x] `test_rewards_claims.py` cancellation: cancel the task awaiting a `claim_reward` while its executor job is gated (same technique). After the gate opens, either the claim and all its reserve rows exist, or none do, and `rewards_lock` is not released before the job lands (`store.rewards_lock.locked()` stays true until then).

### Sub-Phase C: Member removal and rename

Deliverable: removing or renaming a member keeps rewards data consistent.

- [x] `store.async_release_member_claims(slug, actor_user_id) -> int`. One transaction: every `pending` claim where `slug` is the claimer **or** a contributor → `rejected`, with `claim_release` rows for **all** of that claim's contributors. Return the count. Idempotent: a second call finds nothing pending.
- [x] `rewards.async_release_member_claims(hass, store, slug)`: takes `rewards_lock`, calls the store method, and fires the event if count > 0.
- [x] `config_flow.async_step_remove_member`: right after `await self._save_members(remaining)` and before entity deletion, call it inside `try/except Exception: _LOGGER.exception(...)`. A failure leaves claims pending, and an admin can still reject them, so it must not abort the removal (same reasoning as the existing comment there about landing failures on the harmless side). Pass `actor_user_id=None`: the options flow has no reliable user id, and the release rows are attributed to the system.
- [x] Ledger rows of the removed member are **kept** (README requirement). Re-adding the same slug restores the balance.
- [x] `store.async_rename_member_slug._rename`: in the same `with` block, add
  - `UPDATE claims SET claimer_slug=? WHERE claimer_slug=?`
  - `UPDATE claim_contributors SET member_slug=? WHERE member_slug=?`
  - `UPDATE streak_bonus_state SET member_slug=? WHERE member_slug=?`
  - Do not try to fix the existing gap where `rotation_owners` / `current_owner` are not renamed. That is out of scope; leave it alone.

#### Tests
- [x] `test_config_flow_remove_member.py`:
  - removing a member with a pending solo claim and a pending pooled claim (as a contributor) rejects both, and every contributor's balance is restored;
  - their ledger rows still exist;
  - with `store.async_release_member_claims` patched to raise, the removal still completes.
- [x] `test_rename.py`: claims, contributors, ledger and streak state all move to the new slug, and the swapped-slug rollback moves them back.

### Sub-Phase D: Streak bonuses

Deliverable: the streak check pays the daily bonus and milestones, idempotently, with no backpay.

- [x] `store.async_get_streak_run(member_slug, today, recurrence_evaluator, tz) -> StreakRun`, where `StreakRun` is the dataclass `(length: int, run_start: date | None, today_counted: bool)` in `models.py`.
  - Implement by generalizing `_compute`: track the last counted day as `run_start`, and set `today_counted` to whether offset 0 had expected routines and all were completed.
  - Rewrite `async_get_streak` as `return (await self.async_get_streak_run(...)).length` so its callers and tests are unchanged.
- [x] `streak_logic.async_evaluate_streak_run(hass, store, member, as_of) -> StreakRun`, which does the same tz/evaluator setup as `async_evaluate_streak`. Make `async_evaluate_streak` call it and return `.length`.
- [x] `rewards.effective_prev_streak(state: tuple[int, str] | None, run: StreakRun) -> int | None`. Pure.
  - `state` is `(last_streak, last_run_start)` from `streak_bonus_state`.
  - `None` state (first evaluation ever) → return `None`, meaning "baseline; pay no milestones".
  - `run.length == 0`, or `run.length < last_streak` (a genuine restart, even across HA downtime) → `0`.
  - Otherwise → `last_streak`, even if `run_start` shifted because routines were edited. This is what stops a shifted `run_start` from re-paying milestones.
- [x] `rewards.milestones_to_award(milestones, prev: int, new: int) -> list[tuple[int, int]]`. Pure; returns the `(days, points)` pairs with `prev < days <= new`.
- [x] `store.async_apply_streak_bonus(member_slug, run, today, daily_bonus, milestones) -> int`. One transaction:
  1. Read `streak_bonus_state`.
  2. Compute `prev` with `effective_prev_streak`.
  3. If `daily_bonus > 0 and run.today_counted`, insert `streak_daily` with `idem_key="daily:<today>"` using `INSERT … ON CONFLICT DO NOTHING`.
  4. If `prev is not None`, insert one `streak_milestone` per `milestones_to_award(...)` with `idem_key="ms:<days>:<run_start>"` and `reason="<days>-day streak"`, also `ON CONFLICT DO NOTHING`.
  5. If `run.length > 0`, upsert `streak_bonus_state(member_slug, last_streak=run.length, last_run_start=run.run_start)`. A zero-length run **never** writes the state. `_compute` returns 0 whenever today's routines are incomplete at the check time, and a routine finished after the check still counts the next day, so the run continues. Overwriting the baseline with 0 would make the next evaluation treat that run as restarted and pay milestones the member had already passed, which is the backpay the README forbids. A genuine break is still detected on the next non-zero evaluation through `run.length < last_streak`.

  Return the number of ledger rows inserted.
- [x] `rewards.async_award_streak_bonus(hass, store, member, run, today)`: reads the settings, takes `rewards_lock`, calls the store method, and fires the event if rows > 0.
- [x] `task_service.handle_evaluate_all_streaks`:
  - Switch to `async_evaluate_streak_run`.
  - Keep `async_apply_streak(hass, store, member, run.length)`.
  - Then call `async_award_streak_bonus`. Its `today` is the **local** date, `as_of.astimezone(ZoneInfo(str(hass.config.time_zone))).date()`, the same value `async_evaluate_streak` computes internally. Never `as_of.date()`: `as_of` is UTC, and at the default 21:00 check in a US time zone that is already tomorrow, so the `daily:<today>` idem key would name the wrong day.
  - Wrap **each member's** body in `try/except Exception: _LOGGER.exception("Streak evaluation failed for %s", member.slug)` so one failure no longer skips the rest.
- [x] `docs/integration.md` "### Streak computation": a short paragraph on bonuses (counted-day daily bonus, crossing milestones, no backpay, awarded at the streak check time, no catch-up if HA is down at that time, same as the streak counter). Link to the README Concepts.

#### Tests
- [x] `test_rewards_math.py`:
  - `effective_prev_streak`: `None` state → `None`; length 0 → 0; length 3 after last 10 → 0; length 11 after 10 with a different `run_start` → 10.
  - `milestones_to_award([(7, 10), (14, 25)], 6, 7)` → `[(7, 10)]`; with `(6, 20)` → both.
- [x] `test_rewards_streak.py`. Drive `handle_evaluate_all_streaks` through `hass.services.async_call(DOMAIN, "evaluate_all_streaks", blocking=True)`, with completions inserted into `completion_log` for a member with one daily routine and dates controlled by the `freezer` fixture (pytest-freezer, installed with `pytest-homeassistant-custom-component`; confirm with `.venv/bin/pip show pytest-freezer`, and if it is absent call `store.async_apply_streak_bonus` directly with explicit `today` values instead). Cases:
  1. first evaluation at streak 10 with milestone 7 → no milestone row (no backpay), `streak_bonus_state.last_streak == 10`;
  2. advance to day 14 with milestone 14 → exactly one milestone row;
  3. run the service twice on the same day → no new rows;
  4. daily bonus 2 → one `streak_daily` row per counted day, and none on a day with an incomplete routine;
  5. on a day with no expected routines (`today_counted` false), no daily bonus while the streak holds;
  6. break the streak, rebuild to 7 → milestone 7 pays again (different `run_start`);
  7. with two members where the first one's evaluation raises (patch `async_evaluate_streak_run` per slug), the second still gets its streak and bonus;
  8. baseline at streak 10 with milestone 7 (case 1), then a day whose routine is completed only **after** the check (that evaluation returns length 0), then the next day's evaluation at length 12 with the same `run_start` → no milestone 7 row, and `streak_bonus_state.last_streak` was never 0. This is what fails if a zero-length run overwrites the state.
- [x] `test_rewards_streak.py`: `async_get_streak_run` on the existing `test_streak_logic.py` fixtures returns `length` equal to `async_get_streak`, and a `run_start` that skips no-routine days (a Mon–Fri routine walked back over a weekend gives a `run_start` on a Monday, not today − length + 1).

### Build Verification (required before marking phase complete)

- [x] `.venv/bin/ruff check custom_components/lucarne_family/` and `.venv/bin/mypy custom_components/lucarne_family/` pass with zero findings.
- [x] `.venv/bin/pytest tests/python/` passes, with the statement floor of 86 met.
- [x] `npm run build && npm run test:coverage && npm run lint && npm run typecheck` pass, with no `frontend/*.js` diff.
- [x] Scan the pytest output for `Unexpected exception`, never-awaited coroutines, `verify_cleanup` failures (a test that leaves `rewards_lock` contention or executor jobs behind shows up here) and new `DeprecationWarning`s.
- [x] If `rewards.py` is over about 600 lines, move the service handlers into `rewards_service.py`, keeping the pure helpers and the listener and streak entry points in `rewards.py`, and say so in the PR body.
- [x] Mark the phase `status: done` only after all of the above pass.

### Manual Verification with MCP Tools

> Not run: it needs a deploy and restart of the live house, which an unattended run must not do without asking.

- [ ] Deploy (`./scripts/deploy-integration.sh --skip-build`) and restart HA. Ask the user before restarting the live house.
- [ ] Through `mcp__home-assistant__ha_call_service`, following the README's **live-house rule** (`[test]` names; clean up):
  1. `lucarne_family.create_reward {name: "[test] sticker", cost: 1}`.
  2. `grant_points {member: <test-safe slug>, points: 1, reason: "[test]"}`.
  3. `claim_reward {member: <slug>, reward_id: <id>}`, then `reject_claim`, so the balance is restored.
  4. `archive_reward`.
- [ ] `mcp__home-assistant__ha_get_logs`: no `lucarne_family` errors or `Unexpected exception`.

## Technical Details

### DDL

```sql
CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    cost INTEGER NOT NULL CHECK (cost BETWEEN 1 AND 100000),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
    poolable INTEGER NOT NULL DEFAULT 0 CHECK (poolable IN (0,1)),
    archived_at TEXT,                                  -- NULL = active
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward_id INTEGER NOT NULL REFERENCES rewards(id),
    reward_name TEXT NOT NULL,                         -- snapshot
    cost INTEGER NOT NULL,                             -- snapshot
    claimer_slug TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','cancelled','refunded')),
    created_at TEXT NOT NULL,
    created_by TEXT,                                   -- context.user_id
    resolved_at TEXT,
    resolved_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status, id);
CREATE TABLE IF NOT EXISTS claim_contributors (
    claim_id INTEGER NOT NULL REFERENCES claims(id),
    member_slug TEXT NOT NULL,
    share INTEGER NOT NULL CHECK (share > 0),          -- snapshot
    PRIMARY KEY (claim_id, member_slug)
);
CREATE INDEX IF NOT EXISTS idx_claim_contributors_member ON claim_contributors(member_slug);
CREATE TABLE IF NOT EXISTS rewards_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),             -- singleton
    streak_daily_bonus INTEGER NOT NULL DEFAULT 0,
    streak_milestones TEXT NOT NULL DEFAULT '[]'       -- JSON [{"days": 7, "points": 10}, ...] sorted by days
);
CREATE TABLE IF NOT EXISTS streak_bonus_state (
    member_slug TEXT PRIMARY KEY,
    last_streak INTEGER NOT NULL,
    last_run_start TEXT NOT NULL DEFAULT ''
);
```

### Services

| Service | Fields | Gate | Response |
|---|---|---|---|
| `create_reward` | `name` str, `cost` int, `description`? str, `poolable`? bool (default false) | admin | `{id}` |
| `update_reward` | `reward_id` int, plus any of `name`, `cost`, `description`, `poolable` | admin | — |
| `archive_reward` | `reward_id` int | admin | — |
| `set_rewards_settings` | `streak_daily_bonus`? int, `streak_milestones`? list of `{days, points}` (omitted keys stay unchanged) | admin | — |
| `claim_reward` | `member` str, `reward_id` int, `pool_with`? list[str] | any user | `{claim_id, shares}` |
| `cancel_claim` | `claim_id` int | any user | — |
| `approve_claim` / `reject_claim` / `refund_claim` | `claim_id` int | admin | — |

Error messages reach the user verbatim through the card's `serviceErrorMessage`, so write them as user-facing sentences:
- "Not enough points: Alice needs 3 more"
- "This reward can't be shared"
- "This claim was already approved"
- "This reward is no longer available"

## Constraints

- The affordability check and the reservation happen in one transaction, under `rewards_lock`.
- Claims snapshot the name, cost and shares; later reward edits never change an existing claim.
- Approve writes no ledger row; reject, cancel and refund release exactly the snapshotted shares.
- Streak bonuses are idempotent through `ux_ledger_idem` and never pay milestones already passed at the first evaluation.
- Member removal never deletes ledger rows.
