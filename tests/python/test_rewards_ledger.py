"""points_ledger storage: migration, earn/revoke idempotency, rename."""
from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path

import pytest
from homeassistant.core import HomeAssistant

from custom_components.lucarne_family.store import LucarneFamilyStore, _init_db, _read_schema

_PRE_ROTATING_DDL = """
CREATE TABLE task_metadata (
    item_uid TEXT PRIMARY KEY NOT NULL,
    member_slug TEXT NOT NULL,
    assignee_slug TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('routine','chore')),
    recurrence TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual',
    apple_uid TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    time_of_day TEXT NOT NULL DEFAULT 'anytime',
    rotation_owners TEXT NOT NULL DEFAULT '',
    current_owner TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
"""


def test_migration_adds_points_and_survives_the_rotating_rebuild(tmp_path: Path) -> None:
    db = str(tmp_path / "old.db")
    con = sqlite3.connect(db)
    con.executescript(_PRE_ROTATING_DDL)
    con.execute(
        "INSERT INTO task_metadata (item_uid, member_slug, type, created_at) "
        "VALUES ('u1', 'anna', 'routine', 'now')"
    )
    con.commit()
    con.close()

    _init_db(db, _read_schema())

    con = sqlite3.connect(db)
    cols = {r[1] for r in con.execute("PRAGMA table_info(task_metadata)")}
    assert "points" in cols
    assert con.execute("SELECT points FROM task_metadata WHERE item_uid='u1'").fetchone() == (0,)
    con.execute(
        "INSERT INTO task_metadata (item_uid, member_slug, type, points, created_at) "
        "VALUES ('u2', 'household', 'rotating', 5, 'now')"
    )
    assert con.execute("SELECT points FROM task_metadata WHERE item_uid='u2'").fetchone() == (5,)
    con.close()


def test_init_db_is_idempotent(tmp_path: Path) -> None:
    db = str(tmp_path / "fresh.db")
    _init_db(db, _read_schema())
    _init_db(db, _read_schema())


# ---------------------------------------------------------------------------
# Store-level ledger behaviour
# ---------------------------------------------------------------------------

_CYCLE = date(2026, 6, 10)


async def _store(hass: HomeAssistant, tmp_path: Path) -> LucarneFamilyStore:
    store = LucarneFamilyStore(hass, "entry", str(tmp_path / "l.db"))
    await store.async_init()
    return store


def _rows(store: LucarneFamilyStore) -> list[tuple[str, str, int]]:
    with store._db_connect() as con:
        return [
            (r[0], r[1], r[2])
            for r in con.execute("SELECT kind, member_slug, delta FROM points_ledger ORDER BY id")
        ]


async def test_earn_and_revoke_are_idempotent(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _store(hass, tmp_path)
    async with store.rewards_lock:
        assert await store.async_ledger_record_earn("u", "anna", 5, _CYCLE, "s", None)
        assert not await store.async_ledger_record_earn("u", "anna", 5, _CYCLE, "s", None)
        assert await store.async_ledger_record_revoke("u", _CYCLE, None)
        assert not await store.async_ledger_record_revoke("u", _CYCLE, None)
    assert _rows(store) == [("earn", "anna", 5), ("revoke", "anna", -5)]


async def test_grant_returns_balance_and_history_is_newest_first(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _store(hass, tmp_path)
    async with store.rewards_lock:
        assert await store.async_ledger_grant("anna", 3, "a", "user-1") == 3
        assert await store.async_ledger_grant("anna", 4, "b", None) == 7
    assert await store.async_get_balances() == {"anna": 7}
    history = await store.async_get_ledger_history(1)
    assert [h["reason"] for h in history] == ["b"]
    assert history[0]["actor_user_id"] is None


async def test_rename_moves_ledger_rows_and_back(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _store(hass, tmp_path)
    async with store.rewards_lock:
        await store.async_ledger_grant("anna", 3, "", None)
    await store.async_rename_member_slug("anna", "ann")
    assert await store.async_get_balances() == {"ann": 3}
    await store.async_rename_member_slug("ann", "anna")
    assert await store.async_get_balances() == {"anna": 3}


async def test_rewards_write_requires_the_lock(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _store(hass, tmp_path)
    with pytest.raises(AssertionError):
        await store.async_ledger_grant("anna", 3, "", None)
