"""Webhook registration, unload, and the 1.1 → 1.2 entry migration."""
from __future__ import annotations

import json
import re
from typing import Any

from homeassistant.components import webhook
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

from custom_components.lucarne_family.const import DOMAIN

WEBHOOK_ID = "c" * 64
LEGACY_ROUND_TRIP = {
    "enabled": True,
    "webhook_url": "http://mac-mini.local:9123/writeback",
    "secret": "s" * 32,
    "device_name": "Mac mini",
}


def _base_data(**extra: Any) -> dict[str, Any]:
    return {
        "family_name": "Family",
        "members": [],
        "reset_time": "04:00",
        "streak_check_time": "21:00",
        "custom_presets": [],
        **extra,
    }


def _registered_ids(hass: HomeAssistant) -> set[str]:
    return set(hass.data.get(webhook.DOMAIN, {}))


async def _setup(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


async def test_setup_registers_the_webhook_and_unload_removes_it(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data=_base_data(webhook_id=WEBHOOK_ID, apple_bridge={"household_list": "Family"}),
        minor_version=2,
    )
    await _setup(hass, entry)

    assert WEBHOOK_ID in _registered_ids(hass)
    runtime = hass.data[DOMAIN][entry.entry_id]["bridge"]
    assert runtime.webhook_id == WEBHOOK_ID
    assert runtime.status is None

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert WEBHOOK_ID not in _registered_ids(hass)


async def test_migration_drops_round_trip_and_seeds_bridge_keys(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data=_base_data(round_trip=LEGACY_ROUND_TRIP),
        minor_version=1,
    )
    await _setup(hass, entry)

    assert entry.version == 1
    assert entry.minor_version == 2
    assert "round_trip" not in entry.data
    assert re.fullmatch(r"[0-9a-f]{64}", entry.data["webhook_id"])
    assert entry.data["apple_bridge"] == {"household_list": "Family"}
    assert entry.data["webhook_id"] in _registered_ids(hass)


async def test_migration_keeps_an_existing_webhook_id_and_household_list(
    hass: HomeAssistant,
) -> None:
    """Re-running the migration (or a partial write) must not rotate the credential."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data=_base_data(webhook_id=WEBHOOK_ID, apple_bridge={"household_list": "Casa"}),
        minor_version=1,
    )
    await _setup(hass, entry)

    assert entry.minor_version == 2
    assert entry.data["webhook_id"] == WEBHOOK_ID
    assert entry.data["apple_bridge"] == {"household_list": "Casa"}


async def test_future_major_version_is_refused(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, title="Family", data=_base_data(), version=2)
    entry.add_to_hass(hass)
    assert not await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state.value == "migration_error"


async def test_entry_without_webhook_id_is_seeded_at_setup(hass: HomeAssistant) -> None:
    """An entry that bypassed migration (hand-built at 1.2) still gets a credential."""
    entry = MockConfigEntry(domain=DOMAIN, title="Family", data=_base_data(), minor_version=2)
    await _setup(hass, entry)

    assert re.fullmatch(r"[0-9a-f]{64}", entry.data["webhook_id"])
    assert entry.data["webhook_id"] in _registered_ids(hass)


async def test_get_over_http_returns_the_mapping(
    hass: HomeAssistant, hass_client_no_auth: ClientSessionGenerator
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data=_base_data(webhook_id=WEBHOOK_ID, apple_bridge={"household_list": "Family"}),
        minor_version=2,
    )
    await _setup(hass, entry)
    client = await hass_client_no_auth()

    response = await client.get(f"/api/webhook/{WEBHOOK_ID}")

    assert response.status == 200
    body = json.loads(await response.text())
    assert body["version"] == 1
    assert body["lists"] == [
        {"name": "Family", "target": "household", "entity_id": "todo.lucarne_household"}
    ]


async def test_removing_the_entry_clears_missing_list_issues(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data=_base_data(webhook_id=WEBHOOK_ID, apple_bridge={"household_list": "Family"}),
        minor_version=2,
    )
    await _setup(hass, entry)
    ir.async_create_issue(
        hass,
        DOMAIN,
        "apple_list_missing_household",
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="apple_list_missing",
    )

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    assert ir.async_get(hass).async_get_issue(DOMAIN, "apple_list_missing_household") is None
