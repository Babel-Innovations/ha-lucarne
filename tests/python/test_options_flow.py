"""Tests for the options flow (ongoing member management and schedule edits)."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant import data_entry_flow
from homeassistant.components import webhook
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import (
    CONF_APPLE_BRIDGE,
    CONF_HOUSEHOLD_LIST,
    CONF_MEMBERS,
    CONF_WEBHOOK_ID,
    DEFAULT_RESET_TIME,
    DEFAULT_STREAK_CHECK_TIME,
    DOMAIN,
)
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.rename import RenameImpact


@pytest.fixture(autouse=True)
def _patch_entity_ops():
    """Stub entity creation/deletion/rename so options-flow tests focus on navigation only."""

    async def _create(hass, member):
        return (f"todo.{member.slug}", f"counter.{member.slug}_streak")

    async def _rename(_hass, old_todo, new_slug, old_counter):
        return (f"todo.{new_slug}", f"counter.{new_slug}_streak")

    with (
        patch(
            "custom_components.lucarne_family.entity_manager.async_create_member_entities",
            side_effect=_create,
        ),
        patch(
            "custom_components.lucarne_family.entity_manager.async_delete_member_entities",
            new_callable=AsyncMock,
        ),
        patch(
            "custom_components.lucarne_family.entity_manager.async_rename_member_entities",
            side_effect=_rename,
        ),
        patch(
            "custom_components.lucarne_family.rename.async_rename_member",
            new_callable=AsyncMock,
            return_value=RenameImpact(),
        ),
        patch(
            "custom_components.lucarne_family.store.LucarneFamilyStore.async_rename_member_slug",
            new_callable=AsyncMock,
        ),
        patch(
            "custom_components.lucarne_family.seed_preset_routines",
            new_callable=AsyncMock,
        ),
    ):
        yield


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


async def _init_options_flow(
    hass: HomeAssistant, entry: MockConfigEntry
) -> dict[str, Any]:
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
# Add member
# ---------------------------------------------------------------------------


async def test_add_member_happy_path(hass: HomeAssistant) -> None:
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    assert result["type"] == data_entry_flow.FlowResultType.MENU

    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    assert result["type"] == data_entry_flow.FlowResultType.MENU

    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "add_member"

    result = await _configure(
        hass,
        result["flow_id"],
        # HA's ColorRGBSelector submits RGB triplets; integration normalises to hex.
        {"name": "Anna", "color": [245, 200, 156], "preset": "school-age"},
    )
    # Should return to manage_members menu after success
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "manage_members"

    members = entry.data[CONF_MEMBERS]
    assert len(members) == 1
    assert members[0]["slug"] == "anna"
    assert members[0]["name"] == "Anna"
    assert members[0]["color"] == "#f5c89c"


async def test_add_member_slug_generated_correctly(hass: HomeAssistant) -> None:
    """Slug is derived from name: lowercase, non-alphanum replaced by underscore."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})

    await _configure(
        hass,
        result["flow_id"],
        {"name": "Mary Jane", "color": [170, 187, 204], "preset": "toddler"},
    )

    slug = entry.data[CONF_MEMBERS][0]["slug"]
    assert slug == "mary_jane"


async def test_add_member_slug_conflict(hass: HomeAssistant) -> None:
    """Two members with names that produce the same slug → error."""
    anna = Member(
        slug="anna",
        name="Anna",
        color="#f5c89c",
        avatar=None,
        created_at=datetime(2024, 1, 1, tzinfo=UTC),
        preset="school-age",
    )
    entry = _make_entry(hass, members=[anna.to_dict()])
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})

    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Anna", "color": [18, 52, 86], "preset": "toddler"},
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert "name" in result["errors"]
    assert result["errors"]["name"] == "slug_conflict"

    # Original member unchanged
    assert len(entry.data[CONF_MEMBERS]) == 1


async def test_add_member_empty_name_rejected(hass: HomeAssistant) -> None:
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})

    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "", "color": [245, 200, 156], "preset": "school-age"},
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert "name" in result["errors"]


async def test_add_member_invalid_color_rejected(hass: HomeAssistant) -> None:
    """Regression guard: ColorRGBSelector must validate strictly, not vol.Any-wrapped.

    Wrapping the selector in `vol.Any(selector.ColorRGBSelector(), str)` once
    seemed convenient but crashes HA's frontend (voluptuous_serialize can't
    convert `Any(Selector, ...)`). This test pins the strict-selector contract
    by asserting an out-of-range RGB triplet raises at the schema layer.
    """
    from homeassistant.data_entry_flow import InvalidData

    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})

    # ColorRGBSelector validates 0-255 per channel via cv.byte; a 300 channel
    # fails schema validation before the step handler runs.
    with pytest.raises(InvalidData):
        await _configure(
            hass,
            result["flow_id"],
            {"name": "Bob", "color": [300, 0, 0], "preset": "toddler"},
        )


async def test_add_member_emoji_only_name_produces_empty_slug(hass: HomeAssistant) -> None:
    """All-emoji name after slug generation → empty_slug error."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})

    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "🎉🎊🥳", "color": [18, 52, 86], "preset": "school-age"},
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["errors"].get("name") == "empty_slug"


# ---------------------------------------------------------------------------
# Edit member
# ---------------------------------------------------------------------------


async def _add_anna(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})
    await _configure(
        hass,
        result["flow_id"],
        {"name": "Anna", "color": [245, 200, 156], "preset": "school-age"},
    )


async def test_edit_member_slug_changing_name_shows_rename_confirm(
    hass: HomeAssistant,
) -> None:
    """Editing a member's name to one that changes the slug routes to rename_confirm."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    await _add_anna(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})

    # Submit a name whose slug differs: "Anna-Maria" → "anna_maria" ≠ "anna"
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Anna-Maria", "color": [245, 200, 156], "preset": "school-age"},
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "rename_confirm"

    # Confirm rename — entities renamed and member record updated with new slug
    result = await _configure(hass, result["flow_id"], {"confirm": True})
    assert result["type"] in (
        data_entry_flow.FlowResultType.MENU,
        data_entry_flow.FlowResultType.CREATE_ENTRY,
    )
    from custom_components.lucarne_family.store import LucarneFamilyStore

    store: LucarneFamilyStore = hass.data[DOMAIN][entry.entry_id]["store"]
    slugs = [m.slug for m in store.get_members()]
    assert "anna_maria" in slugs
    assert "anna" not in slugs


async def test_edit_member_slug_unchanged_after_rename(hass: HomeAssistant) -> None:
    """Slug is frozen at creation; editing name must not touch it."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    await _add_anna(hass, entry)

    original_slug = entry.data[CONF_MEMBERS][0]["slug"]

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    await _configure(
        hass,
        result["flow_id"],
        {
            "name": "Completely Different Name",
            "color": [0, 0, 0],
            "preset": "adult-none",
        },
    )

    assert entry.data[CONF_MEMBERS][0]["slug"] == original_slug


# ---------------------------------------------------------------------------
# Remove member
# ---------------------------------------------------------------------------


async def test_remove_member_confirmation_works(hass: HomeAssistant) -> None:
    """Typing the member's name confirms removal."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    await _add_anna(hass, entry)

    assert len(entry.data[CONF_MEMBERS]) == 1

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "remove_member"})

    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    result = await _configure(hass, result["flow_id"], {"confirm_name": "Anna"})
    assert result["type"] == data_entry_flow.FlowResultType.MENU

    assert len(entry.data[CONF_MEMBERS]) == 0


async def test_remove_member_wrong_confirmation_rejected(hass: HomeAssistant) -> None:
    """Wrong confirmation name shows error and does not remove."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    await _add_anna(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "remove_member"})

    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    result = await _configure(hass, result["flow_id"], {"confirm_name": "wrong"})
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["errors"].get("confirm_name") == "confirm_mismatch"

    assert len(entry.data[CONF_MEMBERS]) == 1


# ---------------------------------------------------------------------------
# Edit schedule
# ---------------------------------------------------------------------------


async def test_edit_schedule_times_saved(hass: HomeAssistant) -> None:
    """Valid times are persisted to entry.data and the flow returns to `init`."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_schedule"})
    assert result["type"] == data_entry_flow.FlowResultType.FORM

    result = await _configure(
        hass, result["flow_id"], {"reset_time": "03:00", "streak_check_time": "20:30"}
    )
    # Issue #15: saving the schedule lands back on the root menu instead of
    # closing the dialog, so a sibling option is one click away.
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "init"

    assert entry.data["reset_time"] == "03:00"
    assert entry.data["streak_check_time"] == "20:30"


async def test_edit_schedule_invalid_time_rejected(hass: HomeAssistant) -> None:
    """Invalid time format is rejected by the TimeSelector schema."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_schedule"})

    # TimeSelector validates at the schema level; invalid data raises InvalidData
    with pytest.raises(data_entry_flow.InvalidData):
        await _configure(
            hass, result["flow_id"], {"reset_time": "25:00", "streak_check_time": "21:00"}
        )


# ---------------------------------------------------------------------------
# Edit round-trip
# ---------------------------------------------------------------------------


async def test_manage_members_menu_offers_back_to_init(hass: HomeAssistant) -> None:
    """`manage_members` menu must expose a `back_to_init` affordance."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert "back_to_init" in result["menu_options"]


async def test_manage_members_back_to_init_returns_to_root_menu(
    hass: HomeAssistant,
) -> None:
    """Choosing `back_to_init` from `manage_members` lands on the root `init` menu."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "back_to_init"})

    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "init"


async def test_edit_templates_menu_offers_back_to_init(hass: HomeAssistant) -> None:
    """`edit_templates` menu must expose a `back_to_init` affordance."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_templates"})
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert "back_to_init" in result["menu_options"]


async def test_edit_templates_back_to_init_returns_to_root_menu(
    hass: HomeAssistant,
) -> None:
    """Choosing `back_to_init` from `edit_templates` lands on the root `init` menu."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_templates"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "back_to_init"})

    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "init"


async def test_edit_schedule_submit_returns_to_init_menu(hass: HomeAssistant) -> None:
    """Saving the schedule must land back on `init`, not close the dialog.

    Sibling options (round-trip, presets, members) are still one click away.
    """
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_schedule"})
    result = await _configure(
        hass, result["flow_id"], {"reset_time": "03:00", "streak_check_time": "20:30"}
    )

    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "init"
    # Save still happened
    assert entry.data["reset_time"] == "03:00"
    assert entry.data["streak_check_time"] == "20:30"


async def test_add_preset_routine_new_preset_returns_to_edit_templates(
    hass: HomeAssistant,
) -> None:
    """Finishing a brand-new preset returns to `edit_templates`, not closes."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_templates"})
    result = await _configure(
        hass, result["flow_id"], {"next_step_id": "add_custom_preset"}
    )
    result = await _configure(
        hass, result["flow_id"], {"display_name": "Evening wind-down"}
    )
    assert result["step_id"] == "add_preset_routine"

    result = await _configure(
        hass,
        result["flow_id"],
        {
            "summary": "Read book",
            "icon": "📚",
            "recurrence": "FREQ=DAILY",
            "time_of_day": "night",
            "add_another": False,
        },
    )

    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "edit_templates"


async def test_add_routine_to_existing_preset_returns_to_edit_custom_preset(
    hass: HomeAssistant,
) -> None:
    """Appending a routine to an existing preset returns to that preset's menu,
    not to the root templates menu — so the user can immediately add another
    or rename without re-picking the preset."""
    from custom_components.lucarne_family.const import CONF_CUSTOM_PRESETS

    entry = _make_entry(hass)
    # Seed an existing custom preset directly so we don't have to walk the
    # add-preset flow first.
    hass.config_entries.async_update_entry(
        entry,
        data={
            **entry.data,
            CONF_CUSTOM_PRESETS: [
                {
                    "slug": "evening_wind_down",
                    "display_name": "Evening wind-down",
                    "routines": [],
                }
            ],
        },
    )
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_templates"})
    result = await _configure(
        hass, result["flow_id"], {"next_step_id": "manage_existing_preset"}
    )
    result = await _configure(
        hass, result["flow_id"], {"preset_slug": "evening_wind_down"}
    )
    assert result["step_id"] == "edit_custom_preset"

    result = await _configure(
        hass, result["flow_id"], {"next_step_id": "add_routine_to_preset"}
    )
    assert result["step_id"] == "add_preset_routine"

    result = await _configure(
        hass,
        result["flow_id"],
        {
            "summary": "Brush teeth",
            "icon": "🪥",
            "recurrence": "FREQ=DAILY",
            "time_of_day": "night",
            "add_another": False,
        },
    )

    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "edit_custom_preset"




# ---------------------------------------------------------------------------
# Apple Reminders bridge
# ---------------------------------------------------------------------------


def _webhook_ids(hass: HomeAssistant) -> set[str]:
    return set(hass.data.get(webhook.DOMAIN, {}))


async def _open_bridge_step(hass: HomeAssistant, entry: MockConfigEntry) -> Any:
    result = await _init_options_flow(hass, entry)
    return await _configure(hass, result["flow_id"], {"next_step_id": "edit_apple_bridge"})


async def test_bridge_step_shows_install_command_and_saves_household_list(
    hass: HomeAssistant,
) -> None:
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    hass.config.internal_url = "http://ha.local:8123"

    result = await _open_bridge_step(hass, entry)
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "edit_apple_bridge"
    webhook_id = entry.data[CONF_WEBHOOK_ID]
    placeholders = result["description_placeholders"]
    assert placeholders["webhook_url"] == f"http://ha.local:8123/api/webhook/{webhook_id}"
    assert placeholders["install_command"] == (
        f"lucarne-bridge install http://ha.local:8123/api/webhook/{webhook_id}"
    )
    assert placeholders["last_sync"] == "never"
    assert placeholders["available_lists"] == "(none reported yet)"

    result = await _configure(hass, result["flow_id"], {CONF_HOUSEHOLD_LIST: " Casa "})
    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "init"
    assert entry.data[CONF_APPLE_BRIDGE][CONF_HOUSEHOLD_LIST] == "Casa"
    assert entry.data[CONF_WEBHOOK_ID] == webhook_id


async def test_bridge_step_without_a_url_explains_instead_of_failing(
    hass: HomeAssistant,
) -> None:
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    hass.config.internal_url = None
    hass.config.external_url = None

    with patch(
        "custom_components.lucarne_family.config_flow.webhook.async_generate_url",
        side_effect=__import__(
            "homeassistant.helpers.network", fromlist=["NoURLAvailableError"]
        ).NoURLAvailableError,
    ):
        result = await _open_bridge_step(hass, entry)

    placeholders = result["description_placeholders"]
    assert placeholders["webhook_url"] == "(no URL configured)"
    assert "Settings → System → Network" in placeholders["install_command"]


async def test_bridge_step_reports_last_sync_and_offers_reported_lists(
    hass: HomeAssistant,
) -> None:
    from custom_components.lucarne_family.apple_bridge import BridgeStatus

    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    runtime = hass.data[DOMAIN][entry.entry_id]["bridge"]
    runtime.available_lists = ["Family", "Anna"]
    runtime.status = BridgeStatus(
        synced_at=datetime(2026, 9, 3, 10, 5, tzinfo=UTC),
        host="mac-mini",
        bridge_version="1.6.0",
        received=4,
        created=1,
        updated=2,
        completed_in_ha=1,
        sent_complete=1,
        skipped_lists=["Anna"],
        unmapped_lists=["Groceries"],
    )

    result = await _open_bridge_step(hass, entry)

    placeholders = result["description_placeholders"]
    assert placeholders["available_lists"] == "Family, Anna"
    assert placeholders["last_sync"] == (
        "2026-09-03 10:05 UTC from mac-mini (bridge 1.6.0): 4 received, 1 created, "
        "2 updated, 1 completed here, 1 sent back, skipped: Anna, not mapped: Groceries"
    )
    field = next(k for k in result["data_schema"].schema if k == CONF_HOUSEHOLD_LIST)
    sel = result["data_schema"].schema[field]
    assert sel.config["options"] == ["Family", "Anna"]
    assert sel.config["custom_value"] is True


async def test_bridge_step_reports_a_failed_sync(hass: HomeAssistant) -> None:
    from custom_components.lucarne_family.apple_bridge import BridgeStatus

    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    runtime = hass.data[DOMAIN][entry.entry_id]["bridge"]
    runtime.status = BridgeStatus(
        synced_at=datetime(2026, 9, 3, 10, 5, tzinfo=UTC),
        host="mac-mini",
        bridge_version="1.6.0",
        error="database is locked",
    )

    result = await _open_bridge_step(hass, entry)
    assert result["description_placeholders"]["last_sync"] == (
        "2026-09-03 10:05 UTC from mac-mini: database is locked"
    )


async def test_bridge_step_rejects_a_list_already_given_to_a_member(
    hass: HomeAssistant,
) -> None:
    entry = _make_entry(hass, members=[_member_dict("anna", apple_list="Kids")])
    await _setup_entry(hass, entry)

    result = await _open_bridge_step(hass, entry)
    result = await _configure(hass, result["flow_id"], {CONF_HOUSEHOLD_LIST: "kids"})

    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["errors"] == {CONF_HOUSEHOLD_LIST: "apple_list_conflict"}
    assert entry.data[CONF_APPLE_BRIDGE][CONF_HOUSEHOLD_LIST] == "Family"


async def test_rotating_the_webhook_re_registers_it(hass: HomeAssistant) -> None:
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    old_id = entry.data[CONF_WEBHOOK_ID]
    assert old_id in _webhook_ids(hass)

    result = await _open_bridge_step(hass, entry)
    await _configure(
        hass, result["flow_id"], {CONF_HOUSEHOLD_LIST: "Family", "rotate_webhook": True}
    )
    await hass.async_block_till_done()

    new_id = entry.data[CONF_WEBHOOK_ID]
    assert new_id != old_id
    assert new_id in _webhook_ids(hass)
    assert old_id not in _webhook_ids(hass)
    assert hass.data[DOMAIN][entry.entry_id]["bridge"].webhook_id == new_id

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert new_id not in _webhook_ids(hass)


def _member_dict(slug: str, apple_list: str = "", preset: str = "school-age") -> dict[str, Any]:
    return Member(
        slug=slug,
        name=slug.capitalize(),
        color="#f5c89c",
        avatar=None,
        created_at=datetime(2024, 1, 1, tzinfo=UTC),
        preset=preset,
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
        apple_list=apple_list,
    ).to_dict()


async def test_add_member_stores_apple_list(hass: HomeAssistant) -> None:
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Anna", "color": [245, 200, 156], "preset": "school-age", "apple_list": " Anna "},
    )

    assert result["step_id"] == "manage_members"
    assert entry.data[CONF_MEMBERS][0]["apple_list"] == "Anna"


async def test_add_member_rejects_the_household_list(hass: HomeAssistant) -> None:
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "add_member"})
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Anna", "color": [245, 200, 156], "preset": "school-age", "apple_list": "family"},
    )

    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["errors"] == {"apple_list": "apple_list_conflict"}
    assert entry.data[CONF_MEMBERS] == []


async def test_edit_member_updates_apple_list_and_keeps_it_on_other_edits(
    hass: HomeAssistant,
) -> None:
    entry = _make_entry(
        hass, members=[_member_dict("anna", apple_list="Anna"), _member_dict("ben")]
    )
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "ben"})
    assert result["step_id"] == "edit_member"

    # Ben takes Anna's list → conflict.
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Ben", "color": [1, 2, 3], "preset": "toddler", "apple_list": "anna"},
    )
    assert result["errors"] == {"apple_list": "apple_list_conflict"}

    # A different list is fine, and Anna's mapping is untouched by editing Ben.
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Ben", "color": [1, 2, 3], "preset": "toddler", "apple_list": "Ben"},
    )
    assert result["step_id"] == "manage_members"
    by_slug = {m["slug"]: m for m in entry.data[CONF_MEMBERS]}
    assert by_slug["ben"]["apple_list"] == "Ben"
    assert by_slug["ben"]["preset"] == "toddler"
    assert by_slug["anna"]["apple_list"] == "Anna"


async def test_edit_member_clearing_the_list_drops_its_repairs_issue(
    hass: HomeAssistant,
) -> None:
    from homeassistant.helpers import issue_registry as ir

    entry = _make_entry(hass, members=[_member_dict("anna", apple_list="Anna")])
    await _setup_entry(hass, entry)
    ir.async_create_issue(
        hass,
        DOMAIN,
        "apple_list_missing_anna",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="apple_list_missing",
    )

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    await _configure(
        hass,
        result["flow_id"],
        {"name": "Anna", "color": [1, 2, 3], "preset": "school-age", "apple_list": ""},
    )

    assert entry.data[CONF_MEMBERS][0]["apple_list"] == ""
    assert ir.async_get(hass).async_get_issue(DOMAIN, "apple_list_missing_anna") is None


async def test_rename_keeps_the_apple_list(hass: HomeAssistant) -> None:
    entry = _make_entry(hass, members=[_member_dict("anna", apple_list="Anna")])
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    result = await _configure(
        hass,
        result["flow_id"],
        {
            "name": "Anna-Maria",
            "color": [245, 200, 156],
            "preset": "school-age",
            "apple_list": "Anna",
        },
    )
    assert result["step_id"] == "rename_confirm"
    await _configure(hass, result["flow_id"], {"confirm": True})

    (member,) = entry.data[CONF_MEMBERS]
    assert member["slug"] == "anna_maria"
    assert member["apple_list"] == "Anna"


async def test_deleting_a_preset_keeps_members_apple_lists(hass: HomeAssistant) -> None:
    entry = _make_entry(hass, members=[_member_dict("anna", apple_list="Anna", preset="mine")])
    entry.add_to_hass(hass)
    hass.config_entries.async_update_entry(
        entry,
        data={
            **entry.data,
            "custom_presets": [{"slug": "mine", "display_name": "Mine", "routines": []}],
        },
    )
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_templates"})
    result = await _configure(
        hass, result["flow_id"], {"next_step_id": "manage_existing_preset"}
    )
    result = await _configure(hass, result["flow_id"], {"preset_slug": "mine"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "delete_preset_confirm"})
    await _configure(hass, result["flow_id"], {"confirm": True})

    (member,) = entry.data[CONF_MEMBERS]
    assert member["preset"] == "adult-none"
    assert member["apple_list"] == "Anna"


def _raise_missing_list_issue(hass: HomeAssistant, target: str) -> None:
    from homeassistant.helpers import issue_registry as ir

    ir.async_create_issue(
        hass,
        DOMAIN,
        f"apple_list_missing_{target}",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="apple_list_missing",
    )


async def test_changing_the_household_list_drops_its_repairs_issue(hass: HomeAssistant) -> None:
    from homeassistant.helpers import issue_registry as ir

    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    _raise_missing_list_issue(hass, "household")

    result = await _open_bridge_step(hass, entry)
    await _configure(hass, result["flow_id"], {CONF_HOUSEHOLD_LIST: ""})

    assert entry.data[CONF_APPLE_BRIDGE][CONF_HOUSEHOLD_LIST] == ""
    assert ir.async_get(hass).async_get_issue(DOMAIN, "apple_list_missing_household") is None


async def test_resaving_the_same_household_list_keeps_its_repairs_issue(
    hass: HomeAssistant,
) -> None:
    from homeassistant.helpers import issue_registry as ir

    entry = _make_entry(hass)
    await _setup_entry(hass, entry)
    _raise_missing_list_issue(hass, "household")

    result = await _open_bridge_step(hass, entry)
    await _configure(hass, result["flow_id"], {CONF_HOUSEHOLD_LIST: "family"})

    assert ir.async_get(hass).async_get_issue(DOMAIN, "apple_list_missing_household") is not None


async def test_rename_drops_the_old_slugs_repairs_issue(hass: HomeAssistant) -> None:
    from homeassistant.helpers import issue_registry as ir

    entry = _make_entry(hass, members=[_member_dict("anna", apple_list="Anna")])
    await _setup_entry(hass, entry)
    _raise_missing_list_issue(hass, "anna")

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "manage_members"})
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_member"})
    result = await _configure(hass, result["flow_id"], {"member_slug": "anna"})
    result = await _configure(
        hass,
        result["flow_id"],
        {"name": "Anna-Maria", "color": [1, 2, 3], "preset": "school-age", "apple_list": "Anna"},
    )
    await _configure(hass, result["flow_id"], {"confirm": True})

    assert entry.data[CONF_MEMBERS][0]["slug"] == "anna_maria"
    assert ir.async_get(hass).async_get_issue(DOMAIN, "apple_list_missing_anna") is None
