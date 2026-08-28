"""Reconciliation of ``task_metadata`` rows whose todo item is gone (issue #116).

Deleting a Lucarne-managed item through anything but ``lucarne_family.delete_task``
— HA's own to-do panel, ``todo.remove_item`` from an automation/voice/agent, the
Companion app — goes straight to the todo entity and leaves the metadata row
behind forever. A routine-typed leftover permanently suppresses that member's
``all_routines_done`` and, with an RRULE, pins the streak at 0.

The daily reset reconciles it. These tests pin both halves: the orphan is reaped,
and a list that merely cannot be *read* never costs a row — that second half is
the whole reason this reads the lists directly instead of diffing snapshots.
"""
from __future__ import annotations

import asyncio
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.completion_listener import (
    async_start_completion_listener,
)
from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.reconcile import async_reconcile_task_metadata
from custom_components.lucarne_family.reset_logic import async_perform_daily_reset
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.task_service import async_setup_services


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
    hass: HomeAssistant,
    tmp_path: Path,
    members: list[str] | None = None,
    lists: list[str] | None = None,
) -> tuple[MockConfigEntry, LucarneFamilyStore]:
    """Boot local_todo + todo and create the requested lists.

    ``members`` are the configured family members; ``lists`` are the ``local_todo``
    lists actually created. They are separate so a test can configure a member
    whose todo entity does not exist — the "unreadable list" case.
    """
    members = members if members is not None else ["anna"]
    lists = lists if lists is not None else ["lucarne_household", *members]

    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    for list_name in lists:
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
    return entry, store


def _get_entity(hass: HomeAssistant, entity_id: str) -> Any:
    entity = hass.data[DATA_COMPONENT].get_entity(entity_id)
    assert entity is not None, f"Entity {entity_id} not found"
    return entity


async def _add_task(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entity_id: str,
    uid: str,
    summary: str,
    member_slug: str,
    item_type: str = "routine",
    recurrence: str = "",
) -> None:
    """Create a todo item and its metadata row, the way ``add_task`` would."""
    entity = _get_entity(hass, entity_id)
    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary=summary, status=TodoItemStatus.NEEDS_ACTION)
    )
    await store.async_add_task_metadata(
        member_slug=member_slug,
        item_uid=uid,
        type=item_type,
        recurrence=recurrence,
        summary=summary,
    )


async def _remove_item_outside_lucarne(
    hass: HomeAssistant, entity_id: str, uid: str
) -> None:
    """Delete the todo item only — what HA's to-do panel and todo.remove_item do."""
    await _get_entity(hass, entity_id).async_delete_todo_items([uid])
    await hass.async_block_till_done()


async def _complete_item(
    hass: HomeAssistant, entity_id: str, uid: str, summary: str
) -> None:
    await _get_entity(hass, entity_id).async_update_todo_item(
        TodoItem(uid=uid, summary=summary, status=TodoItemStatus.COMPLETED)
    )
    await hass.async_block_till_done()


async def test_daily_reset_reaps_a_row_whose_item_was_deleted_outside_lucarne(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The regression: an item removed outside Lucarne must not leave its row."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")

    await _remove_item_outside_lucarne(hass, "todo.anna", "r-001")
    assert await store.async_get_task_metadata("r-001") is not None

    await async_perform_daily_reset(hass, store)

    assert await store.async_get_task_metadata("r-001") is None


async def test_reconcile_leaves_rows_of_live_items_alone(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Rows whose item is still listed survive, completed or not."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")
    await _add_task(
        hass, store, "todo.anna", "c-001", "Wash dishes", "anna", item_type="chore"
    )

    reaped = await async_reconcile_task_metadata(hass, store)

    assert reaped == 0
    assert await store.async_get_task_metadata("r-001") is not None
    assert await store.async_get_task_metadata("c-001") is not None


async def test_reconcile_skips_a_member_whose_list_entity_is_missing(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A configured member with no todo entity must not lose rows.

    Reading "no entity" as "empty list" is the mass-deletion hazard this whole
    approach exists to avoid: every one of that member's rows would look orphaned.
    """
    _entry, store = await _setup(
        hass, tmp_path, members=["anna", "bob"], lists=["lucarne_household", "anna"]
    )
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")
    # bob's list was never created; the row is written directly.
    await store.async_add_task_metadata(
        member_slug="bob", item_uid="r-bob", type="routine", summary="Make bed"
    )

    reaped = await async_reconcile_task_metadata(hass, store)

    assert reaped == 0
    assert await store.async_get_task_metadata("r-bob") is not None


async def test_reconcile_skips_a_list_whose_items_have_not_loaded(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """``todo_items`` is None until local_todo's first update — not an empty list.

    An entity present in the registry but not yet populated would otherwise reap
    every row of that list.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")

    entity = _get_entity(hass, "todo.anna")
    with patch.object(type(entity), "todo_items", property(lambda _self: None)):
        reaped = await async_reconcile_task_metadata(hass, store)

    assert reaped == 0
    assert await store.async_get_task_metadata("r-001") is not None


async def test_reconcile_skips_a_list_whose_entity_is_unavailable(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """An unavailable list that reports zero items must not be believed.

    ``local_todo`` keeps its items in memory, but a managed list is only ever
    *this* integration's by configuration — a todo entity backed by a remote
    service can go unavailable while reporting an empty list, and reading that as
    "every item was deleted" would reap the whole list's metadata.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")

    entity = _get_entity(hass, "todo.anna")
    hass.states.async_set("todo.anna", STATE_UNAVAILABLE)
    with patch.object(type(entity), "todo_items", property(lambda _self: [])):
        reaped = await async_reconcile_task_metadata(hass, store)

    assert reaped == 0
    assert await store.async_get_task_metadata("r-001") is not None


async def test_reconcile_ignores_rows_for_slugs_that_are_not_managed_lists(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A row naming a slug Lucarne has no list for is left for its own owner."""
    _entry, store = await _setup(hass, tmp_path)
    await store.async_add_task_metadata(
        member_slug="carol", item_uid="r-carol", type="routine", summary="Leftover"
    )

    reaped = await async_reconcile_task_metadata(hass, store)

    assert reaped == 0
    assert await store.async_get_task_metadata("r-carol") is not None


async def test_reconcile_reaps_an_orphan_in_the_household_list(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The household list has no Member row; it still gets reconciled."""
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(
        hass,
        store,
        "todo.lucarne_household",
        "h-001",
        "Take out bins",
        "household",
        item_type="chore",
    )

    await _remove_item_outside_lucarne(hass, "todo.lucarne_household", "h-001")
    reaped = await async_reconcile_task_metadata(hass, store)

    assert reaped == 1
    assert await store.async_get_task_metadata("h-001") is None


async def test_reconcile_keeps_household_rows_when_that_list_is_absent(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """No household list configured means household rows are simply not reconciled."""
    _entry, store = await _setup(hass, tmp_path, lists=["anna"])
    await store.async_add_task_metadata(
        member_slug="household", item_uid="h-001", type="chore", summary="Take out bins"
    )

    reaped = await async_reconcile_task_metadata(hass, store)

    assert reaped == 0
    assert await store.async_get_task_metadata("h-001") is not None


async def test_a_task_created_after_the_list_scan_keeps_its_row(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The inverse orphan: a fresh task must not be reaped by an in-flight pass.

    ``add_task`` holds the uid lock across item creation *and* the INSERT, so a
    task created after the list scan but before the metadata read looks exactly
    like an orphan. Only re-checking the lists under that lock tells the two
    apart; without it this leaves a todo item whose row was deleted seconds after
    it was written.
    """
    entry, store = await _setup(hass, tmp_path)
    await async_setup_services(hass, entry.entry_id)

    scan_done = asyncio.Event()
    add_done = asyncio.Event()
    original_get_all = store.async_get_all_task_metadata

    async def _gated_get_all() -> list[dict[str, Any]]:
        scan_done.set()
        async with asyncio.timeout(5):
            await add_done.wait()
        return await original_get_all()

    created_uid = ""

    async def _add() -> None:
        nonlocal created_uid
        try:
            response = await hass.services.async_call(
                DOMAIN,
                "add_task",
                {"member": "anna", "summary": "Brush teeth", "type": "routine"},
                blocking=True,
                return_response=True,
            )
            assert response is not None
            created_uid = response["uid"]
        finally:
            add_done.set()

    with patch.object(store, "async_get_all_task_metadata", _gated_get_all):
        reconcile = asyncio.create_task(async_reconcile_task_metadata(hass, store))
        async with asyncio.timeout(5):
            await scan_done.wait()
        await _add()
        reaped = await reconcile

    assert created_uid
    assert reaped == 0
    assert await store.async_get_task_metadata(created_uid) is not None


async def test_a_list_that_stops_being_readable_mid_pass_keeps_its_rows(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Readability is re-decided under the lock, not inherited from the scan.

    The metadata read between the two is an executor hop, and the lock can be
    contended — long enough for a ``local_todo`` entry to reload. A re-check that
    only asked "is this uid in some list" would read the reloading list as empty
    and delete the row it was meant to protect.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")
    await _remove_item_outside_lucarne(hass, "todo.anna", "r-001")

    entity = _get_entity(hass, "todo.anna")
    original_get_all = store.async_get_all_task_metadata
    unloaded = patch.object(type(entity), "todo_items", property(lambda _self: None))

    async def _unload_the_list_then_return_rows() -> list[dict[str, Any]]:
        rows = await original_get_all()
        unloaded.start()
        return rows

    with patch.object(
        store, "async_get_all_task_metadata", _unload_the_list_then_return_rows
    ):
        try:
            reaped = await async_reconcile_task_metadata(hass, store)
        finally:
            unloaded.stop()

    assert reaped == 0
    assert await store.async_get_task_metadata("r-001") is not None


async def test_a_failing_reconcile_does_not_fail_the_reset(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The reaper is a backstop; a DB error in it must not sink the whole reset.

    Every item has already been flipped and counted by the time it runs, so
    raising here would report the service call as failed and throw the count away.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")
    await _complete_item(hass, "todo.anna", "r-001", "Brush teeth")

    with patch(
        "custom_components.lucarne_family.reset_logic.async_reconcile_task_metadata",
        side_effect=sqlite3.OperationalError("database is locked"),
    ):
        reset_count = await async_perform_daily_reset(hass, store)

    assert reset_count == 1


async def test_all_routines_done_recovers_after_the_orphan_is_reaped(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The user-visible consequence, end to end.

    A routine deleted from HA's to-do panel keeps its row in ``routine_uids``,
    where it can never be completed — so the member's ``all_routines_done`` never
    fires again. Reaping the row restores it.
    """
    _entry, store = await _setup(hass, tmp_path)
    await _add_task(hass, store, "todo.anna", "r-001", "Brush teeth", "anna")
    await _add_task(hass, store, "todo.anna", "r-002", "Make bed", "anna")

    unsub = async_start_completion_listener(hass, store, {"todo.anna"}, "")
    fired: list[str] = []
    hass.bus.async_listen(
        "lucarne_family_all_routines_done",
        lambda event: fired.append(event.data["member"]),
    )

    await _remove_item_outside_lucarne(hass, "todo.anna", "r-001")

    entity = _get_entity(hass, "todo.anna")
    await entity.async_update_todo_item(
        TodoItem(uid="r-002", summary="Make bed", status=TodoItemStatus.COMPLETED)
    )
    await hass.async_block_till_done()
    assert fired == [], "the orphaned row suppressed the event"

    # Undo, reconcile, and complete again: now the only routine left is real.
    await entity.async_update_todo_item(
        TodoItem(uid="r-002", summary="Make bed", status=TodoItemStatus.NEEDS_ACTION)
    )
    await hass.async_block_till_done()
    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    await entity.async_update_todo_item(
        TodoItem(uid="r-002", summary="Make bed", status=TodoItemStatus.COMPLETED)
    )
    await hass.async_block_till_done()
    unsub()

    assert fired == ["anna"]
