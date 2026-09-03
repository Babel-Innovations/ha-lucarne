"""Tests for custom preset management (Sub-Phase A of Phase 6)."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant import data_entry_flow
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import (
    CONF_CUSTOM_PRESETS,
    CONF_MEMBERS,
    DEFAULT_RESET_TIME,
    DEFAULT_STREAK_CHECK_TIME,
    DOMAIN,
)
from custom_components.lucarne_family.models import Member, RoutinePreset, RoutineTemplate
from custom_components.lucarne_family.store import LucarneFamilyStore


@pytest.fixture(autouse=True)
def _patch_entity_ops():
    """Stub entity creation so tests focus on preset logic."""
    async def _create(hass, member):
        return (f"todo.{member.slug}", f"counter.{member.slug}_streak")

    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_create_member_entities",
            side_effect=_create,
        ),
    ):
        yield


def _make_entry(
    hass: HomeAssistant,
    custom_presets: list[dict[str, Any]] | None = None,
    members: list[dict[str, Any]] | None = None,
) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            CONF_MEMBERS: members or [],
            "reset_time": DEFAULT_RESET_TIME,
            "streak_check_time": DEFAULT_STREAK_CHECK_TIME,
            CONF_CUSTOM_PRESETS: custom_presets or [],
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


async def _make_store(hass: HomeAssistant, entry_id: str, tmp_path: Path) -> LucarneFamilyStore:
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry_id, db_path)
    await store.async_init()
    return store


# ---------------------------------------------------------------------------
# Custom preset seeding via seed_preset_routines
# ---------------------------------------------------------------------------

async def test_seed_custom_preset_adds_routines(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """seed_preset_routines seeds routines from a custom preset when passed via extra_presets."""
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    # Create a local_todo entity for "ben"
    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "ben"},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"

    from custom_components.lucarne_family import seed_preset_routines

    custom_preset = RoutinePreset(
        slug="custom-morning",
        display_name="Morning routine",
        routines=[
            RoutineTemplate(summary="Yoga", icon="🧘", recurrence="FREQ=DAILY"),
            RoutineTemplate(summary="Journal", icon="📓", recurrence="FREQ=DAILY"),
        ],
    )
    member = Member(
        slug="ben",
        name="Ben",
        color="#aabbcc",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="custom-morning",
        todo_entity_id="todo.ben",
        streak_counter_id="counter.ben_streak",
    )
    await seed_preset_routines(
        hass, store, member, extra_presets={"custom-morning": custom_preset}
    )

    tasks = await store.async_get_tasks_for_member("ben")
    assert len(tasks) == 2
    summaries = {t["summary"] for t in tasks}
    assert summaries == {"Yoga", "Journal"}


async def test_seed_builtin_preset_still_works_without_extra_presets(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Calling seed_preset_routines without extra_presets still seeds built-in presets."""
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

    from custom_components.lucarne_family import seed_preset_routines

    member = Member(
        slug="ingrid",
        name="Ingrid",
        color="#112233",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id="todo.ingrid",
        streak_counter_id="counter.ingrid_streak",
    )
    await seed_preset_routines(hass, store, member)

    tasks = await store.async_get_tasks_for_member("ingrid")
    assert len(tasks) == 5  # school-age has 5 routines


# ---------------------------------------------------------------------------
# Custom preset in options flow
# ---------------------------------------------------------------------------

async def test_add_custom_preset_saved_to_entry_data(hass: HomeAssistant) -> None:
    """Full options-flow add-preset journey saves preset to entry.data."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    await hass.async_block_till_done()
    assert result["type"] == data_entry_flow.FlowResultType.MENU

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "edit_templates"}
    )
    await hass.async_block_till_done()
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "edit_templates"

    # Add a new custom preset
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_custom_preset"}
    )
    await hass.async_block_till_done()
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "add_custom_preset"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"display_name": "Evening wind-down"}
    )
    await hass.async_block_till_done()
    # Should advance to the routine-adding step
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "add_preset_routine"

    # Add a routine
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            "summary": "Read book",
            "icon": "📚",
            "recurrence": "FREQ=DAILY",
            "add_another": False,
        },
    )
    await hass.async_block_till_done()

    # Should have saved and returned to options menu
    assert result["type"] in (
        data_entry_flow.FlowResultType.MENU,
        data_entry_flow.FlowResultType.CREATE_ENTRY,
    )

    # Verify the preset was saved
    custom_presets = entry.data.get(CONF_CUSTOM_PRESETS, [])
    assert len(custom_presets) == 1
    assert custom_presets[0]["display_name"] == "Evening wind-down"
    assert len(custom_presets[0]["routines"]) == 1
    assert custom_presets[0]["routines"][0]["summary"] == "Read book"


async def test_custom_preset_appears_in_add_member_form(hass: HomeAssistant) -> None:
    """Custom presets stored in entry.data are offered as choices when adding a member."""
    custom_preset = {
        "slug": "custom-test",
        "display_name": "My Custom Preset",
        "routines": [{"summary": "Walk", "icon": "🚶", "recurrence": "FREQ=DAILY"}],
    }
    entry = _make_entry(hass, custom_presets=[custom_preset])
    await _setup_entry(hass, entry)

    with (
        patch(
            "custom_components.lucarne_family.config_flow.seed_preset_routines",
            new_callable=AsyncMock,
        ),
        patch(
            "custom_components.lucarne_family.store.LucarneFamilyStore.async_save_members",
            new_callable=AsyncMock,
        ),
    ):
        result = await hass.config_entries.options.async_init(entry.entry_id)
        await hass.async_block_till_done()
        result = await hass.config_entries.options.async_configure(
            result["flow_id"], {"next_step_id": "manage_members"}
        )
        result = await hass.config_entries.options.async_configure(
            result["flow_id"], {"next_step_id": "add_member"}
        )
        assert result["type"] == data_entry_flow.FlowResultType.FORM
        assert result["step_id"] == "add_member"

        # Submit with the custom preset slug — should succeed (not "invalid choice")
        result = await hass.config_entries.options.async_configure(
            result["flow_id"],
            {
                "name": "Charlie",
                "color": [170, 187, 204],
                "preset": "custom-test",
            },
        )
        await hass.async_block_till_done()
        assert result["type"] in (
            data_entry_flow.FlowResultType.MENU,
            data_entry_flow.FlowResultType.CREATE_ENTRY,
        )


# ---------------------------------------------------------------------------
# Edit / delete custom presets + surface built-ins (issue #11)
# ---------------------------------------------------------------------------


async def test_edit_templates_menu_lists_management_options_when_custom_presets_exist(
    hass: HomeAssistant,
) -> None:
    """Menu offers add / edit-existing / view-built-ins when at least one custom preset exists."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {
                "slug": "morning",
                "display_name": "Morning",
                "routines": [{"summary": "Stretch", "icon": "🧘", "recurrence": "FREQ=DAILY"}],
            }
        ],
    )
    await _setup_entry(hass, entry)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "edit_templates"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "edit_templates"
    options = result["menu_options"]
    # The menu lists add + manage-existing + view-builtins
    assert "add_custom_preset" in options
    assert "manage_existing_preset" in options
    assert "view_builtin_presets" in options


async def test_edit_templates_menu_hides_manage_when_no_custom_presets(
    hass: HomeAssistant,
) -> None:
    """Manage-existing is hidden when no custom presets; view-builtins always shows."""
    entry = _make_entry(hass)  # no custom presets
    await _setup_entry(hass, entry)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "edit_templates"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    options = result["menu_options"]
    assert "add_custom_preset" in options
    assert "manage_existing_preset" not in options
    assert "view_builtin_presets" in options


async def test_view_builtin_presets_lists_all_builtins(hass: HomeAssistant) -> None:
    """View-builtins description placeholder includes every built-in display name."""
    from custom_components.lucarne_family.presets import BUILTIN_PRESETS

    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "edit_templates"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "view_builtin_presets"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "view_builtin_presets"
    placeholder = result["description_placeholders"]["presets"]
    for preset in BUILTIN_PRESETS.values():
        assert preset.display_name in placeholder


async def _open_preset_edit_menu(
    hass: HomeAssistant, entry: MockConfigEntry, preset_slug: str
) -> dict[str, Any]:
    """Drive the options flow to the per-preset edit menu and return the result."""
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "edit_templates"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "manage_existing_preset"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"preset_slug": preset_slug}
    )
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "edit_custom_preset"
    return result  # type: ignore[return-value]


async def test_edit_custom_preset_menu_lists_actions(hass: HomeAssistant) -> None:
    """The per-preset edit screen is a menu with rename/add/delete/done options."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    options = result["menu_options"]
    assert "rename_custom_preset" in options
    assert "add_routine_to_preset" in options
    assert "delete_preset_confirm" in options
    assert "done_editing_preset" in options


async def test_rename_custom_preset_updates_display_name_preserves_slug(
    hass: HomeAssistant,
) -> None:
    """Rename changes display_name but keeps slug stable so member.preset still resolves."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {
                "slug": "morning",
                "display_name": "Morning",
                "routines": [{"summary": "Stretch", "icon": "🧘", "recurrence": "FREQ=DAILY"}],
            }
        ],
        members=[
            {
                "slug": "ben",
                "name": "Ben",
                "color": "#aabbcc",
                "avatar": None,
                "created_at": datetime.now(UTC).isoformat(),
                "preset": "morning",
                "todo_entity_id": "todo.ben",
                "streak_counter_id": "counter.ben_streak",
            }
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")

    # Pick "Rename preset"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "rename_custom_preset"}
    )
    assert result["step_id"] == "rename_custom_preset"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"display_name": "Sunrise"}
    )
    await hass.async_block_till_done()
    # After save, we land back in the per-preset edit menu.
    assert result["step_id"] == "edit_custom_preset"

    custom_presets = entry.data.get(CONF_CUSTOM_PRESETS, [])
    assert len(custom_presets) == 1
    assert custom_presets[0]["slug"] == "morning"  # slug unchanged
    assert custom_presets[0]["display_name"] == "Sunrise"

    # Existing member's preset reference still points to "morning"
    members = entry.data[CONF_MEMBERS]
    assert members[0]["preset"] == "morning"


async def test_rename_to_conflicting_name_shows_error(hass: HomeAssistant) -> None:
    """Renaming to a name whose slug collides with another preset is rejected.

    Includes a preset whose `display_name` has drifted from its stored slug
    (slug="evening", display_name="Sunset") — slugs are immutable on rename,
    so the conflict check must compare against the stored slug, not the
    recomputed `_make_slug(display_name)`.
    """
    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
            # Previously renamed: slug stayed "evening", display moved on.
            {"slug": "evening", "display_name": "Sunset", "routines": []},
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "rename_custom_preset"}
    )
    # Rename "Morning" → "Evening" — would collide with stored slug "evening".
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"display_name": "Evening"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "rename_custom_preset"
    assert result["errors"] == {"display_name": "slug_conflict"}


async def test_rename_to_canonically_colliding_builtin_name_shows_error(
    hass: HomeAssistant,
) -> None:
    """Built-in slugs use hyphens; `_make_slug` produces underscores. A rename
    like "School age" must still be rejected as colliding with built-in
    `school-age` (`_canonical_slug` strips the hyphen/underscore diff)."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "rename_custom_preset"}
    )
    # "School age" → slug "school_age"; built-in slug is "school-age".
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"display_name": "School age"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "rename_custom_preset"
    assert result["errors"] == {"display_name": "slug_conflict"}


async def test_add_custom_preset_rejects_canonically_colliding_builtin_name(
    hass: HomeAssistant,
) -> None:
    """`add_custom_preset` applies the same canonical-slug check as rename."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "edit_templates"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_custom_preset"}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"display_name": "School age"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "add_custom_preset"
    assert result["errors"] == {"display_name": "slug_conflict"}


async def test_add_routine_to_existing_preset_appends_via_add_preset_routine(
    hass: HomeAssistant,
) -> None:
    """Choosing 'add_routine' reuses add_preset_routine and appends to the existing preset."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {
                "slug": "morning",
                "display_name": "Morning",
                "routines": [{"summary": "Stretch", "icon": "🧘", "recurrence": "FREQ=DAILY"}],
            }
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    # Choose "Add a routine"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_routine_to_preset"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "add_preset_routine"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            "summary": "Coffee",
            "icon": "☕",
            "recurrence": "FREQ=DAILY",
            "add_another": False,
        },
    )
    await hass.async_block_till_done()

    custom_presets = entry.data.get(CONF_CUSTOM_PRESETS, [])
    assert len(custom_presets) == 1
    routines = custom_presets[0]["routines"]
    assert len(routines) == 2
    summaries = {r["summary"] for r in routines}
    assert summaries == {"Stretch", "Coffee"}


async def test_add_routine_when_preset_vanishes_bounces_to_templates_menu(
    hass: HomeAssistant,
) -> None:
    """If the preset under edit is deleted mid-flow, the routine save bounces
    back to the templates menu (rather than recording a misleading
    create_entry success on top of stale state)."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "add_routine_to_preset"}
    )
    assert result["step_id"] == "add_preset_routine"

    # Simulate the preset being removed from another window after the user
    # opened the add-routine form but before they submitted it.
    new_data = {**entry.data, CONF_CUSTOM_PRESETS: []}
    hass.config_entries.async_update_entry(entry, data=new_data)

    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            "summary": "Coffee",
            "icon": "☕",
            "recurrence": "FREQ=DAILY",
            "add_another": False,
        },
    )
    await hass.async_block_till_done()

    # No preset was created (we're in edit mode, not add mode) and the user
    # is bounced back to the templates menu — input isn't silently lost in
    # the sense that a "succeeded" create_entry was returned.
    assert entry.data.get(CONF_CUSTOM_PRESETS, []) == []
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "edit_templates"


async def test_delete_custom_preset_removes_and_migrates_members(
    hass: HomeAssistant,
) -> None:
    """Deleting a preset removes it and rewrites any member.preset references to adult-none."""
    from custom_components.lucarne_family.const import PRESET_ADULT_NONE

    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
        ],
        members=[
            {
                "slug": "ben",
                "name": "Ben",
                "color": "#aabbcc",
                "avatar": None,
                "created_at": datetime.now(UTC).isoformat(),
                "preset": "morning",
                "todo_entity_id": "todo.ben",
                "streak_counter_id": "counter.ben_streak",
            },
            {
                "slug": "anna",
                "name": "Anna",
                "color": "#112233",
                "avatar": None,
                "created_at": datetime.now(UTC).isoformat(),
                "preset": "school-age",
                "todo_entity_id": "todo.anna",
                "streak_counter_id": "counter.anna_streak",
            },
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    # Choose "Delete this preset"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "delete_preset_confirm"}
    )
    assert result["step_id"] == "delete_preset_confirm"

    # Confirm
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"confirm": True}
    )
    await hass.async_block_till_done()

    # Preset removed
    assert entry.data.get(CONF_CUSTOM_PRESETS, []) == []
    # Ben's preset migrated to adult-none; Anna's untouched
    members_by_slug = {m["slug"]: m for m in entry.data[CONF_MEMBERS]}
    assert members_by_slug["ben"]["preset"] == PRESET_ADULT_NONE
    assert members_by_slug["anna"]["preset"] == "school-age"


async def test_delete_preset_impact_text_derives_fallback_label(
    hass: HomeAssistant,
) -> None:
    """The confirm-delete description uses BUILTIN_PRESETS[adult-none].display_name
    rather than a hard-coded string."""
    from custom_components.lucarne_family.const import PRESET_ADULT_NONE
    from custom_components.lucarne_family.presets import BUILTIN_PRESETS

    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
        ],
        members=[
            {
                "slug": "ben",
                "name": "Ben",
                "color": "#aabbcc",
                "avatar": None,
                "created_at": datetime.now(UTC).isoformat(),
                "preset": "morning",
                "todo_entity_id": "todo.ben",
                "streak_counter_id": "counter.ben_streak",
            }
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "delete_preset_confirm"}
    )
    expected_label = BUILTIN_PRESETS[PRESET_ADULT_NONE].display_name
    assert expected_label in result["description_placeholders"]["impact"]


async def test_delete_preset_cancel_keeps_preset(hass: HomeAssistant) -> None:
    """Declining the delete confirmation leaves the preset intact."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "delete_preset_confirm"}
    )
    # Decline (confirm=False)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"confirm": False}
    )
    await hass.async_block_till_done()

    # Preset still there
    presets = entry.data.get(CONF_CUSTOM_PRESETS, [])
    assert len(presets) == 1
    assert presets[0]["slug"] == "morning"


async def test_done_editing_preset_returns_to_templates_menu(
    hass: HomeAssistant,
) -> None:
    """Selecting 'Done' on the per-preset menu exits back to the templates menu."""
    entry = _make_entry(
        hass,
        custom_presets=[
            {"slug": "morning", "display_name": "Morning", "routines": []},
        ],
    )
    await _setup_entry(hass, entry)
    result = await _open_preset_edit_menu(hass, entry, "morning")
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"next_step_id": "done_editing_preset"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "edit_templates"
