"""Tests for completion_listener.py (Phase 3-C).

Verifies that status-change transitions on managed todo entities produce
exactly the right completion_log rows and HA bus events.
"""
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
from custom_components.lucarne_family.store import LucarneFamilyStore

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _make_entry(hass: HomeAssistant, slug: str = "anna") -> MockConfigEntry:
    member = Member(
        slug=slug,
        name=slug.capitalize(),
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [member.to_dict()],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _setup_member_todo(hass: HomeAssistant, slug: str = "anna") -> None:
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()
    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": slug},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"


async def _make_store(
    hass: HomeAssistant, entry_id: str, tmp_path: Path
) -> LucarneFamilyStore:
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry_id, db_path)
    await store.async_init()
    return store


def _get_entity(hass: HomeAssistant, entity_id: str):
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity(entity_id)
    assert entity is not None, f"Entity {entity_id} not found"
    return entity


async def _add_item(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entity_id: str,
    uid: str,
    summary: str,
    item_type: str = "routine",
    member_slug: str = "anna",
    description: str | None = None,
) -> None:
    entity = _get_entity(hass, entity_id)
    await entity.async_create_todo_item(
        TodoItem(
            uid=uid, summary=summary,
            status=TodoItemStatus.NEEDS_ACTION, description=description,
        )
    )
    await store.async_add_task_metadata(
        member_slug=member_slug,
        item_uid=uid,
        type=item_type,
        recurrence="",
    )
    await hass.async_block_till_done()


async def _set_status(
    hass: HomeAssistant,
    entity_id: str,
    uid: str,
    summary: str,
    status: TodoItemStatus,
) -> None:
    entity = _get_entity(hass, entity_id)
    await entity.async_update_todo_item(
        TodoItem(uid=uid, summary=summary, status=status)
    )
    await hass.async_block_till_done()


def _log_rows(store: LucarneFamilyStore, uid: str | None = None) -> list[dict[str, Any]]:
    query = "SELECT member_slug, item_uid, action FROM completion_log"
    params: tuple[()] | tuple[str] = ()
    if uid is not None:
        query += " WHERE item_uid = ?"
        params = (uid,)
    with store._db_connect() as con:
        rows = con.execute(query + " ORDER BY rowid", params).fetchall()
    return [{"member_slug": r[0], "item_uid": r[1], "action": r[2]} for r in rows]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_complete_item_appends_completed_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Mark item complete → completion_log row with action=completed."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item(hass, store, "todo.anna", "uid-1", "Brush teeth")
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    await _set_status(hass, "todo.anna", "uid-1", "Brush teeth", TodoItemStatus.COMPLETED)

    rows = _log_rows(store, "uid-1")
    unsub()
    assert len(rows) == 1
    assert rows[0]["action"] == "completed"
    assert rows[0]["member_slug"] == "anna"


async def test_uncomplete_item_appends_undone_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Mark item completed then uncompleted → log rows: completed, undone."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item(hass, store, "todo.anna", "uid-1", "Make bed")
    # Complete it before the listener starts so the snapshot reflects "completed".
    await _set_status(hass, "todo.anna", "uid-1", "Make bed", TodoItemStatus.COMPLETED)

    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    await _set_status(hass, "todo.anna", "uid-1", "Make bed", TodoItemStatus.NEEDS_ACTION)

    rows = _log_rows(store, "uid-1")
    unsub()
    assert len(rows) == 1
    assert rows[0]["action"] == "undone"


async def test_summary_change_without_status_change_no_log(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Updating an item's summary without changing status produces no log row."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item(hass, store, "todo.anna", "uid-1", "Old summary")
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    entity = _get_entity(hass, "todo.anna")
    await entity.async_update_todo_item(
        TodoItem(uid="uid-1", summary="New summary", status=TodoItemStatus.NEEDS_ACTION)
    )
    await hass.async_block_till_done()

    rows = _log_rows(store, "uid-1")
    unsub()
    assert rows == []


async def test_new_item_added_no_log(hass: HomeAssistant, tmp_path: Path) -> None:
    """Adding a new item to the entity produces no log row (only status changes log)."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    await _add_item(hass, store, "todo.anna", "uid-new", "New routine")

    rows = _log_rows(store, "uid-new")
    unsub()
    assert rows == []


async def test_task_completed_event_fires_on_complete(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Completing a task fires lucarne_family_task_completed event."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item(hass, store, "todo.anna", "uid-1", "Homework")
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    events: list[dict[str, Any]] = []
    hass.bus.async_listen(
        "lucarne_family_task_completed",
        lambda e: events.append(e.data),
    )

    await _set_status(hass, "todo.anna", "uid-1", "Homework", TodoItemStatus.COMPLETED)

    unsub()
    assert len(events) == 1
    assert events[0]["uid"] == "uid-1"
    assert events[0]["member"] == "anna"


async def test_task_completed_event_not_fired_on_undone(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Uncompleting a task does NOT fire lucarne_family_task_completed."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item(hass, store, "todo.anna", "uid-1", "Homework")
    await _set_status(hass, "todo.anna", "uid-1", "Homework", TodoItemStatus.COMPLETED)

    unsub = async_start_completion_listener(hass, store, {"todo.anna"})
    events: list[dict[str, Any]] = []
    hass.bus.async_listen(
        "lucarne_family_task_completed",
        lambda e: events.append(e.data),
    )

    await _set_status(hass, "todo.anna", "uid-1", "Homework", TodoItemStatus.NEEDS_ACTION)
    unsub()
    assert events == []


async def test_pinned_version_snapshot_fallback_logs_once(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Pinned-version compatibility: state does not expose 'items'; snapshot fallback logs once.

    HA's local_todo state does not expose an `items` attribute (confirmed via
    the docstring in completion_listener.py). This test verifies the per-entity
    snapshot diff path still produces exactly one log row per status transition.
    """
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item(hass, store, "todo.anna", "uid-1", "Chore")
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    # Verify that the state object does NOT expose an `items` attribute.
    state = hass.states.get("todo.anna")
    assert state is not None
    assert "items" not in state.attributes, (
        "todo.anna state now exposes 'items' — update completion_listener.py to use "
        "it directly instead of the per-entity snapshot fallback"
    )

    await _set_status(hass, "todo.anna", "uid-1", "Chore", TodoItemStatus.COMPLETED)

    rows = _log_rows(store, "uid-1")
    unsub()
    assert len(rows) == 1
    assert rows[0]["action"] == "completed"


async def test_only_managed_entities_are_logged(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Status changes on unmanaged entities produce no log rows."""
    await _setup_member_todo(hass, "anna")

    # Also create an unmanaged entity.
    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "unmanaged"},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"

    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    # Listener only tracks anna's entity.
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    # Add to unmanaged entity (no metadata so member_slug won't resolve).
    unmanaged = _get_entity(hass, "todo.unmanaged")
    await unmanaged.async_create_todo_item(
        TodoItem(uid="x-1", summary="Foreign task", status=TodoItemStatus.NEEDS_ACTION)
    )
    await unmanaged.async_update_todo_item(
        TodoItem(uid="x-1", summary="Foreign task", status=TodoItemStatus.COMPLETED)
    )
    await hass.async_block_till_done()

    rows = _log_rows(store)
    unsub()
    assert rows == []


async def test_all_routines_done_event_fires_on_last_completion(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """all_routines_done fires exactly once when the last routine is completed (Phase 3-F)."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    # Two routines; also one chore to verify chore completions don't re-fire the event.
    await _add_item(hass, store, "todo.anna", "r-1", "Brush teeth", "routine")
    await _add_item(hass, store, "todo.anna", "r-2", "Make bed", "routine")
    await _add_item(hass, store, "todo.anna", "c-1", "Take out trash", "chore")

    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    new_events: list[str] = []
    legacy_events: list[str] = []
    hass.bus.async_listen(
        "lucarne_family_all_routines_done", lambda e: new_events.append(e.data["member"])
    )
    hass.bus.async_listen(
        "ha_lucarne_chores_all_done", lambda e: legacy_events.append(e.data["member"])
    )

    # Complete first routine — not yet all done.
    await _set_status(hass, "todo.anna", "r-1", "Brush teeth", TodoItemStatus.COMPLETED)
    assert new_events == []

    # Complete second routine — now all routines done.
    await _set_status(hass, "todo.anna", "r-2", "Make bed", TodoItemStatus.COMPLETED)
    assert new_events == ["anna"]
    assert legacy_events == ["anna"]

    # Complete chore — must NOT re-fire all-routines-done.
    await _set_status(hass, "todo.anna", "c-1", "Take out trash", TodoItemStatus.COMPLETED)
    assert new_events == ["anna"]  # still only once

    unsub()
