"""Tests for rotating-task completion attribution (Sub-Phase B)."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.completion_listener import (
    async_start_completion_listener,
)
from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.rotation import serialize_owners
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
    hass: HomeAssistant,
    tmp_path: Path,
    extra_members: list[str] | None = None,
) -> tuple[MockConfigEntry, LucarneFamilyStore]:
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "lucarne_household"},
    )
    await hass.async_block_till_done()

    entry = _make_entry(hass, extra_members=extra_members)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}
    return entry, store


def _get_entity(hass: HomeAssistant, entity_id: str):
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity(entity_id)
    assert entity is not None, f"Entity {entity_id} not found"
    return entity


# ---------------------------------------------------------------------------
# Attribution to current_owner (not household)
# ---------------------------------------------------------------------------


async def test_rotating_completion_attributed_to_current_owner(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Completing a rotating task logs the row under current_owner, not household."""
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob"])

    entity = _get_entity(hass, "todo.lucarne_household")
    uid = "uid-rot-completion"

    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary="Pick up milk", status=TodoItemStatus.NEEDS_ACTION)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid=uid,
        type="rotating",
        summary="Pick up milk",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
    )

    unsub = async_start_completion_listener(
        hass, store, {"todo.lucarne_household"}, _entry.entry_id
    )
    await hass.async_block_till_done()

    completed_events: list[Any] = []
    hass.bus.async_listen(
        "lucarne_family_task_completed", lambda e: completed_events.append(e)
    )

    # Complete the item
    await entity.async_update_todo_item(
        TodoItem(uid=uid, summary="Pick up milk", status=TodoItemStatus.COMPLETED)
    )
    await hass.async_block_till_done()

    # Completion log should be attributed to "alice", not "household"
    # We can't directly read completion_log, but lucarne_family_task_completed
    # fires with member=current_owner
    assert len(completed_events) == 1
    assert completed_events[0].data["member"] == "alice"
    assert completed_events[0].data["uid"] == uid

    unsub()


async def test_rotating_completion_fires_task_completed_event(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """lucarne_family_task_completed fires with member=current_owner for rotating tasks."""
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob", "cara"])

    entity = _get_entity(hass, "todo.lucarne_household")
    uid = "uid-rot-c2"

    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary="Task", status=TodoItemStatus.NEEDS_ACTION)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid=uid,
        type="rotating",
        summary="Task",
        rotation_owners=serialize_owners(["alice", "bob", "cara"]),
        current_owner="bob",
    )

    unsub = async_start_completion_listener(
        hass, store, {"todo.lucarne_household"}, _entry.entry_id
    )
    await hass.async_block_till_done()

    events: list[Any] = []
    hass.bus.async_listen("lucarne_family_task_completed", lambda e: events.append(e))

    await entity.async_update_todo_item(
        TodoItem(uid=uid, summary="Task", status=TodoItemStatus.COMPLETED)
    )
    await hass.async_block_till_done()

    assert len(events) == 1
    assert events[0].data["member"] == "bob"

    unsub()


# ---------------------------------------------------------------------------
# All-routines-done NOT fired for rotating completions
# ---------------------------------------------------------------------------


async def test_rotating_completion_does_not_fire_all_routines_done(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Completing a rotating task must not trigger all_routines_done."""
    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob"])

    entity = _get_entity(hass, "todo.lucarne_household")
    uid = "uid-rot-c3"

    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary="Task", status=TodoItemStatus.NEEDS_ACTION)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid=uid,
        type="rotating",
        summary="Task",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
    )

    unsub = async_start_completion_listener(
        hass, store, {"todo.lucarne_household"}, _entry.entry_id
    )
    await hass.async_block_till_done()

    all_done_events: list[Any] = []
    hass.bus.async_listen(
        "lucarne_family_all_routines_done", lambda e: all_done_events.append(e)
    )

    await entity.async_update_todo_item(
        TodoItem(uid=uid, summary="Task", status=TodoItemStatus.COMPLETED)
    )
    await hass.async_block_till_done()

    assert len(all_done_events) == 0

    unsub()


# ---------------------------------------------------------------------------
# Reset of rotating task logs action="reset" (not "undone")
# ---------------------------------------------------------------------------


async def test_rotating_reset_logs_reset_action(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Reset of a rotating task logs action=reset attributed to prev owner (not the new one)."""
    import sqlite3

    from custom_components.lucarne_family.reset_logic import async_perform_daily_reset

    _entry, store = await _setup(hass, tmp_path, extra_members=["alice", "bob"])

    entity = _get_entity(hass, "todo.lucarne_household")
    uid = "uid-rot-c4"

    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary="Task", status=TodoItemStatus.COMPLETED)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid=uid,
        type="rotating",
        summary="Task",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
    )

    unsub = async_start_completion_listener(
        hass, store, {"todo.lucarne_household"}, _entry.entry_id
    )
    await hass.async_block_till_done()

    completed_events: list[Any] = []
    hass.bus.async_listen(
        "lucarne_family_task_completed", lambda e: completed_events.append(e)
    )

    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    # No "completed" event fired from the reset flip (resets don't fire task_completed)
    assert len(completed_events) == 0

    # The completion_log row is attributed to "alice" (prev owner), not "bob" (next owner).
    # This verifies the _RESET_ROTATING_PREV_KEY stash mechanism prevents the race where
    # the async listener reads metadata after current_owner has already been advanced.
    con = sqlite3.connect(store._db_path)
    rows = con.execute(
        "SELECT member_slug, action FROM completion_log WHERE item_uid = ?",
        (uid,),
    ).fetchall()
    con.close()
    assert len(rows) == 1, f"Expected 1 completion_log row, got {rows}"
    assert rows[0] == ("alice", "reset"), (
        f"Reset row should be ('alice', 'reset'), got {rows[0]}"
    )

    unsub()
