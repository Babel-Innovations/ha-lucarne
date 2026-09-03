"""Tests for config flow (first-time setup)."""
from __future__ import annotations

import re
from unittest.mock import patch

from homeassistant import data_entry_flow
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.lucarne_family.const import (
    CONF_FAMILY_NAME,
    CONF_MEMBERS,
    DEFAULT_RESET_TIME,
    DEFAULT_STREAK_CHECK_TIME,
    DOMAIN,
)


async def _setup_integration(hass: HomeAssistant) -> None:
    with patch(
        "custom_components.lucarne_family.store.LucarneFamilyStore.async_init",
        return_value=None,
    ):
        assert await async_setup_component(hass, DOMAIN, {})
        await hass.async_block_till_done()


async def test_config_flow_happy_path(hass: HomeAssistant) -> None:
    """User enters a family name and an entry is created."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "user"

    with patch(
        "custom_components.lucarne_family.store.LucarneFamilyStore.async_init",
        return_value=None,
    ):
        result2 = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_FAMILY_NAME: "My Family"}
        )

    assert result2["type"] == data_entry_flow.FlowResultType.CREATE_ENTRY
    assert result2["title"] == "My Family"
    entry = result2["result"]
    assert entry.data[CONF_FAMILY_NAME] == "My Family"
    assert entry.data[CONF_MEMBERS] == []
    assert entry.data["reset_time"] == DEFAULT_RESET_TIME
    assert entry.data["streak_check_time"] == DEFAULT_STREAK_CHECK_TIME
    assert "round_trip" not in entry.data
    assert re.fullmatch(r"[0-9a-f]{64}", entry.data["webhook_id"])
    assert entry.data["apple_bridge"] == {"household_list": "Family"}
    assert entry.minor_version == 2


async def test_config_flow_empty_name_rejected(hass: HomeAssistant) -> None:
    """An empty family name shows an error."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_FAMILY_NAME: ""}
    )
    assert result2["type"] == data_entry_flow.FlowResultType.FORM
    assert "family_name" in result2["errors"]


async def test_config_flow_whitespace_name_rejected(hass: HomeAssistant) -> None:
    """A whitespace-only family name shows an error."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_FAMILY_NAME: "   "}
    )
    assert result2["type"] == data_entry_flow.FlowResultType.FORM
    assert "family_name" in result2["errors"]


async def test_config_flow_duplicate_blocked(hass: HomeAssistant) -> None:
    """Second install attempt is blocked with single_family_only error."""
    # Install once
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    with patch(
        "custom_components.lucarne_family.store.LucarneFamilyStore.async_init",
        return_value=None,
    ):
        result2 = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_FAMILY_NAME: "First"}
        )
    assert result2["type"] == data_entry_flow.FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    # Try to install again
    result3 = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "user"}
    )
    result4 = await hass.config_entries.flow.async_configure(
        result3["flow_id"], {CONF_FAMILY_NAME: "Second"}
    )
    assert result4["type"] == data_entry_flow.FlowResultType.FORM
    assert result4["errors"].get("base") == "single_family_only"
