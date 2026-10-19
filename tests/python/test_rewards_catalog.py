"""Reward catalog and settings services."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import voluptuous as vol
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import ServiceValidationError, Unauthorized

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.websocket_api import async_register_websocket_commands

from .test_rewards_admin import _user_context
from .test_task_service_rotating import _setup_with_household


async def _setup(hass: HomeAssistant, tmp_path: Path):
    from custom_components.lucarne_family.rewards import async_setup_rewards_services

    entry, store = await _setup_with_household(hass, tmp_path, ["anna", "bob"])
    await async_setup_rewards_services(hass, entry.entry_id)
    return store


async def _call(
    hass: HomeAssistant, service: str, data: dict, context: Context | None = None
) -> Any:
    return await hass.services.async_call(
        DOMAIN,
        service,
        data,
        blocking=True,
        context=context,
        return_response=service == "create_reward",
    )


async def _create(hass: HomeAssistant, **extra: Any) -> int:
    data = {"name": "Sticker", "cost": 5, **extra}
    return (await _call(hass, "create_reward", data))["id"]


async def test_create_reward_trims_and_returns_id(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    reward_id = (
        await _call(
            hass,
            "create_reward",
            {"name": "  Ice cream ", "cost": 8, "description": " yum ", "poolable": True},
        )
    )["id"]

    [reward] = await store.async_get_rewards()
    assert reward["id"] == reward_id
    assert (reward["name"], reward["cost"], reward["description"], reward["poolable"]) == (
        "Ice cream", 8, "yum", True,
    )


@pytest.mark.parametrize(
    "service,data",
    [
        ("create_reward", {"name": "x", "cost": 1}),
        ("update_reward", {"reward_id": 1, "cost": 2}),
        ("archive_reward", {"reward_id": 1}),
        ("set_rewards_settings", {"streak_daily_bonus": 1}),
    ],
)
async def test_non_admin_refused(
    hass: HomeAssistant, tmp_path: Path, service: str, data: dict
) -> None:
    store = await _setup(hass, tmp_path)
    await _create(hass)
    ctx = await _user_context(hass, admin=False)

    with pytest.raises(Unauthorized):
        await _call(hass, service, data, ctx)

    [reward] = await store.async_get_rewards()
    assert reward["cost"] == 5 and reward["archived_at"] is None
    assert (await store.async_get_rewards_settings())["streak_daily_bonus"] == 0


@pytest.mark.parametrize(
    "data",
    [
        {"name": "   ", "cost": 1},
        {"name": "x" * 61, "cost": 1},
        {"name": "ok", "cost": 0},
        {"name": "ok", "cost": 100001},
        {"name": "ok", "cost": 1, "description": "x" * 501},
    ],
)
async def test_create_reward_rejects_invalid(
    hass: HomeAssistant, tmp_path: Path, data: dict
) -> None:
    store = await _setup(hass, tmp_path)
    with pytest.raises(vol.Invalid):
        await _call(hass, "create_reward", data)
    assert await store.async_get_rewards() == []


@pytest.mark.parametrize(
    "data",
    [
        {"streak_daily_bonus": 1001},
        {"streak_daily_bonus": -1},
        {"streak_milestones": [{"days": 7, "points": 1}, {"days": 7, "points": 2}]},
        {"streak_milestones": [{"days": 0, "points": 1}]},
        {"streak_milestones": [{"days": 366, "points": 1}]},
        {"streak_milestones": [{"days": 1, "points": 10001}]},
        {"streak_milestones": [{"days": d, "points": 1} for d in range(1, 22)]},
    ],
)
async def test_settings_reject_invalid(
    hass: HomeAssistant, tmp_path: Path, data: dict
) -> None:
    await _setup(hass, tmp_path)
    with pytest.raises(vol.Invalid):
        await _call(hass, "set_rewards_settings", data)


async def test_update_reward_is_partial(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    reward_id = await _create(hass, description="d")

    await _call(hass, "update_reward", {"reward_id": reward_id, "cost": 9})

    [reward] = await store.async_get_rewards()
    assert (reward["name"], reward["cost"], reward["description"]) == ("Sticker", 9, "d")


async def test_update_unknown_or_archived_reward_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await _setup(hass, tmp_path)
    reward_id = await _create(hass)
    await _call(hass, "archive_reward", {"reward_id": reward_id})

    for rid in (reward_id, 999):
        with pytest.raises(ServiceValidationError):
            await _call(hass, "update_reward", {"reward_id": rid, "cost": 2})


async def test_archive_is_idempotent_and_fires_once(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await _setup(hass, tmp_path)
    reward_id = await _create(hass)
    events: list[Any] = []
    hass.bus.async_listen("lucarne_family_rewards_updated", events.append)

    await _call(hass, "archive_reward", {"reward_id": reward_id})
    await _call(hass, "archive_reward", {"reward_id": reward_id})
    await hass.async_block_till_done()

    assert len(events) == 1


async def test_archive_unknown_reward_raises(hass: HomeAssistant, tmp_path: Path) -> None:
    await _setup(hass, tmp_path)
    with pytest.raises(ServiceValidationError):
        await _call(hass, "archive_reward", {"reward_id": 42})


async def test_settings_round_trip_sorted_and_partial(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    assert await store.async_get_rewards_settings() == {
        "streak_daily_bonus": 0,
        "streak_milestones": [],
    }

    await _call(
        hass,
        "set_rewards_settings",
        {
            "streak_daily_bonus": 2,
            "streak_milestones": [{"days": 14, "points": 25}, {"days": 7, "points": 10}],
        },
    )
    await _call(hass, "set_rewards_settings", {"streak_daily_bonus": 3})

    assert await store.async_get_rewards_settings() == {
        "streak_daily_bonus": 3,
        "streak_milestones": [{"days": 7, "points": 10}, {"days": 14, "points": 25}],
    }


async def test_get_rewards_filters_archived(
    hass: HomeAssistant, hass_ws_client: Any, tmp_path: Path
) -> None:
    await _setup(hass, tmp_path)
    async_register_websocket_commands(hass)
    keep = await _create(hass, name="keep")
    gone = await _create(hass, name="gone")
    await _call(hass, "archive_reward", {"reward_id": gone})

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_rewards"})
    result = (await ws.receive_json())["result"]
    assert [r["id"] for r in result["rewards"]] == [keep]

    # Exactly what the admin card sends.
    await ws.send_json(
        {
            "id": 2,
            "type": "lucarne_family/get_rewards",
            "history_limit": 50,
            "include_archived": True,
        }
    )
    msg = await ws.receive_json()
    assert msg["success"] is True
    assert [r["id"] for r in msg["result"]["rewards"]] == [keep, gone]
