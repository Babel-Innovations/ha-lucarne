"""Tests for adoption of todo items created outside add_task (issue #111).

Items added through plain ``todo.add_item`` — HA's to-do panel, voice, the
Companion app, an agent/MCP call — land in ``local_todo`` with no ``task_metadata``
row. The write services used to treat that table as the existence check and reject
them, while the cards rendered them normally.
"""
from __future__ import annotations

import asyncio
import threading
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.apple_sentinel_backfill import (
    async_backfill_apple_sentinel,
)
from custom_components.lucarne_family.completion_listener import (
    async_start_completion_listener,
)
from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import (
    Member,
    RoutinePreset,
    RoutineTemplate,
)
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.task_adoption import (
    async_adopt_item,
    default_task_metadata,
    find_managed_item,
    managed_todo_entity_ids,
    resolve_member_slug,
)
from custom_components.lucarne_family.task_locks import lock_holders
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


# ---------------------------------------------------------------------------
# Orphan race: a delete landing inside the adopting INSERT (issue #114)
# ---------------------------------------------------------------------------


async def _hold_until_contender_settles(
    contender_done: asyncio.Event, uid: str = ORPHAN_UID
) -> None:
    """Block until the concurrent contender either finished or parked on the lock.

    Direction-neutral on purpose: most tests here hold an insert-side step open
    and the contender is a ``delete_task``, but the delete-side scope test holds
    the item removal open and the contender is an adopter.

    Called from inside whichever step of the critical section the test is holding
    open. The two adoption-shaped paths hold only the INSERT. The two
    create-then-INSERT paths hold **both** the create and the INSERT, and need
    both: gating on the create alone misses an INSERT moved out of the lock (the
    delete resumes on release and still finishes last), and gating on the INSERT
    alone misses a *create* moved out. Each gate is paired with an assertion that
    the delete is still parked, which is what turns "moved out of the lock" into a
    deterministic failure rather than a coin flip.

    Both outcomes are observable without a timeout, which is what keeps these
    tests deterministic in *both* directions: unserialized, the delete runs to
    completion inside the held step (the bug); serialized, it parks on the uid
    lock and ``lock_holders`` counts it. A plain "run the delete inside the
    patched INSERT" — the pattern the rest of this file uses — would deadlock the
    moment the lock exists, since the delete could never complete.

    Treating *any* second holder as "the contender" is only sound because
    ``_setup`` does not start the completion listener: with it running, the
    appeared-branch ``async_backfill_apple_sentinel`` would take the same uid's
    lock and release this gate before the contending task even exists, so the race
    tests would pass vacuously. If the listener ever moves into ``_setup``,
    replace this with a contender-specific signal.
    """
    for _ in range(2000):
        if contender_done.is_set() or lock_holders(uid) > 1:
            return
        await asyncio.sleep(0.001)
    pytest.fail("the contender neither completed nor took the uid lock")


async def test_delete_during_adoption_insert_leaves_no_orphan_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A delete completing inside the adopting INSERT must not leave a row behind.

    The INSERT is an executor hop, so ``delete_task`` can remove the todo item
    *and* run its unconditional metadata DELETE entirely within it — the INSERT
    then lands afterwards on an item that no longer exists. Nothing reaps such a
    row, and ``update_task_metadata`` applies ``type: "routine"`` to it straight
    after adopting, which permanently suppresses that member's
    ``all_routines_done`` (issue #114).
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    original_add = store.async_add_task_metadata
    insert_reached = asyncio.Event()
    delete_done = asyncio.Event()

    async def _gated_add(*args: Any, **kwargs: Any) -> None:
        insert_reached.set()
        await _hold_until_contender_settles(delete_done)
        await original_add(*args, **kwargs)

    async def _delete() -> None:
        try:
            await hass.services.async_call(
                DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
            )
        finally:
            delete_done.set()

    with patch.object(store, "async_add_task_metadata", _gated_add):
        update = asyncio.create_task(
            hass.services.async_call(
                DOMAIN,
                "update_task_metadata",
                {"uid": ORPHAN_UID, "type": "routine", "recurrence": "FREQ=DAILY"},
                blocking=True,
            )
        )
        async with asyncio.timeout(5):
            await insert_reached.wait()
        deletion = asyncio.create_task(_delete())
        results = await asyncio.gather(update, deletion, return_exceptions=True)
    # Both calls must succeed on their own terms: the empty end state is reached
    # either way, so without this a regression that *raised* would still pass.
    assert not [r for r in results if isinstance(r, BaseException)]

    assert await store.async_get_task_metadata(ORPHAN_UID) is None
    assert ORPHAN_UID not in _uids(hass, "todo.anna")


async def test_delete_during_apple_backfill_insert_leaves_no_orphan_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The sentinel backfill has adoption's shape, so it needs adoption's guard."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna", description="Synced [apple:abc-123]")

    original_add = store.async_add_task_metadata
    insert_reached = asyncio.Event()
    delete_done = asyncio.Event()

    async def _gated_add(*args: Any, **kwargs: Any) -> None:
        insert_reached.set()
        await _hold_until_contender_settles(delete_done)
        await original_add(*args, **kwargs)

    async def _delete() -> None:
        try:
            await hass.services.async_call(
                DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
            )
        finally:
            delete_done.set()

    with patch.object(store, "async_add_task_metadata", _gated_add):
        backfill = asyncio.create_task(
            async_backfill_apple_sentinel(hass, store, "todo.anna", ORPHAN_UID, "anna")
        )
        async with asyncio.timeout(5):
            await insert_reached.wait()
        deletion = asyncio.create_task(_delete())
        results = await asyncio.gather(backfill, deletion, return_exceptions=True)
    assert not [r for r in results if isinstance(r, BaseException)]

    assert await store.async_get_task_metadata(ORPHAN_UID) is None
    assert ORPHAN_UID not in _uids(hass, "todo.anna")


async def test_delete_during_add_task_insert_leaves_no_orphan_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A fresh uuid4 is not private: the item is published before the INSERT.

    ``async_create_todo_item`` pushes the new item — uid included — to every
    WebSocket subscriber before it returns, so ``delete_task`` can name it while
    ``add_task``'s own metadata INSERT is still in flight. Same orphan, same fix.
    """
    _entry, store = await _setup(hass, tmp_path)

    entity = _get_entity(hass, "todo.anna")
    original_create = entity.async_create_todo_item
    original_add = store.async_add_task_metadata
    item_created = asyncio.Event()
    delete_done = asyncio.Event()
    new_uid = ""

    # Two gates, because either one alone has a blind spot. Gating only on the
    # create misses an INSERT moved out of the lock: the delete resumes when the
    # shortened critical section releases and still lands its metadata DELETE
    # last, so the end state looks clean. Gating only on the INSERT misses a
    # create moved out. Each gate asserts the delete is *still parked*, which is
    # what makes either regression fail deterministically.
    async def _gated_create(item: TodoItem) -> None:
        nonlocal new_uid
        await original_create(item)
        new_uid = item.uid or ""
        item_created.set()
        await _hold_until_contender_settles(delete_done, new_uid)

    async def _gated_add(*args: Any, **kwargs: Any) -> None:
        await _hold_until_contender_settles(delete_done, new_uid)
        if delete_done.is_set():
            # pytest.fail, not assert: Failed inherits BaseException, so it escapes
            # handle_add_task's `except Exception` rollback — whose own delete would
            # otherwise raise first and bury this message.
            pytest.fail("INSERT ran outside the uid lock")
        await original_add(*args, **kwargs)

    async def _delete() -> None:
        try:
            await hass.services.async_call(
                DOMAIN, "delete_task", {"uid": new_uid}, blocking=True
            )
        finally:
            delete_done.set()

    with (
        patch.object(entity, "async_create_todo_item", _gated_create),
        patch.object(store, "async_add_task_metadata", _gated_add),
    ):
        add = asyncio.create_task(
            hass.services.async_call(
                DOMAIN,
                "add_task",
                {"member": "anna", "summary": "Practice piano", "type": "routine"},
                blocking=True,
            )
        )
        async with asyncio.timeout(5):
            await item_created.wait()
        deletion = asyncio.create_task(_delete())
        results = await asyncio.gather(add, deletion, return_exceptions=True)
    assert not [r for r in results if isinstance(r, BaseException)]

    assert new_uid
    assert await store.async_get_task_metadata(new_uid) is None
    assert new_uid not in _uids(hass, "todo.anna")


async def test_delete_task_removes_metadata_before_the_item(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The two halves are ordered metadata-first, and the order is load-bearing.

    Both are executor hops, so a cancellation (HA shutdown, or an explicit
    caller cancellation)
    or a raising item delete can land between them. Metadata-first leaves an item
    with no row — what every un-adopted item already is, and what the cards render
    via their fallback. The reverse leaves the unreapable orphan of #114. Pinned
    by making the item delete fail, since nothing else would notice a swap.
    """
    _entry, store = await _setup(hass, tmp_path)
    response = await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Feed the cat", "type": "routine"},
        blocking=True,
        return_response=True,
    )
    assert response is not None
    uid = response["uid"]
    assert await store.async_get_task_metadata(uid) is not None

    entity = _get_entity(hass, "todo.anna")

    # Fail the ics write, not the whole call: local_todo's async_delete_todo_items
    # mutates the in-memory calendar and *then* saves, so failing earlier would
    # model a raise that cannot happen for this branch and would make the retry
    # below look recoverable when it isn't.
    async def _failing_save() -> None:
        raise HomeAssistantError("ics write failed")

    with patch.object(entity, "async_save", _failing_save):
        with pytest.raises(HomeAssistantError, match="ics write failed"):
            await hass.services.async_call(
                DOMAIN, "delete_task", {"uid": uid}, blocking=True
            )

    # Metadata went first, so it is already gone — which is the whole point of the
    # order: the reverse would have left the row with the item unreachable.
    assert await store.async_get_task_metadata(uid) is None
    # The item is still listed, because the state refresh is skipped when the save
    # raises. That listing is stale: the calendar itself no longer holds the uid.
    assert uid in _uids(hass, "todo.anna")

    # So this branch is visible but not retry-fixable — the retry resolves the uid
    # from the stale list and ical's store raises on it again, until local_todo
    # reloads. Pinned so the rationale in handle_delete_task stays honest.
    #
    # A plain HomeAssistantError, not the ServiceValidationError branch: the uid
    # is still listed (the failed save skipped the state refresh), so the
    # post-hoc classification correctly refuses to call this "already removed" —
    # the item really is still in the file (issue #119).
    with pytest.raises(HomeAssistantError, match="Could not remove task") as excinfo:
        await hass.services.async_call(
            DOMAIN, "delete_task", {"uid": uid}, blocking=True
        )
    assert type(excinfo.value) is HomeAssistantError
    # The provider's own message survives as context rather than as the whole
    # error: before #119 this reached the user raw.
    assert "No existing item with uid" in str(excinfo.value)
    assert "No existing item with uid" in str(excinfo.value.__cause__)


async def test_delete_task_reports_an_outside_removal_as_a_validation_error(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The commonest item-delete raise is #116's: the item went, its row stayed.

    ``local_todo`` lets ical's ``TodoStoreError`` out unwrapped and it is not a
    ``HomeAssistantError``, so HA reported it as ``unknown_error`` with an
    "Unexpected exception" traceback and the raw
    "No existing item with uid/recurrence_id: …" reached the user (issue #119).
    Nothing is actually broken here — the task is gone, which is what the caller
    asked for — so it is a ServiceValidationError, which HA logs without a
    traceback.
    """
    _entry, store = await _setup(hass, tmp_path)
    response = await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Feed the cat", "type": "routine"},
        blocking=True,
        return_response=True,
    )
    assert response is not None
    uid = response["uid"]

    # Remove the item the way every path except delete_task does — HA's to-do
    # panel, todo.remove_item, the Companion app — leaving the row behind. The
    # entity's own state refresh drops the uid from todo_items, which is what
    # lets the post-hoc classification tell this branch apart.
    await _get_entity(hass, "todo.anna").async_delete_todo_items([uid])
    assert uid not in _uids(hass, "todo.anna")
    assert await store.async_get_task_metadata(uid) is not None

    with pytest.raises(ServiceValidationError, match="already removed") as excinfo:
        await hass.services.async_call(
            DOMAIN, "delete_task", {"uid": uid}, blocking=True
        )
    # The raw ical wording is what the user used to see; keep it out.
    assert "No existing item with uid" not in str(excinfo.value)
    # Metadata-first is why the raise still reaped #116's orphan.
    assert await store.async_get_task_metadata(uid) is None


async def test_delete_during_preset_seeding_insert_leaves_no_orphan_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Preset seeding is the fourth locked INSERT path; pin it like the other three.

    It has ``add_task``'s create-then-INSERT shape, so it has the same exposure:
    the seeded item is published to WS subscribers before its metadata row lands.
    Without this, a regression moving either half of that pair out of the critical
    section would orphan a seeded routine with nothing to catch it.
    """
    from custom_components.lucarne_family import seed_preset_routines

    _entry, store = await _setup(hass, tmp_path)
    preset = RoutinePreset(
        slug="custom-one",
        display_name="One routine",
        routines=[RoutineTemplate(summary="Yoga", icon="🧘", recurrence="FREQ=DAILY")],
    )
    member = Member(
        slug="anna",
        name="Anna",
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="custom-one",
        todo_entity_id="todo.anna",
        streak_counter_id="counter.anna_streak",
    )

    entity = _get_entity(hass, "todo.anna")
    original_create = entity.async_create_todo_item
    original_add = store.async_add_task_metadata
    item_created = asyncio.Event()
    delete_done = asyncio.Event()
    seeded_uid = ""

    # Both gates, for the reasons spelled out in the add_task race test above.
    async def _gated_create(item: TodoItem) -> None:
        nonlocal seeded_uid
        await original_create(item)
        seeded_uid = item.uid or ""
        item_created.set()
        await _hold_until_contender_settles(delete_done, seeded_uid)

    async def _gated_add(*args: Any, **kwargs: Any) -> None:
        await _hold_until_contender_settles(delete_done, seeded_uid)
        if delete_done.is_set():
            pytest.fail("INSERT ran outside the uid lock")
        await original_add(*args, **kwargs)

    async def _delete() -> None:
        try:
            await hass.services.async_call(
                DOMAIN, "delete_task", {"uid": seeded_uid}, blocking=True
            )
        finally:
            delete_done.set()

    with (
        patch.object(entity, "async_create_todo_item", _gated_create),
        patch.object(store, "async_add_task_metadata", _gated_add),
    ):
        seeding = asyncio.create_task(
            seed_preset_routines(
                hass, store, member, extra_presets={"custom-one": preset}
            )
        )
        async with asyncio.timeout(5):
            await item_created.wait()
        deletion = asyncio.create_task(_delete())
        results = await asyncio.gather(seeding, deletion, return_exceptions=True)
    assert not [r for r in results if isinstance(r, BaseException)]

    assert seeded_uid
    assert await store.async_get_task_metadata(seeded_uid) is None
    assert seeded_uid not in _uids(hass, "todo.anna")


async def test_item_removal_stays_inside_the_uid_lock(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """`delete_task` must hold the lock across the item removal, not just the row.

    Every other race test here drives an *inserter* into the lock first, so the
    delete only ever parks on it — which leaves the delete side's own scope
    unpinned. Narrowing the critical section to the metadata DELETE alone passes
    all of them, and is still a #114 regression in this interleaving: the delete
    drops the row and releases, an adopter then sees the still-present item and
    writes a fresh row, and the item is removed afterwards, orphaning it.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    entity = _get_entity(hass, "todo.anna")
    original_delete_items = entity.async_delete_todo_items
    removal_reached = asyncio.Event()
    adopt_done = asyncio.Event()

    async def _gated_delete_items(uids: list[str]) -> None:
        removal_reached.set()
        await _hold_until_contender_settles(adopt_done)
        await original_delete_items(uids)

    async def _adopt() -> None:
        try:
            await hass.services.async_call(
                DOMAIN,
                "update_task_metadata",
                {"uid": ORPHAN_UID, "type": "routine", "recurrence": "FREQ=DAILY"},
                blocking=True,
            )
        finally:
            adopt_done.set()

    with patch.object(entity, "async_delete_todo_items", _gated_delete_items):
        deletion = asyncio.create_task(
            hass.services.async_call(
                DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
            )
        )
        async with asyncio.timeout(5):
            await removal_reached.wait()
        adoption = asyncio.create_task(_adopt())
        results = await asyncio.gather(deletion, adoption, return_exceptions=True)

    # Anything that is not the one expected error — a product failure, or the
    # gate's pytest.fail — must surface with its own message intact.
    for result in results:
        if isinstance(result, BaseException) and not isinstance(
            result, ServiceValidationError
        ):
            raise result
    # And the expected error is pinned by shape, not just by class: a regression
    # that rejected this call during *validation* would never reach the lock, yet
    # would still set adopt_done and leave both end-state assertions holding.
    deletion_result, adoption_result = results
    assert deletion_result is None
    assert isinstance(adoption_result, ServiceValidationError)
    assert "No task found with uid" in str(adoption_result)

    assert await store.async_get_task_metadata(ORPHAN_UID) is None
    assert ORPHAN_UID not in _uids(hass, "todo.anna")


async def test_add_task_rollback_delete_stays_inside_the_uid_lock(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """`add_task`'s rollback delete is inside the lock, and that is load-bearing.

    ``task_locks`` claims the lock covers creation, the INSERT, *and* the rollback
    delete. The last of those is the error path, so nothing else here exercises
    it — yet moving it out is a real #114 regression: the INSERT fails, the lock
    releases, a racing ``update_task_metadata`` sees the still-present item and
    adopts it as a routine, and the rollback then removes the item underneath the
    row it just wrote.
    """
    _entry, store = await _setup(hass, tmp_path)

    entity = _get_entity(hass, "todo.anna")
    original_delete_items = entity.async_delete_todo_items
    rollback_reached = asyncio.Event()
    adopt_done = asyncio.Event()
    new_uid = ""

    async def _failing_add(*args: Any, **kwargs: Any) -> None:
        nonlocal new_uid
        new_uid = kwargs["item_uid"]
        raise HomeAssistantError("insert boom")

    async def _gated_delete_items(uids: list[str]) -> None:
        rollback_reached.set()
        await _hold_until_contender_settles(adopt_done, new_uid)
        await original_delete_items(uids)

    async def _adopt() -> None:
        try:
            await hass.services.async_call(
                DOMAIN,
                "update_task_metadata",
                {"uid": new_uid, "type": "routine", "recurrence": "FREQ=DAILY"},
                blocking=True,
            )
        finally:
            adopt_done.set()

    with (
        patch.object(store, "async_add_task_metadata", _failing_add),
        patch.object(entity, "async_delete_todo_items", _gated_delete_items),
    ):
        add = asyncio.create_task(
            hass.services.async_call(
                DOMAIN,
                "add_task",
                {"member": "anna", "summary": "Practice piano", "type": "routine"},
                blocking=True,
            )
        )
        async with asyncio.timeout(5):
            await rollback_reached.wait()
        adoption = asyncio.create_task(_adopt())
        results = await asyncio.gather(add, adoption, return_exceptions=True)

    # add_task re-raises the seeded INSERT failure after rolling back, and the
    # adopter loses the item to that rollback. Anything else must surface.
    add_result, adoption_result = results
    for result in results:
        if isinstance(result, BaseException) and not isinstance(
            result, HomeAssistantError
        ):
            raise result
    assert isinstance(add_result, HomeAssistantError)
    assert "insert boom" in str(add_result)
    # Pinned by message, not just class: a regression rejecting this call during
    # *validation* would never contend for the lock, yet would still set
    # adopt_done and satisfy both end-state assertions below.
    assert isinstance(adoption_result, ServiceValidationError)
    assert "No task found with uid" in str(adoption_result)

    assert new_uid
    assert await store.async_get_task_metadata(new_uid) is None
    assert new_uid not in _uids(hass, "todo.anna")


async def test_apple_backfill_re_read_stays_inside_the_uid_lock(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The backfill's whole check → re-read → INSERT span must be under the lock.

    Contender-first, unlike the other Apple test: gating the INSERT only ever
    makes the delete *park*, so it cannot see a lock narrowed to the INSERT alone.
    That narrowing is a real #114 regression — the delete removes the item between
    the backfill's re-read and its INSERT, and the row lands on nothing.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna", description="Synced [apple:abc-123]")

    entity = _get_entity(hass, "todo.anna")
    original_delete_items = entity.async_delete_todo_items
    removal_reached = asyncio.Event()
    backfill_done = asyncio.Event()

    async def _gated_delete_items(uids: list[str]) -> None:
        removal_reached.set()
        await _hold_until_contender_settles(backfill_done)
        await original_delete_items(uids)

    async def _backfill() -> None:
        try:
            await async_backfill_apple_sentinel(
                hass, store, "todo.anna", ORPHAN_UID, "anna"
            )
        finally:
            backfill_done.set()

    with patch.object(entity, "async_delete_todo_items", _gated_delete_items):
        deletion = asyncio.create_task(
            hass.services.async_call(
                DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
            )
        )
        async with asyncio.timeout(5):
            await removal_reached.wait()
        backfill = asyncio.create_task(_backfill())
        results = await asyncio.gather(deletion, backfill, return_exceptions=True)

    # Neither side should error: the backfill simply finds no item and declines.
    for result in results:
        if isinstance(result, BaseException):
            raise result

    assert await store.async_get_task_metadata(ORPHAN_UID) is None
    assert ORPHAN_UID not in _uids(hass, "todo.anna")


async def test_cancelling_an_adoption_mid_insert_leaves_no_orphan_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A cancelled adoption must still land its INSERT before releasing the lock.

    The lock makes check → re-read → INSERT atomic only for a holder that runs to
    completion. The INSERT is an executor hop and a started worker cannot be
    cancelled, so cancelling the adopter used to release the lock with the
    statement still in flight: the parked delete then ran both of its halves
    against a table with no row yet, and the INSERT committed afterwards — the
    unreapable #114 orphan, reached without any lock being skipped (issue #118).

    Unlike every other race test here the gate blocks *inside the executor
    thread*, which is the only place that window exists.
    ``_hold_until_contender_settles`` is awaited on the loop and cannot reach it,
    and neither can patching the store coroutine, which is what the rest of this
    file gates on: that would model the drain instead of exercising it.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_orphan(hass, "todo.anna")

    real_connect = store._db_connect
    real_add = store.async_add_task_metadata
    armed = False
    insert_started = threading.Event()
    release = threading.Event()

    def _gated_connect() -> Any:
        nonlocal armed
        if armed:
            # Once only. The parked delete's own metadata DELETE has to get
            # through, or a regression would deadlock here instead of failing on
            # the assertion that names it.
            armed = False
            insert_started.set()
            if not release.wait(10):  # pragma: no cover - a hung test, not a path
                raise TimeoutError("gate was never released")
        return real_connect()

    async def _arming_add(*args: Any, **kwargs: Any) -> None:
        # Armed here, not at patch time, so the adopter's own existence check and
        # item re-read run normally and only the INSERT is held.
        nonlocal armed
        armed = True
        await real_add(*args, **kwargs)

    async def _wait_until(predicate: Callable[[], bool]) -> None:
        async with asyncio.timeout(5):
            while not predicate():
                await asyncio.sleep(0.001)

    results: list[Any] = []
    with (
        patch.object(store, "_db_connect", _gated_connect),
        patch.object(store, "async_add_task_metadata", _arming_add),
    ):
        adoption = asyncio.create_task(
            hass.services.async_call(
                DOMAIN,
                "update_task_metadata",
                {"uid": ORPHAN_UID, "type": "routine", "recurrence": "FREQ=DAILY"},
                blocking=True,
            )
        )
        deletion: asyncio.Task[Any] | None = None
        try:
            await _wait_until(insert_started.is_set)
            deletion = asyncio.create_task(
                hass.services.async_call(
                    DOMAIN, "delete_task", {"uid": ORPHAN_UID}, blocking=True
                )
            )
            await _wait_until(lambda: lock_holders(ORPHAN_UID) > 1)

            adoption.cancel()
            for _ in range(20):
                await asyncio.sleep(0)
            # Both spellings of the same claim: the cancelled adopter still owns
            # the lock, so the delete cannot overtake the INSERT it must follow.
            assert lock_holders(ORPHAN_UID) == 2, "the lock was released mid-INSERT"
            assert not deletion.done()
        finally:
            release.set()
            results = await asyncio.gather(
                *[t for t in (adoption, deletion) if t is not None],
                return_exceptions=True,
            )

    assert isinstance(results[0], asyncio.CancelledError)
    assert results[1] is None
    # INSERT first, then the delete's two halves — so neither is left behind.
    assert await store.async_get_task_metadata(ORPHAN_UID) is None
    assert ORPHAN_UID not in _uids(hass, "todo.anna")
