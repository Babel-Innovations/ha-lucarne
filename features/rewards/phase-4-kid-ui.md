---
status: done
---

# Phase 4: Kid-facing chores card UI

This phase is what kids see on the wall tablet. Each member column of the chores card gets a ⭐ balance pill, with a dot when a reward is affordable. Tapping it opens a rewards modal that lists pending claims (with Cancel) and every active reward, affordable ones first; kids claim alone or pool with siblings. Task rows show a `+N` chip. Everything updates optimistically, because the iPad kiosk's WebSocket pushes stall while it idles. This phase also writes the user-facing docs and does the on-device check.

## Context

Read [./README.md](./README.md) first, especially **Claims** (pooling, who can cancel) and **Earning and revoking** (what the `+N` chip promises).

### What Phases 1–3 produced (verify before starting)

| Artifact | Where | Take from it |
|---|---|---|
| `FamilyState.rewards: RewardsState \| null`, `FamilyState.rewardsFetchedAt` | `src/shared/family-subscription.ts` | The chores card already subscribes with `{ rewards: true }` (Phase 3 Sub-Phase A). Read `rewards` from the same state push. Do not add a second subscription, and do not opt in the Today card. |
| `TaskMetadata.points` (number, normalized) | `src/shared/types.ts`, `doRefreshOnce` | Drives the `+N` chip and the tick balance delta. |
| `claimReward`, `cancelClaim` wrappers | `src/shared/integration-services.ts` | `claimReward` returns `{claim_id, shares}`. |
| `RewardsOverlay` (`addClaim`, `resolveClaim`, `reconcile(fetchedAt)`, `apply(server)`) | `src/shared/rewards-optimistic.ts`, spec in [Phase 3 → RewardsOverlay](./phase-3-admin-card.md#rewardsoverlay) | Use it, not a parallel mechanism. Add one new override kind here (`tickDelta`, below). |
| `isAdmin` popover prop + points in `editMatches` | chores card | Already done. Don't redo it. |

If any of these is missing or has a different shape, Phase 3 is not done. Stop.

### Existing frontend code this phase touches

Open each symbol before relying on it.

- **`src/components/member-column.ts` (`LucarneMemberColumn`):**
  - `render()` lays the column out as: `lucarne-celebration-overlay`, the absolute `.add-task-btn`, `.header` (avatar + name), `.lists` (task rows via `lucarne-task-row`), then `.streak-area` holding `lucarne-streak-display`.
  - `.streak-area` is rendered only when `showStreak`, and sits at the **bottom** of the column, because `.lists` is `flex: 1`.
  - The column's properties include `member`, `tasks`, `members`, `streak` and `showStreak`.
- **`src/components/task-row.ts` (`LucarneTaskRow`):**
  - The row is `role="checkbox"`, and its `aria-label` comes from `_rowLabel(...)`. The doc comment above that helper says anything worth announcing must be added there explicitly.
  - Trailing badges are `.rotation-badge` and `.due`.
- **`src/cards/lucarne-chores-card.ts`:**
  - Config flags `show_routines`, `show_tasks`, `show_streak` (each `?? true`).
  - Per-member props are built in `_resolveMembers()` (the streak comes from `_familyState.streakByMember`).
  - `_handleTaskToggle` flips `_optimistic` before calling `todo.update_item`.
  - `_onFamilyState` reconciles.
  - The popovers are mounted after `</ha-card>` and closed via `popover-close`.
- **Kiosk constraints** (CLAUDE.md, `docs/ipad-debugging.md`): iPadOS 15 WebKit and Tizen. Touch targets must be at least 44 px. Never use native dialogs. The bundle floor is ES2020: no regex literals with `\p{…}`.

> **Shortcut warnings:**
> - The pill and modal must show the **overlaid** state (`overlay.apply(rewards)` plus tick deltas), never raw `rewards`, or the iPad stays stale after a claim or tick.
> - Affordability in the UI is a display hint. Never skip the service call because the UI computed "affordable". The server's atomic check is the authority, and its error message is shown verbatim.
> - The pool picker must show each contributor's **share**, computed with the same rule as `split_shares` (Phase 2). Do not show "split evenly" and let the server surprise the kid with the remainder.

## Structure

```
src/
  shared/
    rewards-optimistic.ts       # update (ALREADY EXISTS, Phase 3): 'tickDelta' override kind
    rewards-math.ts             # new: splitShares (mirror of Python split_shares), affordableRewards, displayBalance helpers
  components/
    reward-balance-pill.ts      # new: lucarne-reward-balance-pill
    rewards-modal.ts            # new: lucarne-rewards-modal (list, claim, pool picker, cancel)
    member-column.ts            # update (ALREADY EXISTS): balance/affordable/showRewards props; pill beside the streak
    task-row.ts                 # update (ALREADY EXISTS): +N chip; points in _rowLabel
  cards/
    lucarne-chores-card.ts      # update (ALREADY EXISTS): show_rewards config; overlay; modal host; tick deltas
  editors/
    lucarne-chores-card-editor.ts  # update (ALREADY EXISTS): show_rewards toggle
custom_components/lucarne_family/frontend/
  ha-lucarne.js, ha-lucarne-loader.js  # rebuilt + committed
tests/
  shared/rewards-math.test.ts          # new
  shared/rewards-optimistic.test.ts    # update (ALREADY EXISTS): tickDelta
  components/reward-balance-pill.test.ts  # new
  components/rewards-modal.test.ts     # new
  components/member-column.test.ts     # update (ALREADY EXISTS)
  components/task-row.test.ts          # update (ALREADY EXISTS)
  components/lucarne-chores-card.test.ts  # update (ALREADY EXISTS)
  components/lucarne-chores-card-editor.test.ts  # update (ALREADY EXISTS)
docs/
  cards.md                     # update: chores card show_rewards + pill/modal behaviour
  integration.md               # update: new "## Rewards" user guide section
README.md                      # update: "### The cards" lists the admin card; "## What you get" mentions rewards
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] Run the full baseline gate (CLAUDE.md "Both (baseline gate before any commit)", plus `.venv/bin/ruff` and `.venv/bin/mypy`). All must be green.
- [x] If anything fails, fix it and commit separately before proceeding.

### Sub-Phase A: Points visible (chip + pill, no modal yet)

Deliverable: rows show `+N`, and columns show the balance, updating immediately on tick.

#### Helpers
- [x] `rewards-math.ts`:
  - `splitShares(cost, claimer, others) -> Map<string, number> | null`. It mirrors Python `split_shares` exactly: dedupe with order kept, `floor(cost / n)` each, the remainder to the claimer, and `null` when `n > cost`.
  - `affordableRewards(rewards, balance)`: active rewards with `cost <= balance`.
  - `sortForModal(rewards, balance)`: affordable first, then by cost ascending, then by name.

#### Tick deltas
- [x] `rewards-optimistic.ts`: add the override `{ kind: 'tickDelta'; uid: string; member: string; points: number; appliedAt: number }`.
  - `apply` adds `points` (which can be negative) to `balances[member]`.
  - `reconcile` drops it by the same `appliedAt < fetchedAt` / 30 s rule.
  - Each `tickDelta` is its own override, and `apply` **sums** them. Every surviving delta was applied after the fetch the server state came from, so none of them is in that state yet. Tick then untick inside one window therefore nets to 0 (balance 5 → 7 → 5), and tick → untick → tick nets `+points`, matching the server's one-award rule. Replacing the first delta with the second would show 3 after a quick tick-untick.
- [x] `lucarne-chores-card.ts`:
  - Own one `RewardsOverlay`. In `_onFamilyState` call `overlay.reconcile(state.rewardsFetchedAt)`.
  - In `_handleTaskToggle`, after the `todo.update_item` call **resolves**, if the task's `metadata.points > 0` and it is not a plain household task, record `tickDelta` with `+points` for complete and `-points` for un-complete. The credited member is `metadata.current_owner` for rotating tasks, and otherwise the column's member.
  - On error the toggle already reverts; record nothing.
  - This is a display approximation. The server's open-earn rules (README) can differ in rare cases, and the next fetch corrects them.

#### Chip and pill
- [x] `task-row.ts`:
  - When `task.metadata.points > 0`, render `<span class="points" aria-hidden="true">+N</span>` after `.rotation-badge`, styled like `.due` (small and muted), with a min-width so rows align.
  - Append `, N points` to the `_rowLabel` output so screen readers hear it. Don't render the chip on not-today rows (`notToday`).
- [x] `reward-balance-pill.ts` (`lucarne-reward-balance-pill`):
  - **Props:** `balance: number`, `affordable: boolean`, `memberName: string`.
  - **Render:** a `<button>` (≥ 44×44 px hit area) showing `⭐ {balance}`; negative values show as `⭐ −3`.
  - **Dot:** when `affordable`, a dot badge plus `aria-label="{memberName}: {balance} points, a reward is ready"`. Otherwise `aria-label="{memberName}: {balance} points"`.
  - **Event:** click dispatches a bubbling, composed `rewards-open` event with `{ memberSlug }`.
- [x] `member-column.ts`:
  - Add the props `balance: number | null`, `affordable: boolean`, `hasActiveRewards: boolean` and `showRewards: boolean`.
  - Render the pill in the same bottom area as the streak, as a row: streak on the left, pill on the right. When `showStreak` is false and `showRewards` is true, render the area with only the pill.
  - Hide the pill when `showRewards` is false, when `balance === null` (rewards unavailable, or the household column), and also when `balance === 0 && !hasActiveRewards` (an adult column with nothing to show stays unchanged).
  - Keep `.streak-area`'s existing look when rewards are off.
- [x] `lucarne-chores-card.ts`:
  - Add the config `show_rewards?: boolean` (default true).
  - In `_resolveMembers`, compute each member's `balance` from `overlay.apply(rewards).balances[slug] ?? 0` (or `null` when `rewards` is null), `affordable` with `affordableRewards(...).length > 0`, and `hasActiveRewards` as "the overlaid `rewards` list has at least one non-archived entry".
  - **The household column** (`slug === 'household'`, also rendered through `lucarne-member-column`) always gets `balance: null`. It is not a member, has no balance, and `claim_reward` rejects `"household"`; without this the `?? 0` above would show a `⭐ 0` pill on it whenever any reward exists, opening a modal whose every claim fails.
- [x] `lucarne-chores-card-editor.ts`: a "Show rewards" toggle next to "Show streak".

#### Tests (write first)
- [x] `rewards-math.test.ts`: `splitShares` against the same cases as Python `test_rewards_math.py`, i.e. `(10, a, [b, c])` → a 4, b 3, c 3; dedupe; `n > cost` → null. Plus `sortForModal` ordering.
- [x] `rewards-optimistic.test.ts`:
  - `tickDelta` adds then reconciles away;
  - for the same uid, `+2` then `-2` (both newer than the last fetch) leaves the balance unchanged, and `+2`, `-2`, `+2` raises it by 2;
  - the reconcile does not double-count once the server balance includes the earn.
- [x] `task-row.test.ts`:
  - the chip renders for points 3 and not for 0 or undefined;
  - the `aria-label` ends with ", 3 points";
  - no chip on not-today rows.
- [x] `member-column.test.ts`:
  - the pill renders with `balance=5`;
  - it is hidden with `balance=null`, and with `balance=0` and `hasActiveRewards=false`, but shown with `balance=0` and `hasActiveRewards=true`;
  - the dot appears with `affordable=true`;
  - `rewards-open` fires with the slug.
- [x] `lucarne-chores-card.test.ts`:
  - with `get_rewards` answering balance 5 and a routine of 2 points, ticking the row shows `⭐ 7` before any new `get_rewards` response;
  - a later push with balance 7 and a newer `rewardsFetchedAt` still shows 7, not 9;
  - a rejecting `todo.update_item` leaves `⭐ 5`;
  - with one active reward, the household column renders no pill.
- [x] `lucarne-chores-card-editor.test.ts`: the toggle writes `show_rewards: false`.

### Sub-Phase B: Rewards modal, claims and pooling

Deliverable: kids can see rewards, claim them (alone or pooled) and cancel pending claims, all optimistic.

- [x] `rewards-modal.ts` (`lucarne-rewards-modal`):
  - **Props:** `hass`, `member: MemberSummary`, `members: MemberSummary[]` (real members, never household), `rewards: RewardsState` (**overlaid**).
  - **Shell:** fixed `:host`, `.backdrop` (a click on the backdrop itself closes), `.popover` with `role="dialog" aria-modal="true" aria-labelledby` pointing at the title "{name}'s rewards", and a `✕` close with `aria-label="Close"`.
  - **Focus management** (new in this codebase; the existing popovers have none):
    - On open, focus the close button.
    - Escape closes.
    - Tab cycles inside the dialog.
    - On close, the card returns focus to the pill that opened it.

    Fire `popover-close` like the other popovers.
  - **Header:** `⭐ {balance} points`.
  - **"Waiting for a grown-up"** (only when non-empty): pending claims where this member is the claimer or a contributor. Each shows the reward name, this member's share, and, if pooled, "with Bob, Cara". **Cancel** (≥ 44 px) appears only when this member is the claimer; contributors see "Bob's claim". Cancel uses the inline two-step "Cancel claim? [Yes, cancel] [Keep]".
  - **Rewards:** active rewards in `sortForModal` order.
    - **Affordable:** name, description, `⭐ cost`, and a **Claim** button.
    - **Poolable:** also a **Claim together** button. Show it even when the reward is unaffordable alone, since pooling is the point.
    - **Unaffordable:** greyed (`aria-disabled` on the row; the text stays readable at ≥ 4.5:1 contrast) with "{cost − balance} more points" and a progress bar (`role="progressbar"`, `aria-valuenow=balance`, `aria-valuemax=cost`).
  - **Claim flow:**
    1. Inline confirm "Claim {name} for ⭐ {cost}? [Claim] [Back]". Little ones tap things.
    2. `claimReward(...)`.
    3. On success, dispatch `reward-claimed` with `{ claim }`, built from the response's `claim_id` and `shares`, `status: 'pending'`, and the reward name and cost.
    4. On error, show the inline `role="alert"` with `serviceErrorMessage(err, 'Could not claim this reward')` and keep the modal open.

    A `_busy` flag disables all buttons while a call is in flight.
  - **Claim together:** an inline step listing the other members as checkboxes (≥ 44 px rows, avatar and name, the member's current balance).
    - The live preview is computed with `splitShares`: "You pay ⭐ 4 · Bob ⭐ 3 · Cara ⭐ 3".
    - A contributor who cannot afford their share is marked "needs N more", and **Ask together** stays disabled until every share is affordable and at least one other member is ticked.
    - With `splitShares === null` (more people than points), show "Too many people for this reward" and keep the button disabled.
    - Submit calls `claimReward(hass, member, id, others)`, then follows the same success and error path as a solo claim.
  - **Empty catalog:** "No rewards yet — ask a grown-up to add some."
- [x] `lucarne-chores-card.ts`:
  - On `rewards-open`, set `_rewardsMember` and mount the modal after `</ha-card>` like the popovers, passing `overlay.apply(rewards)`.
  - On `reward-claimed`, call `overlay.addClaim(claim)` and request an update. On `claim-cancelled` (`{ claimId }`), call `overlay.resolveClaim(claimId, 'cancelled')`.
  - On `popover-close`, unmount and refocus that member's pill.
  - If `rewards` becomes `null` while the modal is open, close it.

#### Tests
- [x] `rewards-modal.test.ts`. Use `makeFakeHass` with `callService` overridden per test to resolve `{ response: { claim_id: 9, shares: { alice: 10 } } }` or reject with `{ code: 'service_validation_error', message: 'Not enough points: Alice needs 3 more' }`:
  - order is affordable first, and unaffordable rows show "N more points" and a progressbar;
  - Claim needs the confirm step, then sends `claim_reward {member, reward_id}`, then fires `reward-claimed`;
  - the rejection text appears verbatim in `role="alert"`;
  - Claim together: ticking Bob for a cost-10 reward shows "You pay ⭐ 5 · Bob ⭐ 5", the payload has `pool_with: ['bob']`, and the button stays disabled while Bob is short;
  - Cancel shows only for the claimer and sends `cancel_claim {claim_id}`;
  - Escape fires `popover-close`, focus starts on the close button, and Tab wraps.
- [x] `lucarne-chores-card.test.ts`:
  - tap the pill → the modal mounts;
  - a claim reduces the pill immediately and shows the pending entry;
  - a later push without the claim and an **older** `rewardsFetchedAt` keeps it;
  - one with a newer fetch that includes the pending claim shows it once, not twice;
  - cancel restores the balance immediately;
  - closing returns focus to the pill.

### Sub-Phase C: Docs and on-device verification

- [x] `docs/cards.md` `## lucarne-chores-card`: add `show_rewards` to the config table, plus a short "Rewards" paragraph on the pill, the dot, the modal, pooling and the `+N` chip.
- [x] `docs/integration.md`: a new `## Rewards` section for parents, covering:
  - setting task points (admin only, from the edit popover);
  - adding rewards and streak bonuses in the admin card;
  - approving claims;
  - refunds.

  It explains *how to use* the feature. The rules themselves live in `features/rewards/README.md` → Concepts; link there instead of restating them. Also state that rewards events for automations are not available yet (#32 follow-up).
- [x] Root `README.md`: in `### The cards`, add the admin card; in `## What you get`, add one bullet for rewards.
- [x] `npm run build`, then commit both rebuilt `frontend/*.js`.

### Build Verification (required before marking phase complete)

- [x] `npm run build && npm run test:coverage && npm run lint && npm run typecheck` pass: line ≥ 88, branch ≥ 80, funcs ≥ 73.
- [x] `tests/build/bundle-syntax.test.ts` passes: no ES2021+ syntax, and no `\p{…}` / lookbehind / `v`-flag regex literals in the new files.
- [x] `.venv/bin/pytest tests/python/` passes.
- [x] Scan the test output for console errors, unhandled rejections and Lit update warnings.
- [x] Both rebuilt `frontend/*.js` are staged.
- [x] Mark the phase `status: done` only after all of the above pass and the on-device check below is done, or explicitly handed to the user.

### Manual Verification with MCP Tools

> Handed to the user: deploying to and restarting the live house needs their go-ahead, and the iPad check is theirs.

- [ ] `./scripts/deploy-integration.sh`, then restart HA (ask the user first; this is the live house).
- [ ] Following the README live-house rule, as admin:
  1. create a `[test]` reward costing 1;
  2. give one test-safe member 1 point (`grant_points`, reason `[test]`).
- [ ] `mcp__browsermcp__browser_navigate` to the chores dashboard and `browser_screenshot`:
  - the pill shows the balance with the dot;
  - open the modal and screenshot it;
  - claim → the pill drops to 0 immediately and the pending entry shows;
  - cancel → it returns.

  Then archive the test reward.
- [ ] **iPad check (human).** You cannot drive the wall iPad. Leave this box unchecked and ask the user to verify on the iPad: tap the pill, claim, cancel. On a stale app shell they should force-quit the Companion app (CLAUDE.md "Deploy"). Record their result in the PR. Do not tick it on their behalf.
- [ ] `mcp__home-assistant__ha_get_logs`: no new `lucarne_family` errors.

## Technical Details

### Modal state machine

```
list ──Claim──▶ confirm(rewardId) ──Claim──▶ [busy] ──ok──▶ list (+pending entry, via reward-claimed)
  │                │ Back                        └─err──▶ confirm + role=alert
  ├─Claim together─▶ pool(rewardId, selected[]) ──Ask together──▶ [busy] ──ok/err── as above
  └─Cancel(claim)──▶ cancelConfirm(claimId) ──Yes──▶ [busy] ──ok──▶ list (claim-cancelled)
```

One `@state() _step` drives it. There are no nested dialogs.

### Pill placement

```
┌─ Alice ─────────────────┐
│        (avatar)         │
│         Alice           │
├─────────────────────────┤
│ ○ Make bed         +2   │
│ ○ Brush teeth      +1   │
│ ✓ Feed cat         +3   │
├─────────────────────────┤
│ 🔥 5 day streak  [⭐ 42•]│   ← existing .streak-area, now a row
└─────────────────────────┘
```

## Constraints

- The pill and modal render overlaid state only.
- The server is the authority on affordability. Show its error message verbatim.
- `splitShares` must match Python `split_shares`; both test files pin the same cases.
- No native dialogs. Every touch target is at least 44 px.
- No regex literals that break the ES2020 / Safari 15 parse floor.
- The iPad check is a human step. Leave it unchecked and ask the user.
