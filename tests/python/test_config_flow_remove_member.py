"""Tests for rotating-task owner sanitization when a member is removed (Sub-Phase B)."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import CONF_MEMBERS, DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.rotation import parse_owners, serialize_owners
from custom_components.lucarne_family.store import LucarneFamilyStore


def _member(slug: str) -> Member:
    return Member(
        slug=slug,
        name=slug.capitalize(),
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="adult-none",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id="",
    )


def _make_entry(
    hass: HomeAssistant, slugs: list[str]
) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            CONF_MEMBERS: [_member(s).to_dict() for s in slugs],
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
    slugs: list[str],
) -> tuple[MockConfigEntry, LucarneFamilyStore]:
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    # Create household and per-member todo entities
    await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "lucarne_household"},
    )
    for slug in slugs:
        await hass.config_entries.flow.async_init(
            "local_todo",
            context={"source": "user"},
            data={"todo_list_name": slug},
        )
    await hass.async_block_till_done()

    entry = _make_entry(hass, slugs=slugs)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}
    return entry, store


async def _add_rotating(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    uid: str,
    owners: list[str],
    current_owner: str,
) -> None:
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    assert entity is not None
    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary="Task", status=TodoItemStatus.NEEDS_ACTION)
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid=uid,
        type="rotating",
        summary="Task",
        rotation_owners=serialize_owners(owners),
        current_owner=current_owner,
    )


async def _run_remove_member(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    slug_to_remove: str,
) -> Any:
    """Drive the options flow to remove `slug_to_remove`."""
    result = await hass.config_entries.options.async_init(entry.entry_id)

    # Navigate to remove_member step
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], user_input={"next_step_id": "manage_members"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], user_input={"next_step_id": "remove_member"}
    )
    # First form: select member
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], user_input={"member_slug": slug_to_remove}
    )
    await hass.async_block_till_done()

    # Second form: confirm by typing member name
    members_before = entry.data.get(CONF_MEMBERS, [])
    target_name = next(
        (m["name"] for m in members_before if m["slug"] == slug_to_remove), slug_to_remove
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], user_input={"confirm_name": target_name}
    )
    await hass.async_block_till_done()
    return result


# ---------------------------------------------------------------------------
# Removing a middle owner keeps the task and continues rotation
# ---------------------------------------------------------------------------


async def test_remove_middle_owner_keeps_task(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Removing a middle owner (bob) from [alice, bob, cara] keeps the task."""
    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
            new_callable=AsyncMock,
        ),
    ):
        _entry, store = await _setup(hass, tmp_path, slugs=["alice", "bob", "cara"])
        await _add_rotating(
            hass, store, "uid-rot-r1",
            owners=["alice", "bob", "cara"], current_owner="alice"
        )

        await _run_remove_member(hass, _entry, "bob")

        row = await store.async_get_task_metadata("uid-rot-r1")
        assert row is not None
        owners_after = parse_owners(row["rotation_owners"])
        assert "bob" not in owners_after
        assert "alice" in owners_after
        assert "cara" in owners_after
        # current_owner unchanged since alice was not removed
        assert row["current_owner"] == "alice"


# ---------------------------------------------------------------------------
# Removing the current owner advances current_owner to a remaining owner
# ---------------------------------------------------------------------------


async def test_remove_current_owner_advances_current_owner(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Removing the current owner advances current_owner to the next remaining owner."""
    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
            new_callable=AsyncMock,
        ),
    ):
        _entry, store = await _setup(hass, tmp_path, slugs=["alice", "bob", "cara"])
        await _add_rotating(
            hass, store, "uid-rot-r2",
            owners=["alice", "bob", "cara"], current_owner="alice"
        )

        await _run_remove_member(hass, _entry, "alice")

        row = await store.async_get_task_metadata("uid-rot-r2")
        assert row is not None
        owners_after = parse_owners(row["rotation_owners"])
        assert "alice" not in owners_after
        # current_owner must be one of the remaining owners
        assert row["current_owner"] in owners_after


# ---------------------------------------------------------------------------
# Removing the last owner deletes the task
# ---------------------------------------------------------------------------


async def test_remove_last_owner_deletes_task(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """When only one owner remains and they're removed, the task is deleted."""
    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
            new_callable=AsyncMock,
        ),
    ):
        # Only alice and bob; task has just alice and bob; remove bob then alice
        # For simplicity: start with 2 owners, remove the second to leave 1 valid owner,
        # then simulate a DB state where the only remaining owner is removed.
        # Actually: we want 0 valid owners remaining. So task has [bob] and we remove bob.
        _entry, store = await _setup(hass, tmp_path, slugs=["alice", "bob"])
        await _add_rotating(
            hass, store, "uid-rot-r3",
            owners=["bob"],  # only bob
            current_owner="bob",
        )
        # Note: Adding a task with 1 owner bypasses the service (we insert directly).
        # The service requires >= 2; this tests the removal path specifically.

        delete_events: list[Any] = []
        hass.bus.async_listen(
            "lucarne_family_task_deleted", lambda e: delete_events.append(e)
        )

        await _run_remove_member(hass, _entry, "bob")

        row = await store.async_get_task_metadata("uid-rot-r3")
        assert row is None, "Task should have been deleted"
        assert any(e.data["uid"] == "uid-rot-r3" for e in delete_events)


async def test_remove_member_forgets_its_reminders_sync_rows_and_issue(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    from homeassistant.helpers import issue_registry as ir

    with patch(
        "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
        new_callable=AsyncMock,
    ):
        _entry, store = await _setup(hass, tmp_path, slugs=["alice", "bob"])
        await store.async_upsert_apple_sync_state("apple-a", "alice", "uid-a")
        await store.async_upsert_apple_sync_state("apple-b", "bob", "uid-b")
        ir.async_create_issue(
            hass,
            DOMAIN,
            "apple_list_missing_bob",
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="apple_list_missing",
        )

        await _run_remove_member(hass, _entry, "bob")

        assert await store.async_get_apple_sync_state("bob") == []
        assert len(await store.async_get_apple_sync_state("alice")) == 1
        assert ir.async_get(hass).async_get_issue(DOMAIN, "apple_list_missing_bob") is None
