"""Tests for issue #127 — no raw ``sqlite3`` exception may leave the store.

``sqlite3.OperationalError`` ("database is locked", "disk I/O error"),
``sqlite3.IntegrityError`` and an ``OSError`` off the db file are none of them a
``HomeAssistantError``, so HA's WebSocket handler lands on its terminal clause:
the client is told "Unknown error" and the log gets an "Unexpected exception"
traceback naming neither the task nor the service. Translating at the store —
rather than in each handler — is what makes every caller's failure legible, and
the store is the only place that knows the failure came from Lucarne's own
database rather than from a todo platform (#119 covers that half).
"""
from __future__ import annotations

import sqlite3
from collections.abc import Callable
from datetime import date
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.store import (
    LucarneFamilyStore,
    StoreError,
    StoreIntegrityError,
)

UID = "ab3571c0-9db6-11f1-b387-525400288db4"


async def _make_store(hass: HomeAssistant, tmp_path: Path) -> LucarneFamilyStore:
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


# Keyed by the phrase the store must put in the message, so a label that drifts
# away from what the user is shown fails here rather than silently.
_WRITE_OPERATIONS = (
    "save details for task",
    "update details for task",
    "delete details for task",
    "log the completion of task",
)
_READ_OPERATIONS = (
    "read details for task",
    "list the tasks for",
    "list every task",
    "list the rotating tasks",
    "compute the streak for",
)


def _writes(store: LucarneFamilyStore) -> dict[str, Callable[[], Any]]:
    return {
        "save details for task": lambda: store.async_add_task_metadata(
            member_slug="anna", item_uid=UID, type="routine"
        ),
        "update details for task": lambda: store.async_update_task_metadata(
            UID, icon="mdi:tooth"
        ),
        "delete details for task": lambda: store.async_delete_task_metadata(UID),
        "log the completion of task": lambda: store.async_append_completion(
            "anna", UID, "Brush teeth", "completed"
        ),
    }


def _reads(store: LucarneFamilyStore) -> dict[str, Callable[[], Any]]:
    return {
        "read details for task": lambda: store.async_get_task_metadata(UID),
        "list the tasks for": lambda: store.async_get_tasks_for_member("anna"),
        "list every task": lambda: store.async_get_all_task_metadata(),
        "list the rotating tasks": lambda: store.async_get_rotating_tasks(),
        "compute the streak for": lambda: store.async_get_streak(
            "anna", date(2026, 8, 31), lambda _day: [UID]
        ),
    }


@pytest.mark.parametrize("operation", _WRITE_OPERATIONS)
async def test_a_failed_write_is_a_home_assistant_error_naming_the_operation(
    hass: HomeAssistant, tmp_path: Path, operation: str
) -> None:
    """Every per-item write translates, and says which task it was."""
    store = await _make_store(hass, tmp_path)
    original = sqlite3.OperationalError("database is locked")

    with patch.object(store, "_db_connect", side_effect=original):
        with pytest.raises(StoreError) as excinfo:
            await _writes(store)[operation]()

    assert isinstance(excinfo.value, HomeAssistantError)
    assert operation in str(excinfo.value)
    assert UID in str(excinfo.value)
    # The wire message HA sends is ``str(err)``; the driver's own words have to
    # survive into it or "database is locked" is lost.
    assert "database is locked" in str(excinfo.value)
    assert excinfo.value.__cause__ is original


@pytest.mark.parametrize("operation", _READ_OPERATIONS)
async def test_a_failed_read_is_a_home_assistant_error_naming_the_operation(
    hass: HomeAssistant, tmp_path: Path, operation: str
) -> None:
    """Reads translate too — a locked db fails them first (most handlers read).

    ``_resolve_task_target`` reads before any handler writes, so leaving reads
    raw would keep the whole #127 symptom reachable on the commonest path.
    """
    store = await _make_store(hass, tmp_path)
    original = sqlite3.OperationalError("database is locked")

    with patch.object(store, "_db_connect", side_effect=original):
        with pytest.raises(StoreError) as excinfo:
            await _reads(store)[operation]()

    assert isinstance(excinfo.value, HomeAssistantError)
    assert operation in str(excinfo.value)
    assert excinfo.value.__cause__ is original


async def test_an_oserror_off_the_db_file_is_translated_too(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A disk failure never reaches sqlite's own exception hierarchy."""
    store = await _make_store(hass, tmp_path)
    original = OSError("No space left on device")

    with patch.object(store, "_db_connect", side_effect=original):
        with pytest.raises(StoreError, match="No space left on device") as excinfo:
            await store.async_delete_task_metadata(UID)

    assert excinfo.value.__cause__ is original


async def test_a_lost_primary_key_race_raises_the_integrity_subclass(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """``StoreIntegrityError`` is what the adoption paths key their retreat on.

    ``async_adopt_item`` and ``async_backfill_apple_sentinel`` both treat a lost
    ``item_uid`` PRIMARY KEY race as "someone else adopted it" rather than an
    error. They used to catch ``sqlite3.IntegrityError`` straight off the store;
    the subclass is what keeps that distinction available now that the store
    translates.
    """
    store = await _make_store(hass, tmp_path)
    await store.async_add_task_metadata(
        member_slug="anna", item_uid=UID, type="routine"
    )

    with pytest.raises(StoreIntegrityError) as excinfo:
        await store.async_add_task_metadata(
            member_slug="anna", item_uid=UID, type="chore"
        )

    # Narrower, but still translated: a caller that does not care about the race
    # catches StoreError and gets the same legible message.
    assert isinstance(excinfo.value, StoreError)
    assert isinstance(excinfo.value.__cause__, sqlite3.IntegrityError)
