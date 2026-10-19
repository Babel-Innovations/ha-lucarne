"""Tests for rotating-task owner sanitization when a member is removed (Sub-Phase B)."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_registry import async_get as er_get
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


# ---------------------------------------------------------------------------
# Removal must survive a member whose entities are already half-gone
# ---------------------------------------------------------------------------


async def test_remove_member_completes_when_todo_entity_is_already_gone(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """The `molant` trap: the todo entity is already deleted, the record is not.

    Regression test. The old flow removed the todo config entry first and let any
    exception abort the whole step, keeping the member record "so the user can
    retry" — but a retry skips the already-deleted todo and fails on the same
    side again, so the member could never be removed through the UI. It stayed in
    the config entry pointing at `todo.molant`, and every card issued a failing
    `todo.get_items` against it every 20 seconds for weeks.
    """
    entry, _store = await _setup(hass, tmp_path, ["anna", "bob"])

    # Simulate the half-deleted state: drop anna's todo config entry, keep the
    # member record (exactly what the wall-tablet instance was left in).
    todo_entry = next(
        ce
        for ce in hass.config_entries.async_entries("local_todo")
        if ce.title == "anna"
    )
    await hass.config_entries.async_remove(todo_entry.entry_id)
    await hass.async_block_till_done()

    await _run_remove_member(hass, entry, "anna")

    slugs = [m["slug"] for m in entry.data[CONF_MEMBERS]]
    assert slugs == ["bob"], "the member record is removed even though its todo entity was gone"


async def test_remove_member_drops_record_and_reports_orphan_when_a_delete_fails(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """A helper that refuses to delete must not block removing the member record.

    A member pointing at nothing is worse than an orphaned helper: the first
    costs an error per card per poll forever, the second is inert. So the record
    goes and the leftover is surfaced in Settings > Repairs.
    """
    from homeassistant.helpers import issue_registry as ir

    from custom_components.lucarne_family.entity_manager import MemberEntityDeletion

    entry, _store = await _setup(hass, tmp_path, ["anna", "bob"])

    with patch(
        "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
        new_callable=AsyncMock,
        return_value=MemberEntityDeletion(
            todo_removed=False,
            counter_removed=True,
            leftovers={"todo.anna": "storage locked"},
        ),
    ):
        await _run_remove_member(hass, entry, "anna")

    slugs = [m["slug"] for m in entry.data[CONF_MEMBERS]]
    assert slugs == ["bob"], "member record removed despite the failed entity delete"

    issue = ir.async_get(hass).async_get_issue("lucarne_family", "orphaned_entities_anna")
    assert issue is not None, "the leftover helper is reported in Settings > Repairs"
    assert "todo.anna" in issue.translation_placeholders["entity_ids"]


async def test_remove_legacy_member_with_no_stored_entity_ids_still_deletes_helpers(
    hass: HomeAssistant,
    tmp_path: Path,
) -> None:
    """A member record predating `todo_entity_id` must not skip helper deletion.

    Those records carry empty strings and are never backfilled. Gating deletion
    on them left real helpers behind with no orphan repairs issue and no log
    line — an invisible orphan, which is the failure mode this whole path exists
    to make impossible.
    """
    entry, _store = await _setup(hass, tmp_path, ["anna", "bob"])

    # Rewrite anna's record the way a pre-migration entry looks on disk.
    legacy = [
        {**m, "todo_entity_id": "", "streak_counter_id": ""}
        if m["slug"] == "anna"
        else m
        for m in entry.data[CONF_MEMBERS]
    ]
    hass.config_entries.async_update_entry(
        entry, data={**entry.data, CONF_MEMBERS: legacy}
    )
    await hass.async_block_till_done()

    er = er_get(hass)
    assert er.async_get("todo.anna") is not None, "the helper really is there"

    await _run_remove_member(hass, entry, "anna")
    await hass.async_block_till_done()

    assert [m["slug"] for m in entry.data[CONF_MEMBERS]] == ["bob"]
    assert er.async_get("todo.anna") is None, (
        "the canonical-id fallback deleted the helper instead of silently orphaning it"
    )


# ---------------------------------------------------------------------------
# Pending reward claims are released; the ledger is kept
# ---------------------------------------------------------------------------


async def _seed_claims(hass: HomeAssistant, entry: MockConfigEntry, store: LucarneFamilyStore):
    from homeassistant.core import Context

    from custom_components.lucarne_family.rewards import async_setup_rewards_services

    await async_setup_rewards_services(hass, entry.entry_id)
    for slug in ("anna", "bob"):
        await hass.services.async_call(
            DOMAIN, "grant_points", {"member": slug, "points": 20}, blocking=True,
            context=Context(),
        )
    reward = (
        await hass.services.async_call(
            DOMAIN, "create_reward", {"name": "Movie", "cost": 10, "poolable": True},
            blocking=True, return_response=True,
        )
    )["id"]
    solo = (
        await hass.services.async_call(
            DOMAIN, "claim_reward", {"member": "anna", "reward_id": reward},
            blocking=True, return_response=True,
        )
    )["claim_id"]
    pooled = (
        await hass.services.async_call(
            DOMAIN, "claim_reward",
            {"member": "bob", "reward_id": reward, "pool_with": ["anna"]},
            blocking=True, return_response=True,
        )
    )["claim_id"]
    return solo, pooled


async def test_remove_member_rejects_their_pending_claims_and_keeps_ledger(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    with patch(
        "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
        new_callable=AsyncMock,
    ):
        entry, store = await _setup(hass, tmp_path, ["anna", "bob"])
        solo, pooled = await _seed_claims(hass, entry, store)
        assert await store.async_get_balances() == {"anna": 5, "bob": 15}

        await _run_remove_member(hass, entry, "anna")

        assert await store.async_get_claims(["pending"]) == []
        statuses = {c["id"]: c["status"] for c in await store.async_get_claims(["rejected"])}
        assert statuses == {solo: "rejected", pooled: "rejected"}
        # Everyone's points are back, and the removed member's rows survive.
        assert await store.async_get_balances() == {"anna": 20, "bob": 20}
        with store._db_connect() as con:
            assert con.execute(
                "SELECT COUNT(*) FROM points_ledger WHERE member_slug = 'anna'"
            ).fetchone()[0] > 0


async def test_remove_member_completes_when_claim_release_fails(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
            new_callable=AsyncMock,
        ),
        patch.object(
            LucarneFamilyStore,
            "async_release_member_claims",
            side_effect=RuntimeError("boom"),
        ),
    ):
        entry, _store = await _setup(hass, tmp_path, ["anna", "bob"])
        await _run_remove_member(hass, entry, "anna")

    assert [m["slug"] for m in entry.data[CONF_MEMBERS]] == ["bob"]
