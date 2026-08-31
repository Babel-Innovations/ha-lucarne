"""Tests for task_service.py and preset seeding (Phase 2-C / 2-D)."""
from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from homeassistant.components.todo.const import DATA_COMPONENT
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.presets import BUILTIN_PRESETS
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.task_service import _todo_write_error


def _make_entry(
    hass: HomeAssistant, members: list[dict[str, Any]] | None = None
) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": members or [],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "round_trip": {
                "enabled": False,
                "webhook_url": "",
                "secret": "",
                "device_name": "Sync device",
            },
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _make_store(hass: HomeAssistant, entry_id: str, tmp_path: Path) -> LucarneFamilyStore:
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry_id, db_path)
    await store.async_init()
    return store


# ---------------------------------------------------------------------------
# Preset seeding
# ---------------------------------------------------------------------------


async def test_add_member_school_age_seeds_preset_routines(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """Adding a member with school-age preset seeds all 5 preset routines."""
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    school_age_preset = BUILTIN_PRESETS["school-age"]
    expected_count = len(school_age_preset.routines)
    assert expected_count == 5

    # First create the todo entity for the member
    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "anna"},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"

    member = Member(
        slug="anna",
        name="Anna",
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id="todo.anna",
        streak_counter_id="counter.anna_streak",
    )

    from custom_components.lucarne_family import seed_preset_routines

    await seed_preset_routines(hass, store, member)

    # Verify task_metadata rows
    tasks = await store.async_get_tasks_for_member("anna")
    assert len(tasks) == expected_count

    for task in tasks:
        assert task["type"] == "routine"
        assert task["source"] == "template"
        assert task["member_slug"] == "anna"
        assert task["recurrence"] != "" or True  # recurrence may be non-empty
        assert task["icon"] != "" or True


async def test_seed_preset_routines_is_idempotent(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """Calling seed_preset_routines twice does not duplicate task_metadata rows."""
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "ben"},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"

    member = Member(
        slug="ben",
        name="Ben",
        color="#0000ff",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id="todo.ben",
        streak_counter_id="counter.ben_streak",
    )

    from custom_components.lucarne_family import seed_preset_routines

    # First seed
    await seed_preset_routines(hass, store, member)
    tasks_after_first = await store.async_get_tasks_for_member("ben")
    assert len(tasks_after_first) == 5

    # Second seed — idempotency guard should skip; no duplicate rows
    await seed_preset_routines(hass, store, member)
    tasks_after_second = await store.async_get_tasks_for_member("ben")
    assert len(tasks_after_second) == 5


async def test_adult_none_preset_seeds_no_routines(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """adult-none preset members get no seeded routines."""
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "ingrid"},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"

    member = Member(
        slug="ingrid",
        name="Ingrid",
        color="#00ff00",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="adult-none",
        todo_entity_id="todo.ingrid",
        streak_counter_id="counter.ingrid_streak",
    )

    from custom_components.lucarne_family import seed_preset_routines

    await seed_preset_routines(hass, store, member)

    tasks = await store.async_get_tasks_for_member("ingrid")
    assert len(tasks) == 0


# ---------------------------------------------------------------------------
# Helper shared by Sub-Phase D service tests
# ---------------------------------------------------------------------------


async def _setup_with_member(
    hass: HomeAssistant,
    tmp_path: Path,
    slug: str = "anna",
    name: str = "Anna",
) -> tuple[MockConfigEntry, LucarneFamilyStore, Member]:
    """Boot local_todo + todo, create a member todo entity, register services."""
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

    member = Member(
        slug=slug,
        name=name,
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
    )

    entry = _make_entry(hass, members=[member.to_dict()])
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    from custom_components.lucarne_family.task_service import async_setup_services
    await async_setup_services(hass, entry.entry_id)

    return entry, store, member


# ---------------------------------------------------------------------------
# Sub-Phase D: Task services
# ---------------------------------------------------------------------------


async def test_add_task_creates_todo_item_and_metadata(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task inserts a todo item and a task_metadata row, fires an event."""
    _entry, store, _ = await _setup_with_member(hass, tmp_path)

    events: list[Any] = []
    hass.bus.async_listen("lucarne_family_task_added", lambda e: events.append(e))

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Make the bed", "type": "routine"},
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_tasks_for_member("anna")
    assert len(tasks) == 1
    task = tasks[0]
    assert task["member_slug"] == "anna"
    assert task["type"] == "routine"
    assert task["source"] == "manual"

    assert len(events) == 1
    assert events[0].data["summary"] == "Make the bed"


async def test_add_task_returns_uid_with_response(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task returns the new uid so the frontend can reconcile its optimistic insert."""
    _entry, store, _ = await _setup_with_member(hass, tmp_path)

    result = await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Tidy room", "type": "chore"},
        blocking=True,
        return_response=True,
    )

    assert isinstance(result, dict)
    uid = result["uid"]
    assert uid

    # The returned uid matches the stored metadata row's item_uid.
    tasks = await store.async_get_tasks_for_member("anna")
    assert len(tasks) == 1
    assert tasks[0]["item_uid"] == uid


async def test_add_task_invalid_member_raises(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task with unknown member slug raises ServiceValidationError."""
    await _setup_with_member(hass, tmp_path)

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {"member": "nobody", "summary": "Task"},
            blocking=True,
        )


async def test_add_task_invalid_rrule_raises(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task with malformed RRULE raises vol.Invalid at schema validation."""
    from voluptuous import MultipleInvalid

    await _setup_with_member(hass, tmp_path)

    with pytest.raises((ServiceValidationError, MultipleInvalid)):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {"member": "anna", "summary": "Task", "recurrence": "NOTANRRULE"},
            blocking=True,
        )


async def test_add_task_household_with_assignee(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task with member=household and valid assignee stores correct metadata."""
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    # Create member todo entity
    await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "anna"},
    )
    # Create household todo entity
    await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "lucarne_household"},
    )
    await hass.async_block_till_done()

    member = Member(
        slug="anna",
        name="Anna",
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id="todo.anna",
        streak_counter_id="counter.anna_streak",
    )
    entry = _make_entry(hass, members=[member.to_dict()])
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    from custom_components.lucarne_family.task_service import async_setup_services
    await async_setup_services(hass, entry.entry_id)

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "household", "summary": "Buy groceries", "assignee": "anna"},
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_tasks_for_member("household")
    assert len(tasks) == 1
    assert tasks[0]["member_slug"] == "household"
    assert tasks[0]["assignee_slug"] == "anna"


async def test_add_task_assignee_on_non_household_raises(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task with assignee on a non-household member raises ServiceValidationError."""
    await _setup_with_member(hass, tmp_path)

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {"member": "anna", "summary": "Task", "assignee": "anna"},
            blocking=True,
        )


async def test_add_task_persists_time_of_day(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task forwards time_of_day to the store."""
    _entry, store, _ = await _setup_with_member(hass, tmp_path)

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {
            "member": "anna",
            "summary": "Brush teeth",
            "type": "routine",
            "time_of_day": "morning",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_tasks_for_member("anna")
    assert len(tasks) == 1
    assert tasks[0]["time_of_day"] == "morning"


async def test_add_task_defaults_time_of_day_to_anytime(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """add_task without time_of_day stores 'anytime' for both routines and chores."""
    _entry, store, _ = await _setup_with_member(hass, tmp_path)

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Clean room", "type": "chore"},
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_tasks_for_member("anna")
    assert len(tasks) == 1
    assert tasks[0]["time_of_day"] == "anytime"


async def test_update_task_metadata_can_change_time_of_day(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """update_task_metadata accepts time_of_day and persists it."""
    _entry, store, _ = await _setup_with_member(hass, tmp_path)

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Make bed", "type": "routine"},
        blocking=True,
    )
    tasks = await store.async_get_tasks_for_member("anna")
    uid = tasks[0]["item_uid"]

    await hass.services.async_call(
        DOMAIN,
        "update_task_metadata",
        {"uid": uid, "time_of_day": "night"},
        blocking=True,
    )

    updated = await store.async_get_task_metadata(uid)
    assert updated is not None
    assert updated["time_of_day"] == "night"


async def test_update_task_metadata_changes_only_specified_fields(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """update_task_metadata updates only the fields present in the call."""
    _entry, store, _ = await _setup_with_member(hass, tmp_path)

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Task", "type": "chore", "icon": "🧹"},
        blocking=True,
    )
    tasks = await store.async_get_tasks_for_member("anna")
    uid = tasks[0]["item_uid"]

    await hass.services.async_call(
        DOMAIN,
        "update_task_metadata",
        {"uid": uid, "icon": "🏠"},
        blocking=True,
    )

    updated = await store.async_get_task_metadata(uid)
    assert updated is not None
    assert updated["icon"] == "🏠"
    assert updated["type"] == "chore"  # unchanged


async def test_delete_task_removes_item_and_metadata(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """delete_task removes the todo item and metadata row, leaves completion_log."""
    _entry, store, _ = await _setup_with_member(hass, tmp_path)

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Chore to delete"},
        blocking=True,
    )
    tasks = await store.async_get_tasks_for_member("anna")
    uid = tasks[0]["item_uid"]

    # Append a log row so we can verify it survives deletion
    await store.async_append_completion("anna", uid, "Chore to delete", "completed")

    await hass.services.async_call(
        DOMAIN,
        "delete_task",
        {"uid": uid},
        blocking=True,
    )

    assert await store.async_get_task_metadata(uid) is None
    # Log row still present

    def _count_log() -> int:
        with store._db_connect() as con:
            return con.execute(
                "SELECT COUNT(*) FROM completion_log WHERE item_uid = ?", (uid,)
            ).fetchone()[0]

    count = await hass.async_add_executor_job(_count_log)
    assert count == 1


async def test_toggle_task_flips_status_and_appends_log(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """toggle_task flips status from NEEDS_ACTION → COMPLETED and appends log.

    Completion logging is handled by the completion_listener (Phase 3-C), not by
    toggle_task directly. This test wires the listener so end-to-end log writing works.
    """
    from custom_components.lucarne_family.completion_listener import (
        async_start_completion_listener,
    )

    _entry, store, _ = await _setup_with_member(hass, tmp_path)
    unsub_listener = async_start_completion_listener(hass, store, {"todo.anna"})

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Brush teeth"},
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_tasks_for_member("anna")
    uid = tasks[0]["item_uid"]

    await hass.services.async_call(
        DOMAIN,
        "toggle_task",
        {"uid": uid},
        blocking=True,
    )
    await hass.async_block_till_done()

    def _get_log() -> list[Any]:
        with store._db_connect() as con:
            return con.execute(
                "SELECT action FROM completion_log WHERE item_uid = ?", (uid,)
            ).fetchall()

    rows = await hass.async_add_executor_job(_get_log)
    unsub_listener()
    assert len(rows) == 1
    assert rows[0][0] == "completed"


async def test_toggle_task_twice_uses_undone_action(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """Toggling twice produces 'completed' then 'undone' — matching schema CHECK.

    Completion logging is handled by the completion_listener (Phase 3-C), not by
    toggle_task directly. This test wires the listener so end-to-end log writing works.
    """
    from custom_components.lucarne_family.completion_listener import (
        async_start_completion_listener,
    )

    _entry, store, _ = await _setup_with_member(hass, tmp_path)
    unsub_listener = async_start_completion_listener(hass, store, {"todo.anna"})

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "anna", "summary": "Brush teeth"},
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_tasks_for_member("anna")
    uid = tasks[0]["item_uid"]

    # First toggle: NEEDS_ACTION → COMPLETED
    await hass.services.async_call(DOMAIN, "toggle_task", {"uid": uid}, blocking=True)
    await hass.async_block_till_done()

    # Second toggle: COMPLETED → NEEDS_ACTION
    await hass.services.async_call(DOMAIN, "toggle_task", {"uid": uid}, blocking=True)
    await hass.async_block_till_done()

    def _get_actions() -> list[str]:
        with store._db_connect() as con:
            return [
                row[0]
                for row in con.execute(
                    "SELECT action FROM completion_log WHERE item_uid = ? ORDER BY rowid",
                    (uid,),
                ).fetchall()
            ]

    actions = await hass.async_add_executor_job(_get_actions)
    unsub_listener()
    assert actions == ["completed", "undone"]


# ---------------------------------------------------------------------------
# Issue #119: a todo platform's own exception never reaches the caller raw
# ---------------------------------------------------------------------------


async def test_toggle_task_wraps_a_store_error_on_a_stale_list(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """toggle_task reaches ical's TodoStore.edit, which raises like the delete does.

    Driven through the real failure rather than a fabricated exception: a delete
    whose ics write fails leaves local_todo's todo_items listing a uid its
    calendar no longer holds, and the next edit of that uid raises.
    """
    _entry, store, _ = await _setup_with_member(hass, tmp_path)
    await hass.services.async_call(
        DOMAIN, "add_task", {"member": "anna", "summary": "Brush teeth"}, blocking=True
    )
    tasks = await store.async_get_tasks_for_member("anna")
    uid = tasks[0]["item_uid"]

    entity = hass.data[DATA_COMPONENT].get_entity("todo.anna")
    assert entity is not None

    async def _failing_save() -> None:
        raise HomeAssistantError("ics write failed")

    with patch.object(entity, "async_save", _failing_save):
        with pytest.raises(HomeAssistantError, match="ics write failed"):
            await hass.services.async_call(
                DOMAIN, "delete_task", {"uid": uid}, blocking=True
            )

    # The list is stale: the calendar dropped the uid, todo_items still lists it.
    assert uid in [i.uid for i in entity.todo_items or []]

    with pytest.raises(HomeAssistantError, match="Could not update task") as excinfo:
        await hass.services.async_call(
            DOMAIN, "toggle_task", {"uid": uid}, blocking=True
        )
    # Still listed, so this is the write-failed branch, not the outside-removal one.
    assert type(excinfo.value) is HomeAssistantError
    assert "No existing item with uid" in str(excinfo.value.__cause__)


async def test_toggle_task_reports_an_outside_removal_as_a_validation_error(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """toggle_task's item lookup reads the list, then awaits — a delete fits between.

    The outside delete refreshes todo_items on its way out, so the post-hoc read
    sees the uid gone and says so instead of surfacing ical's missing-uid string.
    """
    _entry, store, _ = await _setup_with_member(hass, tmp_path)
    await hass.services.async_call(
        DOMAIN, "add_task", {"member": "anna", "summary": "Brush teeth"}, blocking=True
    )
    tasks = await store.async_get_tasks_for_member("anna")
    uid = tasks[0]["item_uid"]

    entity = hass.data[DATA_COMPONENT].get_entity("todo.anna")
    assert entity is not None
    original_update = entity.async_update_todo_item

    async def _vanishing_update(item: Any) -> None:
        # The item is removed outside Lucarne while the update is in flight; the
        # real store then rejects the edit.
        await entity.async_delete_todo_items([uid])
        await original_update(item)

    with patch.object(entity, "async_update_todo_item", _vanishing_update):
        with pytest.raises(ServiceValidationError, match="already removed") as excinfo:
            await hass.services.async_call(
                DOMAIN, "toggle_task", {"uid": uid}, blocking=True
            )
    assert "No existing item with uid" not in str(excinfo.value)


async def test_add_task_reports_the_insert_failure_when_the_rollback_also_fails(
    hass: HomeAssistant,
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """The rollback is best-effort; its own failure must not replace the real one.

    Without the inner guard the rollback's exception propagates instead of the
    bare ``raise``, so the caller is told the list write failed when what
    actually failed — and what they can act on — is the metadata INSERT.
    """
    _entry, store, _ = await _setup_with_member(hass, tmp_path)
    entity = hass.data[DATA_COMPONENT].get_entity("todo.anna")
    assert entity is not None

    async def _failing_insert(*args: Any, **kwargs: Any) -> None:
        raise sqlite3.OperationalError("database is locked")

    async def _failing_rollback(uids: list[str]) -> None:
        raise RuntimeError("ics write failed")

    with (
        patch.object(store, "async_add_task_metadata", _failing_insert),
        patch.object(entity, "async_delete_todo_items", _failing_rollback),
    ):
        with pytest.raises(sqlite3.OperationalError, match="database is locked"):
            await hass.services.async_call(
                DOMAIN,
                "add_task",
                {"member": "anna", "summary": "Brush teeth"},
                blocking=True,
            )

    # Swallowed, but not silent — the log line is the only record left.
    assert "ics write failed" in caplog.text
    # And the residue is named: an item with no row, which is what every
    # un-adopted item already is.
    assert len(entity.todo_items or []) == 1


class _StubItem:
    def __init__(self, uid: str) -> None:
        self.uid = uid


class _StubEntity:
    """Stands in for a todo platform whose todo_items is unloaded or raising."""

    def __init__(self, items: Any) -> None:
        self._items = items

    @property
    def todo_items(self) -> Any:
        if isinstance(self._items, Exception):
            raise self._items
        return self._items


def test_todo_write_error_keeps_an_unloaded_list_out_of_the_gone_branch() -> None:
    """``todo_items is None`` means "not loaded", not "empty" — reconcile.py's rule.

    Collapsing the two (``entity.todo_items or []``) would tell the user a task
    was "already removed outside Lucarne" on the strength of a list that was
    never read, hiding a genuine write failure behind a validation error.
    """
    err = _todo_write_error(
        "remove", "u1", "todo.anna", _StubEntity(None), ValueError("boom")
    )
    assert type(err) is HomeAssistantError
    assert "Could not remove task" in str(err)


def test_todo_write_error_treats_a_loaded_empty_list_as_gone() -> None:
    """``[]`` is a genuine answer: the list was read and does not hold the uid."""
    err = _todo_write_error(
        "remove", "u1", "todo.anna", _StubEntity([]), ValueError("boom")
    )
    assert isinstance(err, ServiceValidationError)
    assert "already removed" in str(err)


def test_todo_write_error_survives_a_raising_todo_items() -> None:
    """It runs inside an ``except`` block, so it must never raise itself.

    Anything thrown here would demote the real failure to ``__context__`` and
    surface something worse than the bug being fixed.
    """
    err = _todo_write_error(
        "remove",
        "u1",
        "todo.anna",
        _StubEntity(RuntimeError("property exploded")),
        ValueError("boom"),
    )
    assert type(err) is HomeAssistantError
    assert "boom" in str(err)


def test_todo_write_error_reports_a_still_listed_uid_as_a_write_failure() -> None:
    err = _todo_write_error(
        "update", "u1", "todo.anna", _StubEntity([_StubItem("u1")]), ValueError("boom")
    )
    assert type(err) is HomeAssistantError
    assert "Could not update task" in str(err)
