---
status: done
---

# Phase 1: Points backend

This phase adds points to the integration with no UI at all. Tasks carry an admin-gated `points` value, and the completion listener earns and revokes them into an append-only ledger. An admin or automation can grant points, the new `lucarne_family/get_rewards` WebSocket command returns balances and history, and every write fires `lucarne_family_rewards_updated`. At the end of this phase a parent can set points on a task through Developer Tools, tick it on the tablet, and see the balance move in `get_rewards`.

## Context

Read [./README.md](./README.md) first, especially **Concepts → The ledger is the only source of balances**, **Earning and revoking**, **Authorization** and **Events**. This phase implements those definitions exactly.

Verified facts about the existing code. Open each symbol before relying on it; line numbers drift.

- **Schema migrations.** `schema.sql` is run by `store._init_db` on every start (`con.executescript`), so `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` is idempotent. New columns on `task_metadata` are added by the `PRAGMA table_info(task_metadata)` probe, followed by `ALTER TABLE … ADD COLUMN` (see how `rotation_owners` / `current_owner` are added).
  - **Trap:** the `_task_metadata_pre_rotating` rebuild block in `_init_db` recreates `task_metadata` with an explicit `CREATE TABLE` and an explicit `INSERT … SELECT` column list. It runs **after** the ALTERs. If `points` is missing from both, any install that still has the old two-value `type` CHECK loses the column.
- **Store writes.** `LucarneFamilyStore._async_write(func, operation)` submits `func` through `hass.loop.run_in_executor`, drains on cancellation (#118) and translates `sqlite3.Error` / `OSError` into `StoreError` (`StoreIntegrityError` for integrity errors) (#127). `_async_read` is its read twin. `_db_connect()` returns a connection with `row_factory = sqlite3.Row`. No code uses an explicit `BEGIN` today; every method uses `with self._db_connect() as con:`.
- **Task metadata.** `async_add_task_metadata` takes keyword args and has an explicit INSERT column list. `async_update_task_metadata` filters `**fields` through an `allowed` set. `default_task_metadata` lives in **`task_adoption.py`**, not `store.py`, and returns a full row dict.
- **Services.** `task_service.async_setup_services` registers `add_task` (`ADD_TASK_SCHEMA`, `SupportsResponse.OPTIONAL`) and `update_task_metadata` (`UPDATE_METADATA_SCHEMA`). `handle_update_task_metadata` copies the fields in its `for field_name in ("icon", "recurrence", "type", "time_of_day")` loop into `update_fields`, then adopts the item (deferred) and writes. `__init__.async_setup_entry` calls `async_setup_services`, `async_setup_avatar_service` and `async_setup_member_service`. `__init__.async_unload_entry` calls `async_unload_services` when the last entry goes. `services.yaml` is the only service-metadata file. `tests/python/test_services_yaml.py` pins every service's field set in `_EXPECTED_FIELDS`. **No code checks `call.context.user_id` or admin today.**
- **Completion listener.** In `completion_listener._async_handle_state_change`, after `await store.async_append_completion(...)`, these locals are available: `uid`, `entity_id`, `action` (`"completed"` / `"undone"` / `"reset"`), `metadata` (dict or `None`), `summary`, and `member_slug`, already re-attributed to `current_owner` for rotating tasks. `_read_entity_snapshot(entity_id)` returns `{uid: (status, summary)}` from the live todo entity, and `{}` if the entity is missing.
- **WebSocket.** `websocket_api.ws_get_family` (decorated `websocket_command` + `async_response`) finds the store with `next(v for k, v in hass.data[DOMAIN].items() if isinstance(v, dict) and "store" in v)`. `LUCARNE_FRONTEND_EVENTS` is the tuple the `ws_subscribe` relay forwards (`event_type` only). `async_register_websocket_commands` registers each command once.
- **Rename.** `store.async_rename_member_slug` runs three `UPDATE`s inside its inner `_rename()`, deliberately **outside** `_async_write` (see its docstring). The config flow calls it a second time with the slugs swapped to roll back.
- **Reset time.** `entry.data[CONF_RESET_TIME]` holds a `"HH:MM"` string; the default `DEFAULT_RESET_TIME = "04:00"` is in `const.py`. The frontend mirror of the cycle boundary is `lastResetBoundary` in `src/shared/date-helpers.ts`.

## Structure

```
custom_components/lucarne_family/
  schema.sql                 # update (ALREADY EXISTS): add points column to fresh task_metadata DDL; add points_ledger + indexes
  store.py                   # update (ALREADY EXISTS): points migration + rebuild column list; INSERT/allowed set; rewards_lock;
                             #   _async_rewards_write helper; ledger methods; ledger rows in _rename
  rewards.py                 # new: cycle_date, async_require_admin, async_record_task_transition, grant_points handler,
                             #   async_setup_rewards_services / async_unload_rewards_services
  task_adoption.py           # update (ALREADY EXISTS): "points": 0 in default_task_metadata
  task_service.py            # update (ALREADY EXISTS): points field + admin gate + household rule in add_task / update_task_metadata
  completion_listener.py     # update (ALREADY EXISTS): one guarded call to rewards.async_record_task_transition
  websocket_api.py           # update (ALREADY EXISTS): ws_get_rewards; "lucarne_family_rewards_updated" in LUCARNE_FRONTEND_EVENTS
  __init__.py                # update (ALREADY EXISTS): call async_setup_rewards_services / async_unload_rewards_services
  services.yaml              # update (ALREADY EXISTS): points field on add_task + update_task_metadata; grant_points
  const.py                   # update (ALREADY EXISTS): EVENT_REWARDS_UPDATED constant
docs/
  services.md                # update: points field; grant_points; lucarne_family/get_rewards
  events.md                  # update: lucarne_family_rewards_updated (refresh-only)
  architecture.md            # update: "### Storage split" row for the ledger; new "### Points ledger" section
tests/python/
  test_rewards_math.py       # new: cycle_date
  test_rewards_ledger.py     # new: store ledger methods, migration, rebuild keeps points, rename
  test_rewards_earn.py       # new: listener earn/revoke end to end
  test_rewards_admin.py      # new: async_require_admin, points gate on add/update, grant_points
  test_websocket.py          # update (ALREADY EXISTS): get_rewards shape + is_admin; relay tuple includes the new event
  test_services_yaml.py      # update (ALREADY EXISTS): _EXPECTED_FIELDS for points + grant_points
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] Run the baseline gate from `CLAUDE.md` "Both (baseline gate before any commit)": `npm run build && npm run test:coverage && npm run lint && npm run typecheck`, then `.venv/bin/pytest tests/python/`, `.venv/bin/ruff check custom_components/lucarne_family/` and `.venv/bin/mypy custom_components/lucarne_family/`. All must be green. (In a `fix/` worktree with no `.venv`, use `../ha-lucarne/.venv/bin/...`.)
- [x] If anything fails, fix it and commit separately before proceeding.

### Sub-Phase A: Schema, task points and the admin gate

Deliverable: a task can store `points`, admins can set it through `add_task` / `update_task_metadata`, and non-admins are refused. Nothing earns yet.

#### Schema and migration
- [x] `schema.sql`: add `points INTEGER NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 1000)` to the fresh `task_metadata` DDL.
- [x] `store._init_db`: add `if "points" not in existing_cols: ALTER TABLE task_metadata ADD COLUMN points INTEGER NOT NULL DEFAULT 0`. ALTER cannot add the CHECK, so the voluptuous range is the enforcement on existing DBs (same note as `time_of_day`).
- [x] `store._init_db` rotating-rebuild block: add `points` to the inline `CREATE TABLE task_metadata` **and** to both column lists of the `INSERT … SELECT`. The rebuild runs after the ALTER, so `points` exists on the old table by then.
- [x] `schema.sql`: add `points_ledger` and its indexes exactly as in [Technical Details → DDL](#ddl).

#### Metadata plumbing
- [x] `store.async_add_task_metadata`: add a `points: int = 0` kwarg to the signature, the column list and the values tuple.
- [x] `store.async_update_task_metadata`: add `"points"` to `allowed`.
- [x] `task_adoption.default_task_metadata`: add `"points": 0`.

#### Admin gate
- [x] `rewards.py`: implement `async_require_admin(hass, context)` from [Technical Details](#async_require_admin). It is the **only** admin check in the integration. Do not inline `is_admin` checks elsewhere.
- [x] `task_service.ADD_TASK_SCHEMA` and `UPDATE_METADATA_SCHEMA`: add `vol.Optional("points"): vol.All(vol.Coerce(int), vol.Range(min=0, max=1000))`. Use **no default**: the key's presence is what triggers the gate.
- [x] `handle_add_task`: if `"points" in call.data`, `await async_require_admin(hass, call.context)` before any write. Reject `points > 0` on a plain household task (`member_slug == HOUSEHOLD_SLUG` and type not `rotating`) with `ServiceValidationError("Household tasks can't earn points; make it a rotating task or assign it to a member")`. Pass `points` to `async_add_task_metadata`.
- [x] `handle_update_task_metadata`: add `"points"` to the copied-fields tuple. If `"points" in call.data`, call `async_require_admin` **before adoption**: a refused call must not adopt the item (see the CLAUDE.md pitfall "Never adopt a todo item automatically"). Apply the same household rule to the row's **resulting** state: resulting points are `call.data.get("points", metadata.get("points", 0))`, checked against `metadata["member_slug"]` and the effective type (the update may change `type`). Run this check on **every** call, not only when `"points"` is in `call.data`: a type-only change that turns a pointed rotating task into a household chore must raise too.
- [x] `services.yaml`: add the `points` field (number selector, 0–1000, step 1) to `add_task` and `update_task_metadata`, with a description saying it requires an admin.

#### Tests (write first; each must fail before the code exists)
- [x] `test_rewards_admin.py`:
  - `add_task` with `points` from a non-admin user context (create the user with `hass.auth.async_create_user("kid", group_ids=["system-users"])`) raises `Unauthorized` and creates **no** todo item.
  - From an admin user it stores `points`.
  - With `Context(user_id=None)` it stores `points`.
  - Without the `points` key, a non-admin call succeeds.
- [x] `test_rewards_admin.py`: `update_task_metadata` with `points` from a non-admin on an **un-adopted** item raises `Unauthorized` and leaves `async_get_task_metadata(uid) is None`. This is what fails if the gate runs after adoption.
- [x] `test_rewards_admin.py`: household rule. `points=5` on a household chore raises `ServiceValidationError`; on a household rotating task it is accepted. Changing a pointed rotating task to `type: chore` raises.
- [x] `test_rewards_ledger.py` migration tests:
  1. Create a DB with the **pre-rotating** DDL (`type CHECK (type IN ('routine','chore'))`, no `points`), insert one row, run `_init_db`. Assert `points` exists, the row survived with `points == 0`, and `type='rotating'` inserts now succeed.
  2. Run `_init_db` twice on a fresh DB with no error.
- [x] `test_services_yaml.py`: add `points` to both `_EXPECTED_FIELDS` entries.

### Sub-Phase B: Ledger, earn and revoke

Deliverable: ticking a pointed task on any surface earns points; un-ticking revokes them; reset does neither.

#### Rewards write helper (store.py)

> **Shortcut warning:** do not keep a balance in a column, a counter entity, `hass.data` or an in-memory dict. Every read of a balance is `SELECT member_slug, SUM(delta) … GROUP BY member_slug`.

- [x] Add `self.rewards_lock = asyncio.Lock()` in `LucarneFamilyStore.__init__`. **Rule:** it is never held together with a `task_locks.async_task_uid_lock`, in either order. Rewards code never takes a uid lock, and uid-lock holders never call rewards code. Put this rule in the attribute's comment.
- [x] Add `_async_rewards_write(func: Callable[[sqlite3.Connection], _T], operation: str) -> _T`. It asserts `self.rewards_lock.locked()`, then calls `self._async_write` with a job that:
  1. opens `self._db_connect()` and sets `con.isolation_level = None`;
  2. runs `BEGIN IMMEDIATE`, then `func(con)`, then `COMMIT`;
  3. on any exception runs `ROLLBACK` and re-raises;
  4. always closes the connection.

  **Every** rewards write in this spec goes through it. Phase 2 reuses it for claims.
- [x] Ledger methods, each a single `_async_rewards_write` (or `_async_read`), with signatures as in [Technical Details → Store API](#store-api):
  - `async_ledger_record_earn`
  - `async_ledger_record_revoke`
  - `async_ledger_grant`
  - `async_get_balances`
  - `async_get_ledger_history`
- [x] `async_rename_member_slug._rename`: add `UPDATE points_ledger SET member_slug = ? WHERE member_slug = ?` **inside the same `with` block** as the existing three, so the config flow's swapped-slug rollback covers it.

#### Earn and revoke (rewards.py + completion_listener.py)
- [x] `rewards.cycle_date(now: datetime, reset_time: str, tz: tzinfo) -> date`. Convert `now` to `tz`, build today's boundary at `reset_time`, and step back one day if the boundary is after `now`; return the boundary's date. Pure; no HA imports. An unparseable `reset_time` falls back to `"00:00"`, mirroring `lastResetBoundary`.
- [x] `rewards.async_record_task_transition(hass, store, *, entity_id, uid, action, metadata, member_slug, summary, actor_user_id, read_status)`:
  - **Returns early, before taking the lock,** when `action == "reset"`, when `metadata is None`, or, on `completed` only, when `metadata["points"] == 0` or the task is a plain household task. An `undone` never returns early on current metadata: a rotating task that earned and was then converted to a household chore (its points reset to 0) must still have that earn revoked.
  - **Otherwise**, `async with store.rewards_lock:`
    1. Call `read_status()` (returns `"completed"`, `"needs_action"` or `None` when unreadable) and apply the **ordering** rule from README "Earning and revoking".
    2. For `completed`, call `async_ledger_record_earn(uid, member_slug, metadata["points"], cycle, summary, actor_user_id)`.
    3. For `undone`, call `async_ledger_record_revoke(uid, cycle, actor_user_id)`. A revoke never checks `metadata["points"]`; it reverses whatever was earned.
  - If a row was written, `hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})` **after** the lock is released.
- [x] `completion_listener._async_handle_state_change`: right after `await store.async_append_completion(...)`, call `async_record_task_transition` inside `try: … except Exception: _LOGGER.exception(...)`, so a rewards failure never stops completion logging or the `task_completed` event. Pass these arguments:
  - `read_status=lambda: _read_entity_snapshot(entity_id).get(uid, (None,))[0]`
  - `actor_user_id`: the todo state's `context.user_id` (`hass.states.get(entity_id)`), or `None`.
  - `cycle` is computed inside `async_record_task_transition` from `datetime.now(UTC)`, the reset time and `ZoneInfo(str(hass.config.time_zone))`. The function has no `entry` parameter: read the reset time as `store._entry().data.get(CONF_RESET_TIME, DEFAULT_RESET_TIME)` (`LucarneFamilyStore._entry()` returns the config entry; the options flow writes `CONF_RESET_TIME` into `entry.data`, not `entry.options`, as `automation_writer` reads it).
- [x] `const.py`: `EVENT_REWARDS_UPDATED = "lucarne_family_rewards_updated"`. `websocket_api.LUCARNE_FRONTEND_EVENTS`: add it.

#### Tests
- [x] `test_rewards_math.py`: `cycle_date` with reset `"04:00"`, tz `Europe/Madrid`:
  - 03:59 local is the previous date, 04:00 is the same date, 23:00 is the same date.
  - A DST-transition date (2026-03-29) returns the correct date.
  - Garbage `reset_time` behaves as `"00:00"`.
- [x] `test_rewards_earn.py`. Reuse the helper pattern of `test_completion_listener.py` (`_make_entry`, `_setup_member_todo`, `_make_store`, `_add_item`, `_set_status`), copied into the new file because each test file defines its own. Use a routine with `points=5`:
  1. complete → balance 5;
  2. complete → undo → complete → balance 5, with 3 ledger rows (`earn`, `revoke`, `earn`);
  3. a reset flip (`hass.data[_RESET_PENDING_KEY]` set as `reset_logic` does) → balance unchanged, no revoke row;
  4. after a reset row in `completion_log`, completing again earns again → 10;
  5. an un-adopted item (no metadata) earns nothing;
  6. a household rotating task credits `current_owner`, and undo revokes from that same member even after `current_owner` has advanced;
  7. editing points from 5 to 8 after completion, then undo → revoke is `-5`;
  8. a household rotating task completed (earn), then converted to `type: chore` with `points: 0`, then undone → the earn is revoked. This is what fails if the household early return also applies to `undone`.
- [x] `test_rewards_earn.py` ordering test. Patch `read_status` to return `"needs_action"`, then deliver a `completed` transition. Assert no earn row. This is what fails if the status re-check is skipped.
- [x] `test_rewards_earn.py` resilience test. Patch `store.async_ledger_record_earn` to raise `StoreError`. The completion is still logged and `lucarne_family_task_completed` still fires.
- [x] `test_rewards_ledger.py` idempotency (store level). Two `async_ledger_record_earn` calls for the same uid and cycle produce one row. Two revokes produce one row: the `ux_ledger_reverses` unique index rejects a second, and the store translates it to "nothing written".
- [x] `test_rewards_ledger.py`: rename moves ledger rows to the new slug; renaming back restores them.
- [x] `test_rewards_ledger.py` lock assertion. Calling `_async_rewards_write` without holding `rewards_lock` raises `AssertionError`.

### Sub-Phase C: `grant_points`, `get_rewards`, docs

Deliverable: an admin or automation can grant points, and any user can read balances and history over WebSocket.

- [x] `rewards.py` `grant_points` handler and schema:
  - **Fields:** `member` (required, a slug from `store.get_members()`; `"household"` rejected), `points` (int 1–10000), `reason` (optional str, stripped, at most 200 characters).
  - **Order:** `async_require_admin` first; then under `rewards_lock` call `async_ledger_grant`; then fire `EVENT_REWARDS_UPDATED`.
  - **Response:** returns `{"balance": <new balance>}` (`SupportsResponse.OPTIONAL`).
- [x] `rewards.async_setup_rewards_services(hass, entry_id)` / `async_unload_rewards_services(hass)`: register and remove `grant_points`. Each owns a tuple of its own service names. Call them from `__init__` next to the existing `async_setup_services` / `async_unload_services` calls.
- [x] `services.yaml`: `grant_points` entry. `test_services_yaml.py`: add it to `_EXPECTED_FIELDS`.
- [x] `websocket_api.ws_get_rewards`:
  - **Command:** `{type: "lucarne_family/get_rewards", history_limit?: int 1–500}`, decorated like `ws_get_family`, **not** admin-gated.
  - **Response:** the full payload shape in [Technical Details → get_rewards](#get_rewards-response), stable from this phase on. Return `rewards: []`, `claims: []` and the default `settings` until Phase 2 fills them.
  - **`history`:** included only when `history_limit` is sent. Resolve `actor_name` through `hass.auth.async_get_user` once per distinct id; `None` for an automation or the system.
  - **Registration:** register it in `async_register_websocket_commands`.
- [x] Docs:
  - `docs/services.md`: the `points` field on `add_task` / `update_task_metadata`, a `## lucarne_family.grant_points` section, and a `### lucarne_family/get_rewards` section under `## WebSocket API`.
  - `docs/events.md`: a `### lucarne_family_rewards_updated` section stating it is a refresh cue with no payload contract.
  - `docs/architecture.md`: a "Points ledger" row in `### Storage split`, and a short `### Points ledger` section summarizing the earn/revoke rules. Link to `features/rewards/README.md`; do not restate them.

#### Tests
- [x] `test_rewards_admin.py`, `grant_points`:
  - non-admin → `Unauthorized`, no row;
  - admin → row with `actor_user_id` = that user's id;
  - `Context(user_id=None)` → row with `actor_user_id IS NULL`;
  - `points=0` and `points=10001` → `vol.Invalid`;
  - a 201-character reason → invalid;
  - an unknown member → `ServiceValidationError`.
- [x] `test_websocket.py`, `get_rewards`:
  - as a non-admin `hass_ws_client` user (`await hass_ws_client(hass, hass_read_only_access_token)`, as the existing read-only test in `test_websocket.py` does), `is_admin` is false;
  - as an admin, it is true;
  - `balances` contains every member (0 when there are no rows);
  - `history` is absent without `history_limit` and newest-first with it;
  - `LUCARNE_FRONTEND_EVENTS` contains `lucarne_family_rewards_updated`.

### Build Verification (required before marking phase complete)

- [x] `.venv/bin/ruff check custom_components/lucarne_family/` and `.venv/bin/mypy custom_components/lucarne_family/` pass with zero findings.
- [x] `.venv/bin/pytest tests/python/` passes, with the statement floor of 86 met.
- [x] `npm run build && npm run test:coverage && npm run lint && npm run typecheck` pass. No TS changed, so the build must leave `frontend/*.js` unchanged; check with `git status`.
- [x] Scan the pytest output for `Unexpected exception`, `RuntimeWarning: coroutine … was never awaited`, lingering-timer failures from `verify_cleanup`, and `DeprecationWarning`s from new code. A zero exit code does not mean clean.
- [x] Mark the phase `status: done` only after all of the above pass.

### Manual Verification with MCP Tools

> BLOCKED: needs a live-house HA restart and a browser-console step from the user; not run unattended.

- [ ] Run `./scripts/deploy-integration.sh --skip-build`, then restart HA (`mcp__home-assistant__ha_restart`; ask the user before restarting the live house).
- [ ] Through `mcp__home-assistant__ha_call_service`, as the admin MCP user:
  1. Set `points: 1` on one existing routine of a test-safe member via `lucarne_family.update_task_metadata`.
  2. Tick it via `todo.update_item`.
  3. Read `get_rewards`. `ha_call_service` cannot send WebSocket commands, HA has no Developer Tools page for them, and this phase adds no debug logging of ledger writes, so ask the user to paste this into the browser console on any HA dashboard and report the result: `await document.querySelector('home-assistant').hass.connection.sendMessagePromise({type: 'lucarne_family/get_rewards'})`. Expect balance +1.
  4. Untick → balance back. Set the task's points back to 0.
- [ ] `mcp__home-assistant__ha_get_logs`: no `lucarne_family` errors since the restart.

## Technical Details

### DDL

```sql
-- schema.sql (appended). Rows are never UPDATEd or DELETEd except member_slug on rename.
CREATE TABLE IF NOT EXISTS points_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,                      -- UTC ISO-8601
    member_slug TEXT NOT NULL,
    delta INTEGER NOT NULL CHECK (delta <> 0),
    kind TEXT NOT NULL CHECK (kind IN ('earn','revoke','grant','streak_daily',
                                       'streak_milestone','claim_reserve','claim_release')),
    item_uid TEXT,                                 -- earn/revoke only
    cycle TEXT,                                    -- earn only: cycle_date ISO
    reverses_id INTEGER REFERENCES points_ledger(id),  -- revoke only
    claim_id INTEGER,                              -- claim_reserve/claim_release only (Phase 2)
    idem_key TEXT,                                 -- streak rows only (Phase 2)
    summary TEXT NOT NULL DEFAULT '',              -- earn/revoke: task summary; claim_reserve/claim_release: reward name (Phase 2)
    reason TEXT NOT NULL DEFAULT '' CHECK (length(reason) <= 200),
    actor_user_id TEXT                             -- context.user_id; NULL = automation/system
);
CREATE INDEX IF NOT EXISTS idx_ledger_member ON points_ledger(member_slug);
CREATE INDEX IF NOT EXISTS idx_ledger_item ON points_ledger(item_uid, id) WHERE item_uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_reverses ON points_ledger(reverses_id) WHERE reverses_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_idem ON points_ledger(member_slug, idem_key) WHERE idem_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_claim ON points_ledger(claim_id, member_slug, kind) WHERE claim_id IS NOT NULL;
```

The two claim and idem indexes are created now so Phase 2 adds no DDL to this table.

### Open-earn query

Used by both earn (must be absent) and revoke (the row to reverse). `:uid` and `:cycle` are bound. It runs inside the `BEGIN IMMEDIATE` transaction:

```sql
SELECT e.id, e.member_slug, e.delta FROM points_ledger e
WHERE e.kind = 'earn' AND e.item_uid = :uid AND e.cycle = :cycle
  AND NOT EXISTS (SELECT 1 FROM points_ledger r WHERE r.reverses_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM completion_log c
                  WHERE c.item_uid = :uid AND c.action = 'reset' AND c.timestamp > e.created_at)
ORDER BY e.id DESC LIMIT 1;
```

Both `timestamp` and `created_at` are `datetime.now(UTC).isoformat()` strings, so they compare lexically.

### Store API

```python
async def async_ledger_record_earn(self, item_uid: str, member_slug: str, points: int,
                                   cycle: date, summary: str, actor_user_id: str | None) -> bool
    # True if an earn row was inserted; False if an open earn already existed.
async def async_ledger_record_revoke(self, item_uid: str, cycle: date,
                                     actor_user_id: str | None) -> bool
    # True if a revoke was inserted (member_slug/delta copied from the earn); False if no open earn.
async def async_ledger_grant(self, member_slug: str, points: int, reason: str,
                             actor_user_id: str | None) -> int   # returns the new balance
async def async_get_balances(self) -> dict[str, int]              # only slugs with rows; caller fills 0s
async def async_get_ledger_history(self, limit: int) -> list[dict[str, Any]]  # newest first
```

The three write methods require `rewards_lock` to be held (asserted by `_async_rewards_write`).
### `async_require_admin`

```python
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import Unauthorized

async def async_require_admin(hass: HomeAssistant, context: Context) -> None:
    """Allow admins and userless (automation/system) calls; refuse everyone else."""
    if context.user_id is None:
        return
    user = await hass.auth.async_get_user(context.user_id)
    if user is None or not user.is_admin:
        raise Unauthorized(context=context)
```

### `get_rewards` response

```typescript
// Stable from Phase 1. Phase 2 fills rewards/claims/settings.
interface GetRewardsResponse {
  is_admin: boolean;                       // connection.user.is_admin
  balances: Record<string, number>;        // every member slug from store.get_members(), 0 if no rows
  rewards: Array<{ id: number; name: string; cost: number; description: string;
                   poolable: boolean; archived: boolean }>;   // active only (archived when include_archived, Phase 2)
  claims: Array<{ id: number; reward_id: number; reward_name: string; cost: number;
                  claimer_slug: string; status: 'pending'|'approved'|'rejected'|'cancelled'|'refunded';
                  created_at: string; resolved_at: string | null;
                  contributors: Array<{ member_slug: string; share: number }> }>;  // pending only (+recent, Phase 2)
  settings: { streak_daily_bonus: number; streak_milestones: Array<{ days: number; points: number }> };
  history?: Array<{ id: number; created_at: string; member_slug: string; delta: number;
                    kind: string; summary: string; reason: string; claim_id: number | null;
                    actor_name: string | null }>;            // only when history_limit is sent
}
```

## Constraints

- No balance storage outside `SUM(points_ledger.delta)`.
- Every rewards write goes through `_async_rewards_write`, with `rewards_lock` held, inside `BEGIN IMMEDIATE`.
- `rewards_lock` is never held together with a uid lock.
- Admin checks happen server-side in `async_require_admin`, nowhere else.
- No `sqlite3` error escapes the store (CLAUDE.md "Don't let a `sqlite3` error out of the store").
- The listener hook is wrapped so it can never break completion logging.
- `reset` never touches the ledger.
