"""Tests for websocket_api.py — lucarne_family/get_family command."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.websocket_api import async_register_websocket_commands


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


async def test_get_family_returns_documented_shape(
    hass: HomeAssistant,
    hass_ws_client: Any,
    tmp_path: Path,
) -> None:
    """get_family returns members, task_metadata, reset_time, streak_check_time, household_entity_id."""  # noqa: E501
    # No need to set up local_todo/todo — the WS command reads from store + config entry only.
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
    entry = _make_entry(hass, members=[member.to_dict()])
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await store.async_add_task_metadata(
        member_slug="anna",
        item_uid="uid-1",
        type="routine",
        recurrence="FREQ=DAILY",
        icon="🦷",
        source="template",
    )

    # Register the WS command (normally done in async_setup_entry)
    async_register_websocket_commands(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_family"})
    msg = await ws.receive_json()

    assert msg["success"] is True
    result = msg["result"]

    # Required top-level keys
    assert "members" in result
    assert "task_metadata" in result
    assert "reset_time" in result
    assert "streak_check_time" in result
    assert "household_entity_id" in result

    assert result["household_entity_id"] == "todo.lucarne_household"
    assert result["reset_time"] == "04:00"
    assert result["streak_check_time"] == "21:00"

    # Member shape
    assert len(result["members"]) == 1
    m = result["members"][0]
    assert m["slug"] == "anna"
    assert m["name"] == "Anna"
    assert "color" in m
    assert "todo_entity_id" in m
    assert "streak_counter_id" in m

    # Task shape
    assert len(result["task_metadata"]) == 1
    t = result["task_metadata"][0]
    assert t["item_uid"] == "uid-1"
    assert t["member_slug"] == "anna"
    assert "assignee_slug" in t
    assert "type" in t
    assert "recurrence" in t
    assert "icon" in t
    assert "source" in t


async def test_get_family_empty_state_never_raises(
    hass: HomeAssistant,
    hass_ws_client: Any,
    tmp_path: Path,
) -> None:
    """get_family with no members and no tasks returns empty arrays without error."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    async_register_websocket_commands(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_family"})
    msg = await ws.receive_json()

    assert msg["success"] is True
    assert msg["result"]["members"] == []
    assert msg["result"]["task_metadata"] == []


async def test_get_family_authenticated_user_succeeds(
    hass: HomeAssistant,
    hass_ws_client: Any,
    tmp_path: Path,
) -> None:
    """get_family succeeds for an authenticated WS client (the HA WS layer handles auth)."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    async_register_websocket_commands(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_family"})
    msg = await ws.receive_json()
    assert msg["success"] is True


async def test_subscribe_relays_family_events(
    hass: HomeAssistant,
    hass_ws_client: Any,
    tmp_path: Path,
) -> None:
    """lucarne_family/subscribe relays lucarne_family_* bus events to the client."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    async_register_websocket_commands(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 5, "type": "lucarne_family/subscribe"})
    sub = await ws.receive_json()
    assert sub["success"] is True

    hass.bus.async_fire("lucarne_family_task_toggled", {"uid": "uid-1", "action": "complete"})
    await hass.async_block_till_done()

    event = await ws.receive_json()
    assert event["type"] == "event"
    assert event["event"]["event_type"] == "lucarne_family_task_toggled"
    # Only the event name is relayed — the bus event's ``data`` is intentionally
    # not forwarded, since the frontend treats relays purely as a refresh cue.
    assert "data" not in event["event"]


async def test_subscribe_ignores_unrelated_events(
    hass: HomeAssistant,
    hass_ws_client: Any,
    tmp_path: Path,
) -> None:
    """Only lucarne_family_* events in the relay list are forwarded."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    async_register_websocket_commands(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 6, "type": "lucarne_family/subscribe"})
    assert (await ws.receive_json())["success"] is True

    # An unrelated bus event must not be relayed; a real lucarne event after it must.
    hass.bus.async_fire("some_other_event", {"nope": True})
    hass.bus.async_fire("lucarne_family_member_updated", {"member": "anna", "field": "avatar"})
    await hass.async_block_till_done()

    event = await ws.receive_json()
    assert event["event"]["event_type"] == "lucarne_family_member_updated"


async def test_subscribe_works_for_non_admin(
    hass: HomeAssistant,
    hass_ws_client: Any,
    hass_read_only_access_token: str,
    tmp_path: Path,
) -> None:
    """A non-admin client (e.g. kiosk tablet) can subscribe — the command is not admin-gated.

    This is the whole point of the relay: non-admin users are forbidden from
    subscribe_events on arbitrary bus events, so cards must go through this command.
    """
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    async_register_websocket_commands(hass)

    ws = await hass_ws_client(hass, hass_read_only_access_token)
    await ws.send_json({"id": 7, "type": "lucarne_family/subscribe"})
    msg = await ws.receive_json()
    assert msg["success"] is True
