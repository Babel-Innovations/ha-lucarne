---
status: done
---

# Phase 4: Chores card rewrite

Replace `lucarne-chores-card` and its editor in-place with the new integration-driven version. Per-member columns showing today's routines + today's tasks. "+ Add task" popover wired to `lucarne_family.add_task`. Long-press to edit/delete. Member picker in the editor populated from the integration. Breaking config change (pre-1.0 — clean break).

By end of phase: a user with the integration installed + 2 members configured can drop the card on a dashboard, pick which members to show, and use it. Adding a task happens entirely in the card — no Settings → Helpers trip.

## Context

The current `lucarne-chores-card` reads from per-card `kids: [...]` config and hardcoded `input_boolean` entities. This phase rewrites it to subscribe to the integration's per-member `todo.<slug>` entities and call integration services for mutations.

Phase 3 fires both `lucarne_family_all_routines_done` and the legacy `ha_lucarne_chores_all_done` during v0.x. The rewritten card emits no completion events of its own; it is a view over integration state and listens to the integration events.

Read [./README.md](./README.md) for overall feature context. Read existing popover pattern at `src/components/create-event-popover.ts` and `src/components/calendar-event-popover.ts` before starting Sub-Phase D.

## Structure

```
src/
  cards/
    lucarne-chores-card.ts                 # rewrite
  editors/
    lucarne-chores-card-editor.ts          # rewrite
  components/
    kid-column.ts                          # rewrite (rename to member-column.ts)
    chore-row.ts                           # rewrite (rename to task-row.ts)
    streak-display.ts                      # update: read from new counter id pattern
    celebration-overlay.ts                 # keep
    kid-avatar.ts                          # rewrite (rename to member-avatar.ts; support emoji or image)
    add-task-popover.ts                    # new
    edit-task-popover.ts                   # new
    member-picker.ts                       # new: reusable in editor
  shared/
    types.ts                               # update: MemberConfig, TaskConfig, TaskType, TaskSource types
    chore-helpers.ts                       # rewrite (rename to task-helpers.ts)
    family-subscription.ts                 # new: subscribes to integration's per-member state
    integration-services.ts                # new: typed wrappers around lucarne_family.* service calls
tests/
  components/
    lucarne-chores-card.test.ts            # rewrite (was placeholder from Phase 0)
    lucarne-chores-card-editor.test.ts     # new
    member-column.test.ts                  # new
    member-avatar.test.ts                  # new
    task-row.test.ts                       # new
    add-task-popover.test.ts               # new
    edit-task-popover.test.ts              # new
    member-picker.test.ts                  # new
  shared/
    task-helpers.test.ts                   # rewrite (was chore-helpers.test.ts)
    family-subscription.test.ts            # new
    integration-services.test.ts           # new
    recurrence.test.ts                     # new (TS-side RRULE round-trip)
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline verification (before starting)

- [ ] On real HA: integration installed, 2-3 members with todo entities and counter entities
- [ ] At least 5 tasks total spread across members (mix of routines and chores)
- [ ] `pytest tests/python` Phase 3 green
- [ ] `npm test && npm run lint && npm run typecheck && npm run build` baseline green

### Sub-Phase A: Type updates and removal of old types

#### `src/shared/types.ts`
- [ ] Remove the existing `KidConfig` interface (will fail typecheck across the repo — that's intentional; we'll fix each usage)
- [ ] Add new interfaces:
  ```ts
  export type TaskType = 'routine' | 'chore';
  export type TaskSource = 'manual' | 'template' | 'apple';
  export interface MemberSummary {
    slug: string;
    name: string;
    color: string;
    avatar: string | null;            // emoji or /local/lucarne/avatars/<slug>.<ext>
    todo_entity_id: string;
    streak_counter_id: string;        // empty string for synthetic household
  }
  export interface TaskMetadata {
    item_uid: string;
    member_slug: string;
    assignee_slug: string;              // only meaningful for household tasks
    type: TaskType;
    recurrence: string;                // RRULE
    icon: string;
    source: TaskSource;
  }
  export interface RenderableTask {
    uid: string;
    summary: string;
    status: 'needs_action' | 'completed';
    due: string | null;
    description: string;
    metadata: TaskMetadata;
  }
  ```
- [ ] Run `npm run typecheck` — expect failures across cards/editors that referenced `KidConfig`. Fix each by either: removing dead code or adapting to the new types. Document each non-trivial fix in a code review note.

### Sub-Phase B: Integration data plumbing

#### `src/shared/family-subscription.ts`
- [ ] Function `subscribeFamilyState(hass, callback): UnsubscribeFunction`:
  - Calls `hass.callWS({type: "lucarne_family/get_family"})` to fetch members + their task metadata + reset_time/streak_check_time. Response shape is locked in Phase 2 Sub-Phase D's "Response shape contract" — re-read that before writing the TS types.
  - Reuses **`subscribeEntityState`** and **`subscribeTodoItems`** from existing `src/shared/ha-subscriptions.ts` (both already exported; do not reimplement). Use `subscribeTodoItems` for `todo.<slug>` and `todo.lucarne_household`; use `subscribeEntityState` for `counter.<slug>_streak`.
  - Synthesize a `MemberSummary` for the special card config slug `"household"` even though it is not stored as a real family member: `{slug: "household", name: "Household", color: "var(--primary-color)", avatar: null, todo_entity_id: "todo.lucarne_household", streak_counter_id: ""}`. It has no avatar image and no streak subscription; `show_streak` is ignored for this synthetic member.
  - **Skip members whose `todo_entity_id` is empty string** — in race conditions during Phase 2 entity creation, the integration may report a member before its entities exist. Log a debug warning and exclude that member from the rendered set rather than crashing the card.
  - Computes `RenderableTask[]` per member by joining todo items with metadata from initial fetch.
  - If a todo item has no matching metadata row, still include it with synthesized fallback metadata: `{item_uid: uid, member_slug: <member slug or "household">, assignee_slug: "", type: "chore", recurrence: "", icon: "", source: "manual"}`. This covers bridge-synced items without `[apple:...]` sentinels and any pre-existing todo items. Do not drop or crash on orphan todo items; render them with default styling.
  - Mutation ownership is resolved from the task's metadata, not from the rendered column alone: `metadata.member_slug == "household"` means `todo.lucarne_household`; otherwise resolve the owning real member's `todo_entity_id`. New household tasks use the synthetic member's `todo_entity_id`, and optional `assignee` stays metadata-only.
  - Calls `callback(familyState)` on every change with the merged state.
- [ ] The WebSocket command `lucarne_family/get_family` is registered in Phase 2 (Sub-Phase D). Before starting Phase 4, verify it returns the expected shape via the WS playground (Developer Tools → Services has no "Call WS" surface; use the browser DevTools console: `await window.hassConnection.then(c => c.conn.sendMessagePromise({type: "lucarne_family/get_family"}))`). If the command is missing or stubbed, complete that Phase 2 sub-task first — do NOT inline it into Phase 4.
- [ ] Also subscribe to the HA event bus for `lucarne_family_task_added`, `lucarne_family_task_completed`, `lucarne_family_task_deleted`, `lucarne_family_task_metadata_updated`, `lucarne_family_task_toggled`, and `lucarne_family_all_routines_done` (via `hass.connection.subscribeEvents`) and refresh the task metadata cache (re-call `get_family`) when any task-metadata event fires. Debounce to ≤ 1 call/sec so a bulk operation doesn't storm the WS.

#### `src/shared/integration-services.ts`
- [ ] Typed wrappers:
  ```ts
  export async function addTask(hass, params: AddTaskParams): Promise<void>
  export async function updateTaskMetadata(hass, uid: string, fields: Partial<TaskMetadata> & {assignee?: string}): Promise<void>
  export async function deleteTask(hass, uid: string): Promise<void>
  export async function uploadAvatar(hass, memberSlug: string, file: File): Promise<void>
  ```
- [ ] Each calls `hass.callService('lucarne_family', '<action>', payload)`
- [ ] `AddTaskParams` includes the public service fields exactly: `member`, `summary`, `type`, `recurrence`, `icon`, `due`, `source`, and optional `assignee` for household tasks. Do not send `assignee_slug` from the browser; that is the storage key.
- [ ] `uploadAvatar` converts File → base64 `image_data` + `mime_type` in browser before sending. The service payload field name is `mime_type` exactly; do not send `mime`.

#### Tests
- [ ] `tests/shared/family-subscription.test.ts`: fake hass; subscribe → callback fires with merged state; state change on a managed entity → callback fires again; todo items without metadata are included with fallback chore metadata; unsubscribe works
- [ ] `tests/shared/integration-services.test.ts`: each wrapper calls `callService` with correct domain/service/payload

### Sub-Phase C: Member column + task row + avatar

#### `member-avatar.ts` (rewrite of `kid-avatar.ts`)
- [ ] Render rules:
  - If `avatar` is `null` or empty: render colored initial circle (current behavior)
  - If `avatar` is exactly one emoji (regex `/^\p{Emoji}+$/u`): render the emoji in a circle background of `color`
  - If `avatar` starts with `/local/`: render `<img src=avatar>` (HA serves these paths)
- [ ] Accessibility: `aria-label="<name>'s avatar"`
- [ ] Tests in `tests/components/member-avatar.test.ts`: cover all three render paths

#### `task-row.ts` (rewrite of `chore-row.ts`)
- [ ] Props: `task: RenderableTask`, `memberColor: string`
- [ ] Render:
  - Leading: icon (from `metadata.icon`) or fallback to checkmark icon
  - Middle: `summary`
  - Trailing: due time if `due` is set
  - Status visual: strikethrough + dimmed when `status == 'completed'`
- [ ] Tap → fires `task-toggle` event (parent decides whether to call `todo.update_item`)
- [ ] Long-press (500ms) → fires `task-long-press` event (parent opens edit popover)
- [ ] Touch target: full row, ≥ 44px height for iPad
- [ ] Tests in `tests/components/task-row.test.ts`: render variants, tap fires event, long-press fires event after 500ms threshold

#### `member-column.ts` (rewrite of `kid-column.ts`)
- [ ] Props: `member: MemberSummary`, `tasks: RenderableTask[]`, `streak: number`, `showRoutines: boolean`, `showTasks: boolean`, `showStreak: boolean`
- [ ] Filter tasks by type into two sections (only render section header if showRoutines/showTasks is true and section has items)
- [ ] Sort routines by recurrence order ("morning first") — or alphabetical if no recurrence ordering
- [ ] Sort chores by due date ascending; undated last
- [ ] Header: avatar + name + "+ Add task" button (fires `add-task-clicked` event with `member.slug` as detail)
- [ ] Footer: streak (only if showStreak)
- [ ] Celebration overlay still triggered when all routines flip to complete
- [ ] Tests: render with various task mixes; "+ Add task" event fires; long-press from inner row bubbles up

### Sub-Phase D: Add Task + Edit Task popovers

Reuse the overlay pattern from `create-event-popover.ts` (fixed inset 0, backdrop dismissal, centered popover with max-width 480px).

#### `add-task-popover.ts`
- [ ] Props: `hass`, `member: MemberSummary` (pre-selected, but user can change), `members: MemberSummary[]` (for the dropdown)
- [ ] Fields:
  - Member (dropdown, default = current member)
  - Assignee (dropdown, only shown when Member = Household; optional)
  - Summary (text, required, max 200 chars)
  - Type (radio: Routine / Chore)
  - Icon (emoji input with quick-pick of common emojis: 🪥 🛏️ 🎒 💗 📵 🧸 👕 🧹 🧺 🍽️ 🐕 🌱 — plus free emoji input)
  - Recurrence (friendly picker; details below)
  - Due (date+time selector, only if type=Chore)
- [ ] Recurrence picker:
  - Mode dropdown: None / Daily / Weekly / Monthly / Yearly
  - Daily: no extra fields
  - Weekly: multi-select days of week (Mon-Sun) + interval (every N weeks)
  - Monthly: choice "Day N of month" + interval, OR "Nth weekday of month" + interval
  - Yearly: choice "Specific date" + interval (e.g. "every 1 year" = annually; "every 2 years" = biennially)
  - Always builds an RRULE string under the hood; show the friendly summary next to the picker for confirmation
- [ ] Submit: calls `integration-services.addTask`; closes popover on success; shows inline error on failure
- [ ] Dismiss: ESC, backdrop click, Cancel button
- [ ] Tests: each recurrence mode produces correct RRULE; submit calls correct service; validation errors display
- [ ] Tests: household task with an assignee sends `{member: "household", assignee: "<slug>"}`; non-household task omits `assignee`

#### `edit-task-popover.ts`
- [ ] Props: `hass`, `task: RenderableTask`, `members: MemberSummary[]`
- [ ] Same fields as add, prefilled
- [ ] Buttons: Save, Delete (calls `deleteTask` after confirmation), Cancel
- [ ] Save behavior: split fields by owner. For standard HA `TodoItem` fields (`summary`, `due`, `status`, `description`), call `todo.update_item` on the owning todo entity. For integration metadata fields (`type`, `recurrence`, `icon`, and household `assignee`), call `updateTaskMetadata`. If both calls are needed and one fails, show an inline error and re-fetch family state rather than trying to locally roll back.
- [ ] Member field NOT editable in v1 (would require moving the item between todo entities — defer to a future feature). Show as read-only with explanatory tooltip.
- [ ] Tests: prefill correct, save calls `todo.update_item` for summary/due changes, save calls `updateTaskMetadata` for metadata changes, household assignee edit calls `updateTaskMetadata`, delete confirmation works

#### Recurrence helper (TS side)
- [ ] `src/shared/recurrence.ts` — `buildRRule(mode, opts): string` and `parseRRule(rrule): {mode, opts}` for round-trip
- [ ] **Support EXACTLY the six rows locked in Phase 2's "Supported RRULE pattern contract" table: one-off plus five recurring modes** (see `phase-2-task-model.md` Sub-Phase A → `recurrence.py` section). Re-read that table before writing this file; the TS and Python sides MUST accept and produce identical RRULE strings byte-for-byte for the same picker inputs.
- [ ] Reject (don't silently accept) any RRULE outside the contract. If `parseRRule` is handed a string it doesn't recognize, return `{mode: 'unknown', raw: rrule}` so the edit popover can show a read-only "Custom recurrence (not editable here)" label instead of corrupting the rule on save.
- [ ] Implementation choice: hand-roll for the six supported rows. Do NOT add `rrule.js` (~30KB) — bundle budget in this phase is ≤ +20KB total, and we only need string build/parse for a fixed pattern set, not generic iCal evaluation.
- [ ] Tests in `tests/shared/recurrence.test.ts`: every supported pattern from the contract table round-trips (`buildRRule(parseRRule(s)) === s` and vice versa for every example in the table); unknown pattern returns `mode: 'unknown'`.

### Sub-Phase E: Card + editor rewrite

#### `lucarne-chores-card.ts` (rewrite)
- [ ] New config schema (in `setConfig`):
  ```ts
  interface LucarneChoresCardConfig {
    type: 'custom:lucarne-chores-card';
    title?: string;
    members: string[];                // array of real member slugs, plus optional synthetic "household"
    show_routines?: boolean;          // default true
    show_tasks?: boolean;             // default true
    show_streak?: boolean;            // default true
  }
  ```
- [ ] `setConfig` validation:
  - `members` required, non-empty array
  - Each slug must be a string (existence check happens at render time — show error block if a configured slug isn't in the integration's member list)
- [ ] On first `hass` setter: call `subscribeFamilyState`, store unsubscribe
- [ ] On disconnect: unsubscribe
- [ ] Render:
  - If integration not installed: prominent error block "Lucarne Family integration not set up. Install it in Settings → Devices & Services." (link to a docs anchor)
  - Else: grid of member columns, only for configured slugs. `"household"` resolves to the synthetic `MemberSummary` from `family-subscription.ts`, not to a stored integration member.
  - Per-column: pass `RenderableTask[]` filtered to today's items (routines always; chores where `due` is today or overdue). For the special `household` column, render tasks from `todo.lucarne_household`; if a household task has `assignee_slug`, show the assignee name as secondary text but keep the task in the household column.
- [ ] Handle `add-task-clicked` events from columns → open `add-task-popover`
- [ ] Handle `task-toggle` events → call `todo.update_item` via WebSocket
- [ ] Handle `task-long-press` events → open `edit-task-popover`
- [ ] Keep the celebration overlay flow (now triggered by the `lucarne_family_all_routines_done` HA event, subscribed via `hass.connection.subscribeEvents`)

#### `lucarne-chores-card-editor.ts` (rewrite)
- [ ] Use `subscribeFamilyState` (or a one-shot fetch) to get the list of members for the multi-select picker
- [ ] Member picker UI: a list of checkboxes (one per member from the integration), plus a checkbox for "Household tasks"
- [ ] Visual editor sections:
  - General: title field
  - Members: multi-checkbox list
  - Display: 3 toggles (show_routines, show_tasks, show_streak)
- [ ] If integration not installed: render a placeholder "Install the Lucarne Family integration first" with a link
- [ ] Tests: editor fires `config-changed` correctly for each field

### Sub-Phase F: Old config error path + card-level integration tests

Users with the old `lucarne-chores-card` YAML (`kids: [...]`) will hit `setConfig`. The card should:
- [ ] Detect old config shape (presence of `kids` key, absence of `members` key)
- [ ] Render an error block: "This card was upgraded. Install the Lucarne Family integration and update your YAML — see [migration notes URL]"
- [ ] Don't throw — render gracefully so the dashboard doesn't crash

#### Tests

Add card-level integration tests to `tests/components/lucarne-chores-card.test.ts` covering the whole card surface (per-component tests live inline under each Sub-Phase B–E above):

- [ ] Empty members config → `setConfig` throws
- [ ] Valid config, integration installed → renders columns for configured members only
- [ ] Integration not installed → renders error block with link
- [ ] Old `kids` config → renders upgrade message, doesn't crash
- [ ] State change on a managed entity → card re-renders
- [ ] Visual regression is NOT in CI (per Phase 0 decision); implementer manually verifies on the iPad-landscape breakpoint using browser MCP and attaches screenshots to the PR

### Documentation (end of phase)

- [ ] `README.md` — rewrite the `lucarne-chores-card` Configuration section with the new schema
- [ ] `docs/integration.md` — add "Card usage" section showing the YAML
- [ ] `docs/architecture.md` — update the card subscription model section (now uses `subscribeFamilyState` instead of raw `hass.states` reads)

### Build verification

- [ ] `npm run lint`, `npm run typecheck`, `npm run build` — green; bundle size delta acceptable (< +20KB)
- [ ] `npm test` — all card tests pass
- [ ] `pytest tests/python` — unchanged
- [ ] Bundle deployed via `scripts/deploy.sh` to ha-vm
- [ ] On the wall iPad (or browser at iPad-landscape breakpoint via browser MCP):
  - Card renders for configured members
  - "+ Add task" opens popover; submit creates the task and column updates without manual reload
  - Tap a task → status flips
  - Long-press a task → edit popover opens prefilled
  - Recurrence picker produces correct RRULE for at least: daily, weekly Mon/Wed/Fri, monthly first Sat, every 6 months
  - Celebration overlay fires when all of a member's routines complete
- [ ] HA logs clean
- [ ] Mark phase `status: done`

### Manual verification with MCP tools

- [ ] Browser MCP: navigate to dashboard with the card, screenshot before/after each major flow (open popover, submit, tap, long-press)
- [ ] `mcp__home-assistant__ha_get_state` for managed entities — confirm card mutations propagated to HA state
- [ ] `mcp__home-assistant__ha_call_service` for `lucarne_family.add_task` directly — verify card auto-updates within 1-2 seconds (subscription correctness)

## Technical Details

### Why long-press for edit instead of swipe or 3-dot menu

- Swipe gestures conflict with horizontal swipe used by the calendar card on iPad
- 3-dot menu adds visual clutter
- Long-press is intuitive on touch (matches iOS/Android list-item edit patterns)
- Threshold 500ms is the standard

### Why visual regression isn't in CI

Per Phase 0 decision: visual diffs are noisy across HA versions and theme tweaks. Manual MCP browser verification per phase replaces them. The implementer is expected to screenshot and review each phase visually.

### Bundle size constraint

The current bundle is ~189KB unminified. Adding `rrule.js` (~30KB) would push it noticeably. Measure first; if hand-rolled RRULE building for the 5 supported modes is straightforward, prefer that. The TS side only needs to build RRULEs from the friendly picker — parsing them back is rarer.

### Why old config gets an error block, not silent migration

The data model changed too much for safe silent migration: members in old config were children only with manually-curated entity IDs; in new model they're integration-owned with auto-generated entity IDs. A migration would have to guess. Better to fail clearly and direct the user to setup.

## Constraints

- **Breaking config change.** Old `kids:` configs render a friendly error block, don't crash.
- **Integration is a hard prerequisite.** Card renders an error if integration not installed.
- **Member entity-id is not user-editable** from the card editor — only display name + show toggles.
- **Bundle size delta ≤ +20KB** unminified. Measure before/after.
- **iPad landscape (1080×810 @ 200% zoom)** is the primary visual target.
- **Card must remain in single bundle `dist/ha-lucarne.js`** — no code splitting.

## Shortcut-resistance notes for LLM implementer

- **Don't hand-roll the WebSocket subscription pattern.** Reuse `subscribeEntityState` from `src/shared/ha-subscriptions.ts`.
- **Don't poll for integration state.** Subscribe to state changes + the `lucarne_family_*` events.
- **Don't import `rrule.js` without measuring bundle delta first.** Hand-roll for the six supported rows if smaller.
- **Don't conflate `members` array of slugs with `MemberSummary[]`** in code. Slug strings come from config; full data comes from the integration.
- **Don't forget the synthetic "household" member** — it resolves to `todo.lucarne_household`, has no streak counter, and only renders chores.
- **Don't break the existing `create-event-popover.ts` overlay pattern** when building new popovers. Match its CSS structure exactly so iPad behavior is consistent.
- **Don't forget unsubscribe on disconnect.** Lit's `disconnectedCallback` is where this lives.
