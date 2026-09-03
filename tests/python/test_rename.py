"""Tests for rename.py (Sub-Phase F)."""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
import yaml
from homeassistant import data_entry_flow
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import (
    CONF_MEMBERS,
    DEFAULT_RESET_TIME,
    DEFAULT_STREAK_CHECK_TIME,
    DOMAIN,
)
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.rename import (
    RenameImpact,
    async_compute_rename_impact,
    async_rename_member,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_member(
    slug: str = "anna",
    name: str = "Anna",
    todo_entity_id: str | None = None,
    streak_counter_id: str | None = None,
) -> Member:
    return Member(
        slug=slug,
        name=name,
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=todo_entity_id or f"todo.{slug}",
        streak_counter_id=streak_counter_id or f"counter.{slug}_streak",
    )


def _make_entry(
    hass: HomeAssistant, members: list[dict[str, Any]] | None = None
) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            CONF_MEMBERS: members or [],
            "reset_time": DEFAULT_RESET_TIME,
            "streak_check_time": DEFAULT_STREAK_CHECK_TIME,
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _setup_entry(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    with patch(
        "custom_components.lucarne_family.store.LucarneFamilyStore.async_init",
        return_value=None,
    ):
        await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()


async def _init_flow(hass: HomeAssistant, entry: MockConfigEntry) -> dict[str, Any]:
    result = await hass.config_entries.options.async_init(entry.entry_id)
    await hass.async_block_till_done()
    return result  # type: ignore[return-value]


async def _configure(
    hass: HomeAssistant, flow_id: str, user_input: dict[str, Any]
) -> dict[str, Any]:
    result = await hass.config_entries.options.async_configure(flow_id, user_input)
    await hass.async_block_till_done()
    return result  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# async_compute_rename_impact tests
# ---------------------------------------------------------------------------


async def test_compute_impact_no_files_returns_empty(hass: HomeAssistant) -> None:
    """Empty config dir → empty impact."""
    impact = await async_compute_rename_impact(hass, "todo.anna")
    assert impact.is_empty


async def test_compute_impact_automation_reference(
    hass: HomeAssistant,
) -> None:
    """automations.yaml referencing the entity_id is included in impact."""
    automations = [
        {
            "id": "morning_routine",
            "alias": "Morning routine",
            "trigger": [{"platform": "time", "at": "07:00:00"}],
            "action": [{"service": "todo.get_items", "target": {"entity_id": "todo.anna"}}],
        },
        {
            "id": "unrelated",
            "alias": "Unrelated",
            "trigger": [],
            "action": [],
        },
    ]
    (Path(hass.config.config_dir) / "automations.yaml").write_text(yaml.dump(automations))

    impact = await async_compute_rename_impact(hass, "todo.anna")
    assert impact.automations == ["morning_routine"]
    assert impact.scripts == []
    assert impact.scenes == []
    assert impact.dashboards == []


async def test_compute_impact_script_reference(
    hass: HomeAssistant,
) -> None:
    """scripts.yaml referencing the entity_id is included in impact."""
    scripts = {
        "check_anna_tasks": {
            "sequence": [
                {"service": "todo.get_items", "target": {"entity_id": "todo.anna"}}
            ]
        },
        "other_script": {"sequence": []},
    }
    (Path(hass.config.config_dir) / "scripts.yaml").write_text(yaml.dump(scripts))

    impact = await async_compute_rename_impact(hass, "todo.anna")
    assert impact.scripts == ["script.check_anna_tasks"]


async def test_compute_impact_scene_reference(
    hass: HomeAssistant,
) -> None:
    """scenes.yaml referencing the entity_id is included in impact."""
    scenes = [
        {"name": "Evening", "entities": {"todo.anna": {"state": "in_progress"}}},
        {"name": "Morning", "entities": {}},
    ]
    (Path(hass.config.config_dir) / "scenes.yaml").write_text(yaml.dump(scenes))

    impact = await async_compute_rename_impact(hass, "todo.anna")
    assert impact.scenes == ["Evening"]


async def test_compute_impact_dashboard_reference(
    hass: HomeAssistant,
) -> None:
    """lovelace storage referencing the entity_id is included in impact."""
    storage_dir = Path(hass.config.config_dir) / ".storage"
    storage_dir.mkdir(exist_ok=True)
    dashboard = {
        "key": "lovelace",
        "data": {
            "config": {
                "views": [
                    {
                        "cards": [
                            {"type": "todo-list", "entity": "todo.anna"}
                        ]
                    }
                ]
            }
        },
    }
    (storage_dir / "lovelace").write_text(json.dumps(dashboard))

    impact = await async_compute_rename_impact(hass, "todo.anna")
    assert len(impact.dashboards) >= 1
    assert any("todo.anna" in str(d) or "entity" in d.get("path", "") for d in impact.dashboards)


# ---------------------------------------------------------------------------
# async_rename_member tests
# ---------------------------------------------------------------------------


async def test_rename_member_noop_same_slug(
    hass: HomeAssistant,
) -> None:
    """Renaming to a name with the same slug returns empty impact without scanning."""
    automations = [
        {"id": "ref_anna", "alias": "ref", "action": [{"entity_id": "todo.anna"}]}
    ]
    (Path(hass.config.config_dir) / "automations.yaml").write_text(yaml.dump(automations))

    member = _make_member("anna", "Anna")
    # "Anna" and "anna" produce the same slug "anna"
    impact = await async_rename_member(hass, member, "anna")
    assert impact.is_empty


async def test_rename_member_slug_changes_no_refs(hass: HomeAssistant) -> None:
    """Slug-changing rename with no downstream refs returns empty impact."""
    member = _make_member("anna", "Anna")
    impact = await async_rename_member(hass, member, "Annabelle")
    assert impact.is_empty


async def test_rename_member_slug_changes_with_refs(
    hass: HomeAssistant,
) -> None:
    """Slug-changing rename returns automation refs from both todo and counter entities."""
    automations = [
        {
            "id": "streak_watcher",
            "alias": "Streak watcher",
            "trigger": [{"platform": "state", "entity_id": "counter.anna_streak"}],
            "action": [],
        }
    ]
    (Path(hass.config.config_dir) / "automations.yaml").write_text(yaml.dump(automations))

    member = _make_member("anna", "Anna")
    impact = await async_rename_member(hass, member, "Annabelle")
    assert "streak_watcher" in impact.automations


# ---------------------------------------------------------------------------
# Options flow — rename confirm step
# ---------------------------------------------------------------------------


@pytest.fixture()
def _patch_entity_ops_rename():
    async def _rename(_hass, old_todo, new_slug, old_counter):
        return (f"todo.{new_slug}", f"counter.{new_slug}_streak")

    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_rename_member_entities",
            side_effect=_rename,
        ),
        patch(
            "custom_components.lucarne_family.entity_manager.async_create_member_entities",
            side_effect=lambda hass, m: (f"todo.{m.slug}", f"counter.{m.slug}_streak"),
        ),
        patch(
            "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
            new_callable=AsyncMock,
        ),
        patch(
            "custom_components.lucarne_family.seed_preset_routines",
            new_callable=AsyncMock,
        ),
        patch(
            "custom_components.lucarne_family.rename.async_rename_member",
            return_value=RenameImpact(),
        ),
        patch(
            "custom_components.lucarne_family.store.LucarneFamilyStore.async_rename_member_slug",
            new_callable=AsyncMock,
        ),
    ):
        yield


async def test_rename_confirm_step_shown_on_slug_change(
    hass: HomeAssistant,
    _patch_entity_ops_rename: None,
) -> None:
    """Editing a member with a name that changes the slug shows rename_confirm step."""
    anna = _make_member("anna", "Anna")
    entry = _make_entry(hass, [anna.to_dict()])
    await _setup_entry(hass, entry)

    result = await _init_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    # Step 1: pick member
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    # Step 2: submit new name with different slug
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Annabelle", "color": [255, 0, 0], "preset": "school-age"},
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "rename_confirm"


async def test_rename_confirm_confirmed_renames_member(
    hass: HomeAssistant,
    _patch_entity_ops_rename: None,
) -> None:
    """Confirming rename updates the member slug and entity IDs."""
    anna = _make_member("anna", "Anna")
    entry = _make_entry(hass, [anna.to_dict()])
    await _setup_entry(hass, entry)

    result = await _init_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Annabelle", "color": [255, 0, 0], "preset": "school-age"},
    )
    assert result["step_id"] == "rename_confirm"

    # Confirm the rename
    result = await _configure(hass, result["flow_id"], {"confirm": True})
    assert result["type"] in (
        data_entry_flow.FlowResultType.MENU,
        data_entry_flow.FlowResultType.CREATE_ENTRY,
    )

    # Verify member was renamed in the store
    from custom_components.lucarne_family.store import LucarneFamilyStore
    store: LucarneFamilyStore = hass.data[DOMAIN][entry.entry_id]["store"]
    members = store.get_members()
    slugs = [m.slug for m in members]
    assert "annabelle" in slugs
    assert "anna" not in slugs


async def test_rename_confirm_entity_rename_failure_rolls_back_sqlite(
    hass: HomeAssistant,
) -> None:
    """Entity rename fails after SQLite migration → SQLite rolled back, form re-renders."""
    anna = _make_member("anna", "Anna")
    entry = _make_entry(hass, [anna.to_dict()])

    rename_slug_calls: list[tuple[str, str]] = []

    async def _failing_rename_entities(_hass, old_todo, new_slug, old_counter):
        raise Exception("entity registry locked")

    async def _track_rename_slug(old_slug: str, new_slug: str) -> None:
        rename_slug_calls.append((old_slug, new_slug))

    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_rename_member_entities",
            side_effect=_failing_rename_entities,
        ),
        patch(
            "custom_components.lucarne_family.entity_manager.async_create_member_entities",
            side_effect=lambda hass, m: (f"todo.{m.slug}", f"counter.{m.slug}_streak"),
        ),
        patch(
            "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
            new_callable=AsyncMock,
        ),
        patch(
            "custom_components.lucarne_family.seed_preset_routines",
            new_callable=AsyncMock,
        ),
        patch(
            "custom_components.lucarne_family.rename.async_rename_member",
            return_value=RenameImpact(),
        ),
        patch(
            "custom_components.lucarne_family.store.LucarneFamilyStore.async_rename_member_slug",
            side_effect=_track_rename_slug,
        ),
    ):
        await _setup_entry(hass, entry)
        result = await _init_flow(hass, entry)
        result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
        result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
        result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
        result = await _configure(
            hass,
            result["flow_id"],
            {"name": "Annabelle", "color": [255, 0, 0], "preset": "school-age"},
        )
        assert result["step_id"] == "rename_confirm"

        result = await _configure(hass, result["flow_id"], {"confirm": True})

    # Form re-renders with error (not MENU/CREATE_ENTRY)
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result.get("errors", {}).get("base") == "entity_rename_failed"

    # SQLite migrated forward (anna → annabelle) then rolled back (annabelle → anna)
    assert ("anna", "annabelle") in rename_slug_calls
    assert ("annabelle", "anna") in rename_slug_calls

    # Member record unchanged — slug still "anna"
    from custom_components.lucarne_family.store import LucarneFamilyStore
    store: LucarneFamilyStore = hass.data[DOMAIN][entry.entry_id]["store"]
    slugs = [m.slug for m in store.get_members()]
    assert "anna" in slugs
    assert "annabelle" not in slugs


async def test_rename_confirm_cancel_discards_change(
    hass: HomeAssistant,
    _patch_entity_ops_rename: None,
) -> None:
    """Declining rename confirm discards the name change."""
    anna = _make_member("anna", "Anna")
    entry = _make_entry(hass, [anna.to_dict()])
    await _setup_entry(hass, entry)

    result = await _init_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Annabelle", "color": [255, 0, 0], "preset": "school-age"},
    )
    assert result["step_id"] == "rename_confirm"

    # Cancel
    result = await _configure(hass, result["flow_id"], {"confirm": False})
    assert result["type"] in (
        data_entry_flow.FlowResultType.MENU,
        data_entry_flow.FlowResultType.CREATE_ENTRY,
    )

    from custom_components.lucarne_family.store import LucarneFamilyStore
    store: LucarneFamilyStore = hass.data[DOMAIN][entry.entry_id]["store"]
    members = store.get_members()
    slugs = [m.slug for m in members]
    assert "anna" in slugs
    assert "annabelle" not in slugs
