"""Tests for entity_manager.py — todo + counter entity lifecycle."""
from __future__ import annotations

import dataclasses
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_registry import async_get as er_get
from homeassistant.setup import async_setup_component

from custom_components.lucarne_family import _async_reconcile_member_entities
from custom_components.lucarne_family.entity_manager import (
    MemberEntityDeletion,
    async_create_member_entities,
    async_delete_member_entities,
    async_ensure_household_entity,
    async_recreate_member_counter,
    async_recreate_member_todo,
    async_rename_member_entities,
)
from custom_components.lucarne_family.models import Member


def _make_member(slug: str = "anna", name: str = "Anna") -> Member:
    return Member(
        slug=slug,
        name=name,
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
    )



def _mock_counter_storage_collection(
    hass: HomeAssistant, item_id: str = "anna_streak"
) -> MagicMock:
    """Return a mock storage collection that simulates counter creation and deletion.

    Registers/removes entries in the entity registry (mirroring what the real counter
    component does) so that er.async_get_entity_id() / er.async_get() reflect reality.
    """
    sc = MagicMock()

    async def _create_item(data: dict):
        obj_id = data["name"]
        er_get(hass).async_get_or_create(
            "counter", "counter", obj_id, suggested_object_id=obj_id
        )
        return {"id": obj_id}

    async def _delete_item(del_item_id: str):
        er = er_get(hass)
        entity_id = er.async_get_entity_id("counter", "counter", del_item_id)
        if entity_id:
            er.async_remove(entity_id)

    sc.async_create_item = AsyncMock(side_effect=_create_item)
    sc.async_delete_item = AsyncMock(side_effect=_delete_item)
    return sc


def _patch_counter_sc(storage_collection: MagicMock):
    """Patch the entity_manager's _get_counter_storage_collection helper."""
    return patch(
        "custom_components.lucarne_family.entity_manager._get_counter_storage_collection",
        return_value=storage_collection,
    )


# ---------------------------------------------------------------------------
# Happy-path: create
# ---------------------------------------------------------------------------


async def test_create_member_entities_registers_todo_and_counter(
    hass: HomeAssistant,
) -> None:
    """Creating entities for a member registers todo and counter in entity registry."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)

    with _patch_counter_sc(sc):
        todo_id, counter_id = await async_create_member_entities(hass, member)

    assert todo_id == "todo.anna"
    assert counter_id == "counter.anna_streak"

    er = er_get(hass)
    assert er.async_get("todo.anna") is not None

    sc.async_create_item.assert_called_once()
    call_kwargs = sc.async_create_item.call_args[0][0]
    assert call_kwargs["name"] == "anna_streak"
    assert call_kwargs["initial"] == 0
    assert call_kwargs["minimum"] == 0


async def test_create_normalizes_entity_id_to_canonical_slug(
    hass: HomeAssistant,
) -> None:
    """If HA assigns a different entity_id, rename it to the canonical slug form."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    # Member whose display name would HA-slugify to a different id than member.slug
    # e.g. "Anna Marie" → HA would create "todo.anna_marie" but we want "todo.anna_marie"
    # More importantly: slug "anna" but name "ANNA" → local_todo slugifies "ANNA" to "anna"
    # Use a contrived example: name "Anna-Test" → HA slugify → "anna_test" but slug "anna_test"
    # Actually we'll use a name that produces a different slug than our member.slug
    member = Member(
        slug="annatest",
        name="Anna-Test",  # HA would create todo.anna_test (with _), slug="annatest" (no _)
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
    )

    sc = _mock_counter_storage_collection(hass, item_id="annatest_streak")

    with _patch_counter_sc(sc):
        todo_id, _ = await async_create_member_entities(hass, member)

    assert todo_id == "todo.annatest"
    er = er_get(hass)
    assert er.async_get("todo.annatest") is not None


# ---------------------------------------------------------------------------
# Collision handling
# ---------------------------------------------------------------------------


async def test_create_raises_on_todo_collision(
    hass: HomeAssistant,
) -> None:
    """If canonical todo entity_id already exists, raise HomeAssistantError and clean up."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    # Pre-seed a todo.anna entry by creating a local_todo with name "anna"
    first_result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "anna"},
    )
    await hass.async_block_till_done()
    assert first_result.get("type") == "create_entry"

    member = _make_member()  # slug="anna"
    sc = _mock_counter_storage_collection(hass)

    with _patch_counter_sc(sc):
        with pytest.raises(HomeAssistantError, match=r"todo\.anna"):
            await async_create_member_entities(hass, member)

    # No orphan counter should have been created
    sc.async_create_item.assert_not_called()


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def test_delete_member_entities_removes_todo_and_counter(
    hass: HomeAssistant,
) -> None:
    """Deleting removes both the todo config entry and counter entity."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)

    with _patch_counter_sc(sc):
        todo_id, counter_id = await async_create_member_entities(hass, member)

    er = er_get(hass)
    assert er.async_get(todo_id) is not None

    with _patch_counter_sc(sc):
        result = await async_delete_member_entities(hass, todo_id, counter_id)

    await hass.async_block_till_done()
    assert er.async_get(todo_id) is None
    assert result == MemberEntityDeletion(todo_removed=True, counter_removed=True)
    assert result.complete


async def test_delete_member_entities_completes_when_todo_is_already_gone(
    hass: HomeAssistant,
) -> None:
    """An entity that is already absent counts as removed, not as a failure.

    Regression test for the half-deleted `molant` member: the todo config entry
    had already been removed, so a retry of the removal had nothing to do on that
    side. The old code still let the *counter* side's exception abort everything,
    and the caller read that as "keep the member record" — permanently.
    """
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        await async_create_member_entities(hass, _make_member())

    er = er_get(hass)
    # Delete just the todo, leaving the counter behind — the observed half-state.
    todo_entry_id = er.async_get("todo.anna").config_entry_id
    await hass.config_entries.async_remove(todo_entry_id)
    await hass.async_block_till_done()
    assert er.async_get("todo.anna") is None
    assert er.async_get("counter.anna_streak") is not None

    with _patch_counter_sc(sc):
        result = await async_delete_member_entities(
            hass, "todo.anna", "counter.anna_streak"
        )

    assert result.complete, "nothing left behind"
    assert result.todo_removed and result.counter_removed
    assert er.async_get("counter.anna_streak") is None, "the surviving counter is cleaned up"


async def test_delete_member_entities_reports_a_failing_side_instead_of_raising(
    hass: HomeAssistant,
) -> None:
    """One side failing must not abort the other, nor propagate to the caller.

    The counter is attempted first precisely so a failure there leaves the todo
    list — and therefore the whole member — still reconstructable.
    """
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        todo_id, counter_id = await async_create_member_entities(hass, _make_member())

    sc.async_delete_item = AsyncMock(side_effect=Exception("storage locked"))
    with _patch_counter_sc(sc):
        result = await async_delete_member_entities(hass, todo_id, counter_id)

    await hass.async_block_till_done()
    assert not result.complete
    assert result.counter_removed is False
    assert result.leftovers == {counter_id: "storage locked"}
    assert result.todo_removed is True, "the todo side still ran"
    assert er_get(hass).async_get(todo_id) is None


# ---------------------------------------------------------------------------
# Per-side recovery
# ---------------------------------------------------------------------------


async def test_recreate_member_todo_restores_only_the_todo_side(
    hass: HomeAssistant,
) -> None:
    """Recreating the todo must not touch (or need) the surviving counter."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        todo_id, counter_id = await async_create_member_entities(hass, member)

    er = er_get(hass)
    await hass.config_entries.async_remove(er.async_get(todo_id).config_entry_id)
    await hass.async_block_till_done()
    assert er.async_get(todo_id) is None

    sc.async_create_item.reset_mock()
    new_todo_id = await async_recreate_member_todo(hass, member)

    assert new_todo_id == "todo.anna", "restored under the canonical slug id"
    assert er.async_get("todo.anna") is not None
    assert er.async_get(counter_id) is not None, "counter untouched"
    sc.async_create_item.assert_not_called(), "no second counter created"


async def test_recreate_member_todo_refuses_when_the_entity_already_exists(
    hass: HomeAssistant,
) -> None:
    """Recovery must not silently create a `_2` duplicate."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        await async_create_member_entities(hass, member)

    with pytest.raises(HomeAssistantError, match="already exists"):
        await async_recreate_member_todo(hass, member)


async def test_recreate_member_counter_restores_only_the_counter_side(
    hass: HomeAssistant,
) -> None:
    """The mirror case: the todo survives, the counter is rebuilt from 0."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        todo_id, counter_id = await async_create_member_entities(hass, member)

    er = er_get(hass)
    er.async_remove(counter_id)
    assert er.async_get(counter_id) is None

    with _patch_counter_sc(sc):
        new_counter_id = await async_recreate_member_counter(hass, member)

    assert new_counter_id == "counter.anna_streak"
    assert er.async_get("counter.anna_streak") is not None
    assert er.async_get(todo_id) is not None, "todo untouched"


async def test_recreate_member_counter_refuses_when_the_entity_already_exists(
    hass: HomeAssistant,
) -> None:
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        await async_create_member_entities(hass, member)

    with _patch_counter_sc(sc), pytest.raises(HomeAssistantError, match="already exists"):
        await async_recreate_member_counter(hass, member)


# ---------------------------------------------------------------------------
# Rename
# ---------------------------------------------------------------------------


async def test_rename_member_entities_changes_entity_ids(
    hass: HomeAssistant,
) -> None:
    """Renaming entities updates entity_ids in the entity registry."""
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "counter", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)

    with _patch_counter_sc(sc):
        todo_id, _ = await async_create_member_entities(hass, member)

    er = er_get(hass)
    assert er.async_get("todo.anna") is not None
    counter_id = "counter.anna_streak"
    assert er.async_get(counter_id) is not None

    with _patch_counter_sc(sc):
        new_todo_id, new_counter_id = await async_rename_member_entities(
            hass, todo_id, "anna2", counter_id
        )

    assert new_todo_id == "todo.anna2"
    assert new_counter_id == "counter.anna2_streak"
    assert er.async_get("todo.anna2") is not None
    assert er.async_get("todo.anna") is None
    # Old counter storage item was deleted and recreated; old entity_id freed.
    assert er.async_get("counter.anna2_streak") is not None
    assert er.async_get("counter.anna_streak") is None


# ---------------------------------------------------------------------------
# Household entity
# ---------------------------------------------------------------------------


async def test_ensure_household_entity_creates_if_absent(
    hass: HomeAssistant,
) -> None:
    """async_ensure_household_entity creates todo.lucarne_household if not present."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    er = er_get(hass)
    assert er.async_get("todo.lucarne_household") is None

    entity_id = await async_ensure_household_entity(hass)

    assert entity_id == "todo.lucarne_household"
    assert er.async_get("todo.lucarne_household") is not None


async def test_ensure_household_entity_is_idempotent(
    hass: HomeAssistant,
) -> None:
    """Calling async_ensure_household_entity twice doesn't create a second entry."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    entity_id1 = await async_ensure_household_entity(hass)
    entity_id2 = await async_ensure_household_entity(hass)

    assert entity_id1 == entity_id2 == "todo.lucarne_household"
    # Only one local_todo config entry for lucarne_household should exist
    entries = hass.config_entries.async_entries("local_todo")
    household_entries = [
        e for e in entries if e.data.get("todo_list_name") == "Lucarne Household"
    ]
    assert len(household_entries) == 1


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------


async def test_reconcile_skips_members_with_present_entities(
    hass: HomeAssistant,
) -> None:
    """No recreation attempt when the todo entity is already in the registry."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    sc = _mock_counter_storage_collection(hass)
    member = _make_member()

    with _patch_counter_sc(sc):
        todo_id, _ = await async_create_member_entities(hass, member)

    assert todo_id == "todo.anna"

    mock_store = MagicMock()
    mock_store.get_members.return_value = [
        _make_member().__class__(
            slug="anna",
            name="Anna",
            color="#ff0000",
            avatar=None,
            created_at=datetime.now(UTC),
            preset="school-age",
            todo_entity_id="todo.anna",
            streak_counter_id="counter.anna_streak",
        )
    ]

    with patch(
        "custom_components.lucarne_family.entity_manager.async_create_member_entities",
        new_callable=AsyncMock,
    ) as mock_create:
        await _async_reconcile_member_entities(hass, mock_store)

    mock_create.assert_not_called()


async def test_reconcile_recreates_when_both_entities_missing(
    hass: HomeAssistant,
) -> None:
    """Reconciliation recreates both entities when both are absent from the registry."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    # Member stored with entity IDs but neither entity actually exists in registry.
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

    mock_store = MagicMock()
    mock_store.get_members.return_value = [member]
    mock_store.async_save_members = AsyncMock()

    with patch(
        "custom_components.lucarne_family.entity_manager.async_create_member_entities",
        new_callable=AsyncMock,
        return_value=("todo.anna", "counter.anna_streak"),
    ) as mock_create:
        await _async_reconcile_member_entities(hass, mock_store)

    mock_create.assert_called_once()
    mock_store.async_save_members.assert_called_once()
    saved = mock_store.async_save_members.call_args[0][0]
    assert saved[0].todo_entity_id == "todo.anna"
    assert saved[0].streak_counter_id == "counter.anna_streak"


async def test_reconcile_recreates_todo_when_only_todo_is_missing(
    hass: HomeAssistant,
) -> None:
    """The `molant` half-state: todo gone, counter alive → recreate just the todo.

    Regression test. This state is what a partially-completed member removal
    leaves behind (see async_delete_member_entities). Reconciliation used to log
    a warning and move on, so the member stayed in the config entry pointing at a
    non-existent entity — and every card then issued a failing `todo.get_items`
    against it on every poll, indefinitely.
    """
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    # Pre-seed the counter entity in the registry; leave the todo missing.
    er = er_get(hass)
    er.async_get_or_create("counter", "counter", "anna_streak", suggested_object_id="anna_streak")

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

    mock_store = MagicMock()
    mock_store.get_members.return_value = [member]
    mock_store.async_save_members = AsyncMock()

    with patch(
        "custom_components.lucarne_family.entity_manager.async_create_member_entities",
        new_callable=AsyncMock,
    ) as mock_create:
        await _async_reconcile_member_entities(hass, mock_store)

    mock_create.assert_not_called(), "the both-missing path must not run when the counter survives"
    assert er.async_get("todo.anna") is not None, "todo entity recreated"
    mock_store.async_save_members.assert_called_once()
    saved = mock_store.async_save_members.call_args[0][0]
    assert saved[0].todo_entity_id == "todo.anna"
    assert saved[0].streak_counter_id == "counter.anna_streak", "counter untouched"


async def test_reconcile_recreates_counter_when_only_counter_is_missing(
    hass: HomeAssistant,
) -> None:
    """Mirror of the above: counter gone, todo alive → recreate just the counter."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

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

    mock_store = MagicMock()
    mock_store.get_members.return_value = [member]
    mock_store.async_save_members = AsyncMock()

    sc = _mock_counter_storage_collection(hass)
    with (
        _patch_counter_sc(sc),
        patch(
            "custom_components.lucarne_family.entity_manager.async_create_member_entities",
            new_callable=AsyncMock,
        ) as mock_create,
    ):
        await _async_reconcile_member_entities(hass, mock_store)

    mock_create.assert_not_called()
    assert er_get(hass).async_get("counter.anna_streak") is not None, "counter recreated"
    mock_store.async_save_members.assert_called_once()
    saved = mock_store.async_save_members.call_args[0][0]
    assert saved[0].streak_counter_id == "counter.anna_streak"


async def test_reconcile_raises_repair_issue_when_per_side_recovery_fails(
    hass: HomeAssistant,
) -> None:
    """A member that cannot be repaired must surface in Settings > Repairs.

    A startup WARNING is not enough: the state persists across restarts and
    costs traffic on every card poll, so it needs to be visible and actionable.
    """
    from homeassistant.helpers import issue_registry as ir

    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    er = er_get(hass)
    er.async_get_or_create("counter", "counter", "anna_streak", suggested_object_id="anna_streak")

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

    mock_store = MagicMock()
    mock_store.get_members.return_value = [member]
    mock_store.async_save_members = AsyncMock()

    with patch(
        "custom_components.lucarne_family.entity_manager.async_recreate_member_todo",
        new_callable=AsyncMock,
        side_effect=Exception("local_todo flow refused"),
    ):
        await _async_reconcile_member_entities(hass, mock_store)

    issue = ir.async_get(hass).async_get_issue("lucarne_family", "broken_member_todo_anna")
    assert issue is not None, "unrepairable member is reported as a repairs issue"
    assert issue.translation_placeholders["entity_id"] == "todo.anna"
    assert issue.translation_key == "broken_member_todo", (
        "a missing todo list drops the member entirely; the counter-only wording "
        "would understate it"
    )
    mock_store.async_save_members.assert_not_called()


async def test_reconcile_clears_repair_issue_once_the_member_is_healthy(
    hass: HomeAssistant,
) -> None:
    """A stale broken-member issue must not outlive the condition."""
    from homeassistant.helpers import issue_registry as ir

    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        todo_id, counter_id = await async_create_member_entities(hass, member)

    from custom_components.lucarne_family.issues import async_report_broken_member

    async_report_broken_member(hass, "anna", "Anna", todo_id, "stale", side="todo")
    registry = ir.async_get(hass)
    assert registry.async_get_issue("lucarne_family", "broken_member_todo_anna") is not None

    healthy = Member(
        slug="anna",
        name="Anna",
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=todo_id,
        streak_counter_id=counter_id,
    )
    mock_store = MagicMock()
    mock_store.get_members.return_value = [healthy]
    mock_store.async_save_members = AsyncMock()

    await _async_reconcile_member_entities(hass, mock_store)

    assert ir.async_get(hass).async_get_issue("lucarne_family", "broken_member_todo_anna") is None


async def test_reconcile_logs_error_on_recreate_failure(
    hass: HomeAssistant,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """When recreation fails, an error is logged and setup continues."""
    await async_setup_component(hass, "local_todo", {})
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

    mock_store = MagicMock()
    mock_store.get_members.return_value = [member]
    mock_store.async_save_members = AsyncMock()

    import logging

    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_create_member_entities",
            new_callable=AsyncMock,
            side_effect=Exception("counter component not loaded"),
        ),
        caplog.at_level(logging.ERROR, logger="custom_components.lucarne_family"),
    ):
        await _async_reconcile_member_entities(hass, mock_store)

    assert any("Failed to recreate" in r.message for r in caplog.records)
    # No save should happen when recreation failed
    mock_store.async_save_members.assert_not_called()

    from homeassistant.helpers import issue_registry as ir

    assert (
        ir.async_get(hass).async_get_issue("lucarne_family", "broken_member_todo_anna") is not None
    ), "a failed recreate is reported as a repairs issue, not just a log line"


async def test_orphan_issue_is_persistent_and_withdrawn_once_the_helper_is_gone(
    hass: HomeAssistant,
) -> None:
    """The orphan warning must outlive a restart, but not the problem itself.

    A non-persistent issue silently vanishes on the next restart with nothing to
    re-derive it (the member record is already gone) — reproducing the exact
    "one warning nobody sees" failure the repairs module exists to replace.
    Conversely it must not linger after the user deletes the helper as told.
    """
    from homeassistant.helpers import issue_registry as ir

    from custom_components.lucarne_family.issues import (
        async_prune_resolved_orphan_issues,
        async_report_orphaned_entities,
    )

    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    er = er_get(hass)
    er.async_get_or_create("counter", "counter", "anna_streak", suggested_object_id="anna_streak")

    async_report_orphaned_entities(hass, "anna", ["counter.anna_streak"])
    issue = ir.async_get(hass).async_get_issue("lucarne_family", "orphaned_entities_anna")
    assert issue is not None
    assert issue.is_persistent, "must survive the restart the member record did not"

    # Still present → still reported.
    async_prune_resolved_orphan_issues(hass)
    assert ir.async_get(hass).async_get_issue("lucarne_family", "orphaned_entities_anna")

    # The user deletes the leftover helper as the issue instructs.
    er.async_remove("counter.anna_streak")
    async_prune_resolved_orphan_issues(hass)
    assert (
        ir.async_get(hass).async_get_issue("lucarne_family", "orphaned_entities_anna") is None
    ), "the warning is withdrawn once the helper it names is gone"


async def test_reconcile_clears_the_orphan_issue_when_the_slug_is_a_member_again(
    hass: HomeAssistant,
) -> None:
    """Re-adding the slug makes its helpers owned again, not orphaned."""
    from homeassistant.helpers import issue_registry as ir

    from custom_components.lucarne_family.issues import async_report_orphaned_entities

    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    member = _make_member()
    sc = _mock_counter_storage_collection(hass)
    with _patch_counter_sc(sc):
        todo_id, counter_id = await async_create_member_entities(hass, member)

    async_report_orphaned_entities(hass, "anna", [counter_id])
    assert ir.async_get(hass).async_get_issue("lucarne_family", "orphaned_entities_anna")

    healthy = dataclasses.replace(
        member, todo_entity_id=todo_id, streak_counter_id=counter_id
    )
    mock_store = MagicMock()
    mock_store.get_members.return_value = [healthy]
    mock_store.async_save_members = AsyncMock()

    await _async_reconcile_member_entities(hass, mock_store)

    assert (
        ir.async_get(hass).async_get_issue("lucarne_family", "orphaned_entities_anna") is None
    )


async def test_reconcile_warns_on_orphaned_entity(
    hass: HomeAssistant,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Reconciliation warns about local_todo entities not tracked by any member."""
    await async_setup_component(hass, "local_todo", {})
    await hass.async_block_till_done()

    # Create a local_todo entry that lucarne doesn't know about
    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "orphan"},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"

    mock_store = MagicMock()
    mock_store.get_members.return_value = []  # No members

    import logging

    with caplog.at_level(logging.WARNING, logger="custom_components.lucarne_family"):
        await _async_reconcile_member_entities(hass, mock_store)

    assert any("orphaned" in r.message for r in caplog.records)
