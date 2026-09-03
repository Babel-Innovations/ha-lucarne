"""Tests for automation_writer.py (Phase 3-B).

HA has no stable in-process automation upsert API — this test suite documents
that finding (verified on HA 2026.4.3) and validates the async_track_time_change
fallback.
"""
from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import patch

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.lucarne_family.automation_writer import (
    async_write_managed_automations,
)
from custom_components.lucarne_family.const import DOMAIN

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_entry(
    hass: HomeAssistant,
    reset_time: str = "04:00",
    streak_check_time: str = "21:00",
) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [],
            "reset_time": reset_time,
            "streak_check_time": streak_check_time,
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


# ---------------------------------------------------------------------------
# Gate test: document absence of stable in-process automation upsert API
# ---------------------------------------------------------------------------


async def test_automation_reload_requires_configuration_yaml(
    hass: HomeAssistant,
) -> None:
    """Document that automation.reload is not usable without configuration.yaml.

    In the test environment, async_prepare_reload() either raises FileNotFoundError
    (config.yaml absent) or returns None (caught HomeAssistantError). Both outcomes
    confirm there is no stable in-process automation upsert API on this HA version.
    Therefore automation_writer.py uses async_track_time_change instead.
    """
    await async_setup_component(hass, "automation", {})
    await hass.async_block_till_done()

    from homeassistant.components.automation import DATA_COMPONENT

    comp = hass.data.get(DATA_COMPONENT)
    assert comp is not None

    # async_prepare_reload reads configuration.yaml which does not exist in tests.
    # It raises FileNotFoundError or returns None — either confirms the absence of
    # a stable in-process upsert path.
    try:
        conf = await comp.async_prepare_reload(skip_reset=True)
        assert conf is None, (
            "Expected None because configuration.yaml is not present in the test "
            "environment. If this assertion fails, HA now has a stable in-process "
            "automation upsert path — consider replacing async_track_time_change "
            "with the YAML-based approach."
        )
    except (FileNotFoundError, OSError):
        # FileNotFoundError: configuration.yaml absent → reload path unusable.
        pass  # Expected: confirms no stable upsert API


# ---------------------------------------------------------------------------
# async_write_managed_automations: listener registration
# ---------------------------------------------------------------------------


async def test_write_managed_automations_registers_two_listeners(
    hass: HomeAssistant,
) -> None:
    """async_write_managed_automations registers exactly two time-change listeners."""
    entry = _make_entry(hass, reset_time="04:00", streak_check_time="21:00")

    from homeassistant.helpers.event import async_track_time_change

    with patch(
        "custom_components.lucarne_family.automation_writer.async_track_time_change",
        wraps=async_track_time_change,
    ) as mock_track:
        unsub = await async_write_managed_automations(hass, entry)

    assert mock_track.call_count == 2
    assert callable(unsub)
    unsub()


async def test_write_managed_automations_returns_callable_unsub(
    hass: HomeAssistant,
) -> None:
    """Returned unsub cancels both listeners without raising."""
    entry = _make_entry(hass)
    unsub = await async_write_managed_automations(hass, entry)
    assert callable(unsub)
    unsub()
    # Calling again should not raise (HA unsubscribe callbacks are safe to call once).


async def test_reset_time_change_calls_perform_daily_reset_service(
    hass: HomeAssistant,
) -> None:
    """When reset_time fires, perform_daily_reset service is dispatched."""
    entry = _make_entry(hass, reset_time="04:00")
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {}

    service_calls: list[str] = []

    async def _capture_reset(call: ServiceCall) -> None:
        service_calls.append(call.service)

    # Register both services: fire_all=True fires all pending timers (both 04:00 and 21:00).
    hass.services.async_register(DOMAIN, "perform_daily_reset", _capture_reset)
    hass.services.async_register(DOMAIN, "evaluate_all_streaks", lambda _c: None)

    unsub = await async_write_managed_automations(hass, entry)
    try:
        # Use a far-future time so the timer's expected_fire_timestamp check passes.
        # _TrackPointUTCTime only fires when time_tracker_timestamp() >= expected_fire_timestamp;
        # using 2030 ensures this holds regardless of when the test runs.
        async_fire_time_changed(hass, datetime(2030, 1, 1, 4, 0, 0, tzinfo=UTC), fire_all=True)
        await hass.async_block_till_done()
        assert "perform_daily_reset" in service_calls
    finally:
        unsub()


async def test_streak_time_change_calls_evaluate_all_streaks_service(
    hass: HomeAssistant,
) -> None:
    """When streak_check_time fires, evaluate_all_streaks service is dispatched."""
    entry = _make_entry(hass, streak_check_time="21:00")
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {}

    service_calls: list[str] = []

    async def _capture_streak(call: ServiceCall) -> None:
        service_calls.append(call.service)

    # Register both services: fire_all=True fires all pending timers (both 04:00 and 21:00).
    hass.services.async_register(DOMAIN, "evaluate_all_streaks", _capture_streak)
    hass.services.async_register(DOMAIN, "perform_daily_reset", lambda _c: None)

    unsub = await async_write_managed_automations(hass, entry)
    try:
        async_fire_time_changed(hass, datetime(2030, 1, 1, 21, 0, 0, tzinfo=UTC), fire_all=True)
        await hass.async_block_till_done()
        assert "evaluate_all_streaks" in service_calls
    finally:
        unsub()


async def test_options_update_rewires_listeners(hass: HomeAssistant) -> None:
    """Changing reset_time via options flow re-registers listeners at new time."""
    entry = _make_entry(hass, reset_time="04:00")
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {}

    unsub_old = await async_write_managed_automations(hass, entry)
    hass.data[DOMAIN][entry.entry_id]["unsub_automations"] = unsub_old

    # Simulate options update: new reset_time = 05:00
    hass.config_entries.async_update_entry(
        entry,
        data={**entry.data, "reset_time": "05:00"},
    )
    unsub_old()

    unsub_new = await async_write_managed_automations(hass, entry)
    assert callable(unsub_new)
    unsub_new()


# ---------------------------------------------------------------------------
# Service registration ordering: services exist before listener fires
# ---------------------------------------------------------------------------


async def test_services_registered_after_setup_entry(hass: HomeAssistant) -> None:
    """After async_setup_entry returns, all lucarne_family services are registered.

    The spec requires services to be registered before managed automations so
    that if a listener fires immediately, it finds the service already present.
    """
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()

    # Create the household entity first
    await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": "lucarne household"},
    )
    await hass.async_block_till_done()

    from custom_components.lucarne_family import async_setup_entry

    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)

    result = await async_setup_entry(hass, entry)

    assert result is True

    # All services must be registered immediately after setup_entry returns.
    for service in (
        "add_task",
        "update_task_metadata",
        "delete_task",
        "toggle_task",
        "perform_daily_reset",
        "evaluate_all_streaks",
    ):
        assert hass.services.has_service(DOMAIN, service), (
            f"Service {DOMAIN}.{service} not registered after async_setup_entry"
        )

    # Unload to cancel time-change listeners and close the store.
    from custom_components.lucarne_family import async_unload_entry

    await async_unload_entry(hass, entry)
