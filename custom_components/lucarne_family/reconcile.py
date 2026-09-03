"""Reap ``task_metadata`` rows whose todo item is gone (issue #116).

``lucarne_family.delete_task`` is the only path that pairs removing a todo item
with deleting its metadata row. Everything else that can remove an item — HA's
own to-do panel, ``todo.remove_item`` from an automation, a script, voice or an
agent/MCP call, the Companion app — goes straight to the todo entity, and nothing
in Lucarne notices: ``reset_logic``'s deletes all sit inside a loop over
``entity.todo_items`` so they can never reach a row with no item, the only rows
``config_flow``'s member-removal cleanup ever deletes are household ``rotating``
rows that lost their last owner, and the completion listener's disappeared branch
deliberately writes nothing.

Unlike the race in :mod:`.task_locks` this needs no concurrency and no prior
adoption — ``add_task`` always writes a row — and the leftover is not dead weight.
``completion_listener`` puts a routine-typed row in ``routine_uids``, where it can
never be completed because ``completed`` is built from the entity's own items, so
that member's ``lucarne_family_all_routines_done`` never fires again; and if it
carries a recurrence, ``recurrence.make_recurrence_evaluator`` marks it due on
every matching day with no completion ever logged, pinning the streak at 0 (an
orphan with no RRULE is never due, so it costs only the event). Both failures are
silent, permanent, and have no UI surface to point at.

**Why this reads the lists instead of diffing snapshots.** The obvious fix —
reap on the completion listener's disappeared branch — is a trap.
``_read_entity_snapshot`` returns ``{}`` for an entity missing from
``DATA_COMPONENT``, so reloading a ``local_todo`` config entry diffs a full list
to ``{}`` and makes *every* uid in it look like it disappeared at once; a naive
reaper would drop the whole list's metadata on every reload. Reading the lists
directly is immune to that only as long as a list that cannot be read is
**skipped** rather than treated as empty, which is what ``_live_uids`` enforces:
a row is only ever a candidate when the list that would hold it was actually
read.

The pass runs at the daily-reset window — the configured ``reset_time``, 04:00 by
default — from :func:`reset_logic.async_perform_daily_reset`, which already walks
every managed list, and can be triggered on demand with the
``lucarne_family.perform_daily_reset`` service.

**Not covered: rows left by removing a member.** Skipping a slug with no readable
list is what makes this safe, and it is also what puts a removed member's rows out
of reach — their todo entity is gone, so the slug is never in ``live`` again. The
only rows ``config_flow``'s member-removal cleanup ever deletes are household
``rotating`` rows that lost their last owner, so the removed member's own routines
and chores stay in the table for good. The visible consequence is on re-adding a
member with the same slug: ``seed_preset_routines`` returns early when any row for
the slug has ``source="template"``, so the new member's list is never seeded.
Fixing that belongs in the removal path, which knows the slug is going away and
can delete its rows outright — it is not something this pass can infer, since "no
list" is exactly the state it refuses to act on.
"""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant

from .store import LucarneFamilyStore
from .task_adoption import managed_todo_entity_ids, resolve_member_slug
from .task_locks import async_task_uid_lock

_LOGGER = logging.getLogger(__name__)


def readable_todo_entity(
    hass: HomeAssistant, entity_id: str
) -> tuple[Any, list[TodoItem]] | None:
    """Return ``(entity, items)`` for a todo list that can be read, else ``None``.

    ``None`` — never an empty list — when the entity is unknown, its state is
    unavailable, or ``todo_items`` is still ``None``. That last one is the
    difference between "not loaded yet" and "genuinely empty": ``local_todo``
    leaves ``_attr_todo_items`` unset until its first update, and an entity
    caught in that window would otherwise read as having lost every item. The
    single readability rule for every pass that acts on a list's *absences*:
    the orphan reaper below and the Apple Reminders bridge receiver.
    """
    todo_component = hass.data.get(DATA_COMPONENT)
    if todo_component is None:
        return None
    entity = todo_component.get_entity(entity_id)
    if entity is None:
        return None
    state = hass.states.get(entity_id)
    if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        return None
    items = entity.todo_items
    if items is None:
        return None
    return entity, list(items)


def readable_todo_items(hass: HomeAssistant, entity_id: str) -> list[TodoItem] | None:
    """Items of a readable list, or ``None`` (see :func:`readable_todo_entity`)."""
    readable = readable_todo_entity(hass, entity_id)
    return None if readable is None else readable[1]


def _live_uids(hass: HomeAssistant, store: LucarneFamilyStore) -> dict[str, set[str]]:
    """Return ``{member_slug: uids}`` for every managed list that could be read.

    A list is omitted — not recorded as empty — whenever
    :func:`readable_todo_entity` refuses it.
    """
    live: dict[str, set[str]] = {}
    for entity_id in managed_todo_entity_ids(store):
        slug = resolve_member_slug(entity_id, store)
        if not slug:
            continue
        items = readable_todo_items(hass, entity_id)
        if items is None:
            continue
        live[slug] = {item.uid for item in items if item.uid}
    return live


async def async_reconcile_task_metadata(
    hass: HomeAssistant, store: LucarneFamilyStore
) -> int:
    """Delete metadata rows whose todo item is in none of the managed lists.

    Returns the number of rows deleted. Conservative by construction: a row is
    only considered when the list its ``member_slug`` names was actually read, so
    an unavailable list, a member with no todo entity, or a slug Lucarne manages
    no list for costs nothing.
    """
    live = _live_uids(hass, store)
    if not live:
        return 0
    listed_uids = {uid for uids in live.values() for uid in uids}

    reaped = 0
    for row in await store.async_get_all_task_metadata():
        uid = row.get("item_uid") or ""
        slug = row.get("member_slug") or ""
        if not uid or slug not in live or uid in listed_uids:
            continue

        # Re-check under the uid lock rather than trusting the scan above. Both
        # create-then-INSERT paths (``add_task``, preset seeding) hold this lock
        # across item creation *and* the INSERT, so a task created after the scan
        # but before the read above is indistinguishable from an orphan here —
        # deleting it would leave the inverse orphan, a todo item whose row was
        # dropped seconds after it was written. Holding the lock also keeps an
        # adopting INSERT from landing between this check and the DELETE.
        #
        # The re-check runs through ``_live_uids`` again rather than a plain
        # "is this uid in some list" scan, so readability is decided the same way
        # in both passes. A list can stop being readable in between — the read
        # above is an executor hop and the lock may be contended, which is long
        # enough for a ``local_todo`` entry to reload — and a scan that skipped
        # those guards would read the reloading list as empty and delete the row.
        async with async_task_uid_lock(uid):
            live_now = _live_uids(hass, store)
            if slug not in live_now:
                continue
            if any(uid in uids for uids in live_now.values()):
                continue
            if await store.async_get_task_metadata(uid) is None:
                continue
            await store.async_delete_task_metadata(uid)
        reaped += 1
        # Per row at debug, one aggregated line at info below: a bulk cleanup in
        # HA's to-do panel can reap many rows at once. No summary in either line —
        # it is free-text household content, and uid + member + type is what a "my
        # streak stopped working" report needs.
        _LOGGER.debug(
            "Removed task_metadata for %s (member=%s, type=%s): its todo item was "
            "deleted outside Lucarne",
            uid,
            slug,
            row.get("type", ""),
        )

    if reaped:
        # Forward-looking on purpose: this pass's per-row detail was emitted at
        # debug and is already gone by the time anyone reads this, and re-running
        # finds nothing — the rows it would have named have been deleted.
        _LOGGER.info(
            "Removed %d task_metadata row(s) whose todo item was deleted outside "
            "Lucarne; enable debug logging for this integration to see which rows "
            "later passes remove",
            reaped,
        )
    return reaped
