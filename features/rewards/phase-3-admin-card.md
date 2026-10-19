---
status: done
---

# Phase 3: Admin card & points field

This phase gives parents a UI. Rewards data flows through `subscribeFamilyState` to the cards that opt in (chores and admin; the Today card never fetches it). A new fourth card, `lucarne-rewards-admin-card`, lets an admin approve and reject claims, grant points, manage the reward catalog, browse history (with refund) and set streak bonuses. The add-task and edit-task popovers gain an admin-only Points field. After this phase a parent can run the whole rewards system from an admin-only dashboard. Kids still see nothing new until Phase 4.

## Context

Read [./README.md](./README.md) first. **Authorization** says why every admin control here is cosmetic: the server is the gate.

### What Phases 1–2 produced (verify before starting)

| Artifact | Where | Take from it |
|---|---|---|
| WS `lucarne_family/get_rewards` (`history_limit?`, `include_archived?`) | `websocket_api.ws_get_rewards`; response shape in [Phase 1 → get_rewards response](./phase-1-points-backend.md#get_rewards-response) | Copy the `GetRewardsResponse` interface into `src/shared/types.ts` verbatim. |
| Services `grant_points`, `create_reward`, `update_reward`, `archive_reward`, `set_rewards_settings`, `claim_reward`, `cancel_claim`, `approve_claim`, `reject_claim`, `refund_claim` | `rewards.py`; fields in [Phase 2 → Services](./phase-2-rewards-claims-backend.md#services) and Phase 1 Sub-Phase C | Wrap each in `integration-services.ts`. |
| `points` field on `add_task` / `update_task_metadata` (admin-gated; presence of the key triggers the gate) | `task_service.py` | A non-admin client must **omit** the key entirely. |
| Event `lucarne_family_rewards_updated` relayed by `lucarne_family/subscribe` | `websocket_api.LUCARNE_FRONTEND_EVENTS` | The existing relay callback already triggers `scheduleMetadataRefresh`, so no client-side event wiring is needed. |
| `task_metadata.points` in the `get_family` `task_metadata` rows | `ws_get_family` (`SELECT *`) | Coerce with `Number(t.points ?? 0)`. |

If any of these is missing or has a different shape, the backend phases are not done. Stop.

### Existing frontend code this phase touches

Open each symbol before relying on it.

- **`src/shared/family-subscription.ts`.** `subscribeFamilyState(hass, callback)` owns the whole refresh machinery:
  - `doRefreshOnce` calls `get_family` through `hass.connection.sendMessagePromise` and normalizes `rotation_owners`.
  - The 20 s poll (`FAMILY_POLL_INTERVAL_MS`) and the 5 min error backoff.
  - Refresh on `visibilitychange` / `pageshow`.
  - The `lucarne_family/subscribe` relay, whose callback calls `scheduleMetadataRefresh` (1 s debounce, ignores `event_type`).
  - Reconnect handling through the `ready` listener.

  `FamilyState` and `GetFamilyResponse` are declared at the top of this file, not in `types.ts`.
- **`src/shared/integration-services.ts`.** Wrappers such as `addTask` and `updateTaskMetadata` build `serviceData` with the `if (x !== undefined) serviceData.x = …` pattern and call `hass.callService('lucarne_family', …)`; services that return data pass `(…, undefined, true, true)`. Always call through `hass.` (method call, keeps `this`).
- **`src/shared/service-errors.ts`.** `serviceErrorMessage(err, fallback)` is the **only** way to turn a service rejection into text (#128).
- **Popovers** (`add-task-popover.ts`, `edit-task-popover.ts`):
  - **Layout:** fixed `:host`, a `.backdrop`, a `.popover` with `role="dialog" aria-modal="true"`, and a `✕` close with `aria-label="Cancel"`.
  - **Closing:** they fire a bubbling, composed `popover-close`.
  - **Errors:** shown inline through `@state() _error` → `.error-msg`.
  - **Saving:** a `_saving` flag guards against double submit.

  `add-task-popover._provisionalTask` builds the optimistic `RenderableTask`; the edit popover builds one in its save path.
- **`src/cards/lucarne-chores-card.ts`:**
  - Mounts both popovers after `</ha-card>`.
  - `editMatches(real, opt)` is the reconcile predicate for `_optimisticEdits`; it compares a fixed field list.
  - `_onFamilyState` is the reconcile point.
- **New card registration** (#101: read CLAUDE.md "NEVER register the card bundle as an `extra_module_url`" before touching the loader):
  - `src/index.ts` imports each card and editor pair after the `install-reporter` first import.
  - Each card module pushes to `window.customCards`, calls `markBoot('evaluating:<tag>')`, and is decorated with `@customElement`.
  - `src/loader/boot.ts` `CARD_TAGS` is the list of tags the loader claims with a fallback element on bundle failure and heals afterwards; `tests/loader/boot.test.ts` pins it.
- **`src/shared/card-base.ts`.** Cards extend `LucarneCardBase<Config>` and implement `applyConfig()` / `renderContent()`, never `setConfig()` / `render()`. Throw `LucarneConfigError` for bad config. See the chores card's static `getConfigElement`, `getStubConfig`, `getCardSize` and `getGridOptions` for the pattern.
- **`tests/setup/ha-mock.mjs`.** `makeFakeHass(overrides)` records `callService` calls in `calls.callService`, and its `sendMessagePromise` returns `undefined`. Card tests override `connection.sendMessagePromise` to answer by `type`; see `makeFakeHassWithMembers` in `tests/components/lucarne-chores-card.test.ts`.

> **Shortcut warnings for this whole phase:**
> - **No `window.confirm` / `window.alert` / `prompt`.** The kiosk is a WKWebView. Confirmations are an inline second step ("Archive? [Archive] [Keep]") inside the card.
> - **Every mutation is optimistic** (CLAUDE.md "Optimistic UI is mandatory"). A button that waits for the next poll to change the screen is a bug, not an MVP.
> - **Admin detection comes from `rewards.is_admin`**, the `get_rewards` response field. Do not add `hass.user` to the types, and do not read it.

## Structure

```
src/
  shared/
    types.ts                       # update (ALREADY EXISTS): TaskMetadata.points; GetRewardsResponse + RewardsState types
    family-subscription.ts         # update (ALREADY EXISTS): opts {rewards?, rewardsHistory?}; opt-in parallel get_rewards; FamilyState.rewards + rewardsFetchedAt
    integration-services.ts        # update (ALREADY EXISTS): points on AddTaskParams/UpdateTaskMetadataFields; 10 rewards wrappers
    rewards-optimistic.ts          # new: RewardsOverlay — pure apply/reconcile of optimistic rewards overrides
  components/
    add-task-popover.ts            # update (ALREADY EXISTS): isAdmin prop + Points field; points in _provisionalTask
    edit-task-popover.ts           # update (ALREADY EXISTS): isAdmin prop + Points field; points in the optimistic row
    rewards-admin/
      claims-tab.ts                # new: lucarne-rewards-claims-tab
      points-tab.ts                # new: lucarne-rewards-points-tab
      catalog-tab.ts               # new: lucarne-rewards-catalog-tab
      history-tab.ts               # new: lucarne-rewards-history-tab
      settings-tab.ts              # new: lucarne-rewards-settings-tab
  cards/
    lucarne-chores-card.ts         # update (ALREADY EXISTS): subscribe with { rewards: true }; pass isAdmin to popovers; points in editMatches
    lucarne-rewards-admin-card.ts  # new: the card (tabs shell, overlay owner, non-admin read-only notice)
  editors/
    lucarne-rewards-admin-card-editor.ts  # new: title + history_limit
  loader/boot.ts                   # update (ALREADY EXISTS): add 'lucarne-rewards-admin-card' to CARD_TAGS
  index.ts                         # update (ALREADY EXISTS): import the new card + editor
  shared/boot-marks.ts             # update (ALREADY EXISTS): element-count comment
custom_components/lucarne_family/frontend/
  ha-lucarne.js, ha-lucarne-loader.js  # rebuilt + committed
tests/
  shared/family-subscription.test.ts   # update (ALREADY EXISTS): opt-in rewards fetch, no fetch without opt-in, isolation on failure, rewardsFetchedAt
  shared/integration-services.test.ts  # update (ALREADY EXISTS): wrappers + points omission
  shared/rewards-optimistic.test.ts    # new
  components/add-task-popover.test.ts  # update (ALREADY EXISTS): Points field gating
  components/edit-task-popover.test.ts # update (ALREADY EXISTS): Points field gating
  components/lucarne-chores-card.test.ts  # update (ALREADY EXISTS): rewards opt-in, editMatches points
  components/lucarne-rewards-admin-card.test.ts  # new
  loader/boot.test.ts                  # update (ALREADY EXISTS): four tags
  python/test_frontend.py              # update (ALREADY EXISTS): element-count docstrings only, if they cite a number
docs/cards.md                          # update: "## lucarne-rewards-admin-card" section
CLAUDE.md                              # update: "three card tags" / element count; Project overview lists four cards
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] Run the full baseline gate (CLAUDE.md "Both (baseline gate before any commit)", plus `.venv/bin/ruff` and `.venv/bin/mypy`). All must be green.
- [x] If anything fails, fix it and commit separately before proceeding.

### Sub-Phase A: Data layer, service wrappers, points field

Deliverable: subscribers that opt in (the chores card here, the admin card in Sub-Phase B) receive `FamilyState.rewards`, every other subscriber's traffic is unchanged, and admins can set task points from the popovers.

#### Data layer
- [x] `types.ts`: add `points?: number` to `TaskMetadata`. Add `GetRewardsResponse` (copied from Phase 1) and `type RewardsState = GetRewardsResponse`.
- [x] `family-subscription.ts`:
  - `subscribeFamilyState(hass, callback, opts?: { rewards?: boolean; rewardsHistory?: number })`. Compute `wantsRewards = opts?.rewards === true || opts?.rewardsHistory !== undefined` once, when the handle is created.
  - **Opt-in.** When `wantsRewards` is false, `doRefreshOnce` sends **no** `get_rewards` at all (it calls `get_family` exactly as today), `rewards` stays `null` and `rewardsFetchedAt` stays `0`. The other existing callers, `lucarne-today-card.ts` and `lucarne-chores-card-editor.ts` (the Calendar card does not subscribe), call `subscribeFamilyState` without `opts` and must not be edited: they never use rewards, and a `get_rewards` on each of their 20 s polls would be pure load.
  - When `wantsRewards` is true, `doRefreshOnce` fetches `get_rewards` (sending `history_limit: opts.rewardsHistory` and `include_archived: true` only when `rewardsHistory` is set) **in parallel** with `get_family`, using `Promise.allSettled`.
  - A rejected rewards fetch sets `rewards: null` and must not set `integrationError` or block the family state. The integration may be on an older version without the command.
  - Record `rewardsFetchedAt = Date.now()` taken **before** the `get_rewards` request is sent.
  - Keep `rewards` and `rewardsFetchedAt` in closure variables next to `resetTime` / `streakCheckTime`, and include them in the object `emitState()` passes to `callback`. `emitState` also runs on every todo push (`onEntityState` → `refreshTodo(...).then(emitState)`), not only at the end of `doRefreshOnce`, so state set only on the refresh path would vanish on the next push.
  - A rejected `get_family` still takes the existing `catch` path unchanged (it sets `integrationError` and clears the family state); set `rewards = null` there too. Only a rejected `get_rewards` alone is isolated.
  - Normalize `points` with `Number(t.points ?? 0)` in the metadata loop.
- [x] `FamilyState`: add `rewards: RewardsState | null` and `rewardsFetchedAt: number`.

#### Service wrappers
- [x] `integration-services.ts`:
  - Add `points?: number` to `AddTaskParams` and `UpdateTaskMetadataFields`, forwarded only when `!== undefined`.
  - Add wrappers `grantPoints`, `createReward`, `updateReward`, `archiveReward`, `setRewardsSettings`, `claimReward`, `cancelClaim`, `approveClaim`, `rejectClaim`, `refundClaim`, with signatures in [Technical Details → Service wrappers](#service-wrappers). `createReward` and `claimReward` return the service response (`returnResponse = true`).

#### Points field
- [x] `add-task-popover.ts` / `edit-task-popover.ts`: add `@property({ type: Boolean }) isAdmin = false`.
  - When `isAdmin`, render a labelled number input "Points" (min 0, max 1000, step 1, `inputmode="numeric"`, default 0 / the task's current value).
  - Hide it when the target is a plain household task, and show it again if the user switches the type to `rotating`. The server rejects household points anyway; the hiding just avoids a guaranteed error. For the same reason, when an admin switches a household task with points > 0 away from `rotating`, the edit save sends `points: 0`: the server's household rule checks the row's resulting points, so keeping the old value would fail the save.
  - When not admin, render nothing **and send no `points` key**.
  - Validate as an integer 0–1000 before calling the service, showing an inline error.
  - Include `points` in the optimistic `RenderableTask` (`_provisionalTask` / the edit save path).
- [x] `lucarne-chores-card.ts`:
  - Opt in to rewards: change **both** `subscribeFamilyState(this.hass, this._onFamilyState)` calls (in `connectedCallback` and in `updated`) to `subscribeFamilyState(this.hass, this._onFamilyState, { rewards: true })`. Without it `rewards` is always `null` and `isAdmin` below is always false. Opt in unconditionally (Phase 4's `show_rewards: false` hides the kid UI but the popovers still need `is_admin`).
  - Pass `.isAdmin=${this._familyState?.rewards?.is_admin ?? false}` to both popovers.
  - Add `(a.points ?? 0) === (b.points ?? 0)` to `editMatches`.

#### Tests (write first)
- [x] `family-subscription.test.ts`:
  - a subscriber created **without** `opts` sends no `get_rewards` message (record every `sendMessagePromise` `type`) across the initial refresh, a 20 s poll and a relayed `lucarne_family_rewards_updated` refresh, and every emitted state has `rewards: null` and `rewardsFetchedAt: 0`;
  - with `{ rewards: true }`, `get_rewards` is sent alongside `get_family` on every refresh, including the one triggered by a relayed `lucarne_family_rewards_updated` callback, with no `history_limit` or `include_archived` key;
  - `{ rewardsHistory: 50 }` alone (no `rewards` key) also fetches, and adds `history_limit: 50` and `include_archived: true`;
  - a rejecting `get_rewards` yields `rewards: null` with `integrationError: null`;
  - `rewardsFetchedAt` is ≤ the time the response resolved;
  - a state emitted by a later todo push (not a refresh) still carries the same `rewards` and `rewardsFetchedAt`.
- [x] `integration-services.test.ts`:
  - `updateTaskMetadata(hass, uid, { icon: '⭐' })` sends **no** `points` key;
  - `{ points: 0 }` sends `points: 0`;
  - each new wrapper calls the right service with the right payload.
- [x] `add-task-popover.test.ts` / `edit-task-popover.test.ts`:
  - with `isAdmin=false` the field is absent and the recorded service payload has no `points` key;
  - with `isAdmin=true` entering 5 sends `points: 5`;
  - 1001 shows an inline error and makes no service call;
  - the field is hidden for a household chore.
- [x] `lucarne-chores-card.test.ts`:
  - the card sends `get_rewards` (it opted in), and with `get_rewards` answering `is_admin: true` the add-task popover renders the Points field;
  - an optimistic edit that changes only `points` is dropped once a push carries the new points, and is kept while the push still has the old value.

### Sub-Phase B: Admin card shell, Claims and Points tabs

Deliverable: the card registers, shows pending claims with approve/reject, and shows balances with a grant form.

- [x] `rewards-optimistic.ts`: implement `RewardsOverlay` as in [Technical Details → RewardsOverlay](#rewardsoverlay). It is pure: no Lit, no `hass`.
- [x] `lucarne-rewards-admin-card.ts`. Extends `LucarneCardBase<LucarneRewardsAdminCardConfig>`:
  - **Config** (`{type, title?: string, history_limit?: number}`). `applyConfig` throws `LucarneConfigError` if `history_limit` is not an integer 1–500, and defaults it to 200.
  - **Lifecycle.** Subscribe with `subscribeFamilyState(hass, cb, { rewards: true, rewardsHistory: history_limit })` in `connectedCallback`, and unsubscribe in `disconnectedCallback`, the same way the chores card manages its subscription (open it and copy the pattern, including resubscribing when `hass` first arrives).
  - **State.** Hold one `RewardsOverlay`. On every state push call `overlay.reconcile(state.rewardsFetchedAt)` (the one-argument signature in [Technical Details → RewardsOverlay](#rewardsoverlay)), and render `overlay.apply(state.rewards)` whenever `state.rewards` is non-null.
  - **Tabs.** Five, in order: Claims (label shows the pending count, e.g. "Claims 2"), Points, Rewards, History, Settings.
  - **Accessibility.** `role="tablist"`, each tab `role="tab"` with `aria-selected` and `aria-controls`, the panel `role="tabpanel"`; ArrowLeft/ArrowRight move between tabs; each tab is at least 44 px tall.
  - **Non-admin** (`!rewards.is_admin`). Render the same tabs read-only: no mutation controls (no Approve/Reject/Refund/Archive/Edit/Add/Save/Grant buttons, no forms, no editable inputs). The two view-only controls stay, because they change nothing on the server: the History member filter (`<select>`) and the Rewards tab's "Show archived" toggle (a labelled `<input type="checkbox">`, **not** a `<button>`, so the zero-buttons test below holds). Above the tabs show a `role="note"` banner: "You can view rewards, but approving claims and granting points needs a Home Assistant administrator."
  - **Loading and missing data.** `rewards === null` before the first push shows a skeleton line. `rewards === null` after a push whose family state loaded (`members.length > 0`) shows "Rewards need the Lucarne integration to be updated." Keep the wording close to that.
  - **Statics.** `getConfigElement` returns `lucarne-rewards-admin-card-editor`; `getStubConfig` returns `{type: 'custom:lucarne-rewards-admin-card'}`; `getCardSize` returns 6; `getGridOptions` returns `{columns: 12, rows: 'auto', min_columns: 6}`.
  - **Picker entry.** Push to `window.customCards` (`type: 'lucarne-rewards-admin-card'`, `name: 'Lucarne Rewards Admin'`, `description`, `preview: false`) and call `markBoot('evaluating:lucarne-rewards-admin-card')`, both at module scope as the other cards do.
- [x] `claims-tab.ts` (`lucarne-rewards-claims-tab`):
  - Lists pending claims, oldest first. Each row shows the reward name, the contributors with their shares (names and avatars resolved from `members`), the cost and the relative age.
  - Admins get **Approve** / **Reject** buttons. Each calls the wrapper; on success it calls `overlay.resolveClaim(id, status)`, and on failure it shows the inline `role="alert"` error from `serviceErrorMessage`.
  - Each row has its own busy flag that disables both buttons.
  - Empty state: "No claims waiting."
- [x] `points-tab.ts` (`lucarne-rewards-points-tab`):
  - One row per member with avatar, name and balance (negative balances shown as "−3").
  - Admins get a "Grant points" form per member: a number input 1–10000 and a reason input with a 200-character limit and a counter. On success it calls `overlay.addGrant(slug, points)` and clears the form.
  - Client-side validation mirrors the server.
- [x] Register the card:
  - `src/index.ts`: add the card + editor import pair after the chores pair.
  - `src/loader/boot.ts` `CARD_TAGS`: append `'lucarne-rewards-admin-card'`, and update the "three" wording in the comments that mention the count.
  - `tests/loader/boot.test.ts`: update the hard-coded tag list and the "all three card tags" title.
- [x] `lucarne-rewards-admin-card-editor.ts`: fields `title` (text) and `history_limit` (number). Copy the structure of `lucarne-today-card-editor.ts`, including its `declare global` `HTMLElementTagNameMap` entry.

#### Tests
- [x] `rewards-optimistic.test.ts`:
  - `resolveClaim` removes the claim from `apply().claims` until a reconcile with `fetchedAt > appliedAt` (after which the server state, which no longer lists it as pending, is shown as is);
  - a reconcile with an older `fetchedAt` keeps the override;
  - `addGrant` raises `balances[slug]` until a newer fetch, and does **not** double-count after it (the server balance already includes the grant);
  - overrides older than 30 s are dropped on reconcile regardless.
- [x] `lucarne-rewards-admin-card.test.ts`. Use `makeFakeHass` with `sendMessagePromise` answering `get_family` and `get_rewards`:
  - non-admin shows the note, with zero `button`s inside the tab panels;
  - admin: Approve calls `lucarne_family.approve_claim {claim_id}` and the row disappears immediately;
  - a rejecting service shows `role="alert"` text and the row stays;
  - grant updates the balance immediately;
  - the arrow keys move `aria-selected`;
  - `history_limit: 0` → `LucarneConfigError`;
  - `rewards: null` shows the update message.
- [x] `boot.test.ts`: `CARD_TAGS` has four entries and the fallback claims all four.

### Sub-Phase C: Rewards, History and Settings tabs, docs

Deliverable: the full admin feature set, with documentation.

- [x] `catalog-tab.ts` (`lucarne-rewards-catalog-tab`):
  - Lists active rewards with name, cost, a "Shareable" badge when poolable, and the description.
  - Admins get:
    - **Add reward:** an inline form with name (1–60, required), cost (1–100000), description (≤ 500, textarea) and a "Kids can pool points" checkbox.
    - **Edit:** the same form, inline in the row.
    - **Archive:** an inline two-step confirm, "Archive? [Archive] [Keep]".
  - A "Show archived" toggle lists archived rewards greyed, with no actions.
  - Optimistic behaviour:
    - create → `overlay.addReward(reward)`, built from the form values and the `id` that `createReward` returns; the normal `reconcile` rule drops it once a newer fetch (which already contains the real row) arrives;
    - edit → `overlay.editReward(id, fields)`;
    - archive → `overlay.archiveReward(id)`.
- [x] `history-tab.ts` (`lucarne-rewards-history-tab`):
  - Lists `rewards.history` newest first: date and time (in HA's locale, as the existing cards format dates), member, signed delta, and a kind label (earn → the task summary; revoke → "Un-ticked: <summary>"; grant → the reason or "Points granted"; streak_daily → "Streak bonus"; streak_milestone → the reason; claim_reserve → "Claimed <summary>"; claim_release → "Returned: <summary>", where Phase 2 stores the reward name snapshot in the row's `summary`). Also the actor name when present.
  - Rows for claims whose current status (looked up in `rewards.claims` by `claim_id`) is `approved` show **Refund** for admins, with the same inline two-step confirm, then `overlay.resolveClaim(id, 'refunded')`.
  - A member filter (`<select>`, "Everyone" default).
- [x] `settings-tab.ts` (`lucarne-rewards-settings-tab`):
  - "Daily streak bonus" number input (0–1000, 0 = off).
  - A milestones list with days (1–365) and points (1–10000) per row, Add/Remove row buttons, up to 20 rows, and duplicate days flagged inline.
  - Save calls `setRewardsSettings` with both keys, then `overlay.setSettings(settings)`.
  - Non-admins see the values as text.
- [x] Docs:
  - `docs/cards.md`: a `## lucarne-rewards-admin-card` section with the config table (`title`, `history_limit`) and a note to put it on an admin-only dashboard. Hiding the dashboard is for tidiness; the server enforces admin either way.
  - `CLAUDE.md`: replace "three Lit-based Lovelace cards" and the loader's "three card tags" wording with the current count. Recount registered elements with `grep -rc "@customElement(" src | awk -F: '{s+=$2} END {print s}'` and update the "31 elements" mentions in `CLAUDE.md`, `src/shared/boot-marks.ts` and `tests/python/test_frontend.py` (comments and docstrings only) to the new number.
- [x] `npm run build`, then commit both rebuilt `frontend/*.js`.

#### Tests
- [x] `lucarne-rewards-admin-card.test.ts`:
  - **Catalog:** creating a reward shows it at once; name `"  "` shows an inline error with no service call; archive needs the second click; the archived reward appears only under "Show archived".
  - **History:** Refund appears only on approved-claim rows, and calls `refund_claim`.
  - **Settings:** duplicate days block Save; Save sends `streak_milestones` sorted.

### Build Verification (required before marking phase complete)

- [x] `npm run build && npm run test:coverage && npm run lint && npm run typecheck` pass: line ≥ 88, branch ≥ 80, funcs ≥ 73.
- [x] `tests/build/bundle-syntax.test.ts` passes. No regex literal with `\p{…}`, lookbehind or the `v` flag anywhere in the new code (CLAUDE.md pitfall).
- [x] `.venv/bin/pytest tests/python/` passes (`test_frontend.py` must still pin loader-only registration).
- [x] Scan the test output for `[lucarne]` console errors, unhandled rejections and Lit "change-in-update" warnings.
- [x] `git status` shows the two rebuilt `frontend/*.js` files staged.
- [x] Mark the phase `status: done` only after all of the above pass.

### Manual Verification with MCP Tools

> Not run: deploying restarts the live house's HA and needs the user's go-ahead, which an unattended run cannot ask for.

- [ ] Run `./scripts/deploy-integration.sh` and restart HA (ask the user first; this is the live house).
- [ ] Ask the user which dashboard to add the admin card to, or to create a `[test]` admin-only view. Do **not** edit the family's dashboards unasked.
- [ ] `mcp__browsermcp__browser_navigate` to that view, then `browser_screenshot` each of the five tabs as an admin. With a `[test]` reward and a `[test]` claim (README live-house rule), check that Approve/Reject and Grant change the screen immediately.
- [ ] `window.__lucarneBoot.registered` includes `lucarne-rewards-admin-card` and `error` is null. Browser MCP has no JavaScript-evaluate tool, so ask the user to run `JSON.stringify(window.__lucarneBoot)` in the dashboard's browser console and paste the result.
- [ ] Ask the user to open the same view as their non-admin kiosk user and confirm the read-only note. You cannot log in as another user.
- [ ] Clean up the test data.

## Technical Details

### Service wrappers

```typescript
export function grantPoints(hass: HomeAssistant, member: string, points: number, reason?: string): Promise<void>;
export function createReward(hass: HomeAssistant, f: { name: string; cost: number; description?: string; poolable?: boolean }): Promise<{ id: number }>;
export function updateReward(hass: HomeAssistant, rewardId: number, f: Partial<{ name: string; cost: number; description: string; poolable: boolean }>): Promise<void>;
export function archiveReward(hass: HomeAssistant, rewardId: number): Promise<void>;
export function setRewardsSettings(hass: HomeAssistant, s: { streak_daily_bonus?: number; streak_milestones?: Array<{ days: number; points: number }> }): Promise<void>;
export function claimReward(hass: HomeAssistant, member: string, rewardId: number, poolWith?: string[]): Promise<{ claim_id: number; shares: Record<string, number> }>;
export function cancelClaim(hass: HomeAssistant, claimId: number): Promise<void>;
export function approveClaim(hass: HomeAssistant, claimId: number): Promise<void>;
export function rejectClaim(hass: HomeAssistant, claimId: number): Promise<void>;
export function refundClaim(hass: HomeAssistant, claimId: number): Promise<void>;
```

The wire field names are snake_case (`reward_id`, `claim_id`, `pool_with`), exactly as in Phase 2's Services table.

### RewardsOverlay

All rewards optimism goes through one object, so a single reconcile rule covers every mutation. Phase 4's chores card uses the same class.

```typescript
// src/shared/rewards-optimistic.ts
type Override =
  | { kind: 'resolveClaim'; claimId: number; status: 'approved'|'rejected'|'cancelled'|'refunded'; appliedAt: number }
  | { kind: 'addClaim'; claim: RewardsState['claims'][number]; appliedAt: number }   // Phase 4
  | { kind: 'grant'; member: string; points: number; appliedAt: number }
  | { kind: 'addReward'; reward: RewardsState['rewards'][number]; appliedAt: number }
  | { kind: 'editReward'; id: number; fields: Partial<RewardsState['rewards'][number]>; appliedAt: number }
  | { kind: 'archiveReward'; id: number; appliedAt: number }
  | { kind: 'settings'; settings: RewardsState['settings']; appliedAt: number };

export class RewardsOverlay {
  constructor(now: () => number = Date.now) {}
  resolveClaim(claimId: number, status: …): void;  addClaim(claim): void;  addGrant(member: string, points: number): void;
  addReward(r): void;  editReward(id, fields): void;  archiveReward(id): void;  setSettings(s): void;
  /** Drop every override whose appliedAt < fetchedAt (that fetch was sent after the mutation
   *  succeeded, so the server state already includes it), plus any override older than 30 s. */
  reconcile(fetchedAt: number): void;
  /** Server state with the surviving overrides applied. Pure; never mutates `server`. */
  apply(server: RewardsState): RewardsState;
}
```

Effects in `apply`:
- **`resolveClaim`** removes the claim from the pending list. For `rejected`, `cancelled` and `refunded` it also adds each contributor's `share` back to `balances`.
- **`addClaim`** prepends the claim and subtracts each contributor's share.
- **`grant`** adds the points to the balance.
- **`addReward` / `editReward` / `archiveReward` / `settings`** patch the corresponding lists.

Overrides are recorded **only after the service call resolves** (the confirm-then-apply rule for add/edit/delete in `docs/architecture.md` "## Optimistic UI"). `appliedAt = now()` at that moment.

The overlay is a plain class, not Lit reactive state: recording an override does not re-render anything. Every overlay mutation must be followed by a `requestUpdate()` on the card that owns it, because the card is what computes `overlay.apply(...)` and passes the result down. When a tab makes the call, it also has to tell the card, for example with a bubbling `rewards-overlay-changed` event that the card handles with `requestUpdate()`. Phase 4's chores card has the same rule, including after `tickDelta`. The "row disappears immediately" and "grant updates the balance immediately" tests fail without this.

## Constraints

- No `hass.user`; admin detection uses `rewards.is_admin` only.
- No native dialogs.
- The `points` key is omitted for non-admins.
- The bundle stays a single file. The new card is imported from `src/index.ts`, its tag is added to `CARD_TAGS`, and it is never registered with HA separately.
- Cards implement `applyConfig` / `renderContent`, never `setConfig` / `render`.
- Tests use `node:test`, never vitest.
- Both built artifacts are rebuilt and committed.
