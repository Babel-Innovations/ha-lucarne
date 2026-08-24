"""Per-uid serialization for ``task_metadata`` writes (issue #114).

Every ``task_metadata`` INSERT for a todo item that *already exists* is a
check-then-act: the caller confirms there is no row, re-reads the item, and only
then awaits the INSERT. That await is an executor hop, so a concurrent
``lucarne_family.delete_task`` for the same uid can complete entirely inside it —
todo-item delete **and** its unconditional metadata DELETE — leaving the INSERT
to land afterwards. The result is a ``task_metadata`` row whose todo item is
gone, and nothing reaps it: ``reset_logic``'s deletes all sit inside a loop over
``entity.todo_items``, so they can never reach a row with no item.

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

Lucarne's other ``task_metadata`` DELETE paths — ``reset_logic``'s sweep and
``config_flow``'s member-removal cleanup — need no lock: both delete only rows
they have already read non-``None``, and every inserter above either holds this
lock or acts only when no row exists, so the two are mutually exclusive.

Two windows this deliberately does **not** close, so don't read the invariant
wider than it is:

* **Deleting the todo item outside Lucarne.** ``todo.remove_item`` and HA's
  to-do panel go straight to the entity, take no lock, and delete no metadata
  row — and the completion listener's disappeared branch only ``continue``s. So
  removing an adopted task that way orphans its row outright, no race required.
  That is a separate reconciliation gap, tracked in issue #116, not this one.
* **Cancellation of the task holding the lock.** ``async_add_executor_job``
  cannot cancel a worker that has already started, so a cancelled service call
  (HA shutdown, a closed WebSocket connection) unwinds and releases the lock
  while its INSERT is still in flight. A parked delete then runs, and the INSERT
  commits afterwards. Reaching it needs the worker to be starved across the
  delete's two executor round-trips, which is why it is left rather than papered
  over with cancellation handling that nothing tests. ``handle_delete_task``'s
  own halves are ordered to fail safe under the same cancellation — see there.

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
