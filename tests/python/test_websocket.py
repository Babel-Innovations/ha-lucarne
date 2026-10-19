"""Tests for websocket_api.py — lucarne_family/get_family command."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_registry import async_get as er_get
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
    # The WS command reads from store + config entry, but it also drops members
    # whose todo entity is not registered, so the entity has to exist.
    er_get(hass).async_get_or_create(
        "todo", "local_todo", "anna-uid", suggested_object_id="anna"
    )
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


async def test_get_family_skips_members_whose_todo_entity_is_missing(
    hass: HomeAssistant,
    hass_ws_client: Any,
    tmp_path: Path,
) -> None:
    """A member pointing at a deleted todo entity must not reach the cards.

    Regression test for the `molant` flood: a half-deleted member stayed in the
    config entry with `todo_entity_id: todo.molant` after that entity was gone.
    Every card that received it then called `todo.get_items` against the missing
    entity on every 20s poll, so HA logged an error per card per cycle for weeks.
    The reconciler repairs this at setup; this is the backstop that keeps a
    broken member from being served in the meantime.
    """
    live = Member(
        slug="anna",
        name="Anna",
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id="todo.anna",
        streak_counter_id="counter.anna_streak",
    )
    ghost = Member(
        slug="molant",
        name="Molant",
        color="#00ff00",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id="todo.molant",
        streak_counter_id="counter.molant_streak",
    )
    er_get(hass).async_get_or_create(
        "todo", "local_todo", "anna-uid", suggested_object_id="anna"
    )

    entry = _make_entry(hass, members=[live.to_dict(), ghost.to_dict()])
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    async_register_websocket_commands(hass)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_family"})
    msg = await ws.receive_json()

    assert msg["success"] is True
    slugs = [m["slug"] for m in msg["result"]["members"]]
    assert slugs == ["anna"], "the member with a missing todo entity is filtered out"


async def _rewards_setup(hass: HomeAssistant, tmp_path: Path) -> LucarneFamilyStore:
    members = [
        Member(
            slug=slug, name=slug.capitalize(), color="#ff0000", avatar=None,
            created_at=datetime.now(UTC), preset="school-age",
            todo_entity_id=f"todo.{slug}", streak_counter_id="",
        ).to_dict()
        for slug in ("anna", "bob")
    ]
    entry = _make_entry(hass, members=members)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}
    async_register_websocket_commands(hass)
    return store


async def test_get_rewards_is_admin_flag_and_zero_balances(
    hass: HomeAssistant,
    hass_ws_client: Any,
    hass_read_only_access_token: str,
    tmp_path: Path,
) -> None:
    await _rewards_setup(hass, tmp_path)

    ws = await hass_ws_client(hass, hass_read_only_access_token)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_rewards"})
    msg = await ws.receive_json()
    assert msg["success"] is True
    assert msg["result"]["is_admin"] is False
    assert msg["result"]["balances"] == {"anna": 0, "bob": 0}
    assert "history" not in msg["result"]
    assert msg["result"]["rewards"] == [] and msg["result"]["claims"] == []

    admin_ws = await hass_ws_client(hass)
    await admin_ws.send_json({"id": 1, "type": "lucarne_family/get_rewards"})
    assert (await admin_ws.receive_json())["result"]["is_admin"] is True


async def test_get_rewards_history_newest_first(
    hass: HomeAssistant, hass_ws_client: Any, tmp_path: Path
) -> None:
    store = await _rewards_setup(hass, tmp_path)
    async with store.rewards_lock:
        await store.async_ledger_grant("anna", 2, "first", None)
        await store.async_ledger_grant("anna", 3, "second", None)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_rewards", "history_limit": 10})
    result = (await ws.receive_json())["result"]

    assert result["balances"]["anna"] == 5
    assert [h["reason"] for h in result["history"]] == ["second", "first"]
    assert result["history"][0]["actor_name"] is None
    assert "actor_user_id" not in result["history"][0]


def test_relay_forwards_rewards_updated() -> None:
    from custom_components.lucarne_family.websocket_api import LUCARNE_FRONTEND_EVENTS

    assert "lucarne_family_rewards_updated" in LUCARNE_FRONTEND_EVENTS
