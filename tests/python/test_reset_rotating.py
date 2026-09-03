"""Tests for rotating-task reset behavior (Sub-Phase B)."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN, EVENT_ROTATION_ADVANCED
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.reset_logic import async_perform_daily_reset
from custom_components.lucarne_family.rotation import parse_owners, serialize_owners
from custom_components.lucarne_family.store import LucarneFamilyStore


def _make_entry(
    hass: HomeAssistant, extra_members: list[str] | None = None
) -> MockConfigEntry:
    members_data: list[dict[str, Any]] = []
    for slug in extra_members or []:
        members_data.append(
            Member(
                slug=slug,
                name=slug.capitalize(),
                color="#ff0000",
                avatar=None,
                created_at=datetime.now(UTC),
                preset="adult-none",
                todo_entity_id=f"todo.{slug}",
                streak_counter_id="",
            ).to_dict()
        )
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
    hass: HomeAssistant,
    tmp_path: Path,
    extra_members: list[str] | None = None,
) -> tuple[MockConfigEntry, LucarneFamilyStore]:
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    # Create household todo entity
    await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "lucarne_household"},
    )
    for slug in extra_members or []:
        await hass.config_entries.flow.async_init(
            "local_todo",
            context={"source": "user"},
            data={"todo_list_name": slug},
        )
    await hass.async_block_till_done()

    entry = _make_entry(hass, extra_members=extra_members)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}
    return entry, store


async def _create_rotating_task(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    uid: str,
    summary: str,
    owners: list[str],
    current_owner: str,
    complete: bool = False,
) -> None:
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    assert entity is not None, "household todo entity not found"
    status = TodoItemStatus.COMPLETED if complete else TodoItemStatus.NEEDS_ACTION
    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary=summary, status=status)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid=uid,
        type="rotating",
        summary=summary,
        rotation_owners=serialize_owners(owners),
        current_owner=current_owner,
    )


# ---------------------------------------------------------------------------
# Advance on completion
# ---------------------------------------------------------------------------


async def test_completed_rotating_task_advances_owner(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A completed rotating task advances current_owner and flips to NEEDS_ACTION."""
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob"])

    await _create_rotating_task(
        hass, store, "uid-rot-1", "Pick up milk",
        owners=["alice", "bob"], current_owner="alice", complete=True
    )
    events: list[Any] = []
    hass.bus.async_listen(EVENT_ROTATION_ADVANCED, lambda e: events.append(e))

    reset_count = await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    # Rotating items are NOT counted in total_reset
    assert reset_count == 0

    # current_owner advanced from alice to bob
    row = await store.async_get_task_metadata("uid-rot-1")
    assert row is not None
    assert row["current_owner"] == "bob"

    # Item flipped back to NEEDS_ACTION
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    items = entity.todo_items or []
    item = next((i for i in items if i.uid == "uid-rot-1"), None)
    assert item is not None
    assert item.status == TodoItemStatus.NEEDS_ACTION

    # EVENT_ROTATION_ADVANCED fired with correct from/to
    assert len(events) == 1
    assert events[0].data["uid"] == "uid-rot-1"
    assert events[0].data["from"] == "alice"
    assert events[0].data["to"] == "bob"


async def test_three_owner_rotation_wraps(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Rotation wraps from the last owner back to the first."""
    _entry, store = await _setup(
        hass, tmp_path, extra_members=["alice", "bob", "cara"]
    )

    # Start at cara (last owner)
    await _create_rotating_task(
        hass, store, "uid-rot-2", "Task",
        owners=["alice", "bob", "cara"], current_owner="cara", complete=True
    )

    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    row = await store.async_get_task_metadata("uid-rot-2")
    assert row is not None
    assert row["current_owner"] == "alice"


# ---------------------------------------------------------------------------
# Stay on skip (uncompleted)
# ---------------------------------------------------------------------------


async def test_uncompleted_rotating_task_unchanged_after_reset(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """An uncompleted rotating task is untouched at reset."""
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob"])

    await _create_rotating_task(
        hass, store, "uid-rot-3", "Task",
        owners=["alice", "bob"], current_owner="alice", complete=False
    )

    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    row = await store.async_get_task_metadata("uid-rot-3")
    assert row is not None
    assert row["current_owner"] == "alice"

    # Item remains NEEDS_ACTION
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    items = entity.todo_items or []
    item = next((i for i in items if i.uid == "uid-rot-3"), None)
    assert item is not None
    assert item.status == TodoItemStatus.NEEDS_ACTION


# ---------------------------------------------------------------------------
# Zero valid owners → task deleted
# ---------------------------------------------------------------------------


async def test_rotating_task_deleted_when_no_valid_owners(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Rotating task with no valid owners is deleted at reset."""
    # Note: extra_members list does NOT include alice or bob; they've been removed
    _entry, store = await _setup(hass, tmp_path, extra_members=[])

    # Manually insert a rotating task whose owners are no longer in the family
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    await entity.async_create_todo_item(
        TodoItem(uid="uid-rot-4", summary="Orphaned task", status=TodoItemStatus.COMPLETED)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-rot-4",
        type="rotating",
        summary="Orphaned task",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
    )

    delete_events: list[Any] = []
    hass.bus.async_listen(
        "lucarne_family_task_deleted", lambda e: delete_events.append(e)
    )

    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    row = await store.async_get_task_metadata("uid-rot-4")
    assert row is None

    assert any(e.data["uid"] == "uid-rot-4" for e in delete_events)


# ---------------------------------------------------------------------------
# Rotating items NOT counted in total_reset
# ---------------------------------------------------------------------------


async def test_rotating_not_counted_in_total_reset(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """total_reset counts only routine items; rotating items are excluded."""
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob"])

    # Create a member todo and a routine task
    await hass.config_entries.flow.async_init(
        "local_todo", context={"source": "user"}, data={"todo_list_name": "alice"}
    )
    await hass.async_block_till_done()

    todo_component = hass.data[DATA_COMPONENT]
    alice_entity = todo_component.get_entity("todo.alice")
    await alice_entity.async_create_todo_item(
        TodoItem(uid="uid-routine", summary="Morning", status=TodoItemStatus.COMPLETED)
    )
    await store.async_add_task_metadata(
        member_slug="alice", item_uid="uid-routine", type="routine",
        recurrence="FREQ=DAILY",
    )

    # Also create a completed rotating task
    await _create_rotating_task(
        hass, store, "uid-rot-5", "Task",
        owners=["alice", "bob"], current_owner="alice", complete=True
    )

    reset_count = await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    # Only the routine counts
    assert reset_count == 1


# ---------------------------------------------------------------------------
# Completed one-off chore still deleted (regression)
# ---------------------------------------------------------------------------


async def test_completed_chore_still_deleted_with_rotating_task_present(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Rotating task doesn't interfere with chore deletion at reset."""
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob"])

    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")

    # Completed chore
    await entity.async_create_todo_item(
        TodoItem(uid="uid-chore", summary="Buy groceries", status=TodoItemStatus.COMPLETED)
    )
    await store.async_add_task_metadata(
        member_slug="household", item_uid="uid-chore", type="chore", summary="Buy groceries"
    )

    # Completed rotating task
    await _create_rotating_task(
        hass, store, "uid-rot-6", "Task",
        owners=["alice", "bob"], current_owner="alice", complete=True
    )

    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    # Chore metadata is deleted
    chore_row = await store.async_get_task_metadata("uid-chore")
    assert chore_row is None

    # Rotating task metadata still exists (but advanced)
    rot_row = await store.async_get_task_metadata("uid-rot-6")
    assert rot_row is not None
    assert rot_row["current_owner"] == "bob"


# ---------------------------------------------------------------------------
# Single owner stays with that owner
# ---------------------------------------------------------------------------


async def test_single_owner_rotating_task_stays(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A rotating task with a single valid owner always stays with that owner."""
    # bob removed from family; only alice remains
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice"])

    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    await entity.async_create_todo_item(
        TodoItem(uid="uid-rot-7", summary="Task", status=TodoItemStatus.COMPLETED)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-rot-7",
        type="rotating",
        summary="Task",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
    )

    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    row = await store.async_get_task_metadata("uid-rot-7")
    assert row is not None
    # alice is the only valid owner; next_owner cycles back to alice
    assert row["current_owner"] == "alice"
    assert parse_owners(row["rotation_owners"]) == ["alice"]
