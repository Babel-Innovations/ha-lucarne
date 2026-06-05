"""Daily reset logic for the Lucarne Family integration."""
from __future__ import annotations

import logging

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant

from .completion_listener import _RESET_PENDING_KEY
from .const import HOUSEHOLD_ENTITY_ID, HOUSEHOLD_SLUG
from .store import LucarneFamilyStore

_LOGGER = logging.getLogger(__name__)


async def async_perform_daily_reset(hass: HomeAssistant, store: LucarneFamilyStore) -> int:
    """Run the daily routine reset and clear completed one-off chores.

    For every member's todo list, completed *routine* items are flipped back to
    needs_action. Across both member lists and the shared household list,
    completed one-off *chores* are deleted so they don't linger forever
    (issue #63); incomplete chores are left in place.

    Returns the number of routine items reset (not counting deleted chores), so
    the value stays a stable signal of "routines flipped today".
    Idempotent for routines: items already in needs_action are untouched, so a
    second call on the same day returns 0.

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

    # (slug, entity_id, reset_routines). Member lists reset routines and clear
    # completed chores; the household list only clears completed chores (its
    # routines, if any, keep their prior behavior of not being auto-reset).
    targets: list[tuple[str, str, bool]] = [
        (m.slug, m.todo_entity_id, True) for m in members if m.todo_entity_id
    ]
    targets.append((HOUSEHOLD_SLUG, HOUSEHOLD_ENTITY_ID, False))

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
            elif item_type == "chore":
                # One-off chores are removed once completed so they don't stay
                # visible forever. Mirrors task_service.handle_delete_task.
                await entity.async_delete_todo_items([item_uid])
                await store.async_delete_task_metadata(item_uid)
                hass.bus.async_fire("lucarne_family_task_deleted", {"uid": item_uid})
                total_deleted += 1

    if total_deleted:
        _LOGGER.debug("Daily reset removed %d completed one-off chore(s)", total_deleted)

    return total_reset
