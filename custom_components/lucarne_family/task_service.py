"""Service handlers for task management in the Lucarne Family integration."""
from __future__ import annotations

import logging
import uuid
from typing import Any

import homeassistant.helpers.config_validation as cv
import voluptuous as vol
from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError

from .const import DOMAIN, HOUSEHOLD_ENTITY_ID, HOUSEHOLD_SLUG
from .recurrence import is_valid_rrule
from .rotation import parse_owners, serialize_owners
from .store import LucarneFamilyStore
from .task_adoption import (
    async_adopt_item,
    default_task_metadata,
    find_managed_item,
    resolve_member_slug,
)
from .task_locks import async_task_uid_lock

_LOGGER = logging.getLogger(__name__)
# Aliases to the shared constants in const.py (single source of truth).
_HOUSEHOLD_SLUG = HOUSEHOLD_SLUG
_HOUSEHOLD_ENTITY_ID = HOUSEHOLD_ENTITY_ID
_TASK_TYPES = ("routine", "chore", "rotating")
_TIME_OF_DAY_VALUES = ("anytime", "morning", "afternoon", "night")


def _get_store(hass: HomeAssistant, entry_id: str) -> LucarneFamilyStore:
    return hass.data[DOMAIN][entry_id]["store"]  # type: ignore[no-any-return]


def _get_todo_entity(hass: HomeAssistant, entity_id: str) -> Any:
    """Return the todo entity, raising HomeAssistantError if unavailable."""
    todo_component = hass.data.get(DATA_COMPONENT)
    if todo_component is None:
        raise HomeAssistantError("todo component not loaded")
    entity = todo_component.get_entity(entity_id)
    if entity is None:
        raise HomeAssistantError(f"Todo entity {entity_id!r} not found")
    return entity


def _resolve_todo_entity_id(store: LucarneFamilyStore, member_slug: str) -> str:
    """Map member slug → todo entity_id, raising ServiceValidationError for unknowns."""
    if member_slug == _HOUSEHOLD_SLUG:
        return _HOUSEHOLD_ENTITY_ID
    member = next((m for m in store.get_members() if m.slug == member_slug), None)
    if member is None:
        raise ServiceValidationError(f"Unknown member: {member_slug!r}")
    if not member.todo_entity_id:
        raise HomeAssistantError(f"Member {member_slug!r} has no todo entity configured")
    return member.todo_entity_id


async def _resolve_task_target(
    hass: HomeAssistant, store: LucarneFamilyStore, uid: str
) -> tuple[str, dict[str, Any] | None]:
    """Return ``(todo_entity_id, metadata_or_None)`` for a uid.

    A metadata row names the owning list directly. When there is none — the item
    was created outside ``add_task``, e.g. through HA's to-do panel (issue #111) —
    fall back to scanning the managed lists: the todo entity, not
    ``task_metadata``, is the source of truth for whether a task exists.

    Raises ServiceValidationError only when no managed list holds the uid either.
    """
    metadata = await store.async_get_task_metadata(uid)
    if metadata is not None:
        return _resolve_todo_entity_id(store, metadata["member_slug"]), metadata
    located = find_managed_item(hass, store, uid)
    if located is None:
        raise ServiceValidationError(f"No task found with uid {uid!r}")
    return located[0], None


def _rrule_validator(value: str) -> str:
    if value and not is_valid_rrule(value):
        raise vol.Invalid(f"Invalid RRULE: {value!r}")
    return value


ADD_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("member"): cv.string,
        vol.Required("summary"): vol.All(cv.string, vol.Length(max=200)),
        vol.Optional("type", default="chore"): vol.In(list(_TASK_TYPES)),
        vol.Optional("recurrence", default=""): _rrule_validator,
        vol.Optional("icon", default=""): cv.string,
        vol.Optional("due"): cv.datetime,
        vol.Optional("source", default="manual"): vol.In(["manual", "template", "apple"]),
        vol.Optional("assignee", default=""): cv.string,
        vol.Optional("time_of_day", default="anytime"): vol.In(list(_TIME_OF_DAY_VALUES)),
        vol.Optional("rotation_owners", default=list): [cv.string],
        vol.Optional("current_owner", default=""): cv.string,
    }
)

UPDATE_METADATA_SCHEMA = vol.Schema(
    {
        vol.Required("uid"): cv.string,
        vol.Optional("icon"): cv.string,
        vol.Optional("recurrence"): _rrule_validator,
        vol.Optional("type"): vol.In(list(_TASK_TYPES)),
        vol.Optional("assignee"): cv.string,
        vol.Optional("time_of_day"): vol.In(list(_TIME_OF_DAY_VALUES)),
        vol.Optional("rotation_owners"): [cv.string],
        vol.Optional("current_owner"): cv.string,
    }
)

DELETE_TASK_SCHEMA = vol.Schema({vol.Required("uid"): cv.string})

TOGGLE_TASK_SCHEMA = vol.Schema({vol.Required("uid"): cv.string})


async def async_setup_services(hass: HomeAssistant, entry_id: str) -> None:
    """Register lucarne_family task services. Re-registration replaces the handler."""

    async def handle_add_task(call: ServiceCall) -> ServiceResponse:
        store = _get_store(hass, entry_id)
        known_slugs = {m.slug for m in store.get_members()}
        member_slug: str = call.data["member"]
        summary: str = call.data["summary"]
        task_type: str = call.data.get("type", "chore")
        recurrence: str = call.data.get("recurrence", "")
        icon: str = call.data.get("icon", "")
        due = call.data.get("due")
        source: str = call.data.get("source", "manual")
        assignee: str = call.data.get("assignee", "")
        time_of_day: str = call.data.get("time_of_day", "anytime")
        rotation_owners_raw: list[str] = call.data.get("rotation_owners", [])
        current_owner_raw: str = call.data.get("current_owner", "")

        if member_slug != _HOUSEHOLD_SLUG and member_slug not in known_slugs:
            raise ServiceValidationError(f"Unknown member: {member_slug!r}")
        if assignee and member_slug != _HOUSEHOLD_SLUG:
            raise ServiceValidationError("assignee is only valid for household tasks")
        if assignee and member_slug == _HOUSEHOLD_SLUG and assignee not in known_slugs:
            raise ServiceValidationError(f"Unknown assignee: {assignee!r}")

        rotation_owners_str = ""
        resolved_current_owner = ""

        if task_type == "rotating":
            if member_slug != _HOUSEHOLD_SLUG:
                raise ServiceValidationError(
                    "rotating tasks must use member='household'"
                )
            if recurrence:
                raise ServiceValidationError(
                    "rotating tasks must not have a recurrence rule"
                )
            # Validate owners: de-duplicate preserving order, check membership
            owners_deduped: list[str] = []
            seen_owners: set[str] = set()
            for slug in rotation_owners_raw:
                if slug not in known_slugs:
                    raise ServiceValidationError(
                        f"Unknown rotation_owners member: {slug!r}"
                    )
                if slug not in seen_owners:
                    seen_owners.add(slug)
                    owners_deduped.append(slug)
            if len(owners_deduped) < 2:
                raise ServiceValidationError(
                    "rotating tasks require at least 2 owners in rotation_owners"
                )
            resolved_current_owner = current_owner_raw or owners_deduped[0]
            if resolved_current_owner not in owners_deduped:
                raise ServiceValidationError(
                    f"current_owner {resolved_current_owner!r} must be in rotation_owners"
                )
            rotation_owners_str = serialize_owners(owners_deduped)

        todo_entity_id = _resolve_todo_entity_id(store, member_slug)
        entity = _get_todo_entity(hass, todo_entity_id)

        item_uid = str(uuid.uuid4())
        # Create and INSERT under the uid lock. The uid is freshly minted, but
        # async_create_todo_item publishes the item — uid included — to every
        # WebSocket subscriber before it returns, so a delete_task naming it can
        # arrive before the INSERT lands and orphan the row (issue #114).
        async with async_task_uid_lock(item_uid):
            await entity.async_create_todo_item(
                TodoItem(
                    uid=item_uid,
                    summary=summary,
                    status=TodoItemStatus.NEEDS_ACTION,
                    due=due,
                )
            )
            try:
                await store.async_add_task_metadata(
                    member_slug=member_slug,
                    item_uid=item_uid,
                    type=task_type,
                    recurrence=recurrence,
                    icon=icon,
                    source=source,
                    assignee_slug=assignee,
                    summary=summary,
                    time_of_day=time_of_day,
                    rotation_owners=rotation_owners_str,
                    current_owner=resolved_current_owner,
                )
            except Exception:
                # Best-effort rollback: remove the orphaned todo item.
                await entity.async_delete_todo_items([item_uid])
                raise
        hass.bus.async_fire(
            "lucarne_family_task_added",
            {"member": member_slug, "uid": item_uid, "type": task_type, "summary": summary},
        )
        # Return the new uid so the frontend can reconcile its optimistic insert
        # (the chores card flips a freshly-added row in immediately; the slow
        # family-state subscription on some clients can't be relied on to deliver
        # the add promptly). HA only surfaces this response to callers that pass
        # return_response=True; for everyone else the return value is ignored.
        return {"uid": item_uid}

    async def handle_update_task_metadata(call: ServiceCall) -> None:
        store = _get_store(hass, entry_id)
        uid: str = call.data["uid"]

        metadata = await store.async_get_task_metadata(uid)
        # Unlike delete/toggle, this handler needs a row to write to, so an item
        # created outside add_task (issue #111) has to be adopted. The adoption is
        # *deferred* until every validation below has passed: adopting enrolls the
        # item into reset_logic's completed-chore sweep, and a call the user got an
        # error back from must not leave that behind. Until then we validate
        # against the row adoption would write.
        pending_adoption: tuple[str, str] | None = None
        if metadata is None:
            located = find_managed_item(hass, store, uid)
            if located is None:
                raise ServiceValidationError(f"No task found with uid {uid!r}")
            adopt_entity_id, adopt_item = located
            adopt_slug = resolve_member_slug(adopt_entity_id, store)
            if not adopt_slug:
                raise HomeAssistantError(
                    f"Todo entity {adopt_entity_id!r} maps to no known member"
                )
            metadata = default_task_metadata(uid, adopt_slug, adopt_item)
            # Only the entity + slug are carried forward. async_adopt_item re-reads
            # the item itself, so a concurrent delete during validation is caught
            # there rather than adopting an item that no longer exists.
            pending_adoption = (adopt_entity_id, adopt_slug)

        assignee = call.data.get("assignee")
        if assignee is not None and metadata.get("member_slug") != _HOUSEHOLD_SLUG:
            raise ServiceValidationError("assignee can only be set on household tasks")
        if assignee:
            known_slugs = {m.slug for m in store.get_members()}
            if assignee not in known_slugs:
                raise ServiceValidationError(f"Unknown assignee: {assignee!r}")

        update_fields: dict[str, Any] = {}
        for field_name in ("icon", "recurrence", "type", "time_of_day"):
            if field_name in call.data:
                update_fields[field_name] = call.data[field_name]
        if "assignee" in call.data:
            update_fields["assignee_slug"] = call.data["assignee"]

        # Validate and serialize rotating-task owner fields when provided.
        new_owners_raw = call.data.get("rotation_owners")
        new_current_owner = call.data.get("current_owner")
        effective_type = update_fields.get("type", metadata.get("type", ""))

        # Enforce the rotating-task invariants whenever the effective type is
        # rotating — whether the task already is rotating or is being converted
        # to it via this update. A rotating task must live in the household list
        # and never carry an RRULE; converting to rotating must supply owners so
        # we never persist type=rotating with an empty owners list.
        if effective_type == "rotating":
            if metadata.get("member_slug") != _HOUSEHOLD_SLUG:
                raise ServiceValidationError(
                    "rotating tasks must live in the household list"
                )
            if update_fields.get("recurrence"):
                raise ServiceValidationError(
                    "rotating tasks cannot have a recurrence"
                )
            converting_to_rotating = (
                update_fields.get("type") == "rotating"
                and metadata.get("type") != "rotating"
            )
            if converting_to_rotating and new_owners_raw is None:
                raise ServiceValidationError(
                    "converting a task to rotating requires rotation_owners"
                )

        if new_owners_raw is not None or new_current_owner is not None:
            if effective_type != "rotating":
                raise ServiceValidationError(
                    "rotation_owners / current_owner can only be set on rotating tasks"
                )
            known_slugs = {m.slug for m in store.get_members()}
            if new_owners_raw is not None:
                owners_deduped: list[str] = []
                seen_owners: set[str] = set()
                for slug in new_owners_raw:
                    if slug not in known_slugs:
                        raise ServiceValidationError(
                            f"Unknown rotation_owners member: {slug!r}"
                        )
                    if slug not in seen_owners:
                        seen_owners.add(slug)
                        owners_deduped.append(slug)
                if len(owners_deduped) < 1:
                    raise ServiceValidationError(
                        "rotation_owners must have at least 1 owner"
                    )
                update_fields["rotation_owners"] = serialize_owners(owners_deduped)
                # Re-validate current_owner against the new list
                existing_current = new_current_owner or metadata.get("current_owner", "")
                if existing_current and existing_current not in owners_deduped:
                    raise ServiceValidationError(
                        f"current_owner {existing_current!r} must be in rotation_owners"
                    )
            if new_current_owner is not None:
                # Validate against whichever owners list is authoritative
                effective_owners_raw = (
                    call.data["rotation_owners"]
                    if new_owners_raw is not None
                    else parse_owners(metadata.get("rotation_owners", ""))
                )
                if new_current_owner not in effective_owners_raw:
                    raise ServiceValidationError(
                        f"current_owner {new_current_owner!r} must be in rotation_owners"
                    )
                update_fields["current_owner"] = new_current_owner

        # Converting a task to rotating without an explicit current_owner: seed
        # it from the first owner so the task never lands ownerless (which would
        # break the daily-reset advance and column routing).
        if (
            effective_type == "rotating"
            and "current_owner" not in update_fields
            and not metadata.get("current_owner")
        ):
            seeded_owners = parse_owners(
                update_fields.get("rotation_owners")
                or metadata.get("rotation_owners", "")
            )
            if seeded_owners:
                update_fields["current_owner"] = seeded_owners[0]

        # Every validation passed, so the deferred adoption is now safe to commit.
        # Skipped for a fields-less call: async_update_task_metadata early-returns
        # on an empty update set, so adopting there would arm the daily-reset sweep
        # while changing nothing — the same trade the deferral exists to avoid.
        if pending_adoption is not None and update_fields:
            adopt_entity_id, adopt_slug = pending_adoption
            adopted = await async_adopt_item(
                hass, store, adopt_entity_id, uid, adopt_slug
            )
            if not adopted and await store.async_get_task_metadata(uid) is None:
                # Adoption declined and no row appeared, so the item went away
                # while this call was validating. Without this the UPDATE below
                # matches nothing and the event still tells the caller the edit
                # landed.
                raise ServiceValidationError(f"No task found with uid {uid!r}")

        await store.async_update_task_metadata(uid, **update_fields)
        hass.bus.async_fire("lucarne_family_task_metadata_updated", {"uid": uid})

    async def handle_delete_task(call: ServiceCall) -> None:
        store = _get_store(hass, entry_id)
        uid: str = call.data["uid"]

        todo_entity_id, _metadata = await _resolve_task_target(hass, store, uid)
        entity = _get_todo_entity(hass, todo_entity_id)

        # Both deletes under the uid lock: an adopting INSERT is an executor hop,
        # so a delete slipping between the metadata DELETE and the item removal
        # would let that INSERT land afterwards and orphan a row nothing reaps
        # (issue #114). See task_locks.
        #
        # Metadata first, item second, so that being cancelled between the two —
        # each is an executor hop, and HA cancels service-call tasks at shutdown
        # (a dropped WebSocket does *not* cancel them: async_response dispatches
        # each command as a background task, and connection teardown cancels only
        # the connection's own handler and writer) — leaves the *benign* half-state:
        # an item with no row, which is exactly what every un-adopted item already
        # is and which the cards render via buildRenderableTasks' fallback. The
        # reverse order leaves the unreapable orphan this whole change exists to
        # prevent. No inserter can observe the intermediate state; the lock
        # excludes them.
        #
        # An item delete that *raises* splits two ways.
        #
        # ical's store raises on a missing uid. That is the common case, and it
        # is the #116 row whose item was already removed outside Lucarne: nothing
        # is left to clean up, and this order reaps the row where the reverse
        # order never could, since the raise came first. A retry just reports
        # "No task found" — find_managed_item has no list holding the uid.
        #
        # A failed ics *write* is the narrower branch, and its cost is real: the
        # row is gone while the item survives, so until the user re-edits the task
        # in Lucarne (which re-adopts it), a routine reads back as the fallback
        # chore and drops out of both routine_uids and the streak evaluator.
        # Accepted because that state is *visible* — the item is still listed and
        # the caller got the error, the card gating its optimistic removal on
        # success — where the reverse order's residue is neither visible nor
        # recoverable. Note it is not retry-fixable either: local_todo mutates the
        # in-memory calendar before it saves and skips the state refresh when the
        # save raises, so todo_items stays stale, and the retry re-raises
        # missing-uid until the local_todo entry reloads.
        #
        # Restoring the row on failure was considered and rejected: the commonest
        # raise *is* the missing-uid case, so a blanket restore would re-create
        # exactly the #116 orphan, and a conditional one would need its own
        # cancellation handling in the except (#118).
        async with async_task_uid_lock(uid):
            # Unconditional: the DELETE is a no-op when the item was never adopted,
            # and gating it on the earlier read would leak a row for an item that
            # gets adopted between that read and this call.
            await store.async_delete_task_metadata(uid)
            await entity.async_delete_todo_items([uid])
        hass.bus.async_fire("lucarne_family_task_deleted", {"uid": uid})

    async def handle_toggle_task(call: ServiceCall) -> None:
        store = _get_store(hass, entry_id)
        uid: str = call.data["uid"]

        todo_entity_id, _metadata = await _resolve_task_target(hass, store, uid)
        entity = _get_todo_entity(hass, todo_entity_id)

        items = entity.todo_items or []
        item = next((i for i in items if i.uid == uid), None)
        if item is None:
            raise HomeAssistantError(f"Todo item {uid!r} not found in {todo_entity_id!r}")

        is_completing = item.status != TodoItemStatus.COMPLETED
        new_status = TodoItemStatus.COMPLETED if is_completing else TodoItemStatus.NEEDS_ACTION
        action = "completed" if is_completing else "undone"

        # Include all existing fields to avoid overwriting due/description with None.
        await entity.async_update_todo_item(
            TodoItem(
                uid=uid,
                summary=item.summary,
                status=new_status,
                due=item.due,
                description=item.description,
            )
        )
        # Phase 3: completion_listener is now the authoritative source for the
        # completion log. toggle_task must NOT append here or a double row appears
        # for every card tap (once from this handler, once from the state-change
        # listener). The state change triggered by async_update_todo_item above
        # is what drives the log entry.
        hass.bus.async_fire("lucarne_family_task_toggled", {"uid": uid, "action": action})

    async def handle_perform_daily_reset(_call: ServiceCall) -> None:
        from .reset_logic import async_perform_daily_reset

        store = _get_store(hass, entry_id)
        reset_count = await async_perform_daily_reset(hass, store)
        _LOGGER.debug("Daily reset: %d items reset", reset_count)

    async def handle_evaluate_all_streaks(_call: ServiceCall) -> None:
        from datetime import UTC, datetime

        from .streak_logic import async_apply_streak, async_evaluate_streak

        store = _get_store(hass, entry_id)
        as_of = datetime.now(UTC)
        for member in store.get_members():
            new_streak = await async_evaluate_streak(hass, store, member, as_of)
            await async_apply_streak(hass, store, member, new_streak)
        _LOGGER.debug("Evaluated streaks for %d members", len(store.get_members()))

    hass.services.async_register(
        DOMAIN,
        "add_task",
        handle_add_task,
        schema=ADD_TASK_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN, "update_task_metadata", handle_update_task_metadata, schema=UPDATE_METADATA_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "delete_task", handle_delete_task, schema=DELETE_TASK_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "toggle_task", handle_toggle_task, schema=TOGGLE_TASK_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "perform_daily_reset", handle_perform_daily_reset, schema=vol.Schema({})
    )
    hass.services.async_register(
        DOMAIN, "evaluate_all_streaks", handle_evaluate_all_streaks, schema=vol.Schema({})
    )


async def async_unload_services(hass: HomeAssistant) -> None:
    """Remove lucarne_family task services."""
    for service in (
        "add_task",
        "update_task_metadata",
        "delete_task",
        "toggle_task",
        "perform_daily_reset",
        "evaluate_all_streaks",
    ):
        hass.services.async_remove(DOMAIN, service)
