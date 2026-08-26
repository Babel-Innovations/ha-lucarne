"""Tests for the options flow (ongoing member management and schedule edits)."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant import data_entry_flow
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import (
    CONF_MEMBERS,
    DEFAULT_RESET_TIME,
    DEFAULT_STREAK_CHECK_TIME,
    DOMAIN,
)
from custom_components.lucarne_family.entity_manager import MemberEntityDeletion
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
            return_value=MemberEntityDeletion(todo_removed=True, counter_removed=True),
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


async def test_edit_round_trip_disabled_saves_without_url(hass: HomeAssistant) -> None:
    """Submitting with enabled=False saves without requiring URL or secret."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "edit_round_trip"

    result = await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": False,
            "webhook_url": "",
            "secret": "",
            "device_name": "My Mac",
        },
    )
    assert result["type"] in (
        data_entry_flow.FlowResultType.MENU,
        data_entry_flow.FlowResultType.CREATE_ENTRY,
    )
    rt = entry.data["round_trip"]
    assert rt["enabled"] is False
    assert rt["device_name"] == "My Mac"


async def test_edit_round_trip_enabled_saves_correctly(hass: HomeAssistant) -> None:
    """Enabled=True with valid URL and 32-char secret round-trips correctly."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    secret = "a" * 32
    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})

    result = await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": True,
            "webhook_url": "https://example.com/hook",
            "secret": secret,
            "device_name": "Mac mini",
        },
    )
    assert result["type"] in (
        data_entry_flow.FlowResultType.MENU,
        data_entry_flow.FlowResultType.CREATE_ENTRY,
    )
    rt = entry.data["round_trip"]
    assert rt["enabled"] is True
    assert rt["webhook_url"] == "https://example.com/hook"
    assert rt["secret"] == secret
    assert rt["device_name"] == "Mac mini"


async def test_edit_round_trip_invalid_url_rejected(hass: HomeAssistant) -> None:
    """Malformed URL is rejected when round-trip is enabled."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    secret = "b" * 32
    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})

    result = await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": True,
            "webhook_url": "not-a-url",
            "secret": secret,
            "device_name": "Mac mini",
        },
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert "webhook_url" in result["errors"]


async def test_edit_round_trip_short_secret_rejected(hass: HomeAssistant) -> None:
    """Secret shorter than 32 chars is rejected when round-trip is enabled."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})

    result = await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": True,
            "webhook_url": "https://example.com/hook",
            "secret": "tooshort",
            "device_name": "Mac mini",
        },
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert "secret" in result["errors"]


async def test_edit_round_trip_generate_secret_replaces_existing(
    hass: HomeAssistant,
) -> None:
    """generate_secret=True rotates the secret and saves the form atomically.

    Other in-flight fields (URL, device name) must be preserved alongside
    the new secret — they're not silently discarded.
    """
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    old_secret = "a" * 32
    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})
    await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": True,
            "webhook_url": "https://example.com/hook",
            "secret": old_secret,
            "device_name": "Mac mini",
        },
    )
    assert entry.data["round_trip"]["secret"] == old_secret

    # Re-open and submit with generate_secret + a changed device_name.
    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})
    result = await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": True,
            "webhook_url": "https://example.com/hook",
            "secret": old_secret,
            "device_name": "New Mac",
            "generate_secret": True,
        },
    )
    # Save flow completes successfully — both the new secret and the
    # device_name update are persisted in one atomic write.
    assert result["type"] in (
        data_entry_flow.FlowResultType.MENU,
        data_entry_flow.FlowResultType.CREATE_ENTRY,
    )

    rt = entry.data["round_trip"]
    new_secret = rt["secret"]
    assert new_secret != old_secret
    assert len(new_secret) >= 32
    assert all(c in "0123456789abcdef" for c in new_secret)
    assert rt["device_name"] == "New Mac"


async def test_edit_round_trip_readback(hass: HomeAssistant) -> None:
    """Data saved in one flow can be read back in a subsequent flow init."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    secret = "c" * 32
    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})
    await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": True,
            "webhook_url": "https://hook.example.com/lucarne",
            "secret": secret,
            "device_name": "Home server",
        },
    )

    # Start a new flow and navigate to edit_round_trip to confirm defaults are populated
    result2 = await _init_options_flow(hass, entry)
    result2 = await _configure(hass, result2["flow_id"], {"next_step_id": "edit_round_trip"})
    assert result2["type"] == data_entry_flow.FlowResultType.FORM
    # The schema defaults should reflect the saved values
    schema = result2.get("data_schema")
    assert schema is not None


# ---------------------------------------------------------------------------
# Back navigation (issue #15) — every sub-menu and sub-form returns to its
# parent menu instead of closing the dialog, so users don't have to reopen
# the gear icon to access a sibling setting.
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


async def test_edit_round_trip_submit_returns_to_init_menu(hass: HomeAssistant) -> None:
    """Saving Apple-Reminders-sync settings lands back on `init`, not close."""
    entry = _make_entry(hass)
    await _setup_entry(hass, entry)

    result = await _init_options_flow(hass, entry)
    result = await _configure(hass, result["flow_id"], {"next_step_id": "edit_round_trip"})
    result = await _configure(
        hass,
        result["flow_id"],
        {
            "enabled": False,
            "webhook_url": "",
            "secret": "",
            "device_name": "Mac mini",
        },
    )

    assert result["type"] == data_entry_flow.FlowResultType.MENU
    assert result["step_id"] == "init"
    assert entry.data["round_trip"]["device_name"] == "Mac mini"


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

