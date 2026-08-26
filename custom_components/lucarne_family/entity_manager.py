"""Entity lifecycle manager for the Lucarne Family integration.

Creates, renames, and deletes the managed todo + counter entities
that back each family member and the shared household list.
"""
from __future__ import annotations

import dataclasses
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_registry import async_get as er_get

from .models import Member

_LOGGER = logging.getLogger(__name__)

_HOUSEHOLD_NAME = "Lucarne Household"
_HOUSEHOLD_ENTITY_ID = "todo.lucarne_household"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_counter_storage_collection(hass: HomeAssistant) -> Any:
    """Return the counter StorageCollection via the registered WS handler.

    The counter component exposes no direct Python API for creating helpers;
    we reach the storage collection through the `counter/create` WS handler
    that HA registers when the counter component loads. The decorators
    (@require_admin, @async_response) use @functools.wraps so __wrapped__
    chains back to the bound ws_create_item method whose __self__ carries
    the storage_collection reference.
    """
    ws_handlers: dict[str, Any] = hass.data.get("websocket_api", {})
    entry = ws_handlers.get("counter/create")
    if entry is None:
        raise HomeAssistantError(
            "counter/create WS handler not found. "
            "Ensure the counter component is loaded before calling lucarne_family services."
        )
    handler, _ = entry
    # Unwrap @require_admin(@async_response(ws_create_item))
    inner = getattr(handler, "__wrapped__", handler)
    inner = getattr(inner, "__wrapped__", inner)
    sc = getattr(getattr(inner, "__self__", None), "storage_collection", None)
    if sc is None:
        raise HomeAssistantError(
            "Cannot access counter storage collection. "
            "The counter component may not be fully initialised."
        )
    return sc


async def _create_local_todo(hass: HomeAssistant, name: str) -> ConfigEntry:
    """Start the local_todo config flow and return the resulting ConfigEntry."""
    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": name},
    )
    if result.get("type") != "create_entry":
        raise HomeAssistantError(
            f"Failed to create local_todo for {name!r}: flow returned {result.get('type')!r}"
        )
    # flow.async_init for a CREATE_ENTRY result already awaits the new entry's
    # async_setup_entry (and platform entity registration). Do NOT call
    # hass.async_block_till_done() here: when this helper runs inside our own
    # async_setup_entry, it would wait on the HTTP/WS task that is itself
    # awaiting us, producing a stall that gets cancelled by HA setup timeout.
    ce: ConfigEntry | None = result.get("result")
    if ce is None:
        raise HomeAssistantError(
            f"Config entry missing after creating local_todo for {name!r}."
        )
    return ce


def _find_todo_entity_id(hass: HomeAssistant, config_entry_id: str) -> str | None:
    """Return the entity_id of the todo entity created by a local_todo config entry."""
    er = er_get(hass)
    for entry in er.entities.values():
        if entry.config_entry_id == config_entry_id and entry.domain == "todo":
            return entry.entity_id
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def async_create_member_entities(
    hass: HomeAssistant, member: Member
) -> tuple[str, str]:
    """Create todo + counter entities for *member*.

    Returns ``(todo_entity_id, counter_entity_id)``.  Both ids use the member's
    slug so downstream automations and the card config can reference them
    predictably.  If the canonical entity_id is already taken, raises
    HomeAssistantError and cleans up any partially-created entities.
    """
    canonical_todo_id = f"todo.{member.slug}"
    canonical_counter_id = f"counter.{member.slug}_streak"

    er = er_get(hass)

    # Guard against collision before creating anything
    if er.async_get(canonical_todo_id) is not None:
        raise HomeAssistantError(
            f"Cannot create {canonical_todo_id}: an entity with this id already exists. "
            "Delete or rename the conflicting helper before adding this member."
        )

    # --- Create the todo via local_todo config flow ---
    todo_entry = await _create_local_todo(hass, member.name)

    actual_todo_id = _find_todo_entity_id(hass, todo_entry.entry_id)
    if actual_todo_id is None:
        await hass.config_entries.async_remove(todo_entry.entry_id)
        raise HomeAssistantError(
            f"No todo entity found after creating local_todo for {member.name!r}."
        )

    # Normalize entity_id to canonical slug form
    if actual_todo_id != canonical_todo_id:
        try:
            er.async_update_entity(actual_todo_id, new_entity_id=canonical_todo_id)
        except Exception as exc:
            await hass.config_entries.async_remove(todo_entry.entry_id)
            raise HomeAssistantError(
                f"Cannot create {canonical_todo_id}: an entity with this id already exists. "
                "Delete or rename the conflicting helper before adding this member."
            ) from exc

        # Verify the rename succeeded
        er_entry = er.async_get(canonical_todo_id)
        if er_entry is None:
            await hass.config_entries.async_remove(todo_entry.entry_id)
            raise HomeAssistantError(
                f"Cannot create {canonical_todo_id}: rename did not produce the expected id."
            )

    # --- Create counter via the counter storage collection ---
    try:
        sc = _get_counter_storage_collection(hass)
        item = await sc.async_create_item(
            {
                "name": f"{member.slug}_streak",
                "initial": 0,
                "step": 1,
                "minimum": 0,
                "restore": True,
            }
        )
    except Exception as exc:
        # Roll back the todo entry so no orphan is left
        await hass.config_entries.async_remove(todo_entry.entry_id)
        raise HomeAssistantError(
            f"Failed to create counter entity for member {member.slug!r}: {exc}"
        ) from exc

    # sc.async_create_item awaits the storage collection's change-set listeners,
    # which awaits EntityComponent.async_add_entities -> entity registration.
    # No async_block_till_done here — see _create_local_todo for why.

    # Verify entity registry assigned the canonical entity_id (not a _2 suffix from collision)
    registry_counter_id = er.async_get_entity_id("counter", "counter", item["id"])
    if registry_counter_id != canonical_counter_id:
        await hass.config_entries.async_remove(todo_entry.entry_id)
        await sc.async_delete_item(item["id"])
        raise HomeAssistantError(
            f"Cannot create {canonical_counter_id}: registry assigned {registry_counter_id!r}. "
            "Delete or rename the conflicting helper before adding this member."
        )

    return (canonical_todo_id, canonical_counter_id)


@dataclasses.dataclass(frozen=True)
class MemberEntityDeletion:
    """Outcome of deleting one member's entities.

    ``todo_removed`` / ``counter_removed`` mean *the entity is gone* — an entity
    that was already absent counts as removed, because the goal state already
    holds. ``leftovers`` maps entity_id -> error text for sides that still exist
    and could not be deleted.
    """

    todo_removed: bool
    counter_removed: bool
    leftovers: dict[str, str] = dataclasses.field(default_factory=dict)

    @property
    def complete(self) -> bool:
        """True when nothing of the member's entities is left behind."""
        return not self.leftovers


async def async_delete_member_entities(
    hass: HomeAssistant,
    todo_entity_id: str,
    counter_entity_id: str,
) -> MemberEntityDeletion:
    """Delete the todo config entry and counter helper for a member.

    Each side is attempted independently and failures are *reported*, not
    raised, so a partial failure never leaves the caller keeping a member
    record that points at a deleted entity. An entity that is already absent
    counts as removed, which makes a retry converge.

    The counter is deleted first: it is the failure-prone side (it reaches into
    the counter component's storage collection), and while the todo list still
    exists the member is fully reconstructable.
    """
    er = er_get(hass)
    leftovers: dict[str, str] = {}

    # --- Counter, via the storage collection ---
    counter_removed = True
    er_counter = er.async_get(counter_entity_id) if counter_entity_id else None
    if er_counter is not None:
        counter_item_id = er_counter.unique_id
        if not counter_item_id:
            counter_removed = False
            leftovers[counter_entity_id] = "counter entity has no unique_id"
            _LOGGER.warning(
                "counter entity %s has no unique_id; cannot delete it",
                counter_entity_id,
            )
        else:
            try:
                sc = _get_counter_storage_collection(hass)
                await sc.async_delete_item(counter_item_id)
            except Exception as exc:
                # Reported, not raised — see this function's docstring.
                counter_removed = False
                leftovers[counter_entity_id] = str(exc)
                _LOGGER.warning(
                    "Failed to delete counter entity %s: %s", counter_entity_id, exc
                )

    # --- Todo, via its config entry ---
    todo_removed = True
    er_todo = er.async_get(todo_entity_id) if todo_entity_id else None
    if er_todo is not None:
        if not er_todo.config_entry_id:
            todo_removed = False
            leftovers[todo_entity_id] = "todo entity has no config_entry_id"
            _LOGGER.warning(
                "todo entity %s has no config_entry_id; skipping config entry removal",
                todo_entity_id,
            )
        else:
            try:
                await hass.config_entries.async_remove(er_todo.config_entry_id)
            except Exception as exc:
                # Reported, not raised — see this function's docstring.
                todo_removed = False
                leftovers[todo_entity_id] = str(exc)
                _LOGGER.warning(
                    "Failed to delete todo entity %s: %s", todo_entity_id, exc
                )

    return MemberEntityDeletion(
        todo_removed=todo_removed,
        counter_removed=counter_removed,
        leftovers=leftovers,
    )


async def async_recreate_member_todo(hass: HomeAssistant, member: Member) -> str:
    """Recreate only the todo list for *member*, returning its entity_id.

    Per-side recovery for a member whose todo entity went missing while its
    counter survived — the half-state left behind by a partially-completed
    member removal, or by deleting the Local To-do config entry by hand.
    """
    canonical_todo_id = f"todo.{member.slug}"
    er = er_get(hass)

    if er.async_get(canonical_todo_id) is not None:
        raise HomeAssistantError(
            f"Cannot recreate {canonical_todo_id}: an entity with this id already exists."
        )

    todo_entry = await _create_local_todo(hass, member.name)
    actual_todo_id = _find_todo_entity_id(hass, todo_entry.entry_id)
    if actual_todo_id is None:
        await hass.config_entries.async_remove(todo_entry.entry_id)
        raise HomeAssistantError(
            f"No todo entity found after creating local_todo for {member.name!r}."
        )

    if actual_todo_id != canonical_todo_id:
        try:
            er.async_update_entity(actual_todo_id, new_entity_id=canonical_todo_id)
        except Exception as exc:
            await hass.config_entries.async_remove(todo_entry.entry_id)
            raise HomeAssistantError(
                f"Cannot recreate {canonical_todo_id}: an entity with this id already exists. "
                "Delete or rename the conflicting helper before recovering this member."
            ) from exc
        if er.async_get(canonical_todo_id) is None:
            await hass.config_entries.async_remove(todo_entry.entry_id)
            raise HomeAssistantError(
                f"Cannot recreate {canonical_todo_id}: rename did not produce the expected id."
            )

    return canonical_todo_id


async def async_recreate_member_counter(hass: HomeAssistant, member: Member) -> str:
    """Recreate only the streak counter for *member*, returning its entity_id.

    The mirror of :func:`async_recreate_member_todo` for the other half-state.
    The streak restarts at 0 — the old value died with the old helper.
    """
    canonical_counter_id = f"counter.{member.slug}_streak"
    er = er_get(hass)

    if er.async_get(canonical_counter_id) is not None:
        raise HomeAssistantError(
            f"Cannot recreate {canonical_counter_id}: an entity with this id already exists."
        )

    sc = _get_counter_storage_collection(hass)
    item = await sc.async_create_item(
        {
            "name": f"{member.slug}_streak",
            "initial": 0,
            "step": 1,
            "minimum": 0,
            "restore": True,
        }
    )

    registry_counter_id = er.async_get_entity_id("counter", "counter", item["id"])
    if registry_counter_id != canonical_counter_id:
        await sc.async_delete_item(item["id"])
        raise HomeAssistantError(
            f"Cannot recreate {canonical_counter_id}: registry assigned {registry_counter_id!r}. "
            "Delete or rename the conflicting helper before recovering this member."
        )

    return canonical_counter_id


async def async_rename_member_entities(
    hass: HomeAssistant,
    old_todo_id: str,
    new_slug: str,
    old_counter_id: str,
) -> tuple[str, str]:
    """Rename todo + counter entities to reflect a member's new slug.

    The counter helper is deleted and recreated under the new slug so that the
    counter StorageCollection's IDManager frees the old id — otherwise adding a
    new member with the freed slug later would fail with a canonical-id collision.
    The streak value is preserved via ``initial`` on the new item.

    Raises HomeAssistantError if either entity is missing or the target id is taken.
    If the todo rename succeeds but the counter rename fails, the todo rename is rolled back.

    Returns ``(new_todo_entity_id, new_counter_entity_id)``.
    """
    from homeassistant.exceptions import HomeAssistantError

    er = er_get(hass)
    new_todo_id = f"todo.{new_slug}"
    new_counter_id = f"counter.{new_slug}_streak"

    # Preflight: ensure old entities exist and new ids are free.
    if er.async_get(old_todo_id) is None:
        raise HomeAssistantError(f"Entity {old_todo_id!r} not found in registry")
    er_counter = er.async_get(old_counter_id)
    if er_counter is None:
        raise HomeAssistantError(f"Entity {old_counter_id!r} not found in registry")
    if er.async_get(new_todo_id) is not None:
        raise HomeAssistantError(f"Target entity {new_todo_id!r} already exists")
    if er.async_get(new_counter_id) is not None:
        raise HomeAssistantError(f"Target entity {new_counter_id!r} already exists")

    # Preserve current streak value before replacing the counter storage item.
    current_value = 0
    state = hass.states.get(old_counter_id)
    if state and state.state not in (None, "unknown", "unavailable"):
        try:
            current_value = int(state.state)
        except (ValueError, TypeError):
            current_value = 0
    else:
        _LOGGER.warning(
            "Counter state for %s is %r at rename time; streak will reset to 0",
            old_counter_id,
            state.state if state else None,
        )

    sc = _get_counter_storage_collection(hass)

    # Step 1: Create the new counter first — verify canonical id before touching old one.
    # If this fails nothing in the registry has changed yet.
    new_item_id: str | None = None
    try:
        new_item = await sc.async_create_item(
            {
                "name": f"{new_slug}_streak",
                "initial": current_value,
                "step": 1,
                "minimum": 0,
                "restore": True,
            }
        )
        new_item_id = str(new_item["id"])
        # sc.async_create_item already awaits entity registration via the
        # collection change-set listeners; see _create_local_todo for why we
        # must not call async_block_till_done here.

        registry_counter_id = er.async_get_entity_id("counter", "counter", new_item_id)
        if registry_counter_id != new_counter_id:
            raise HomeAssistantError(
                f"Cannot rename to {new_counter_id}: registry assigned {registry_counter_id!r}. "
                "Delete or rename the conflicting helper before renaming this member."
            )
    except Exception as exc:
        if new_item_id is not None:
            try:
                await sc.async_delete_item(new_item_id)
            except Exception:
                pass
        raise HomeAssistantError(
            f"Failed to create new counter entity for {new_slug!r}: {exc}"
        ) from exc

    # Step 2: Rename the todo entity (simple in-memory registry update).
    # Wrap so a rare registry race doesn't leave the new counter orphaned.
    try:
        er.async_update_entity(old_todo_id, new_entity_id=new_todo_id)
    except Exception as exc:
        if new_item_id is not None:
            try:
                await sc.async_delete_item(new_item_id)
            except Exception:
                pass
        raise HomeAssistantError(
            f"Failed to rename todo entity {old_todo_id!r} to {new_todo_id!r}: {exc}"
        ) from exc

    # Step 3: Delete old counter — new one is already verified so rollback on
    # failure means undoing the todo rename and removing the new counter.
    old_item_id = er_counter.unique_id
    try:
        if old_item_id:
            await sc.async_delete_item(old_item_id)
    except Exception as exc:
        er.async_update_entity(new_todo_id, new_entity_id=old_todo_id)
        if new_item_id is not None:
            try:
                await sc.async_delete_item(new_item_id)
            except Exception:
                pass
        raise HomeAssistantError(
            f"Failed to remove old counter entity {old_counter_id!r}: {exc}"
        ) from exc

    return (new_todo_id, new_counter_id)


async def async_ensure_household_entity(hass: HomeAssistant) -> str:
    """Ensure ``todo.lucarne_household`` exists, creating it if necessary.

    Returns the entity_id (always ``todo.lucarne_household``).
    """
    er = er_get(hass)
    if er.async_get(_HOUSEHOLD_ENTITY_ID) is not None:
        return _HOUSEHOLD_ENTITY_ID

    # If a local_todo entry for this name already exists (e.g. after a reload),
    # adopt the entity it owns rather than creating a duplicate. The local_todo
    # config entry is fully set up by the time we get here (HA awaits all entry
    # setups before our async_setup_entry runs), so its entity is in the registry.
    existing = [
        e
        for e in hass.config_entries.async_entries("local_todo")
        if e.data.get("todo_list_name") == _HOUSEHOLD_NAME
    ]
    if existing:
        for ce in existing:
            existing_id = _find_todo_entity_id(hass, ce.entry_id)
            if existing_id is None:
                continue
            if existing_id != _HOUSEHOLD_ENTITY_ID:
                er.async_update_entity(existing_id, new_entity_id=_HOUSEHOLD_ENTITY_ID)
            return _HOUSEHOLD_ENTITY_ID

    todo_entry = await _create_local_todo(hass, _HOUSEHOLD_NAME)

    actual_id = _find_todo_entity_id(hass, todo_entry.entry_id)
    if actual_id is None:
        await hass.config_entries.async_remove(todo_entry.entry_id)
        raise HomeAssistantError("Failed to create todo.lucarne_household entity.")

    if actual_id != _HOUSEHOLD_ENTITY_ID:
        try:
            er.async_update_entity(actual_id, new_entity_id=_HOUSEHOLD_ENTITY_ID)
        except Exception as exc:
            await hass.config_entries.async_remove(todo_entry.entry_id)
            raise HomeAssistantError(
                f"Cannot normalise household entity to {_HOUSEHOLD_ENTITY_ID}: {exc}"
            ) from exc

    return _HOUSEHOLD_ENTITY_ID
