"""Per-uid serialization for ``task_metadata`` writes (issue #114).

Every ``task_metadata`` INSERT for a todo item that *already exists* is a
check-then-act: the caller confirms there is no row, re-reads the item, and only
then awaits the INSERT. That await is an executor hop, so a concurrent
``lucarne_family.delete_task`` for the same uid can complete entirely inside it —
todo-item delete **and** its unconditional metadata DELETE — leaving the INSERT
to land afterwards. The result is a ``task_metadata`` row whose todo item is
gone. Nothing in the reset loop reaps it — ``reset_logic``'s deletes all sit
inside a loop over ``entity.todo_items``, so they can never reach a row with no
item — and ``reconcile.async_reconcile_task_metadata`` (issue #116), which does,
only runs at the daily-reset window. Serializing here is what keeps the row from
existing at all; the reconciliation is a backstop for the removal paths that
never take this lock, not a licence to drop it.

Such an orphan is worse than dead weight. ``update_task_metadata`` applies the
caller's fields right after adopting, so a racing call carrying
``type: "routine"`` leaves a routine-typed orphan, and two consumers read the
table without consulting todo items: ``completion_listener`` puts the uid in
``routine_uids`` where it can never be completed (that member's
``lucarne_family_all_routines_done`` never fires again), and — if the same call
also carried an RRULE — ``recurrence.make_recurrence_evaluator`` marks it due
every matching day with no completion ever logged, pinning the streak at 0.

No adoption-side check closes this: the window *is* the INSERT await, so anything
checked before it is still check-then-act. The remedy is serialization shared
between the writers, which is what this module provides.

The rule is unconditional for per-item writes: **every** caller of
``store.async_add_task_metadata`` holds this lock, and where the INSERT is paired
with creating the todo item, the create is inside the critical section too. (The
table-rebuild ``INSERT … SELECT`` in ``store.async_init`` is not a per-item write
— it runs on one connection before any service is registered.) Holders:

* :func:`task_adoption.async_adopt_item` — across its existence check, item
  re-read, and INSERT.
* :func:`apple_sentinel_backfill.async_backfill_apple_sentinel` — same shape,
  same orphan.
* ``task_service.handle_add_task`` and ``__init__.seed_preset_routines`` —
  across item creation, the INSERT, and (for the former) its rollback delete.
  The uid is freshly minted, but ``async_create_todo_item`` publishes the item —
  uid included — to every WebSocket subscriber before it returns, so a
  ``delete_task`` can name it before the INSERT lands.
* ``task_service.handle_delete_task`` — across the item delete *and* the
  metadata delete, so a delete is never half-applied from an inserter's view.

Two of Lucarne's other ``task_metadata`` DELETE paths — ``reset_logic``'s sweep
and ``config_flow``'s member-removal cleanup — need no lock: both delete only
rows they have already read non-``None``, and every inserter above either holds
this lock or acts only when no row exists, so the two are mutually exclusive.

The third, :func:`reconcile.async_reconcile_task_metadata`, does hold it, and for
the opposite reason to everyone else here: it deletes rows *because* it found no
todo item, so it must not run against a uid whose item is being created. Both
create-then-INSERT paths above hold this lock across the create, so taking it and
re-reading the lists inside is what tells a genuine orphan from a task that was
created a moment ago.

Holding the lock is not on its own enough to survive **cancellation of the
holder** (HA shutdown, or an explicit caller cancellation — note a dropped
WebSocket does not cancel a service call). ``async_add_executor_job`` cannot
cancel a worker that has already started, so a cancelled holder used to unwind
and release this lock with its INSERT still in flight: a parked delete then ran
both of its halves against a table with no row yet, and the INSERT committed
afterwards. Same orphan, reached without any lock being skipped (issue #118).

That is closed in the store rather than here, because the fix has to know when
the statement has actually landed: :meth:`store.LucarneFamilyStore._async_write`
waits on the executor job instead of awaiting it, and on cancellation drains it
before re-raising. The caller's frame — and therefore this lock — stays open
until the write is committed, so cancellation orders the write *before* the
release instead of after. Every per-item ``task_metadata`` add/update/delete goes
through it, as does the completion-log insert, and nothing is required of the call
sites here. The two bulk writes stay out: ``async_init``, which runs before any
service is registered, and ``async_rename_member_slug``, whose caller rolls it
back in a later step that a ``CancelledError`` would skip — see its docstring.

``handle_delete_task``'s halves are still ordered metadata-first to fail safe
under a cancellation landing *between* them, which no store-level drain can
cover — see there.

The registry is keyed by uid alone rather than per config entry: uids are UUIDs,
and the alternative means threading ``entry_id`` into call sites that do not
receive one. Two entries colliding on a uid is not a real case, and serializing
them if they did is harmless.
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

_LOCKS: dict[str, asyncio.Lock] = {}
_HOLDERS: dict[str, int] = {}


def lock_holders(uid: str) -> int:
    """Return how many callers currently hold or await this uid's lock.

    Diagnostics — and the only deterministic way a test can observe that a second
    caller has parked on the lock rather than run to completion.
    """
    return _HOLDERS.get(uid, 0)


@asynccontextmanager
async def async_task_uid_lock(uid: str) -> AsyncIterator[None]:
    """Serialize a block against every other holder of the same uid.

    The refcount is what keeps the registry from growing without bound: the
    entries are dropped once the last holder leaves. Registration is safe without
    further guarding because there is no await between the lookup and the
    increment, and this only ever runs on the event loop.
    """
    lock = _LOCKS.get(uid)
    if lock is None:
        lock = _LOCKS[uid] = asyncio.Lock()
    _HOLDERS[uid] = _HOLDERS.get(uid, 0) + 1
    try:
        async with lock:
            yield
    finally:
        remaining = _HOLDERS[uid] - 1
        if remaining:
            _HOLDERS[uid] = remaining
        else:
            del _HOLDERS[uid]
            del _LOCKS[uid]
