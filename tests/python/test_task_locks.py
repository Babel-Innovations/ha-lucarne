"""Tests for the per-uid serialization primitive behind issue #114.

The lock exists to make ``task_metadata`` INSERTs for pre-existing todo items
atomic against ``delete_task``. Its own contract is small: same uid serializes,
different uids don't, and the registry never leaks entries.
"""
from __future__ import annotations

import asyncio

import pytest

from custom_components.lucarne_family.task_locks import (
    _HOLDERS,
    _LOCKS,
    async_task_uid_lock,
    lock_holders,
)

UID_A = "ab3571c0-9db6-11f1-b387-525400288db4"
UID_B = "c2f9d18e-9db6-11f1-b387-525400288db4"


async def test_same_uid_serializes() -> None:
    """The second holder cannot enter until the first has left."""
    events: list[str] = []

    async def _hold(name: str, ready: asyncio.Event | None) -> None:
        async with async_task_uid_lock(UID_A):
            events.append(f"enter-{name}")
            if ready is not None:
                ready.set()
            # Yield generously: without the lock the other task would interleave.
            for _ in range(10):
                await asyncio.sleep(0)
            events.append(f"exit-{name}")

    first_entered = asyncio.Event()
    first = asyncio.create_task(_hold("first", first_entered))
    await first_entered.wait()
    second = asyncio.create_task(_hold("second", None))
    await asyncio.gather(first, second)

    assert events == ["enter-first", "exit-first", "enter-second", "exit-second"]


async def test_different_uids_do_not_serialize() -> None:
    """Distinct uids get distinct locks, so they interleave freely."""
    events: list[str] = []

    async def _hold(uid: str, name: str) -> None:
        async with async_task_uid_lock(uid):
            events.append(f"enter-{name}")
            await asyncio.sleep(0)
            events.append(f"exit-{name}")

    await asyncio.gather(_hold(UID_A, "a"), _hold(UID_B, "b"))

    assert events == ["enter-a", "enter-b", "exit-a", "exit-b"]


async def test_waiter_is_visible_to_lock_holders() -> None:
    """lock_holders counts waiters, not just the holder.

    This is what lets the race test tell "the delete parked on the lock" apart
    from "the delete ran to completion" without a timeout.
    """
    entered = asyncio.Event()
    release = asyncio.Event()

    async def _hold() -> None:
        async with async_task_uid_lock(UID_A):
            entered.set()
            await release.wait()

    async def _wait() -> None:
        async with async_task_uid_lock(UID_A):
            pass

    holder = asyncio.create_task(_hold())
    await entered.wait()
    assert lock_holders(UID_A) == 1

    waiter = asyncio.create_task(_wait())
    for _ in range(10):
        await asyncio.sleep(0)
    assert lock_holders(UID_A) == 2

    release.set()
    await asyncio.gather(holder, waiter)
    assert lock_holders(UID_A) == 0


async def test_registry_is_empty_once_released() -> None:
    """No entry survives the last holder — the registry must not grow."""
    async with async_task_uid_lock(UID_A):
        assert UID_A in _LOCKS
    assert UID_A not in _LOCKS
    assert UID_A not in _HOLDERS
    assert lock_holders(UID_A) == 0


async def test_registry_is_cleaned_up_when_the_body_raises() -> None:
    """A service call raising mid-critical-section must still release."""
    with pytest.raises(RuntimeError):
        async with async_task_uid_lock(UID_A):
            raise RuntimeError("boom")

    assert UID_A not in _LOCKS
    assert UID_A not in _HOLDERS
    # And the uid is usable again afterwards.
    async with async_task_uid_lock(UID_A):
        pass
