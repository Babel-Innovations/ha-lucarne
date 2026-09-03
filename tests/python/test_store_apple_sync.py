"""Tests for the apple_sync_state table (Reminders bridge receiver state)."""
from __future__ import annotations

import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.store import LucarneFamilyStore, StoreError


async def _make_store(hass: HomeAssistant, tmp_path: Path) -> LucarneFamilyStore:
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
    store = LucarneFamilyStore(hass, entry.entry_id, str(tmp_path / "lucarne.db"))
    await store.async_init()
    return store


async def test_upsert_then_get(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _make_store(hass, tmp_path)
    await store.async_upsert_apple_sync_state("apple-1", "anna", "uid-1")
    await store.async_upsert_apple_sync_state("apple-2", "anna", "uid-2")
    await store.async_upsert_apple_sync_state("apple-3", "household", "uid-3")

    rows = await store.async_get_apple_sync_state("anna")
    assert {r["apple_uid"]: r["item_uid"] for r in rows} == {
        "apple-1": "uid-1",
        "apple-2": "uid-2",
    }
    assert all(r["last_seen"] for r in rows)
    assert await store.async_get_apple_sync_state("nobody") == []


async def test_upsert_replaces_existing_row(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _make_store(hass, tmp_path)
    await store.async_upsert_apple_sync_state("apple-1", "anna", "uid-1")
    first = (await store.async_get_apple_sync_state("anna"))[0]

    await store.async_upsert_apple_sync_state("apple-1", "ben", "uid-9")

    assert await store.async_get_apple_sync_state("anna") == []
    (row,) = await store.async_get_apple_sync_state("ben")
    assert row["item_uid"] == "uid-9"
    assert row["last_seen"] >= first["last_seen"]


async def test_delete_by_apple_uid(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _make_store(hass, tmp_path)
    for i in range(3):
        await store.async_upsert_apple_sync_state(f"apple-{i}", "anna", f"uid-{i}")

    await store.async_delete_apple_sync_state(["apple-0", "apple-2", "never-existed"])

    rows = await store.async_get_apple_sync_state("anna")
    assert [r["apple_uid"] for r in rows] == ["apple-1"]


async def test_delete_with_no_ids_is_a_noop(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _make_store(hass, tmp_path)
    await store.async_upsert_apple_sync_state("apple-1", "anna", "uid-1")
    with patch.object(store, "_async_write") as write:
        await store.async_delete_apple_sync_state([])
    write.assert_not_called()
    assert len(await store.async_get_apple_sync_state("anna")) == 1


async def test_delete_for_member(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _make_store(hass, tmp_path)
    await store.async_upsert_apple_sync_state("apple-1", "anna", "uid-1")
    await store.async_upsert_apple_sync_state("apple-2", "ben", "uid-2")

    await store.async_delete_apple_sync_state_for_member("anna")

    assert await store.async_get_apple_sync_state("anna") == []
    assert len(await store.async_get_apple_sync_state("ben")) == 1


async def test_rename_carries_rows_to_the_new_slug(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _make_store(hass, tmp_path)
    await store.async_upsert_apple_sync_state("apple-1", "anna", "uid-1")

    await store.async_rename_member_slug("anna", "anna_b")

    assert await store.async_get_apple_sync_state("anna") == []
    (row,) = await store.async_get_apple_sync_state("anna_b")
    assert row["apple_uid"] == "apple-1"


async def test_table_is_added_to_an_existing_database(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A pre-bridge database gains the table on the next init (no ALTER needed)."""
    db_path = tmp_path / "lucarne.db"
    con = sqlite3.connect(db_path)
    con.execute("CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at TEXT)")
    con.commit()
    con.close()

    store = await _make_store(hass, tmp_path)
    await store.async_upsert_apple_sync_state("apple-1", "anna", "uid-1")
    assert len(await store.async_get_apple_sync_state("anna")) == 1


@pytest.mark.parametrize(
    ("call", "phrase"),
    [
        (lambda s: s.async_get_apple_sync_state("anna"), "list the Reminders sync state"),
        (
            lambda s: s.async_upsert_apple_sync_state("apple-1", "anna", "uid-1"),
            "save the Reminders sync state",
        ),
        (
            lambda s: s.async_delete_apple_sync_state(["apple-1"]),
            "delete the Reminders sync state",
        ),
        (
            lambda s: s.async_delete_apple_sync_state_for_member("anna"),
            "delete the Reminders sync state",
        ),
    ],
)
async def test_sqlite_errors_are_translated(
    hass: HomeAssistant, tmp_path: Path, call, phrase: str
) -> None:
    """#127: no raw sqlite3 error may leave the store."""
    store = await _make_store(hass, tmp_path)

    def _boom() -> sqlite3.Connection:
        raise sqlite3.OperationalError("database is locked")

    with patch.object(store, "_db_connect", side_effect=_boom):
        with pytest.raises(StoreError) as excinfo:
            await call(store)
    assert phrase in str(excinfo.value)
    assert "database is locked" in str(excinfo.value)
    assert isinstance(excinfo.value.__cause__, sqlite3.OperationalError)
