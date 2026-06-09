---
status: done
---

# Phase 3: Rotating tasks — frontend

This phase surfaces rotating tasks in the cards: a **"Rotating" type** in the add-task popover with an **ordered, reorderable owners picker**, owner editing in the edit popover, and **chores-card routing** that displays a rotating task in its current owner's column with a rotation icon (↻) and a "next: \<name\>" hint. After this phase the feature from issue #57 is fully usable end-to-end.

## Context

This phase depends on **Phase 2** (the backend must accept `type: "rotating"`, the `rotation_owners`/`current_owner` columns, and surface them via the WebSocket `get_family` payload). Do not start until Phase 2 is `status: done`.

Key existing facts (verified) to build on:

- **WebSocket** (`websocket_api.py`) returns `task_metadata` rows verbatim (`async_get_all_task_metadata`), so `rotation_owners` (a JSON **string**) and `current_owner` arrive raw on the wire. The family subscription layer must parse `rotation_owners` into `string[]`.
- **Subscription shape** (`src/shared/family-subscription.ts`): there is **no** per-row "mapping" transform — `refreshMetadata` stores each `task_metadata` row **verbatim** into `metadataByUid` in the loop at **lines ~120–123** (`metaMap.set(t.item_uid, t)`). That map is later attached to tasks unchanged by `buildRenderableTasks` (lines ~48–74). So the single place to convert `rotation_owners` from the wire `string` into `string[]` is **that ingest loop** (`for (const t of resp.task_metadata ?? [])`): clone the row and overwrite `rotation_owners` with the parsed array before `metaMap.set`. Because `TaskMetadata.rotation_owners` is typed `string[]` (below) but the wire sends a `string`, parsing here is also what keeps the type honest — do not declare it `string` to dodge the parse.
- **`tasksByMember` is keyed by which todo entity a task lives in, NOT by `current_owner`.** `emitState` (lines ~92–101) builds each member's list from that member's todo entity items, and puts **all** `todo.lucarne_household` items — including rotating tasks (whose `member_slug` is `household`) — into `tasksByMember.get('household')`. Consequence for the card: a rotating task **never** appears in `tasksByMember.get(<owner-slug>)`; it only appears in the `household` bucket. The card-side routing (Sub-Phase B) must therefore pull rotating tasks **out of the household bucket** and inject them into the owner's column — filtering a regular member's own `tasksByMember.get(slug)` for rotating tasks would be a silent no-op.
- **Shared types** (`src/shared/types.ts`): `TaskMetadata` (lines ~38–47) lacks rotation fields; `TaskType` must gain `'rotating'`.
- **Add popover** (`src/components/add-task-popover.ts`): has a type selector that gates the recurrence UI; submits `add_task`.
- **Edit popover** (`src/components/edit-task-popover.ts`): `_prefill` populates state from a task; save calls `update_task_metadata`. Hides/shows recurrence by type.
- **Chores card** (`src/cards/lucarne-chores-card.ts`): `_resolveMembers` (lines ~296–341) builds each member's column from `tasksByMember.get(slug)` and runs a `.filter()` (lines ~319–330) with explicit `if (type === 'routine')` / `if (type === 'chore')` branches and a final **`return false`** — any type that is not `routine` or `chore` is **dropped**. So adding `rotating` requires a new branch in this filter; otherwise rotating tasks vanish even after you route them. `_handleTaskToggle` (lines ~343–366) routes a toggle to `todo.lucarne_household` when `member_slug === 'household'` — this already works for rotating tasks (no change needed there).

Read [./README.md](./README.md) for the rotating-task concept and rotation-order math (the "next" hint reuses the same math).

## Structure

```
src/shared/
  types.ts                   # update: TaskType += 'rotating'; TaskMetadata += rotation_owners?: string[], current_owner?: string
  integration-services.ts    # update: AddTaskParams/addTask + UpdateTaskMetadataFields/updateTaskMetadata carry rotation_owners + current_owner
  family-subscription.ts     # update: parse rotation_owners JSON string -> string[] when mapping task_metadata
  rotation.ts                # new (or extend recurrence-adjacent shared): nextOwner() mirror for the "next" hint
src/components/
  add-task-popover.ts        # update: 'Rotating' type option; owners picker (multi-select + reorder); hide recurrence/due
  edit-task-popover.ts       # update: owners editor for rotating; hide recurrence; prefill from metadata
  member-column.ts / task-row.ts  # update: render ↻ badge + "next: <name>" hint for rotating tasks
src/cards/
  lucarne-chores-card.ts     # update: route household rotating tasks into current_owner's column; exclude from household column
tests/
  components/add-task-popover.test.ts   # update: rotating type + owners picker behavior
  components/edit-task-popover.test.ts   # update: rotating prefill + reorder + recurrence hidden
  cards/lucarne-chores-card.test.ts      # update: routing into current_owner column + badge/next hint
  shared/rotation.test.ts                # new: nextOwner() mirror
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] `npm run test:coverage && npm run lint && npm run typecheck && npm run build` — all green
- [x] `pytest tests/python/` — green (Phase 2 already merged)
- [x] If anything fails, fix and commit separately before proceeding

### Sub-Phase A: Shared types, subscription parsing & create/edit UI

Deliverable: a parent can create a rotating task (pick ordered owners, ≥2) from the add-task popover and edit its owners/order later; recurrence controls are hidden for rotating.

#### Shared types & subscription

- [x] `src/shared/types.ts`: add `'rotating'` to `TaskType`; add `rotation_owners?: string[]` and `current_owner?: string` to `TaskMetadata`.
- [x] `src/shared/integration-services.ts`: extend `AddTaskParams` with `rotation_owners?: string[]` and `current_owner?: string`, and forward them in `addTask` (only when defined). Likewise extend `UpdateTaskMetadataFields` and `updateTaskMetadata` with `rotation_owners?: string[]` and `current_owner?: string`. The popovers call these helpers — they do **not** call `hass.callService` directly — so the rotation fields cannot reach the backend until the helpers carry them.
- [x] `src/shared/family-subscription.ts`: in `refreshMetadata`'s ingest loop (`for (const t of resp.task_metadata ?? [])`, lines ~120–123 — the **single** point where rows enter `metadataByUid`), parse `rotation_owners`. The wire value is a JSON **string**; produce `string[]` via `JSON.parse`, defaulting to `[]` on empty/malformed (wrap in try/catch). Store a cloned row, e.g. `metaMap.set(t.item_uid, { ...t, rotation_owners: parsed })`; `current_owner` passes through unchanged. There is no separate "mapping" transform elsewhere — rows are otherwise stored verbatim and attached unchanged by `buildRenderableTasks`, so this loop is where the `string → string[]` conversion must happen to match the `TaskMetadata` type below.
- [x] `src/shared/rotation.ts`: add `nextOwner(owners: string[], current: string, knownSlugs: Set<string>): string | null` — mirror of the Python `next_owner` (sanitize → wrap). Used only for the "next" hint; the backend remains authoritative for actual advancement.

#### Add popover

- [x] Add a **"Rotating"** option to the type selector (Routine / Chore / Rotating).
- [x] When type is `rotating`: **hide recurrence and due-date controls**, default `time_of_day` to `anytime` (still editable), and show an **owners picker**.
- [x] Owners picker: a list of family members (exclude household) with a checkbox/toggle to include each as an owner, and **reorder controls** (up/down buttons or drag) that set turn order. Show the order numerically (1, 2, 3…).
- [x] Validation: disable submit until **≥2 owners** are selected; show a hint explaining the minimum.
- [x] On submit for rotating: call the `addTask` helper with `member: 'household'`, `type: 'rotating'`, `summary`, `icon`, `time_of_day`, `rotation_owners: [<ordered slugs>]` (omit recurrence). `current_owner` is left to the backend default (first owner). Requires the `AddTaskParams`/`addTask` extension above.
- [x] Ensure the Phase 1 "Also add to" routine checklist does **not** appear for the rotating type.

#### Edit popover

- [x] `_prefill`: when editing a rotating task, populate the owners picker from `metadata.rotation_owners` (ordered) and hide recurrence controls.
- [x] Allow add/remove/reorder of owners; keep ≥1 owner (removing the last owner is not allowed from the editor — direct them to delete the task instead).
- [x] On save: call the `updateTaskMetadata` helper with `rotation_owners` (and `current_owner` only if the current owner was removed — otherwise leave the backend's pointer alone). Do not send `recurrence` for rotating. Requires the `UpdateTaskMetadataFields`/`updateTaskMetadata` extension above.

#### Tests (Sub-Phase A)

- [x] `shared/rotation.test.ts`: `nextOwner` matches the Python cases (cycle, skip removed, current-removed→first, single owner, empty→null).
- [x] `family-subscription` parses `rotation_owners` JSON string → `string[]`; malformed → `[]`.
- [x] Add popover: selecting `rotating` hides recurrence/due and shows the owners picker; submit is disabled with <2 owners; submitting issues one `add_task` with `member: 'household'`, `type: 'rotating'`, ordered `rotation_owners`, and no recurrence; reorder changes the emitted order.
- [x] Add popover: the routine "Also add to" checklist is not shown for rotating.
- [x] Edit popover: prefills owners in order, hides recurrence, reorders, and emits `update_task_metadata` with the new `rotation_owners`; prevents removing the last owner.

### Sub-Phase B: Chores-card routing, badge & "next" hint

Deliverable: a rotating task shows in its current owner's column (not household), marked ↻ with a "next: \<name\>" hint, and completing it works through the existing household toggle path.

#### Card routing

- [x] `lucarne-chores-card.ts::_resolveMembers`: rotating tasks arrive in `tasksByMember.get('household')` (their `member_slug` is `household`), **not** in `tasksByMember.get(<owner-slug>)`. When building a non-household member's column, pull the household bucket's rotating tasks (`tasksByMember.get('household')` filtered to `metadata.type === 'rotating' && metadata.current_owner === slug`) and **concatenate** them onto that member's own resolved tasks. When building the **household** column, **exclude** rotating tasks (`metadata.type !== 'rotating'`) so they don't double-render.
- [x] Add a `rotating` branch to the existing `.filter()` in `_resolveMembers` (lines ~319–330). Without it the final `return false` drops rotating tasks. Gate rotating tasks behind the same toggle as chores: **shown unless `show_tasks === false`** (`if (t.metadata.type === 'rotating') return showTasks;`). Document this choice in `docs/cards.md`.
- [x] Confirm `_handleTaskToggle` already routes rotating toggles to `todo.lucarne_household` (it keys off `metadata.member_slug === 'household'`, which is true for rotating) — no change expected, but add a test asserting it.

#### Visual marker

- [x] In `task-row.ts` (and/or `member-column.ts`), render a rotation icon (↻) on rotating tasks and a small **"next: \<name\>"** hint computed via `nextOwner(rotation_owners, current_owner, knownSlugs)` resolved to the member's display name. Hide the hint if there's only one owner.
- [x] Match the surrounding component style/design tokens (`src/shared/design-tokens`); keep touch targets ≥44px.

#### Tests (Sub-Phase B)

- [x] A rotating task with `current_owner = 'bob'` renders in Bob's column and **not** in the household column.
- [x] When `current_owner` changes (simulated subscription update), the task moves to the new owner's column.
- [x] The ↻ badge and "next: \<name\>" hint render with the correct next-owner name; hint hidden for a single-owner rotation.
- [x] Toggling a rotating task issues a `todo.update_item` against `todo.lucarne_household`.

#### Documentation (End of Sub-Phase)

- [x] `docs/integration.md` — user-facing: how to create a rotating task, how turns advance, that it's excluded from streaks.
- [x] `docs/cards.md` — document the ↻ badge + "next" hint pattern on the chores card if a reusable convention is introduced (`docs/design-guidelines.md` does not exist; use the existing card docs).
- [x] `docs/architecture.md` — note the card-side routing of household rotating tasks into owner columns.
- [x] `CLAUDE.md` — routing is documented in `docs/architecture.md`; no CLAUDE.md update needed (routing is explained in the existing "Rotating tasks" pitfall entry).

### Build Verification (required before marking phase complete)

- [x] `npm run lint` — zero warnings/errors
- [x] `npm run typecheck` — zero errors
- [x] `npm run test:coverage` — all pass, coverage at/above gate (line 88 / branch 80 / funcs 73)
- [x] `npm run build` — rebuilds the bundle; **stage `custom_components/lucarne_family/frontend/ha-lucarne.js`** (committed)
- [x] `pytest tests/python/` — green (no regressions)
- [x] Scan all test/lint/build output for non-fatal warnings — a zero exit code does not mean clean output
- [x] Mark phase `status: done` only after all steps pass

> **This is a hard gate.** The rebuilt bundle must be committed — HACS ships repo files and does not run a build.

### Manual Verification with MCP Tools (after automated tests pass)

- [ ] Deploy (**ask first**; requires HA restart + hard browser refresh). Use Browser MCP to: create a rotating task with owners [Alice, Bob, Cara]; verify it shows in Alice's column with ↻ and "next: Bob"; complete it; fire `lucarne_family.perform_daily_reset` (via HA MCP); refresh and verify it now shows unchecked in Bob's column with "next: Cara".
- [ ] Verify an uncompleted rotating task stays in the same column after a reset.
- [ ] Screenshot the rotating task in two consecutive owners' columns for review.

## Constraints

- The backend is authoritative for rotation; the frontend `nextOwner` is **display-only** (the "next" hint).
- A rotating task is created with `member: 'household'` and never with a personal member slug.
- Minimum 2 owners to create; the editor must not let the last owner be removed.
- Recurrence/due controls must be hidden for the rotating type in both popovers.
- `node:test`, not vitest; the rebuilt `frontend/ha-lucarne.js` must be committed (`CLAUDE.md`).
- Do not split the ESM bundle or reintroduce a separate HACS plugin (`CLAUDE.md`).
