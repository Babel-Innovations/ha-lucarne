"""Claim lifecycle, pooling, snapshots and atomic reservation."""
from __future__ import annotations

import asyncio
import contextlib
import sqlite3
import sys
import threading
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import ServiceValidationError, Unauthorized

from custom_components.lucarne_family.const import DOMAIN

from .test_rewards_admin import _user_context
from .test_task_service_rotating import _setup_with_household


async def _setup(hass: HomeAssistant, tmp_path: Path):
    from custom_components.lucarne_family.rewards import async_setup_rewards_services

    entry, store = await _setup_with_household(hass, tmp_path, ["anna", "bob", "cy"])
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
        return_response=service in ("claim_reward", "create_reward"),
    )


async def _grant(hass: HomeAssistant, member: str, points: int) -> None:
    await _call(hass, "grant_points", {"member": member, "points": points}, Context())


async def _reward(hass: HomeAssistant, cost: int = 10, **extra: Any) -> int:
    return (
        await _call(hass, "create_reward", {"name": "Movie", "cost": cost, **extra})
    )["id"]


async def _balance(store, slug: str) -> int:
    return (await store.async_get_balances()).get(slug, 0)


def _ledger(store, claim_id: int) -> list[tuple[str, str, int]]:
    with store._db_connect() as con:
        return [
            tuple(r)
            for r in con.execute(
                "SELECT member_slug, kind, delta FROM points_ledger"
                " WHERE claim_id = ? ORDER BY id",
                (claim_id,),
            )
        ]


async def _claim(hass: HomeAssistant, reward_id: int, member="anna", **extra: Any) -> int:
    data = {"member": member, "reward_id": reward_id, **extra}
    return (await _call(hass, "claim_reward", data))["claim_id"]


# ---------------------------------------------------------------------------
# lifecycle
# ---------------------------------------------------------------------------


async def test_claim_reserves_and_cancel_restores(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 15)
    claim_id = await _claim(hass, await _reward(hass))
    assert await _balance(store, "anna") == 5

    await _call(hass, "cancel_claim", {"claim_id": claim_id})
    assert await _balance(store, "anna") == 15


async def test_approve_keeps_spent_and_refund_restores(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    claim_id = await _claim(hass, await _reward(hass))

    await _call(hass, "approve_claim", {"claim_id": claim_id})
    assert await _balance(store, "anna") == 0
    assert len(_ledger(store, claim_id)) == 1

    await _call(hass, "refund_claim", {"claim_id": claim_id})
    assert await _balance(store, "anna") == 10


async def test_reject_restores(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    claim_id = await _claim(hass, await _reward(hass))

    await _call(hass, "reject_claim", {"claim_id": claim_id})

    assert await _balance(store, "anna") == 10
    assert [k for _, k, _ in _ledger(store, claim_id)] == ["claim_reserve", "claim_release"]


async def test_second_transition_raises_already(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    claim_id = await _claim(hass, await _reward(hass))
    await _call(hass, "approve_claim", {"claim_id": claim_id})

    for service in ("approve_claim", "reject_claim", "cancel_claim"):
        with pytest.raises(ServiceValidationError, match="already approved"):
            await _call(hass, service, {"claim_id": claim_id})
    await _call(hass, "refund_claim", {"claim_id": claim_id})
    with pytest.raises(ServiceValidationError, match="already refunded"):
        await _call(hass, "refund_claim", {"claim_id": claim_id})
    assert await _balance(store, "anna") == 10


@pytest.mark.parametrize("service", ["approve_claim", "reject_claim", "refund_claim"])
async def test_non_admin_cannot_resolve(
    hass: HomeAssistant, tmp_path: Path, service: str
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    claim_id = await _claim(hass, await _reward(hass))
    ctx = await _user_context(hass, admin=False)

    with pytest.raises(Unauthorized):
        await _call(hass, service, {"claim_id": claim_id}, ctx)

    assert await _balance(store, "anna") == 0


async def test_non_admin_can_claim_and_cancel(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    reward_id = await _reward(hass)
    ctx = await _user_context(hass, admin=False)

    result = await _call(hass, "claim_reward", {"member": "anna", "reward_id": reward_id}, ctx)
    assert result["shares"] == {"anna": 10}
    await _call(hass, "cancel_claim", {"claim_id": result["claim_id"]}, ctx)

    assert await _balance(store, "anna") == 10


async def test_claim_rejects_unknown_and_household_members(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await _setup(hass, tmp_path)
    reward_id = await _reward(hass, poolable=True)
    for bad in ("household", "nobody"):
        with pytest.raises(ServiceValidationError):
            await _claim(hass, reward_id, member=bad)
        with pytest.raises(ServiceValidationError):
            await _claim(hass, reward_id, pool_with=[bad])


# ---------------------------------------------------------------------------
# pooling
# ---------------------------------------------------------------------------


async def test_pooled_claim_reserves_split(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    for slug in ("anna", "bob", "cy"):
        await _grant(hass, slug, 10)
    reward_id = await _reward(hass, poolable=True)

    result = await _call(
        hass, "claim_reward", {"member": "anna", "reward_id": reward_id, "pool_with": ["bob", "cy"]}
    )

    assert result["shares"] == {"anna": 4, "bob": 3, "cy": 3}
    assert [await _balance(store, s) for s in ("anna", "bob", "cy")] == [6, 7, 7]

    await _call(hass, "reject_claim", {"claim_id": result["claim_id"]})
    assert [await _balance(store, s) for s in ("anna", "bob", "cy")] == [10, 10, 10]


async def test_non_poolable_reward_refuses_pool(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    await _grant(hass, "bob", 10)
    reward_id = await _reward(hass)

    with pytest.raises(ServiceValidationError, match="can't be shared"):
        await _claim(hass, reward_id, pool_with=["bob"])

    assert await _balance(store, "anna") == 10


async def test_short_contributor_writes_nothing_and_is_named(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    await _grant(hass, "bob", 1)
    reward_id = await _reward(hass, poolable=True)

    with pytest.raises(ServiceValidationError, match="Not enough points: Bob needs 4 more"):
        await _claim(hass, reward_id, pool_with=["bob"])

    assert await _balance(store, "anna") == 10
    assert await store.async_get_claims(["pending"]) == []
    with store._db_connect() as con:
        assert con.execute("SELECT COUNT(*) FROM claim_contributors").fetchone()[0] == 0


async def test_too_many_people_is_a_validation_error(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await _setup(hass, tmp_path)
    reward_id = await _reward(hass, cost=2, poolable=True)
    with pytest.raises(ServiceValidationError, match="Too many people"):
        await _claim(hass, reward_id, pool_with=["bob", "cy"])


async def test_archived_reward_blocks_new_claims_but_not_pending_ones(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 20)
    reward_id = await _reward(hass)
    claim_id = await _claim(hass, reward_id)
    await _call(hass, "archive_reward", {"reward_id": reward_id})

    with pytest.raises(ServiceValidationError, match="no longer available"):
        await _claim(hass, reward_id)

    await _call(hass, "approve_claim", {"claim_id": claim_id})
    assert await _balance(store, "anna") == 10


async def test_claim_snapshots_reward(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    reward_id = await _reward(hass)
    claim_id = await _claim(hass, reward_id)

    await _call(hass, "update_reward", {"reward_id": reward_id, "cost": 3, "name": "Other"})
    await _call(hass, "reject_claim", {"claim_id": claim_id})

    [claim] = await store.async_get_claims(["rejected"])
    assert (claim["cost"], claim["reward_name"]) == (10, "Movie")
    assert claim["contributors"] == [{"member_slug": "anna", "share": 10}]
    assert _ledger(store, claim_id) == [
        ("anna", "claim_reserve", -10),
        ("anna", "claim_release", 10),
    ]


async def test_get_rewards_returns_pending_and_recent_history(
    hass: HomeAssistant, hass_ws_client: Any, tmp_path: Path
) -> None:
    from custom_components.lucarne_family.websocket_api import async_register_websocket_commands

    await _setup(hass, tmp_path)
    async_register_websocket_commands(hass)
    await _grant(hass, "anna", 30)
    reward_id = await _reward(hass)
    done = await _claim(hass, reward_id)
    await _call(hass, "approve_claim", {"claim_id": done})
    pending = await _claim(hass, reward_id)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "lucarne_family/get_rewards"})
    claims = (await ws.receive_json())["result"]["claims"]
    assert [c["id"] for c in claims] == [pending]

    await ws.send_json({"id": 2, "type": "lucarne_family/get_rewards", "history_limit": 10})
    claims = (await ws.receive_json())["result"]["claims"]
    assert [(c["id"], c["status"]) for c in claims] == [(pending, "pending"), (done, "approved")]


async def test_price_change_between_split_and_reserve_is_refused(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    reward_id = await _reward(hass)

    async with store.rewards_lock:
        with pytest.raises(Exception, match="price just changed"):
            await store.async_create_claim(reward_id, "anna", {"anna": 7}, None)

    assert await _balance(store, "anna") == 10


def test_invalid_transition_pair_is_a_programming_error() -> None:
    from custom_components.lucarne_family.store import LucarneFamilyStore

    store = object.__new__(LucarneFamilyStore)
    with pytest.raises(ValueError):
        asyncio.run(store.async_transition_claim(1, "approved", "rejected", None))


# ---------------------------------------------------------------------------
# concurrency: the affordability check lives in the reserving transaction
# ---------------------------------------------------------------------------


def _in_write_job() -> bool:
    """True when called from ``_async_rewards_write``'s executor job."""
    frame = sys._getframe(1)
    while frame is not None:
        if frame.f_code.co_name == "_job":
            return True
        frame = frame.f_back  # type: ignore[assignment]
    return False


class _NoopLock:
    """Stands in for ``rewards_lock`` so only the SQLite transaction serialises."""

    def locked(self) -> bool:
        return True

    async def __aenter__(self) -> None:
        return None

    async def __aexit__(self, *exc: object) -> None:
        return None


async def _two_racing_claims(hass: HomeAssistant, reward_id: int) -> list[Any]:
    return await asyncio.gather(
        _claim(hass, reward_id), _claim(hass, reward_id), return_exceptions=True
    )


def _assert_one_winner(results: list[Any]) -> None:
    wins = [r for r in results if isinstance(r, int)]
    losses = [r for r in results if isinstance(r, ServiceValidationError)]
    assert len(wins) == 1 and len(losses) == 1, results
    assert "Not enough points" in str(losses[0])


async def test_two_simultaneous_claims_cannot_overspend(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    reward_id = await _reward(hass)

    _assert_one_winner(await _two_racing_claims(hass, reward_id))

    assert await _balance(store, "anna") == 0


async def test_transaction_alone_prevents_overspend_without_the_lock(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    reward_id = await _reward(hass)

    real_connect = store._db_connect
    state = {"calls": 0}
    guard = threading.Lock()
    barrier = threading.Barrier(2)

    def gated_connect() -> sqlite3.Connection:
        with guard:
            state["calls"] += 1
        # Only the write jobs are gated: both must hold a connection before
        # either runs BEGIN IMMEDIATE.
        if _in_write_job():
            barrier.wait(10)
        return real_connect()

    store.rewards_lock = _NoopLock()  # type: ignore[assignment]
    with patch.object(store, "_db_connect", gated_connect):
        results = await _two_racing_claims(hass, reward_id)

    assert state["calls"] >= 4
    wins = [r for r in results if isinstance(r, int)]
    assert len(wins) == 1, results
    assert await _balance(store, "anna") >= 0
    assert len(await store.async_get_claims(["pending"])) == 1


async def test_cancelled_claim_lands_whole_and_keeps_the_lock(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    reward_id = await _reward(hass)

    real_connect = store._db_connect
    started = threading.Event()
    release = threading.Event()

    def gated_connect() -> sqlite3.Connection:
        if _in_write_job():
            started.set()
            release.wait(10)
        return real_connect()

    with patch.object(store, "_db_connect", gated_connect):
        task = asyncio.create_task(_claim(hass, reward_id))
        try:
            async with asyncio.timeout(5):
                while not started.is_set():
                    await asyncio.sleep(0.001)
            task.cancel()
            for _ in range(20):
                await asyncio.sleep(0)
            assert not task.done()
            assert store.rewards_lock.locked()
        finally:
            release.set()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    assert not store.rewards_lock.locked()
    [claim] = await store.async_get_claims(["pending"])
    assert _ledger(store, claim["id"]) == [("anna", "claim_reserve", -10)]
    assert await _balance(store, "anna") == 0


async def test_claim_and_grant_recheck_members_once_they_hold_the_lock(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _grant(hass, "anna", 10)
    await _grant(hass, "bob", 10)
    reward_id = await _reward(hass, cost=10, poolable=True)

    async with store.rewards_lock:
        claim = asyncio.ensure_future(_claim(hass, reward_id, member="bob", pool_with=["anna"]))
        grant = asyncio.ensure_future(_grant(hass, "anna", 1))
        await asyncio.sleep(0.05)  # both validated and now wait on the lock
        # anna is removed (or renamed away) while they wait.
        await store.async_save_members([m for m in store.get_members() if m.slug != "anna"])

    for task in (claim, grant):
        with pytest.raises(ServiceValidationError, match="anna"):
            await task
    assert await store.async_get_claims(["pending"]) == []
    assert await _balance(store, "anna") == 10
    assert await _balance(store, "bob") == 10
