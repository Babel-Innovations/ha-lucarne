"""Adoption of todo items that appeared without a ``task_metadata`` row (issue #111).

Anything created through plain ``todo.add_item`` — HA's to-do panel, voice, the
Companion app, an agent/MCP call, another integration — lands in ``local_todo``'s
ICS store with no row in Lucarne's ``task_metadata`` table. The cards still render
it (``buildRenderableTasks`` in ``src/shared/family-subscription.ts`` synthesizes
fallback metadata for unknown uids), but every write service used to treat
``task_metadata`` as the *existence* check and reject the item outright:

    Validation error: No task found with uid 'ab3571c0-9db6-11f1-b387-525400288db4'

Tell-tale sign of such an item: the uid is a **UUID1** (``…-9db6-11f1-…``), which is
what ``local_todo`` mints. ``add_task`` mints UUID4.

The todo entity is the source of truth for existence; ``task_metadata`` is
enrichment. This module owns both halves of that split:

* :func:`find_managed_item` — locate a uid across the managed lists.
* :func:`async_adopt_item` — write the missing metadata row so the item becomes a
  first-class task (editable icon/type/recurrence, countable in the log).

Apple-sourced items keep their existing treatment: if the description carries the
Reminders bridge's ``[apple:UUID]`` sentinel the adopted row gets ``source="apple"``
and the extracted ``apple_uid``, exactly as ``apple_sentinel_backfill`` wrote it.
Everything else adopts as a plain manual chore.
"""
from __future__ import annotations

import logging
import sqlite3
from typing import Any

from homeassistant.components.todo.const import DATA_COMPONENT
from homeassistant.core import HomeAssistant

from .apple_sentinel_backfill import APPLE_SENTINEL_RE
from .const import HOUSEHOLD_ENTITY_ID, HOUSEHOLD_SLUG
from .store import LucarneFamilyStore
from .task_locks import async_task_uid_lock

_LOGGER = logging.getLogger(__name__)


def managed_todo_entity_ids(store: LucarneFamilyStore) -> list[str]:
    """Return every todo entity Lucarne manages, household list included."""
    entity_ids = [HOUSEHOLD_ENTITY_ID]
    entity_ids.extend(m.todo_entity_id for m in store.get_members() if m.todo_entity_id)
    return entity_ids


def resolve_member_slug(entity_id: str, store: LucarneFamilyStore) -> str:
    """Map a managed todo entity_id → member slug, or "" if it isn't ours.

    Household-aware: the shared list has no ``Member`` row, so a plain scan over
    ``get_members()`` returns "" for it and callers that gate on a truthy slug
    silently skip every household item.
    """
    if entity_id == HOUSEHOLD_ENTITY_ID:
        return HOUSEHOLD_SLUG
    for member in store.get_members():
        if member.todo_entity_id == entity_id:
            return member.slug
    return ""


def find_managed_item(
    hass: HomeAssistant, store: LucarneFamilyStore, uid: str
) -> tuple[str, Any] | None:
    """Locate a todo item by uid across the managed lists.

    Returns ``(entity_id, item)`` or ``None`` when no managed list holds the uid.
    Used when there is no metadata row to name the owning list.
    """
    todo_component = hass.data.get(DATA_COMPONENT)
    if todo_component is None:
        return None
    for entity_id in managed_todo_entity_ids(store):
        entity = todo_component.get_entity(entity_id)
        if entity is None:
            continue
        for item in entity.todo_items or []:
            if item.uid == uid:
                return entity_id, item
    return None


def default_task_metadata(
    item_uid: str, member_slug: str, item: Any
) -> dict[str, Any]:
    """Return the row :func:`async_adopt_item` would insert, *without* inserting it.

    Lets a caller validate a request against what the item would become before
    committing to the write — ``update_task_metadata`` needs that, since a call it
    ultimately rejects must not leave the item adopted (and so swept by the daily
    reset). Shape matches a ``task_metadata`` row; mirrors the frontend's own
    fallback synthesis in ``buildRenderableTasks``.
    """
    match = APPLE_SENTINEL_RE.search(item.description or "")
    return {
        "item_uid": item_uid,
        "member_slug": member_slug,
        "assignee_slug": "",
        "type": "chore",
        "recurrence": "",
        "icon": "",
        "source": "apple" if match else "manual",
        "apple_uid": match.group(1) if match else "",
        "summary": item.summary or "",
        "time_of_day": "anytime",
        "rotation_owners": "",
        "current_owner": "",
    }


async def async_adopt_item(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entity_id: str,
    uid: str,
    member_slug: str = "",
) -> bool:
    """Write the missing ``task_metadata`` row for a todo item. Returns True if inserted.

    Idempotent: returns False without overwriting when a row already exists — the
    user may have deliberately changed the type via ``update_task_metadata``. Also
    returns False when the entity is unknown, or when the item is no longer in that
    list.

    The item is resolved from the entity *here*, never accepted from the caller.
    ``update_task_metadata`` locates it before running its validation, and a
    concurrent delete in between would otherwise leave a metadata row behind for a
    todo item that no longer exists — a row nothing reaps before the next daily
    reset (``reconcile``). Re-reading the list is a handful of in-memory
    comparisons; staleness is the expensive part.

    Re-reading alone narrows the window without closing it, which is why the whole
    body runs under this uid's lock (``task_locks``): the INSERT is an await, so a
    ``delete_task`` completing entirely inside it would otherwise land a metadata
    row whose todo item is gone — one that nothing reaps until the next daily reset
    (``reconcile``), by which time it has already cost a day's streak (issue #114). Holding
    the lock serializes check → re-read → INSERT against ``handle_delete_task``,
    which takes the same lock across its item delete *and* its metadata delete. The
    two possible orderings both end clean: adopt first and the delete removes item
    and row together; delete first and the re-read above finds nothing, so no row is
    written. Short of cancellation, that is — a cancelled task releases the lock
    while its executor INSERT may still be running. See ``task_locks`` for that
    residual window and for the unrelated one that ``todo.remove_item`` opens.

    Adoption enrolls the item into the daily-reset sweep (``reset_logic`` deletes
    completed ``chore`` rows), so it is deliberately *not* automatic: only an
    explicit ``update_task_metadata`` call adopts. See the comment in
    ``completion_listener``'s appeared branch.
    """
    async with async_task_uid_lock(uid):
        if await store.async_get_task_metadata(uid) is not None:
            return False

        slug = member_slug or resolve_member_slug(entity_id, store)
        if not slug:
            return False

        todo_component = hass.data.get(DATA_COMPONENT)
        if todo_component is None:
            return False
        entity = todo_component.get_entity(entity_id)
        if entity is None:
            return False
        item = next((i for i in entity.todo_items or [] if i.uid == uid), None)
        if item is None:
            return False

        defaults = default_task_metadata(uid, slug, item)
        source = defaults["source"]

        try:
            # Every field passed explicitly, never left to async_add_task_metadata's
            # parameter defaults: update_task_metadata validates against the dict
            # default_task_metadata returns, so the row written here must be that dict
            # and not merely happen to match it.
            await store.async_add_task_metadata(
                member_slug=defaults["member_slug"],
                item_uid=defaults["item_uid"],
                type=defaults["type"],
                recurrence=defaults["recurrence"],
                icon=defaults["icon"],
                source=source,
                apple_uid=defaults["apple_uid"],
                assignee_slug=defaults["assignee_slug"],
                summary=defaults["summary"],
                time_of_day=defaults["time_of_day"],
                rotation_owners=defaults["rotation_owners"],
                current_owner=defaults["current_owner"],
            )
        except sqlite3.IntegrityError:
            # The uid lock keeps another *locked* inserter out of the gap between
            # the check above and this INSERT, but item_uid is the PRIMARY KEY and
            # this is a service-call path: anything that ever writes the table
            # without taking the lock would surface here. Losing that race is the
            # same outcome as finding the row already there — someone adopted it —
            # so report "not inserted" rather than raising out of a service call.
            _LOGGER.debug("Adoption of %s lost a race; row already present", uid)
            return False
        _LOGGER.debug(
            "Adopted orphan todo item: entity=%s uid=%s member=%s source=%s",
            entity_id,
            uid,
            slug,
            source,
        )
        return True
