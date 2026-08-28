"""Apple-sentinel backfill for items synced via the Reminders bridge (Phase 3-D).

When the lucarne_reminders_sync blueprint syncs an Apple Reminders item it
embeds a sentinel in the item's description:

    [apple:UUID]

This module detects that sentinel on newly-appeared todo items and inserts a
task_metadata row so the rest of the integration can treat synced items as
first-class tasks.

Regex is locked — do not alter:
    r"\\[apple:([^\\]]+)\\]"
Matches standard UUIDs, Shortcuts-provided IDs such as ``apple-stable-uuid``,
and opaque Apple IDs.  The prefix ``apple:`` is intentionally lowercase to
match what ``blueprints/automation/lucarne_reminders_sync.yaml`` documents.
"""
from __future__ import annotations

import logging
import re
import sqlite3

from homeassistant.components.todo.const import DATA_COMPONENT
from homeassistant.core import HomeAssistant

from .store import LucarneFamilyStore
from .task_locks import async_task_uid_lock

_LOGGER = logging.getLogger(__name__)

# Locked regex — see module docstring. Do not alter.
APPLE_SENTINEL_RE = re.compile(r"\[apple:([^\]]+)\]")


async def async_backfill_apple_sentinel(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entity_id: str,
    uid: str,
    member_slug: str,
) -> bool:
    """Check a newly-appeared todo item for an Apple sentinel and write metadata.

    Returns True if a new metadata row was inserted, False otherwise (no
    sentinel found or row already exists).

    Idempotent: if a metadata row already exists for this UID the function
    returns False without overwriting — the user may have explicitly changed the
    type via update_task_metadata.

    Runs under this uid's lock. Check → re-read → INSERT has the same shape as
    ``task_adoption.async_adopt_item``, and so the same failure: the INSERT is an
    executor hop, and a ``delete_task`` completing inside it would leave a metadata
    row for a todo item that no longer exists, which nothing reaps until the next
    daily reset (``reconcile``) (issue #114).
    """
    async with async_task_uid_lock(uid):
        return await _async_backfill_locked(hass, store, entity_id, uid, member_slug)


async def _async_backfill_locked(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entity_id: str,
    uid: str,
    member_slug: str,
) -> bool:
    """Body of :func:`async_backfill_apple_sentinel`, run under that uid's lock."""
    existing = await store.async_get_task_metadata(uid)
    if existing is not None:
        return False

    todo_component = hass.data.get(DATA_COMPONENT)
    if todo_component is None:
        return False

    entity = todo_component.get_entity(entity_id)
    if entity is None:
        return False

    description = ""
    for item in entity.todo_items or []:
        if item.uid == uid:
            description = item.description or ""
            break

    if not description:
        return False

    match = APPLE_SENTINEL_RE.search(description)
    if not match:
        return False

    apple_uid = match.group(1)
    try:
        await store.async_add_task_metadata(
            member_slug=member_slug,
            item_uid=uid,
            type="chore",
            recurrence="",
            source="apple",
            apple_uid=apple_uid,
        )
    except sqlite3.IntegrityError:
        # Symmetric with task_adoption.async_adopt_item: the uid lock this runs
        # under excludes every other *locked* inserter from the gap between the
        # existence check above and this INSERT, but item_uid is the PRIMARY KEY
        # and an unlocked writer would still surface here. Losing that race means
        # the row is there either way — don't raise out of a background listener
        # task.
        _LOGGER.debug("Apple sentinel backfill of %s lost a race; row present", uid)
        return False
    _LOGGER.debug(
        "Apple sentinel backfill: entity=%s uid=%s apple_uid=%s member=%s",
        entity_id,
        uid,
        apple_uid,
        member_slug,
    )
    return True
