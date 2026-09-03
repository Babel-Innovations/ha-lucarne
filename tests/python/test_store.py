"""Tests for store.py."""
from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore


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
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def test_init_creates_schema(hass: HomeAssistant, tmp_path: Path) -> None:
    """Init should create all expected tables and write schema_version row."""
    entry = _make_entry(hass)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()

    con = sqlite3.connect(db_path)
    try:
        # schema_version row exists
        row = con.execute("SELECT version FROM schema_version").fetchone()
        assert row is not None
        assert row[0] == 1

        # expected tables exist
        tables = {
            r[0]
            for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        }
        assert "schema_version" in tables
        assert "task_metadata" in tables
        assert "completion_log" in tables
    finally:
        con.close()


async def test_init_is_idempotent(hass: HomeAssistant, tmp_path: Path) -> None:
    """Calling async_init twice must not raise or duplicate the schema_version row."""
    entry = _make_entry(hass)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()
    await store.async_init()

    con = sqlite3.connect(db_path)
    try:
        count = con.execute("SELECT COUNT(*) FROM schema_version").fetchone()[0]
        assert count == 1
    finally:
        con.close()


async def test_get_members_returns_empty_initially(hass: HomeAssistant, tmp_path: Path) -> None:
    entry = _make_entry(hass)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()
    assert store.get_members() == []


async def test_save_members_round_trip(hass: HomeAssistant, tmp_path: Path) -> None:
    """save_members followed by get_members should return the same data."""
    entry = _make_entry(hass)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()

    anna = Member(
        slug="anna",
        name="Anna",
        color="#f5c89c",
        avatar="🧒",
        created_at=datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC),
        preset="school-age",
    )
    ben = Member(
        slug="ben",
        name="Ben",
        color="#abc123",
        avatar=None,
        created_at=datetime(2024, 3, 1, 0, 0, 0, tzinfo=UTC),
        preset="toddler",
    )

    await store.async_save_members([anna, ben])
    members = store.get_members()

    assert len(members) == 2
    assert members[0] == anna
    assert members[1] == ben


async def test_save_members_preserves_all_fields(hass: HomeAssistant, tmp_path: Path) -> None:
    entry = _make_entry(hass)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()

    member = Member(
        slug="ingrid",
        name="Ingrid",
        color="#ff0000",
        avatar="/local/lucarne/avatars/ingrid.jpg",
        created_at=datetime(2025, 6, 1, 8, 30, 0, tzinfo=UTC),
        preset="adult-none",
        todo_entity_id="todo.ingrid",
        streak_counter_id="counter.ingrid_streak",
    )
    await store.async_save_members([member])
    restored = store.get_members()[0]

    assert restored.slug == "ingrid"
    assert restored.todo_entity_id == "todo.ingrid"
    assert restored.streak_counter_id == "counter.ingrid_streak"
