"""Tests for add_task / update_task_metadata with type='rotating'."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.rotation import parse_owners
from custom_components.lucarne_family.store import LucarneFamilyStore


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


async def _setup_with_household(
    hass: HomeAssistant,
    tmp_path: Path,
    extra_members: list[str] | None = None,
) -> tuple[MockConfigEntry, LucarneFamilyStore]:
    """Boot local_todo + todo, create household + member todo entities, register services."""
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    # Create household todo
    await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "lucarne_household"},
    )
    members_data: list[dict[str, Any]] = []
    for slug in extra_members or []:
        await hass.config_entries.flow.async_init(
            "local_todo",
            context={"source": "user"},
            data={"todo_list_name": slug},
        )
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
    await hass.async_block_till_done()

    entry = _make_entry(hass, members=members_data)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    from custom_components.lucarne_family.task_service import async_setup_services
    await async_setup_services(hass, entry.entry_id)

    return entry, store


# ---------------------------------------------------------------------------
# add_task — rotating happy path
# ---------------------------------------------------------------------------


async def test_add_rotating_task_creates_metadata(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """add_task with type=rotating creates metadata with rotation_owners and current_owner."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob"]
    )

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {
            "member": "household",
            "summary": "Pick up milk",
            "type": "rotating",
            "rotation_owners": ["alice", "bob"],
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    rotating = await store.async_get_rotating_tasks()
    assert len(rotating) == 1
    task = rotating[0]
    assert task["type"] == "rotating"
    assert task["member_slug"] == "household"
    assert parse_owners(task["rotation_owners"]) == ["alice", "bob"]
    assert task["current_owner"] == "alice"  # defaults to first owner


async def test_add_rotating_task_custom_current_owner(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """current_owner can be set explicitly to any owner in rotation_owners."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob", "cara"]
    )

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {
            "member": "household",
            "summary": "Task",
            "type": "rotating",
            "rotation_owners": ["alice", "bob", "cara"],
            "current_owner": "bob",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    rotating = await store.async_get_rotating_tasks()
    assert rotating[0]["current_owner"] == "bob"


async def test_add_rotating_task_deduplicates_owners(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Duplicate slugs in rotation_owners are removed, preserving order."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob"]
    )

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {
            "member": "household",
            "summary": "Task",
            "type": "rotating",
            "rotation_owners": ["alice", "bob", "alice"],
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    rotating = await store.async_get_rotating_tasks()
    assert parse_owners(rotating[0]["rotation_owners"]) == ["alice", "bob"]


# ---------------------------------------------------------------------------
# add_task — rotating validation errors
# ---------------------------------------------------------------------------


async def test_add_rotating_task_requires_household_member(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Rotating tasks must use member='household'."""
    await _setup_with_household(hass, tmp_path, extra_members=["alice", "bob"])

    with pytest.raises(ServiceValidationError, match="household"):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {
                "member": "alice",
                "summary": "Task",
                "type": "rotating",
                "rotation_owners": ["alice", "bob"],
            },
            blocking=True,
        )


async def test_add_rotating_task_requires_at_least_two_owners(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """rotating tasks need >= 2 owners."""
    await _setup_with_household(hass, tmp_path, extra_members=["alice"])

    with pytest.raises(ServiceValidationError, match="2"):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {
                "member": "household",
                "summary": "Task",
                "type": "rotating",
                "rotation_owners": ["alice"],
            },
            blocking=True,
        )


async def test_add_rotating_task_rejects_unknown_owner(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Owners not in the family are rejected."""
    await _setup_with_household(hass, tmp_path, extra_members=["alice", "bob"])

    with pytest.raises(ServiceValidationError, match="ghost"):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {
                "member": "household",
                "summary": "Task",
                "type": "rotating",
                "rotation_owners": ["alice", "ghost"],
            },
            blocking=True,
        )


async def test_add_rotating_task_rejects_recurrence(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """rotating tasks cannot have a recurrence rule."""
    await _setup_with_household(hass, tmp_path, extra_members=["alice", "bob"])

    # "FREQ=DAILY" is a valid RRULE per is_valid_rrule — use it so the
    # schema passes and our handler-level check fires.
    with pytest.raises(ServiceValidationError, match="recurrence"):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {
                "member": "household",
                "summary": "Task",
                "type": "rotating",
                "rotation_owners": ["alice", "bob"],
                "recurrence": "FREQ=DAILY",
            },
            blocking=True,
        )


async def test_add_rotating_task_rejects_current_owner_not_in_owners(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """current_owner must be one of the rotation_owners."""
    await _setup_with_household(hass, tmp_path, extra_members=["alice", "bob", "cara"])

    with pytest.raises(ServiceValidationError, match="current_owner"):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {
                "member": "household",
                "summary": "Task",
                "type": "rotating",
                "rotation_owners": ["alice", "bob"],
                "current_owner": "cara",
            },
            blocking=True,
        )


async def test_add_rotating_task_no_owners_at_all_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """rotation_owners defaults to empty list; rotating task with 0 owners fails."""
    await _setup_with_household(hass, tmp_path, extra_members=["alice", "bob"])

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "add_task",
            {
                "member": "household",
                "summary": "Task",
                "type": "rotating",
                "rotation_owners": [],
            },
            blocking=True,
        )


# ---------------------------------------------------------------------------
# update_task_metadata — rotating validation
# ---------------------------------------------------------------------------


async def test_update_rotating_owners_valid(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """update_task_metadata accepts new valid rotation_owners list."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob", "cara"]
    )

    # Create a rotating task
    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {
            "member": "household",
            "summary": "Task",
            "type": "rotating",
            "rotation_owners": ["alice", "bob"],
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_rotating_tasks()
    uid = tasks[0]["item_uid"]

    await hass.services.async_call(
        DOMAIN,
        "update_task_metadata",
        {"uid": uid, "rotation_owners": ["alice", "bob", "cara"], "current_owner": "bob"},
        blocking=True,
    )
    await hass.async_block_till_done()

    updated = await store.async_get_task_metadata(uid)
    assert updated is not None
    assert parse_owners(updated["rotation_owners"]) == ["alice", "bob", "cara"]
    assert updated["current_owner"] == "bob"


async def test_update_rotating_owners_unknown_member_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """update_task_metadata rejects unknown slugs in rotation_owners."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob"]
    )

    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {
            "member": "household",
            "summary": "Task",
            "type": "rotating",
            "rotation_owners": ["alice", "bob"],
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    tasks = await store.async_get_rotating_tasks()
    uid = tasks[0]["item_uid"]

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": uid, "rotation_owners": ["alice", "unknown"]},
            blocking=True,
        )


# ---------------------------------------------------------------------------
# update_task_metadata — rotating invariants (PR #73 review)
# ---------------------------------------------------------------------------


async def _add_household_chore(hass: HomeAssistant, store: LucarneFamilyStore) -> str:
    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "household", "summary": "Chore", "type": "chore"},
        blocking=True,
    )
    await hass.async_block_till_done()
    rows = await store.async_get_all_task_metadata()
    return rows[0]["item_uid"]


async def test_update_to_rotating_on_non_household_task_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A per-member task cannot be converted to rotating (must live in household)."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob"]
    )
    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {"member": "alice", "summary": "Brush teeth", "type": "chore"},
        blocking=True,
    )
    await hass.async_block_till_done()
    rows = await store.async_get_all_task_metadata()
    uid = rows[0]["item_uid"]

    with pytest.raises(ServiceValidationError, match="household"):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": uid, "type": "rotating", "rotation_owners": ["alice", "bob"]},
            blocking=True,
        )


async def test_update_set_recurrence_on_rotating_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A rotating task cannot be given an RRULE."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob"]
    )
    await hass.services.async_call(
        DOMAIN,
        "add_task",
        {
            "member": "household",
            "summary": "Pick up milk",
            "type": "rotating",
            "rotation_owners": ["alice", "bob"],
        },
        blocking=True,
    )
    await hass.async_block_till_done()
    uid = (await store.async_get_rotating_tasks())[0]["item_uid"]

    with pytest.raises(ServiceValidationError, match="recurrence"):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": uid, "recurrence": "FREQ=DAILY"},
            blocking=True,
        )


async def test_convert_to_rotating_without_owners_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Converting a household task to rotating requires rotation_owners up front."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob"]
    )
    uid = await _add_household_chore(hass, store)

    with pytest.raises(ServiceValidationError, match="rotation_owners"):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": uid, "type": "rotating"},
            blocking=True,
        )


async def test_convert_household_task_to_rotating_seeds_current_owner(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A valid conversion sets type=rotating and seeds current_owner from owners."""
    _entry, store = await _setup_with_household(
        hass, tmp_path, extra_members=["alice", "bob"]
    )
    uid = await _add_household_chore(hass, store)

    await hass.services.async_call(
        DOMAIN,
        "update_task_metadata",
        {"uid": uid, "type": "rotating", "rotation_owners": ["alice", "bob"]},
        blocking=True,
    )
    await hass.async_block_till_done()

    row = await store.async_get_task_metadata(uid)
    assert row is not None
    assert row["type"] == "rotating"
    assert parse_owners(row["rotation_owners"]) == ["alice", "bob"]
    assert row["current_owner"] == "alice"
