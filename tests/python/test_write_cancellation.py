"""Tests for issue #118 — a cancelled store write must not be abandoned.

Every ``store`` write runs in the executor, and
``concurrent.futures.Future.cancel()`` returns ``False`` once the worker has
started: cancelling the awaiting task abandons the write without stopping it.
Under ``task_locks.async_task_uid_lock`` that is the #114 orphan from the one
direction the lock alone cannot cover — the ``async with`` unwinds and releases
while the INSERT is still in flight, a parked ``delete_task`` runs both its
halves, and the row lands on a todo item that no longer exists.

These are the only tests in the suite that drive a **real** executor job and
cancel a real task awaiting it. That is deliberate: the gate patches
``store._db_connect`` — the blocking primitive every write shares — rather than
the store coroutine the rest of the suite patches, because a patched coroutine
models the drain instead of exercising it, and the whole question here is what
the executor does when nobody is left awaiting it.
"""
from __future__ import annotations

import asyncio
import sqlite3
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.task_locks import (
    async_task_uid_lock,
    lock_holders,
)

# local_todo mints UUID1; the uid itself is incidental here, but keep the suite's
# convention so these read alongside the other race tests.
UID = "ab3571c0-9db6-11f1-b387-525400288db4"


async def _make_store(hass: HomeAssistant, tmp_path: Path) -> LucarneFamilyStore:
    """A real store on a real sqlite file — no todo entities needed."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "round_trip": {
                "enabled": False,
                "webhook_url": "",
                "secret": "",
                "device_name": "",
            },
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    store = LucarneFamilyStore(hass, entry.entry_id, str(tmp_path / "lucarne.db"))
    await store.async_init()
    return store


async def _wait_until(predicate: Callable[[], bool]) -> None:
    """Spin the loop until a condition set from another thread becomes true."""
    async with asyncio.timeout(5):
        while not predicate():
            await asyncio.sleep(0.001)


class _WorkerGate:
    """Hold one executor job open *inside the worker thread*.

    Blocking on the loop side would prove nothing: the point of #118 is that the
    worker has already started and can no longer be cancelled, which is only true
    once control has left the event loop.

    Armed by the coroutine that is about to issue the write, and disarmed the
    moment it fires, so exactly one statement is held. That matters in the
    lock test: the contending delete's own statement has to get through, or a
    pre-fix run would deadlock instead of failing on its assertion.
    """

    def __init__(self, store: LucarneFamilyStore) -> None:
        self._real_connect = store._db_connect
        self._armed = False
        self.started = threading.Event()
        self.release = threading.Event()
        # Set to model a write that fails *after* its caller was cancelled.
        self.fail_on_release = False

    def arm(self) -> None:
        self._armed = True

    def connect(self) -> sqlite3.Connection:
        if self._armed:
            self._armed = False
            self.started.set()
            if not self.release.wait(10):  # pragma: no cover - a hung test, not a path
                raise TimeoutError("gate was never released")
            if self.fail_on_release:
                raise sqlite3.OperationalError("database is locked")
        return self._real_connect()

    async def wait_started(self) -> None:
        await _wait_until(self.started.is_set)


async def test_a_cancelled_write_lands_before_the_frame_unwinds(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Cancellation must not return control while the statement is still running.

    The worker commits either way — that is the premise, not the bug. What has to
    hold is the *ordering*: the coroutine frame stays open until the write has
    landed, so anything the caller holds (a uid lock) is still held when it does.
    """
    store = await _make_store(hass, tmp_path)
    gate = _WorkerGate(store)

    async def _write() -> None:
        gate.arm()
        await store.async_add_task_metadata(
            member_slug="anna", item_uid=UID, type="routine"
        )

    with patch.object(store, "_db_connect", gate.connect):
        writer = asyncio.create_task(_write())
        try:
            await gate.wait_started()
            writer.cancel()
            for _ in range(20):
                await asyncio.sleep(0)
            assert not writer.done(), "the frame unwound while the INSERT was in flight"
        finally:
            gate.release.set()
            with pytest.raises(asyncio.CancelledError):
                await writer

    assert await store.async_get_task_metadata(UID) is not None


async def test_a_cancelled_write_keeps_the_uid_lock_until_it_lands(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The #118 interleaving itself: the parked delete must still run *last*.

    Cancelling the inserter used to release the lock while its INSERT was in
    flight. The delete then ran both halves against a table with no row yet, and
    the INSERT committed afterwards — the unreapable #114 orphan, reached without
    any lock being skipped.
    """
    store = await _make_store(hass, tmp_path)
    gate = _WorkerGate(store)

    async def _insert_under_lock() -> None:
        async with async_task_uid_lock(UID):
            gate.arm()
            await store.async_add_task_metadata(
                member_slug="anna", item_uid=UID, type="routine"
            )

    async def _delete_under_lock() -> None:
        async with async_task_uid_lock(UID):
            await store.async_delete_task_metadata(UID)

    results: list[Any] = []
    with patch.object(store, "_db_connect", gate.connect):
        inserter = asyncio.create_task(_insert_under_lock())
        deleter: asyncio.Task[None] | None = None
        try:
            await gate.wait_started()
            deleter = asyncio.create_task(_delete_under_lock())
            await _wait_until(lambda: lock_holders(UID) > 1)

            inserter.cancel()
            for _ in range(20):
                await asyncio.sleep(0)
            # Both spellings of the same claim: the cancelled holder still owns
            # the lock, so the delete cannot overtake the write it must follow.
            assert lock_holders(UID) == 2, "the lock was released mid-INSERT"
            assert not deleter.done()
        finally:
            gate.release.set()
            results = await asyncio.gather(
                *[t for t in (inserter, deleter) if t is not None],
                return_exceptions=True,
            )

    assert isinstance(results[0], asyncio.CancelledError)
    assert results[1] is None
    # INSERT first, DELETE second — so nothing is left behind.
    assert await store.async_get_task_metadata(UID) is None


async def test_a_second_cancellation_does_not_abandon_the_write(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Draining survives being cancelled again, which shutdown routinely does.

    A single ``await`` in the cancellation handler would be abandoned by the next
    ``cancel()`` and reopen the window, so the drain keeps waiting until the job
    is actually done.
    """
    store = await _make_store(hass, tmp_path)
    gate = _WorkerGate(store)

    async def _write() -> None:
        gate.arm()
        await store.async_add_task_metadata(
            member_slug="anna", item_uid=UID, type="routine"
        )

    with patch.object(store, "_db_connect", gate.connect):
        writer = asyncio.create_task(_write())
        try:
            await gate.wait_started()
            writer.cancel()
            await asyncio.sleep(0)
            writer.cancel()
            for _ in range(20):
                await asyncio.sleep(0)
            assert not writer.done(), "the second cancellation abandoned the INSERT"
        finally:
            gate.release.set()
            with pytest.raises(asyncio.CancelledError):
                await writer

    assert await store.async_get_task_metadata(UID) is not None


async def test_a_write_that_fails_after_cancellation_does_not_mask_it(
    hass: HomeAssistant, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    """A failed drained write is logged, never raised over the cancellation.

    Nobody is left to receive the error — the caller is being torn down — and
    substituting it for ``CancelledError`` would tell the loop the task finished
    normally.
    """
    store = await _make_store(hass, tmp_path)
    gate = _WorkerGate(store)
    gate.fail_on_release = True

    async def _write() -> None:
        gate.arm()
        await store.async_add_task_metadata(
            member_slug="anna", item_uid=UID, type="routine"
        )

    with patch.object(store, "_db_connect", gate.connect):
        writer = asyncio.create_task(_write())
        try:
            await gate.wait_started()
            writer.cancel()
        finally:
            gate.release.set()
            with pytest.raises(asyncio.CancelledError):
                await writer

    assert await store.async_get_task_metadata(UID) is None
    assert "after its caller was cancelled" in caplog.text


async def test_ha_shutdown_cancellation_does_not_abandon_the_write(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The shutdown path, which is the one this whole guarantee is claimed for.

    ``hass.async_add_executor_job`` registers the future it returns in
    ``hass._tasks`` / ``hass._background_tasks``, and ``async_stop`` cancels those
    futures *directly* — every ``_background_tasks`` entry at stage 2, and again
    whatever of the pre-stage-2 ``_tasks`` snapshot is left at stage 4 (a bare
    future has no ``cancelling()``, so stage 4's skip does not spare it).
    Cancelling an executor future marks it ``done()`` and ``cancelled()``
    at once while the worker thread runs on regardless, so a drain that waits on
    ``not job.done()`` returns immediately and the lock is released with the write
    still in flight — #118, reopened on its headline path.

    ``_async_write`` therefore submits through the loop and keeps the future
    private. Modelled here by doing what stage 2 does: cancel everything HA has a
    handle on, then check the write still ordered itself before the lock release.
    """
    store = await _make_store(hass, tmp_path)
    gate = _WorkerGate(store)

    async def _insert_under_lock() -> None:
        async with async_task_uid_lock(UID):
            gate.arm()
            await store.async_add_task_metadata(
                member_slug="anna", item_uid=UID, type="routine"
            )

    async def _delete_under_lock() -> None:
        async with async_task_uid_lock(UID):
            await store.async_delete_task_metadata(UID)

    results: list[Any] = []
    with patch.object(store, "_db_connect", gate.connect):
        inserter = asyncio.create_task(_insert_under_lock())
        deleter: asyncio.Task[None] | None = None
        try:
            await gate.wait_started()
            deleter = asyncio.create_task(_delete_under_lock())
            await _wait_until(lambda: lock_holders(UID) > 1)

            # What async_stop stage 2 does: cancel every future HA is tracking,
            # executor jobs included. Private attributes on purpose — the point
            # is that our job must not be reachable from either bucket.
            for tracked in (*hass._tasks, *hass._background_tasks):
                tracked.cancel()
            inserter.cancel()
            for _ in range(20):
                await asyncio.sleep(0)
            assert lock_holders(UID) == 2, "the lock was released mid-INSERT"
            assert not deleter.done()
        finally:
            gate.release.set()
            results = await asyncio.gather(
                *[t for t in (inserter, deleter) if t is not None],
                return_exceptions=True,
            )

    assert isinstance(results[0], asyncio.CancelledError)
    assert await store.async_get_task_metadata(UID) is None
