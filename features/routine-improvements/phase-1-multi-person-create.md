---
status: done
---

# Phase 1: Multi-person routine creation

This phase lets a parent add the **same routine to several family members at once** from the chores card. Selecting extra members produces **independent copies** — one routine per member, each in that member's own todo list with its own completion and streak. This is a **frontend-only** change: it reuses the existing `lucarne_family.add_task` service, calling it once per target member.

## Context

This is the smallest, most independent slice of issue #57 and ships value first. It depends on nothing else in this spec and touches no Python.

Today the add-task popover (`src/components/add-task-popover.ts`) is scoped to a single member: on submit (`_submit`, line ~259) it calls the `addTask(hass, params)` helper from `src/shared/integration-services.ts` exactly once with `member=<the column's slug>`. That helper wraps `hass.callService('lucarne_family', 'add_task', …)`. The chores card (`src/cards/lucarne-chores-card.ts`) opens the popover with `_addTaskMember` set to the member whose `+` was tapped (see `_handleAddTask`, card lines ~368–375). The `add_task` service already creates exactly one independent task per call (`task_service.py` `handle_add_task`), so "add to multiple members" is N `addTask` calls — no new service or storage.

Read [./README.md](./README.md) for overall feature context (especially the "N independent copies" concept).

## Structure

```
src/components/
  add-task-popover.ts        # update: "Also add to" member checklist (routine type only); fan-out N add_task calls
tests/components/
  add-task-popover.test.ts   # update/new: checklist visibility + multi-call submit behavior
docs/
  integration.md             # update: document multi-member routine creation in the user guide
```

> **Before writing code**, confirm the exact submit path: open `src/components/add-task-popover.ts` and locate the `_submit` method (line ~259). It calls the `addTask(hass, params)` helper from `src/shared/integration-services.ts`, which wraps `hass.callService('lucarne_family', 'add_task', …)`. Implement the fan-out by calling that same `addTask` helper once per target member — do **not** invent a new service or a new event protocol, and do **not** call `hass.callService` directly from the popover (route through the existing helper).

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline Test Verification (before starting implementation)

- [x] Run the full TS suite: `npm run test:coverage && npm run lint && npm run typecheck && npm run build` — all green
- [x] Run the full Python suite: `pytest tests/python/` (via `.venv/bin/pytest` — see `CLAUDE.md`) — all green
- [ ] If any test fails, fix and commit separately before proceeding

> **Why both runners?** Even though this phase is TS-only, a green Python baseline proves the working tree is clean before you start.

### Sub-Phase A: "Also add to" checklist + fan-out create

Deliverable: from a single open of the add-task popover in **Routine** mode, a parent can tick additional members and create one independent routine per selected member.

#### UI

- [x] In `add-task-popover.ts`, add an **"Also add to:"** checklist that renders **only when the selected type is `routine`** (hidden for `chore`; rotating is added in Phase 3).
- [x] Populate the checklist with all members **except** the currently selected member and **except** household (`slug === 'household'`). "Currently selected member" means `this._selectedMemberSlug` (the value of the existing Member `<select>`, which the user can change after opening — not the static `this.member` prop). Use `this.members` (the popover already receives the full list via the `members` property). Recompute the checklist when `_selectedMemberSlug` changes so the selected member is never also offered as an "also add to" target.
- [x] Track the set of ticked additional slugs in component state; default to none ticked.
- [x] When the user switches type away from `routine`, hide the checklist and clear the selection so a hidden selection can't leak into a chore submit.

#### Submit / fan-out

- [x] On submit for a routine, build the target list = `[this._selectedMemberSlug, ...tickedMembers]` (de-duplicated; the selected member is always included, even if somehow also ticked).
- [x] Issue one `addTask(this.hass, {…})` call (the `src/shared/integration-services.ts` helper) **per target member**, each with the same `summary`, `type: 'routine'`, `recurrence`, `icon`, and `time_of_day`, and `member` set to that target's slug. Each call gets its own server-generated uid → independent copies.
- [x] Issue the calls sequentially (`for … of targets { await addTask(...) }`), stopping on the first rejection — do **not** attempt to roll back copies already created (there is no batch/transaction across `add_task` calls; partial success is acceptable and the family subscription will show whatever was created). On a rejection, surface the error in the popover via the existing `this._error` field (the same `.error-msg` block the single-member path uses — see `add-task-popover.ts` `_submit` catch at lines ~298–301) and set `this._saving = false` so the user can retry. Do **not** silently swallow the failure and do **not** close the popover on error.
- [x] After all calls succeed, close the popover exactly as the single-member path does today (the existing family subscription refresh repopulates the card — this is the issue-#57 auto-refresh that already works).

#### Tests

- [x] Checklist is **not** rendered when type is `chore`.
- [x] Checklist is rendered for `routine` and excludes the current member and household.
- [x] Submitting with 2 extra members ticked issues exactly 3 `add_task` calls, one per slug, each `type: 'routine'` with identical summary/recurrence/icon/time_of_day.
- [x] Submitting with none ticked issues exactly 1 call (unchanged single-member behavior).
- [x] Switching type from routine → chore clears the ticked selection (a later routine submit doesn't reuse stale ticks).
- [x] A rejected `add_task` call keeps the popover open and shows the error (does not close as if successful).

> Use the shared HA stub at `tests/setup/ha-mock.mjs` to capture `callService` invocations. Tests run with `node:test`, **not vitest** (see `CLAUDE.md` → pitfalls).

#### Documentation (End of Sub-Phase)

- [x] `docs/integration.md` — document that a routine can be added to multiple members at once and that copies are independent
- [ ] `CLAUDE.md` — only if a new convention is introduced (none expected for this phase)

### Build Verification (required before marking phase complete)

- [x] `npm run lint` — zero warnings/errors
- [x] `npm run typecheck` — zero errors
- [x] `npm run test:coverage` — all pass, coverage at/above gate (line 88 / branch 80 / funcs 73)
- [x] `npm run build` — rebuilds `custom_components/lucarne_family/frontend/ha-lucarne.js`; **stage the rebuilt bundle** (it is committed)
- [x] `pytest tests/python/` — still green (no regressions; statement floor 86)
- [x] Scan all test/lint/build output for non-fatal warnings — a zero exit code does not mean clean output
- [x] Mark phase `status: done` only after all steps pass

> **This is a hard gate.** The built bundle must be committed — HACS ships repo files and does not run a build.

### Manual Verification with MCP Tools (optional, after automated tests pass)

- [ ] Deploy (**ask first**) and use Browser MCP to open the chores card, create a routine with 2 extra members ticked, and confirm an independent copy appears under each member's column.
- [ ] Toggle one copy complete and confirm the others remain unaffected.

## Constraints

- Frontend-only — do **not** modify `task_service.py` or add a new service. Fan-out is N existing `add_task` calls.
- Independent copies only — no shared entity, no cross-member linkage.
- Multi-create applies to **routines only**; the checklist must never appear for chores (or, in Phase 3, rotating tasks).
- Do not introduce vitest imports; use `node:test` (`CLAUDE.md`).
- The rebuilt `frontend/ha-lucarne.js` bundle must be committed.
