"""Tests for adoption of todo items created outside add_task (issue #111).

Items added through plain ``todo.add_item`` — HA's to-do panel, voice, the
Companion app, an agent/MCP call — land in ``local_todo`` with no ``task_metadata``
row. The write services used to treat that table as the existence check and reject
them, while the cards rendered them normally.
"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.completion_listener import (
    async_start_completion_listener,
)
from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.task_adoption import (
    async_adopt_item,
    default_task_metadata,
    find_managed_item,
    managed_todo_entity_ids,
    resolve_member_slug,
)
from custom_components.lucarne_family.task_service import async_setup_services

# A real uid from the reported failure: local_todo mints UUID1, add_task mints UUID4.
ORPHAN_UID = "ab3571c0-9db6-11f1-b387-525400288db4"


def _make_entry(hass: HomeAssistant, members: list[str]) -> MockConfigEntry:
    members_data: list[dict[str, Any]] = [
        Member(
            slug=slug,
            name=slug.capitalize(),
            color="#ff0000",
            avatar=None,
            created_at=datetime.now(UTC),
            preset="adult-none",
            todo_entity_id=f"todo.{slug}",
            streak_counter_id=f"counter.{slug}_streak",
        ).to_dict()
        for slug in members
    ]
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": members_data,
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "round_trip": {
                "enabled": False,
                "webhook_url": "",
                "secret": "",
                "device_name": "",
            },
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _setup(
    hass: HomeAssistant, tmp_path: Path, members: list[str] | None = None
) -> tuple[MockConfigEntry, LucarneFamilyStore]:
    """Boot local_todo + todo, create the household list and each member list."""
    members = members if members is not None else ["anna"]

    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    for list_name in ["lucarne_household", *members]:
        await hass.config_entries.flow.async_init(
            "local_todo",
            context={"source": "user"},
            data={"todo_list_name": list_name},
        )
        await hass.async_block_till_done()

    entry = _make_entry(hass, members)
    store = LucarneFamilyStore(hass, entry.entry_id, str(tmp_path / "lucarne.db"))
    await store.async_init()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}
    await async_setup_services(hass, entry.entry_id)
    return entry, store


def _get_entity(hass: HomeAssistant, entity_id: str) -> Any:
    entity = hass.data[DATA_COMPONENT].get_entity(entity_id)
    assert entity is not None, f"Entity {entity_id} not found"
    return entity


async def _add_orphan(
    hass: HomeAssistant,
    entity_id: str,
    uid: str = ORPHAN_UID,
    summary: str = "Attend Back to School Game Night",
    description: str | None = None,
) -> None:
    """Create a todo item the way todo.add_item does — no metadata row."""
    await _get_entity(hass, entity_id).async_create_todo_item(
        TodoItem(
            uid=uid,
            summary=summary,
            status=TodoItemStatus.NEEDS_ACTION,
            description=description,
        )
    )


def _uids(hass: HomeAssistant, entity_id: str) -> list[str]:
    return [i.uid for i in _get_entity(hass, entity_id).todo_items or []]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def test_managed_entity_ids_include_household(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The household list is managed even though it has no Member row."""
    _entry, store = await _setup(hass, tmp_path, members=["anna", "ben"])

    assert set(managed_todo_entity_ids(store)) == {
        "todo.lucarne_household",
        "todo.anna",
        "todo.ben",
    }


async def test_resolve_member_slug_handles_household(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The household entity resolves to the household slug, not an empty string."""
    _entry, store = await _setup(hass, tmp_path)

    assert resolve_member_slug("todo.lucarne_household", store) == "household"
    assert resolve_member_slug("todo.anna", store) == "anna"
    assert resolve_member_slug("todo.someone_else", store) == ""


async def test_find_managed_item_locates_orphan_across_lists(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A uid with no metadata row is still found by scanning the managed lists."""
    _entry, store = await _setup(hass, tmp_path, members=["anna", "ben"])
    await _add_orphan(hass, "todo.ben")

    located = find_managed_item(hass, store, ORPHAN_UID)

    assert located is not None
    entity_id, item = located
    assert entity_id == "todo.ben"
    assert item.summary == "Attend Back to School Game Night"


async def test_find_managed_item_returns_none_for_unknown_uid(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A uid held by no managed list is not found."""
    _entry, store = await _setup(hass, tmp_path)

    assert find_managed_item(hass, store, "no-such-uid") is None


# ---------------------------------------------------------------------------
# delete_task — the reported failure
# ---------------------------------------------------------------------------


async def test_delete_task_removes_orphan_from_member_list(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """delete_task removes an item that has no metadata row (issue #111)."""
    _entry, _store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")
    assert ORPHAN_UID in _uids(hass, "todo.anna")

    await hass.services.async_call(
        DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
    )

    assert ORPHAN_UID not in _uids(hass, "todo.anna")


async def test_delete_task_removes_orphan_from_household_list(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The household list is scanned too — it has no Member row to resolve through."""
    _entry, _store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.lucarne_household")

    await hass.services.async_call(
        DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
    )

    assert ORPHAN_UID not in _uids(hass, "todo.lucarne_household")


async def test_delete_task_still_rejects_uid_in_no_list(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A uid nowhere in the managed lists is still a validation error."""
    _entry, _store = await _setup(hass, tmp_path)

    with pytest.raises(ServiceValidationError, match="No task found with uid"):
        await hass.services.async_call(
            DOMAIN, "delete_task", {"uid": "no-such-uid"}, blocking=True
        )


async def test_delete_task_leaves_other_items_untouched(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Deleting an orphan removes only that item."""
    _entry, _store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")
    await _add_orphan(hass, "todo.anna", uid="keep-me", summary="Keep me")

    await hass.services.async_call(
        DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
    )

    assert _uids(hass, "todo.anna") == ["keep-me"]


# ---------------------------------------------------------------------------
# toggle_task / update_task_metadata
# ---------------------------------------------------------------------------


async def test_toggle_task_flips_orphan_status(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """toggle_task works on an item with no metadata row."""
    _entry, _store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    await hass.services.async_call(
        DOMAIN, "toggle_task", {"uid": ORPHAN_UID}, blocking=True
    )

    item = next(i for i in _get_entity(hass, "todo.anna").todo_items if i.uid == ORPHAN_UID)
    assert item.status == TodoItemStatus.COMPLETED


async def test_update_task_metadata_adopts_orphan_then_updates(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """update_task_metadata adopts the orphan first, then applies the requested change."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    await hass.services.async_call(
        DOMAIN,
        "update_task_metadata",
        {"uid": ORPHAN_UID, "icon": "🏫", "type": "routine"},
        blocking=True,
    )

    metadata = await store.async_get_task_metadata(ORPHAN_UID)
    assert metadata is not None
    assert metadata["member_slug"] == "anna"
    assert metadata["icon"] == "🏫"
    assert metadata["type"] == "routine"


async def test_rejected_update_leaves_orphan_unadopted(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A call that fails validation must not leave the item adopted.

    Adoption enrolls the item into reset_logic's completed-chore sweep, so an
    update the user got an error back from must write nothing at all — otherwise
    a rejected call silently arms the 04:00 deletion.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    # `assignee` is household-only, so this is rejected *after* the adoption point.
    with pytest.raises(ServiceValidationError, match="assignee can only be set"):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": ORPHAN_UID, "assignee": "anna"},
            blocking=True,
        )

    assert await store.async_get_task_metadata(ORPHAN_UID) is None


async def test_rejected_rotating_update_leaves_orphan_unadopted(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Same for the rotating-field guards, validated against the synthesized row."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.lucarne_household")

    with pytest.raises(ServiceValidationError, match="can only be set on rotating"):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": ORPHAN_UID, "current_owner": "anna"},
            blocking=True,
        )

    assert await store.async_get_task_metadata(ORPHAN_UID) is None


async def test_fieldless_update_does_not_adopt(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A call with no fields to update must not adopt either.

    async_update_task_metadata early-returns on an empty update set, so adopting
    would arm the daily-reset sweep while changing nothing.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    await hass.services.async_call(
        DOMAIN, "update_task_metadata", {"uid": ORPHAN_UID}, blocking=True
    )

    assert await store.async_get_task_metadata(ORPHAN_UID) is None


async def test_update_raises_when_item_deleted_during_validation(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A concurrent delete must surface as an error, not a silent no-op.

    The item is located before validation runs. If it disappears in between,
    adoption declines, the UPDATE would match no row, and the caller would still
    be told the edit landed.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    async def _delete_then_adopt(*args: Any, **kwargs: Any) -> bool:
        # Stand in for a delete landing after find_managed_item located the item
        # but before the adoption commits. Delegates to the real implementation,
        # which then declines because the item is gone.
        await _get_entity(hass, "todo.anna").async_delete_todo_items([ORPHAN_UID])
        return await async_adopt_item(*args, **kwargs)

    with patch(
        "custom_components.lucarne_family.task_service.async_adopt_item",
        _delete_then_adopt,
    ):
        with pytest.raises(ServiceValidationError, match="No task found with uid"):
            await hass.services.async_call(
                DOMAIN,
                "update_task_metadata",
                {"uid": ORPHAN_UID, "icon": "🏫"},
                blocking=True,
            )

    assert await store.async_get_task_metadata(ORPHAN_UID) is None


async def test_update_task_metadata_still_rejects_uid_in_no_list(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Nothing to adopt means the original validation error stands."""
    _entry, _store = await _setup(hass, tmp_path)

    with pytest.raises(ServiceValidationError, match="No task found with uid"):
        await hass.services.async_call(
            DOMAIN, "update_task_metadata", {"uid": "no-such-uid", "icon": "🧹"}, blocking=True
        )


# ---------------------------------------------------------------------------
# async_adopt_item
# ---------------------------------------------------------------------------


async def test_adopt_item_writes_manual_chore_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """An item with no Apple sentinel adopts as a plain manual chore."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    assert await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID) is True

    metadata = await store.async_get_task_metadata(ORPHAN_UID)
    assert metadata is not None
    assert metadata["member_slug"] == "anna"
    assert metadata["type"] == "chore"
    assert metadata["source"] == "manual"
    assert metadata["apple_uid"] == ""
    assert metadata["summary"] == "Attend Back to School Game Night"


async def test_adopt_item_preserves_apple_sentinel_source(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A bridge-synced item keeps source=apple and its extracted apple_uid."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna", description="Buy it [apple:bridge-uuid-42]")

    assert await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID) is True

    metadata = await store.async_get_task_metadata(ORPHAN_UID)
    assert metadata is not None
    assert metadata["source"] == "apple"
    assert metadata["apple_uid"] == "bridge-uuid-42"


async def test_adopt_item_is_idempotent(hass: HomeAssistant, tmp_path: Path) -> None:
    """A second adoption never overwrites a row the user may have edited."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")
    await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID)
    await store.async_update_task_metadata(ORPHAN_UID, type="routine")

    assert await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID) is False

    metadata = await store.async_get_task_metadata(ORPHAN_UID)
    assert metadata is not None
    assert metadata["type"] == "routine"


async def test_adopt_item_losing_a_race_returns_false(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A concurrent adoption of the same uid reports "not inserted", never raises.

    The existence check and the INSERT are two awaits apart, so a second adopter
    can land in between and win the item_uid PRIMARY KEY. Simulated by inserting
    the row from inside the patched call, i.e. after the check has already passed.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    original_add = store.async_add_task_metadata

    async def _racing_add(*args: Any, **kwargs: Any) -> None:
        # Another adopter got there first.
        await original_add(
            member_slug="anna", item_uid=ORPHAN_UID, type="routine", summary="Winner"
        )
        await original_add(*args, **kwargs)

    with patch.object(store, "async_add_task_metadata", _racing_add):
        assert await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID) is False

    metadata = await store.async_get_task_metadata(ORPHAN_UID)
    assert metadata is not None
    assert metadata["type"] == "routine"  # the winner's row survives intact


async def test_adopt_item_writes_exactly_the_default_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The written row IS default_task_metadata's dict, not merely similar to it.

    update_task_metadata validates against that dict before committing the
    adoption, so any drift between the two would validate the wrong shape.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna", description="Buy it [apple:bridge-uuid-42]")
    item = _get_entity(hass, "todo.anna").todo_items[0]
    expected = default_task_metadata(ORPHAN_UID, "anna", item)

    await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID)

    written = await store.async_get_task_metadata(ORPHAN_UID)
    assert written is not None
    written.pop("created_at", None)
    assert written == expected


async def test_adopt_item_returns_false_when_item_disappeared(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A uid deleted from the list is not adopted — no row for a vanished item.

    The item is resolved inside async_adopt_item rather than handed in, so a
    delete that lands after the caller located it is still caught here. Nothing
    reaps a metadata row whose todo item is gone.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")
    await _get_entity(hass, "todo.anna").async_delete_todo_items([ORPHAN_UID])

    assert await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID, "anna") is False
    assert await store.async_get_task_metadata(ORPHAN_UID) is None


async def test_adopt_item_returns_false_for_item_not_in_list(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Nothing is written for a uid the named entity doesn't hold."""
    _entry, store = await _setup(hass, tmp_path)

    assert await async_adopt_item(hass, store, "todo.anna", ORPHAN_UID) is False
    assert await store.async_get_task_metadata(ORPHAN_UID) is None


# ---------------------------------------------------------------------------
# Listener adoption on appearance
# ---------------------------------------------------------------------------


async def test_listener_does_not_adopt_plain_item_on_appear(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """An item without an Apple sentinel is left un-adopted as it appears.

    Adoption would give it ``type="chore"``, and reset_logic deletes completed
    chores at the daily-reset window — so ticking off an item added in HA's own
    to-do panel would silently destroy it. ``metadata is None`` is what keeps it
    out of that sweep; see test_orphan_survives_daily_reset_after_completion.
    """
    entry, store = await _setup(hass, tmp_path)
    unsub = async_start_completion_listener(
        hass, store, {"todo.anna", "todo.lucarne_household"}, entry.entry_id
    )
    try:
        await _add_orphan(hass, "todo.anna")
        await hass.async_block_till_done()
    finally:
        unsub()

    assert await store.async_get_task_metadata(ORPHAN_UID) is None


async def test_listener_still_backfills_apple_sentinel_on_appear(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Bridge-synced items keep their existing enrollment — unchanged behaviour."""
    entry, store = await _setup(hass, tmp_path)
    unsub = async_start_completion_listener(
        hass, store, {"todo.anna", "todo.lucarne_household"}, entry.entry_id
    )
    try:
        await _add_orphan(hass, "todo.anna", description="[apple:bridge-uuid-42]")
        await hass.async_block_till_done()
    finally:
        unsub()

    metadata = await store.async_get_task_metadata(ORPHAN_UID)
    assert metadata is not None
    assert metadata["source"] == "apple"
    assert metadata["apple_uid"] == "bridge-uuid-42"


async def test_listener_backfills_apple_sentinel_in_household_list(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Household resolution no longer returns "", so the household list backfills too."""
    entry, store = await _setup(hass, tmp_path)
    unsub = async_start_completion_listener(
        hass, store, {"todo.anna", "todo.lucarne_household"}, entry.entry_id
    )
    try:
        await _add_orphan(
            hass, "todo.lucarne_household", description="[apple:bridge-uuid-7]"
        )
        await hass.async_block_till_done()
    finally:
        unsub()

    metadata = await store.async_get_task_metadata(ORPHAN_UID)
    assert metadata is not None
    assert metadata["member_slug"] == "household"
    assert metadata["apple_uid"] == "bridge-uuid-7"


async def test_orphan_survives_daily_reset_after_completion(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A completed un-adopted item is not swept by the daily reset.

    reset_logic deletes completed `chore` rows. An item added in HA's to-do panel
    must not be destroyed at 04:00 just because Lucarne can now delete it.
    """
    from custom_components.lucarne_family.reset_logic import async_perform_daily_reset

    entry, store = await _setup(hass, tmp_path)
    unsub = async_start_completion_listener(
        hass, store, {"todo.anna", "todo.lucarne_household"}, entry.entry_id
    )
    try:
        await _add_orphan(hass, "todo.anna")
        await hass.async_block_till_done()

        await hass.services.async_call(
            DOMAIN, "toggle_task", {"uid": ORPHAN_UID}, blocking=True
        )
        await hass.async_block_till_done()

        await async_perform_daily_reset(hass, store)
        await hass.async_block_till_done()
    finally:
        unsub()

    assert ORPHAN_UID in _uids(hass, "todo.anna")


async def test_adopted_orphan_is_swept_by_daily_reset(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Editing an orphan in Lucarne adopts it, which does enroll it in the sweep.

    The counterpart to the test above: adoption is the deliberate opt-in, and it
    is only reachable through an explicit update_task_metadata call.
    """
    from custom_components.lucarne_family.reset_logic import async_perform_daily_reset

    entry, store = await _setup(hass, tmp_path)
    unsub = async_start_completion_listener(
        hass, store, {"todo.anna", "todo.lucarne_household"}, entry.entry_id
    )
    try:
        await _add_orphan(hass, "todo.anna")
        await hass.async_block_till_done()

        await hass.services.async_call(
            DOMAIN, "update_task_metadata", {"uid": ORPHAN_UID, "icon": "🏫"}, blocking=True
        )
        await hass.services.async_call(
            DOMAIN, "toggle_task", {"uid": ORPHAN_UID}, blocking=True
        )
        await hass.async_block_till_done()

        await async_perform_daily_reset(hass, store)
        await hass.async_block_till_done()
    finally:
        unsub()

    assert ORPHAN_UID not in _uids(hass, "todo.anna")


async def test_add_task_keeps_its_own_metadata_with_listener_attached(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """add_task's values survive with the listener running.

    The listener sees the new item appear while add_task's metadata INSERT is
    still in flight. It must not write a competing row: that would collide on the
    item_uid PRIMARY KEY, and add_task's ``except Exception`` rollback deletes the
    item the user just added. The interleaving is forced rather than hoped for —
    yielding inside the insert lets the listener task run its whole appeared
    branch first.
    """
    entry, store = await _setup(hass, tmp_path)

    original_add = store.async_add_task_metadata

    async def _slow_add(*args: Any, **kwargs: Any) -> None:
        # Hand control back long enough for the listener task to complete.
        for _ in range(10):
            await asyncio.sleep(0)
        await original_add(*args, **kwargs)

    unsub = async_start_completion_listener(
        hass, store, {"todo.anna", "todo.lucarne_household"}, entry.entry_id
    )
    try:
        with patch.object(store, "async_add_task_metadata", _slow_add):
            await hass.services.async_call(
                DOMAIN,
                "add_task",
                {
                    "member": "anna",
                    "summary": "Brush teeth",
                    "type": "routine",
                    "icon": "🪥",
                    "time_of_day": "morning",
                },
                blocking=True,
            )
            await hass.async_block_till_done()
    finally:
        unsub()

    tasks = await store.async_get_tasks_for_member("anna")
    assert len(tasks) == 1
    assert tasks[0]["type"] == "routine"
    assert tasks[0]["icon"] == "🪥"
    assert tasks[0]["time_of_day"] == "morning"
    # The todo item survived — no PRIMARY KEY collision triggered the rollback.
    assert tasks[0]["item_uid"] in _uids(hass, "todo.anna")


async def test_household_orphan_completion_is_logged(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Completing an adopted household item writes a completion_log row.

    Household resolution previously returned "" and the listener dropped the row.
    """
    entry, store = await _setup(hass, tmp_path)
    unsub = async_start_completion_listener(
        hass, store, {"todo.anna", "todo.lucarne_household"}, entry.entry_id
    )
    try:
        await _add_orphan(hass, "todo.lucarne_household")
        await hass.async_block_till_done()

        await hass.services.async_call(
            DOMAIN, "toggle_task", {"uid": ORPHAN_UID}, blocking=True
        )
        await hass.async_block_till_done()
    finally:
        unsub()

    def _rows() -> list[Any]:
        with store._db_connect() as con:
            return con.execute(
                "SELECT member_slug, action FROM completion_log WHERE item_uid = ?",
                (ORPHAN_UID,),
            ).fetchall()

    rows = await hass.async_add_executor_job(_rows)
    assert [(r["member_slug"], r["action"]) for r in rows] == [("household", "completed")]
