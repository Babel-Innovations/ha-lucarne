---
status: pending
issue: 32
---

# Rewards

> **Progress Tracking**: Update checkboxes in phase files as you complete tasks. Run `/spec-implement [phase-file]` to begin implementation.

## Goal

Motivate kids to do their routines and chores: tasks earn points, points buy rewards that a parent approves, and the balance is visible on the wall tablet.

## Scope

**In scope (v1):**

- Per-task points, earned on completion and revoked on un-tick.
- A reward catalog managed by parents; kids claim rewards (alone or pooled with siblings); a parent approves or rejects each claim.
- Parent ad-hoc point grants with an optional reason.
- Streak bonuses: a flat daily bonus and milestone bonuses.
- A new admin card (`lucarne-rewards-admin-card`) and kid-facing UI on the chores card.

**Out of scope** (do not build, even partially):

- Auto-unlocked / zero-cost rewards ("all chores done → screen time").
- Rich automation-grade HA events (`claim_approved`, `points_earned`, …) and the documented "unblock a device's internet" automation example. v1 fires exactly **one** refresh-only event (see [Events](#events)).
- A locked "kid mode" that stops kids adding or editing tasks.
- Point expiry or decay; penalties or deductions (grants are positive only); real money or allowance.
- Per-member reward eligibility; reward icons (the emoji goes in the reward name).
- Points on the Today card or the Calendar card.

## Concepts

Every phase builds on these definitions. They are normative: if code disagrees with this section, the code is wrong.

### The ledger is the only source of balances

`points_ledger` is append-only. A member's **balance** is `SUM(delta)` over their rows. There is **no** balance column, counter entity or cached total anywhere, and no row is ever updated or deleted (rename is the one exception: it rewrites `member_slug`). Every point movement is a row:

| `kind` | `delta` | Written when |
|---|---|---|
| `earn` | `+points` | a task with `points > 0` is completed (see [Earning](#earning-and-revoking)) |
| `revoke` | `-earn.delta` | that task is un-ticked; `reverses_id` points at the `earn` |
| `grant` | `+1…+10000` | an admin grants points |
| `streak_daily` | `+N` | the streak check counts today and the daily bonus is > 0 |
| `streak_milestone` | `+P` | the streak crosses a configured milestone |
| `claim_reserve` | `-share` | a claim is created (one row per contributor) |
| `claim_release` | `+share` | a claim is rejected, cancelled or refunded (one row per contributor) |

The balance can be negative. Only a `revoke` can push it below zero (a kid spends points, then un-ticks the task that earned them). Claims and grants can never take a balance below zero.

### Earning and revoking

Points are awarded in `completion_listener._async_handle_state_change`, on the same `completed` / `undone` transitions that write `completion_log`. They are **not** awarded in `toggle_task`. This way a tick from HA's to-do panel, voice or the Companion app counts too.

- **Points come from `task_metadata.points`** (0–1000, default 0). An item with no metadata row (un-adopted) earns 0. A plain household task (`member_slug == "household"`, type not `rotating`) cannot carry points. A rotating task credits the member the listener already attributes the completion to (`current_owner`).
- **Cycle.** `cycle_date(now, reset_time, tz)` returns the local date of the last reset boundary at or before `now`. It is the Python mirror of `lastResetBoundary` in `src/shared/date-helpers.ts`. A routine ticked at 01:00 with a 04:00 reset belongs to the previous day's cycle.
- **Open earn.** For a given uid, the open earn is its most recent `earn` row that meets all three conditions:
  - no `revoke` row has `reverses_id` equal to it,
  - its `cycle` equals the current cycle,
  - no `completion_log` row with `action = 'reset'` for that uid has a `timestamp` after the earn's `created_at`.
- **On `completed`.** Earn `+points` only if the uid has no open earn. Tick → untick → tick therefore nets one award, and a duplicate `completed` with no untick in between earns nothing.
- **On `undone`.** Revoke the open earn, if there is one. The `revoke` takes its `member_slug` and `delta` from the **earn row**, never from current metadata: an admin may have changed the points, or a rotating task may have moved on to its next owner.
- **On `reset`.** Write nothing. Reset never revokes, and neither does the deletion of completed chores at reset.
- **Ordering.** Each state change runs in its own listener task, so a rapid tick then untick can reach the ledger out of order. Under the rewards lock, re-read the item's **current** status from the todo entity before writing:
  - On `completed`, skip if the item is no longer completed.
  - On `undone`, skip if the item is completed again.
  - If the entity cannot be read, act on the observed transition.

### Claims

A claim moves through these states:

`pending` → `approved` | `rejected` | `cancelled`, and `approved` → `refunded`.

- **Claim.** Atomically checks every contributor's balance and writes one `claim_reserve` row per contributor. The reserved points are already gone from the balance.
- **Approve.** Writes no ledger row: the reservation becomes the spend.
- **Reject, cancel, refund.** Each writes one `claim_release` row per contributor, giving back exactly that contributor's `share`.
- **Snapshots.** Each claim stores the reward name, the cost and every contributor's share at claim time. Editing or archiving the reward later changes none of them.
- **Pooling.** Allowed only when the reward is `poolable`. The claimer picks other members, and `split_shares(cost, claimer, others)` (signature in Phase 2) gives each of the `n` deduplicated contributors `cost // n`, with the remainder (`cost % n`) going to the claimer. If `n > cost`, the claim is rejected because a share would be 0. Every contributor must afford their own share, or the whole claim fails.
- **Who can act.** Anyone can claim or cancel: the shared tablet acts on a kid's behalf, and parent approval is the safety net. Approve, reject and refund are admin-only.

### Streak bonuses

Both bonuses are family-wide settings (`rewards_settings`) and are awarded inside `handle_evaluate_all_streaks`, the existing streak-check service.

- **Daily bonus.** If `streak_daily_bonus > 0` and today is a *counted* day (routines were expected today and all of them were completed), insert `streak_daily` with `idem_key = "daily:<today ISO>"`. Every counted day earns it, including the first day of a streak.
- **Milestones.** `streak_milestones` is a list of `{days, points}`. A milestone pays once when the streak **crosses** it: `prev_streak < days <= new_streak`. `prev_streak` comes from `streak_bonus_state` (see Phase 2). On a member's first-ever evaluation, `prev_streak` is set equal to the current streak, so there is **no backpay** for milestones already passed when the feature ships. Only a genuine restart resets `prev_streak` to 0, so each milestone can be earned again in a new streak run. A milestone row carries `idem_key = "ms:<days>:<run_start ISO>"`, so re-running the check never pays twice.
- **Adults** earn bonuses too. They simply have nothing to spend them on.

### Authorization

| Operation | Who |
|---|---|
| `get_rewards` (read), `claim_reward`, `cancel_claim` | any authenticated user |
| `approve_claim`, `reject_claim`, `refund_claim`, `grant_points`, `create_reward`, `update_reward`, `archive_reward`, `set_rewards_settings` | HA admin, or a call with no user (automation or system) |
| `points` field on `add_task` / `update_task_metadata` | HA admin, or a call with no user |

Enforced **server-side** by `async_require_admin(hass, context)` in `rewards.py` (Phase 1), which raises `homeassistant.exceptions.Unauthorized` for a non-admin user. The cards hide the admin controls, but hiding them is cosmetic: the server check is the real gate. The frontend learns `is_admin` from the `get_rewards` response (`connection.user.is_admin`), **not** from `hass.user`.

### Events

v1 fires exactly one new event, `lucarne_family_rewards_updated`, with payload `{}`. It fires after every committed rewards write: earn, revoke, grant, claim, any claim transition, reward create/update/archive, settings change, streak bonus, and member-removal cleanup. It is added to `LUCARNE_FRONTEND_EVENTS` (`websocket_api.py`) so the `lucarne_family/subscribe` relay makes the cards refresh. `docs/events.md` documents it as a **refresh cue only**, with no payload contract. Automation-grade events are out of scope.

## Requirements

### Points
- Task points: integer 0–1000, default 0. Set through an admin-only "Points" field in the add-task and edit-task popovers. A task added from the tablet by a non-admin has 0 points until an admin edits it.
- Grants: integer 1–10000, optional reason up to 200 characters (trimmed). No negative grants.
- Every ledger row records `actor_user_id` (`context.user_id`; `NULL` means an automation or the system).

### Rewards
- Fields:
  - `name`: required, trimmed, 1–60 characters, duplicates allowed.
  - `cost`: integer 1–100000.
  - `description`: up to 500 characters, optional.
  - `poolable`: bool, default false.
- Every reward is visible to every member.
- Deleting a reward archives it (soft delete). An archived reward disappears from the kid modal and is shown only behind "Show archived" in the admin card. Its pending claims can still be approved or rejected.

### Claims
- Atomic check-and-reserve. If two claims race, the second one fails with "Not enough points".
- A kid can cancel their own pending claim from the modal.
- An admin can refund an approved claim from History.
- Removing a member keeps their ledger rows and rejects (and releases) every pending claim they claimed or contributed to.

### UI
- **Chores card:**
  - A ⭐ balance pill in each member column, beside the streak, with a dot when at least one active reward is affordable. Tapping it opens that member's rewards modal.
  - The modal lists the member's pending claims (each with Cancel), then all active rewards: affordable ones first, the rest greyed out with "N more points". Each affordable reward has Claim; a poolable reward also has "Claim together".
  - A `+N` chip on task rows where `points > 0`.
- **Admin card:** tabs Claims, Points, Rewards, History and Settings. A non-admin sees a read-only view with a notice.
- Every card mutation follows the optimistic-UI rule (CLAUDE.md "Optimistic UI is mandatory"; `docs/architecture.md` "## Optimistic UI").

## Phases

- [Phase 1: Points backend](./phase-1-points-backend.md) — ledger, task points (admin-gated), earn/revoke in the listener, `grant_points`, `get_rewards` WS, refresh event
- [Phase 2: Rewards, claims & streak bonuses backend](./phase-2-rewards-claims-backend.md) — reward catalog, claim/pool/cancel/approve/reject/refund, member removal/rename, settings + streak bonuses
- [Phase 3: Admin card & points field](./phase-3-admin-card.md) — rewards data in `subscribeFamilyState`, `lucarne-rewards-admin-card` (5 tabs), admin-only points field in popovers
- [Phase 4: Kid-facing chores card UI](./phase-4-kid-ui.md) — balance pill, `+N` chips, rewards modal with pooling, optimistic claims, docs, on-device verification

Phases 1 and 2 are backend-only and can be verified through Developer Tools → Actions. Phase 3 needs both. Phase 4 needs Phase 3's data layer.

## Architecture (chosen: pragmatic balance)

- **Backend logic** lives in one new module, `custom_components/lucarne_family/rewards.py`. It holds the pure helpers (`cycle_date`, `split_shares`, the milestone math), `async_require_admin`, the earn/revoke entry point the listener calls, the streak-bonus entry point, and every rewards service handler and schema, with their own `async_setup_rewards_services` / `async_unload_rewards_services`.
  - `task_service.py` is **not** where these go: it already carries the #114, #118 and #119 invariants. If `rewards.py` grows past about 600 lines during Phase 2, split the service handlers into `rewards_service.py` and note the split in the PR.
- **Storage** lives in `store.py` as new `LucarneFamilyStore` methods. They use `_async_read` / `_async_write`, so the #118 cancellation drain and the #127 `StoreError` translation apply.
  - **Every** rewards write runs as one executor job holding the per-entry rewards lock, inside an explicit `BEGIN IMMEDIATE` transaction (see Phase 1 "Rewards write helper").
- **Settings** live in a SQLite `rewards_settings` table, **not** in `entry.data`. Writing `entry.data` fires `async_options_updated`, which restarts the completion and time listeners.
- **Frontend data:** `subscribeFamilyState` (`src/shared/family-subscription.ts`) gains an opt-in `opts?: { rewards?: boolean; rewardsHistory?: number }`. Only a subscriber that passes `rewards: true` (or sets `rewardsHistory`) fetches `lucarne_family/get_rewards`, in parallel with `get_family`, and receives it as `FamilyState.rewards`; for every other subscriber `rewards` stays `null` and no `get_rewards` is ever sent. The chores card and the admin card opt in and get polling, visibility refresh and relay refresh this way, with no new subscription. The other existing subscribers (the Today card and the chores card editor; the Calendar card does not subscribe) do not opt in, so their 20 s poll is unchanged.

## Links

- Project conventions and pitfalls: [`CLAUDE.md`](../../CLAUDE.md). Read the pitfalls on #101 (loader / `CARD_TAGS`), #114 (uid lock), #118 (`_async_write` drain), #127 (`StoreError`), optimistic UI, and `node:test` (not vitest).
- [`docs/architecture.md`](../../docs/architecture.md): "## Optimistic UI" and "### Storage split"
- [`docs/services.md`](../../docs/services.md), [`docs/events.md`](../../docs/events.md), [`docs/cards.md`](../../docs/cards.md), [`docs/integration.md`](../../docs/integration.md)

## Testing Tools

| MCP Server | Tool Prefix | Use For |
|-----------|-------------|---------|
| Home Assistant (live house, `ha-vm`) | `mcp__home-assistant__*` | After `./scripts/deploy-integration.sh` and an HA restart: call `lucarne_family.*` services (`ha_call_service`), read logs (`ha_get_logs`), inspect todo items (`ha_get_todo`). Replaces hand-written REST calls. |
| Browser MCP | `mcp__browsermcp__*` | Screenshot and click through the chores card and admin card on the deployed dashboard. If its tools are missing, the server is disconnected: ask the user to reconnect the extension rather than skipping visual verification. |

**Live-house rule:** `ha-vm` is the family's real Home Assistant. Create only test data whose name starts with `[test]` (rewards) or a grant reason containing `[test]`.
- Never approve or reject a claim the test did not create.
- Clean up when done: archive the test rewards, and cancel or reject the test claims.
- The ledger is append-only, so test grants stay in history. Keep them small (1 point) and say so in the PR.

## Logging & Diagnostics

| Log Source | Location | Format | What to Check |
|-----------|----------|--------|---------------|
| HA core log (live) | `mcp__home-assistant__ha_get_logs` | text | `custom_components.lucarne_family` entries at `ERROR` / `WARNING`, especially "Unexpected exception" (a sign an error escaped untranslated, see #119 and #127) |
| pytest coverage | terminal output of `pytest tests/python/` | text | statement floor 86 (`fail_under` in `pyproject.toml`) |
| Node coverage | terminal output of `npm run test:coverage` | text | floors line 88, branch 80, funcs 73 |
| `window.__lucarneBoot` | browser console on the dashboard | JS object | `registered` includes `lucarne-rewards-admin-card`; `error` is null |
