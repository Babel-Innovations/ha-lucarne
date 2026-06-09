---
status: pending
issue: 57
---

# Routine Improvements

> **Progress Tracking**: Update checkboxes in phase files as you complete tasks. Run `/spec-implement [phase-file]` to begin implementation.

## Goal

Make recurring family work easier to set up and fairer to share: let a parent add the **same routine to several family members at once**, and introduce a **rotating task** type that settles "whose turn is it?" by passing an unscheduled chore from one kid to the next each time it's completed.

## Scope

This spec covers **two** of the four items in issue #57:

1. **Multi-person routine creation** — when creating a routine, tick extra members so each gets an independent copy.
2. **Rotating task** — a new task type for unscheduled, shared chores (e.g. "pick up milk from the garage") that rotates ownership among a fixed, ordered set of members.

**Explicitly out of scope** (tracked separately, not in this spec):

- The touch-editor bug ("editor closes as soon as I lift my finger"). This is a separate small fix and will be handled in its own branch/PR.
- The auto-refresh-after-add item from #57 — already shipped.

## Concepts

### Multi-person routine = N independent copies

"Add this routine to these members as well" creates **one independent task per selected member** — not a single shared entity. Each copy:

- Lives in that member's own `todo.<slug>` list (the existing per-member model — no change to storage).
- Has its **own** completion state, its **own** streak contribution, and is **edited/deleted independently** (editing one copy does not touch the others).

This applies to **routines only**. One-off chores stay single-member; rotating tasks use the owners list instead (below).

### Rotating task = unscheduled "whose turn" chore

A rotating task is a **standing chore with no schedule** (no RRULE). Its job is to settle the "who did it last time" argument. Key properties:

- **No recurrence.** Scheduled splits (e.g. "kid 1 walks the dog Mon–Wed, kid 2 Thu–Fri") are *not* this feature — those stay as regular per-day tasks. The editor hides all recurrence controls for the rotating type.
- **Ordered owners.** Owned by a fixed, **reorderable** list of members (turn order). Minimum 2 owners at creation.
- **One stable item, displayed in the current owner's column.** Stored **once** in the shared household list (`todo.lucarne_household`) with a `current_owner` pointer. The chores card *routes* it into the current owner's column; it never physically moves between members' lists. Stable identity → a clean "who did it each time" history. It is **HA-only** (never lands in a member's personal list / Apple Reminders — by design, since nobody syncs these).
- **Rotation advances on completion, surfaces at daily reset.** When the current owner checks it off, it stays checked in their column for the rest of the day. At the next **daily-reset window**, if it was completed, the `current_owner` pointer advances to the next owner and the task reappears **unchecked in the next owner's column**.
- **You don't lose your turn by skipping.** If the current owner does **not** complete it by reset, it stays with the **same** owner (unchecked) — the turn only passes when the task is actually done.
- **Excluded from streaks.** Rotating completions are logged (for the "who did it" history and a rotation event) but never count toward any member's streak — you don't need milk every day. This falls out naturally because streaks only count `type == "routine"` tasks.
- **Owner removed → skip & continue.** If an owner is removed from the family, they're dropped from the rotation and turns continue among the rest. If only one owner remains, the task always stays with them. If zero remain, the task is deleted.

### Rotation order math

The next owner is computed from the ordered `rotation_owners` list and the `current_owner`, **skipping any owners no longer in the family**:

```
owners        = [alice, bob, cara]   (turn order)
current_owner = alice
Alice ✓ → reset → current_owner = bob
Bob   ✓ → reset → current_owner = cara
Cara  ✓ → reset → current_owner = alice   (wraps)

remove bob → owners effectively [alice, cara]; A→C→A
1 owner left → always theirs
0 owners left → task deleted
```

This math lives in a single pure helper (`rotation.py`) so it can be unit-tested in isolation.

## Requirements

### Multi-person routine creation

- In the add-task popover, when **type = Routine**, show an "Also add to:" checklist of the other (non-household) members.
- On submit, create one independent copy per target member (the column's member + each ticked member) via the existing `lucarne_family.add_task` service — one call per member.
- Each copy is fully independent (own todo item, own completion, own streak, edited separately).
- Available for **routines only** — the checklist is hidden for chore and rotating types.

### Rotating task

- New task `type`: `rotating` (alongside `routine`, `chore`).
- Created from the add-task popover via a new "Rotating" type option, with an **ordered, reorderable owners picker** (min 2 owners).
- Stored once in the household list with `rotation_owners` (ordered slug list) and `current_owner`.
- Displayed in the current owner's column on the chores card, marked with a rotation icon (↻) and a "next: \<name\>" hint.
- Rotation advances on completion, applied at the daily-reset window; an uncompleted rotating task stays with its current owner.
- Excluded from streak computation.
- On completion, logged under the **current owner** (not the household slug) so the "who did it" history is accurate, and a `lucarne_family_rotation_advanced` event fires when the owner advances.
- Owner removal sanitizes the rotation (skip & continue; delete the task when no owners remain).

### Authorization

This is a single-family local Home Assistant integration with no per-user roles. All actions are performed by whoever can access the Home Assistant dashboard / Options flow (typically a parent). There is no infrastructure-level access control to update (see [Access Control](#access-control)). No new auth surface is introduced.

## Phases

| Phase | Title | Description |
|-------|-------|-------------|
| 1 | Multi-person routine creation | Frontend-only: "Also add to" member checklist on routine creation; fan-out independent copies via `add_task`. |
| 2 | Rotating tasks — backend & data model | Schema + storage for `rotating` type and owners; pure rotation helper; daily-reset advance; completion attribution; rotation event; owner-removal handling. |
| 3 | Rotating tasks — frontend | Add/edit popover "Rotating" type + owners picker; chores-card routing into the current owner's column with ↻ badge and "next" hint. |

## Related Documentation

- [Phase 1: Multi-person routine creation](./phase-1-multi-person-create.md)
- [Phase 2: Rotating tasks — backend & data model](./phase-2-rotating-backend.md)
- [Phase 3: Rotating tasks — frontend](./phase-3-rotating-frontend.md)
- [Architecture overview](../../docs/architecture.md)
- [Service reference](../../docs/services.md)
- [Event reference](../../docs/events.md)
- [Integration user guide](../../docs/integration.md)
- Project working guide: [`CLAUDE.md`](../../CLAUDE.md)

## Architecture Decision

**Approach 3 (Pragmatic Balance)** was selected. The rotating-task data model uses **two explicit columns on `task_metadata`** (`rotation_owners` as an ordered JSON array of slugs, `current_owner` as a slug) plus a **pure-function `rotation.py` helper** for the turn math. The rotating task lives once in the household list (`member_slug = 'household'`); the card routes it to the current owner's column. No new SQLite tables and no new services are introduced — multi-person create is just N calls to the existing `add_task` service.

Rationale: explicit, self-documenting columns (no overloading `assignee_slug`); isolated, trivially testable rotation math; reuse of the existing household-list storage and daily-reset hook; correct weight for a local single-family integration.

## Testing Tools

> Discovered during spec creation. Use these for manual verification after automated tests pass.

| MCP Server | Tool Prefix | Use For |
|-----------|-------------|---------|
| Home Assistant | `mcp__home-assistant__*` | After deploy, inspect `todo.lucarne_household` and per-member `todo.*` items, read entity state, fire `lucarne_family.perform_daily_reset` to verify rotation advance, and read logs (`ha_get_logs`). Consult `skill://home-assistant-best-practices/SKILL.md` before touching HA config. |
| Browser MCP | `mcp__browsermcp__*` | Visually verify the chores card: multi-create copies appear under each member, a rotating task renders the ↻ badge + "next" hint in the current owner's column, and completing it advances the owner after a reset. Take screenshots of empty/loaded/error states. |

> **Note:** Deploying for manual verification requires an HA restart + hard browser refresh (the bundle is served by the integration, not hot-reloaded). See `CLAUDE.md` → Deploy. **Plan approval is not install/deploy authorization — ask before deploying.**

## Logging & Diagnostics

> Discovered during spec creation. Check these after every test run and build — a zero exit code does not mean clean output.

| Log Source | Location | Format | What to Check |
|-----------|----------|--------|---------------|
| Python test run | stdout of `pytest tests/python/` | pytest text + coverage summary | Failures, errors, and the coverage line (`fail_under = 86` is enforced via `addopts`). |
| TS test run | stdout of `npm run test:coverage` | node:test TAP-ish + Node coverage | Failures and the coverage gate (line 88 / branch 80 / funcs 73). |
| Lint / types | stdout of `ruff check …`, `mypy …`, `npm run lint`, `npm run typecheck` | text | Any warning or error — all must be zero. |
| HA runtime logs | via `mcp__home-assistant__ha_get_logs` (or HA's `home-assistant.log`) | text | After deploy: exceptions from `reset_logic`, `completion_listener`, `task_service`, or the config flow; warnings about missing todo entities. |

There is no structured/JSON log file in this project — scan the raw test/lint/build output and HA logs carefully for non-fatal exceptions, warnings, and deprecation notices.

## Access Control

This project has **no infrastructure-level access control** (no Firebase rules, no Supabase RLS, no IAM). It is a self-contained Home Assistant custom integration; all access is gated by Home Assistant's own auth and the local network. The only enforced write-path constraint in the codebase is the avatar directory allow-list in `avatar_service.py`, which this feature does not touch. Access control for this feature is handled entirely in application code (service-layer validation in `task_service.py` and the config flow).
