"""Daily reset logic for the Lucarne Family integration."""
from __future__ import annotations

import logging

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant

from .completion_listener import _RESET_PENDING_KEY, _RESET_ROTATING_PREV_KEY
from .const import EVENT_ROTATION_ADVANCED, HOUSEHOLD_ENTITY_ID, HOUSEHOLD_SLUG
from .reconcile import async_reconcile_task_metadata
from .rotation import next_owner, parse_owners, sanitize_owners, serialize_owners
from .store import LucarneFamilyStore

_LOGGER = logging.getLogger(__name__)


async def async_perform_daily_reset(hass: HomeAssistant, store: LucarneFamilyStore) -> int:
    """Run the daily routine reset and clear completed one-off chores.

    Across both member lists and the shared household list, completed *routine*
    items are flipped back to needs_action and completed one-off *chores* are
    deleted so they don't linger forever (issue #63); incomplete chores are left
    in place.

    Returns the number of routine items reset (not counting deleted chores), so
    the value stays a stable signal of "routines flipped today".
    Idempotent for routines: items already in needs_action are untouched, so a
    second call on the same day returns 0.

    Finishes by reconciling task_metadata against the lists (see reconcile.py):
    rows whose todo item was removed outside Lucarne — HA's to-do panel,
    todo.remove_item — are reaped here, because nothing in this loop can reach
    them and left alone they silently suppress all_routines_done and the streak
    (issue #116). Reaped rows are not counted in the return value.

    Completion logging is delegated to completion_listener via the reset-pending
    mechanism: each routine UID is added to hass.data[_RESET_PENDING_KEY] before
    async_update_todo_item is called, so the listener classifies the resulting
    COMPLETED→NEEDS_ACTION state change as action="reset" (not "undone").
    """
    members = store.get_members()
    total_reset = 0
    total_deleted = 0
    reset_pending: set[str] = hass.data.setdefault(_RESET_PENDING_KEY, set())

    todo_component = hass.data.get(DATA_COMPONENT)
    if todo_component is None:
        _LOGGER.warning("todo component not loaded; skipping daily reset")
        return 0

    # (slug, entity_id, reset_routines). Both member lists and the household list
    # reset completed routines back to needs_action and clear completed one-off
    # chores. Resetting household routines is required so a completed recurring
    # household routine (e.g. a biweekly task) is flipped back and shows fresh on
    # its next due day instead of lingering crossed-out — the card hides it on
    # off-days via its RRULE, but only the reset can clear the stale completion.
    # Rotating tasks are handled by their own branch below regardless of this flag.
    targets: list[tuple[str, str, bool]] = [
        (m.slug, m.todo_entity_id, True) for m in members if m.todo_entity_id
    ]
    targets.append((HOUSEHOLD_SLUG, HOUSEHOLD_ENTITY_ID, True))

    for slug, entity_id, reset_routines in targets:
        entity = todo_component.get_entity(entity_id)
        if entity is None:
            _LOGGER.warning(
                "Todo entity %s not found; skipping reset for %r", entity_id, slug
            )
            continue

        # Snapshot the list: deleting chores mutates the entity's items mid-loop.
        for item in list(entity.todo_items or []):
            if item.status != TodoItemStatus.COMPLETED:
                continue

            item_uid = item.uid
            if not item_uid:
                continue

            metadata = await store.async_get_task_metadata(item_uid)
            if metadata is None:
                continue
            item_type = metadata.get("type")

            if item_type == "routine":
                if not reset_routines:
                    continue
                # Mark as reset-pending BEFORE the update so the completion_listener
                # classifies the resulting state change as action="reset" not "undone".
                # Clean up on failure so a later user-driven undo is not mis-logged.
                reset_pending.add(item_uid)
                try:
                    await entity.async_update_todo_item(
                        TodoItem(
                            uid=item_uid,
                            summary=item.summary,
                            status=TodoItemStatus.NEEDS_ACTION,
                            due=item.due,
                            description=item.description,
                        )
                    )
                except Exception:
                    reset_pending.discard(item_uid)
                    raise
                total_reset += 1
            elif item_type == "rotating":
                # Rotating tasks live in the household list only.
                # If completed: advance current_owner to the next owner, then
                # flip back to NEEDS_ACTION. If zero valid owners remain, delete.
                known_slugs = {m.slug for m in store.get_members()}
                owners = sanitize_owners(
                    parse_owners(metadata.get("rotation_owners", "")), known_slugs
                )
                if not owners:
                    # No valid owners left — delete the task.
                    await entity.async_delete_todo_items([item_uid])
                    await store.async_delete_task_metadata(item_uid)
                    hass.bus.async_fire(
                        "lucarne_family_task_deleted", {"uid": item_uid}
                    )
                    total_deleted += 1
                    continue
                prev = metadata.get("current_owner", "")
                # owners is non-empty (guarded above), so next_owner cannot return None.
                nxt = next_owner(owners, prev, known_slugs) or owners[0]
                # Stash prev for the async completion_listener to attribute the
                # reset log row to the person who completed the task. The listener
                # runs via hass.async_create_task, so by the time it reads metadata
                # current_owner will already be advanced to nxt in the DB — the
                # stash lets it read the pre-advance value without a race.
                hass.data.setdefault(_RESET_ROTATING_PREV_KEY, {})[item_uid] = prev
                reset_pending.add(item_uid)
                try:
                    await entity.async_update_todo_item(
                        TodoItem(
                            uid=item_uid,
                            summary=item.summary,
                            status=TodoItemStatus.NEEDS_ACTION,
                            due=item.due,
                            description=item.description,
                        )
                    )
                except Exception:
                    reset_pending.discard(item_uid)
                    raise
                # Persist the new owner (and sanitized owners if changed).
                owners_str = serialize_owners(owners)
                await store.async_update_task_metadata(
                    item_uid,
                    rotation_owners=owners_str,
                    current_owner=nxt,
                )
                hass.bus.async_fire(
                    EVENT_ROTATION_ADVANCED,
                    {
                        "uid": item_uid,
                        "summary": item.summary,
                        "from": prev,
                        "to": nxt,
                    },
                )
            elif item_type == "chore":
                # One-off chores are removed once completed so they don't stay
                # visible forever. Mirrors task_service.handle_delete_task.
                await entity.async_delete_todo_items([item_uid])
                await store.async_delete_task_metadata(item_uid)
                hass.bus.async_fire("lucarne_family_task_deleted", {"uid": item_uid})
                total_deleted += 1

    if total_deleted:
        _LOGGER.debug("Daily reset removed %d completed one-off chore(s)", total_deleted)

    # Last, so rows this sweep just deleted alongside their items are already gone
    # and are never rescanned as orphans. Failures here are logged, not raised: the
    # reset itself is already complete and counted by this point, and the reaper is
    # a maintenance backstop — letting a SQLite error out of it would report the
    # whole service call as failed and discard total_reset. The next run retries.
    try:
        reaped = await async_reconcile_task_metadata(hass, store)
    except Exception:
        _LOGGER.exception("Reconciling orphaned task_metadata failed")
    else:
        if reaped:
            _LOGGER.debug("Daily reset reaped %d orphaned task_metadata row(s)", reaped)

    return total_reset
