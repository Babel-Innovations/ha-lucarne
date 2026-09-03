"""Tests for rotating-task storage: migrations, CRUD, and streak exclusion."""
from __future__ import annotations

import sqlite3
from pathlib import Path

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.rotation import serialize_owners
from custom_components.lucarne_family.store import LucarneFamilyStore


def _make_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [
                {
                    "slug": "alice",
                    "name": "Alice",
                    "color": "#ff0000",
                    "avatar": "",
                    "todo_entity_id": "todo.alice",
                    "streak_counter_id": "",
                    "preset": "adult-none",
                },
                {
                    "slug": "bob",
                    "name": "Bob",
                    "color": "#0000ff",
                    "avatar": "",
                    "todo_entity_id": "todo.bob",
                    "streak_counter_id": "",
                    "preset": "adult-none",
                },
            ],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
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


# ---------------------------------------------------------------------------
# Schema — fresh DB has the new columns
# ---------------------------------------------------------------------------


async def test_fresh_db_has_rotation_columns(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry = _make_entry(hass)
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()

    con = sqlite3.connect(db_path)
    cols = {row[1] for row in con.execute("PRAGMA table_info(task_metadata)").fetchall()}
    con.close()

    assert "rotation_owners" in cols
    assert "current_owner" in cols


# ---------------------------------------------------------------------------
# Migration — existing DB without rotation columns gets them added
# ---------------------------------------------------------------------------


async def test_migration_adds_rotation_columns_to_existing_db(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    db_path = str(tmp_path / "lucarne.db")

    # Bootstrap a DB without rotation columns (simulating an old install)
    con = sqlite3.connect(db_path)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY NOT NULL,
            applied_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS task_metadata (
            item_uid TEXT PRIMARY KEY NOT NULL,
            member_slug TEXT NOT NULL,
            assignee_slug TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL,
            recurrence TEXT NOT NULL DEFAULT '',
            icon TEXT NOT NULL DEFAULT '',
            source TEXT NOT NULL DEFAULT 'manual',
            apple_uid TEXT NOT NULL DEFAULT '',
            summary TEXT NOT NULL DEFAULT '',
            time_of_day TEXT NOT NULL DEFAULT 'anytime',
            created_at TEXT NOT NULL
        );
        """
    )
    con.commit()
    con.close()

    entry = _make_entry(hass)
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()

    con = sqlite3.connect(db_path)
    cols = {row[1] for row in con.execute("PRAGMA table_info(task_metadata)").fetchall()}
    con.close()

    assert "rotation_owners" in cols
    assert "current_owner" in cols


async def test_migration_refreshes_type_check_constraint(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """An existing table created with the OLD type CHECK (no 'rotating') must be
    rebuilt so rotating inserts are accepted at the SQLite level, and existing
    rows must be preserved across the rebuild (regression for issue #57 deploy)."""
    db_path = str(tmp_path / "lucarne.db")

    # Bootstrap a DB exactly as an old install would have it: the CHECK
    # constraint that rejects 'rotating'. This is what blocked add_task in prod.
    con = sqlite3.connect(db_path)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY NOT NULL,
            applied_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS task_metadata (
            item_uid TEXT PRIMARY KEY NOT NULL,
            member_slug TEXT NOT NULL,
            assignee_slug TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL CHECK (type IN ('routine','chore')),
            recurrence TEXT NOT NULL DEFAULT '',
            icon TEXT NOT NULL DEFAULT '',
            source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','template','apple')),
            apple_uid TEXT NOT NULL DEFAULT '',
            summary TEXT NOT NULL DEFAULT '',
            time_of_day TEXT NOT NULL DEFAULT 'anytime',
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_task_metadata_member ON task_metadata(member_slug);
        """
    )
    # Seed a pre-existing routine so we can assert data survives the rebuild.
    con.execute(
        "INSERT INTO task_metadata (item_uid, member_slug, type, summary, created_at) "
        "VALUES ('uid-old', 'alice', 'routine', 'Old routine', '2026-01-01T00:00:00+00:00')"
    )
    con.commit()
    con.close()

    entry = _make_entry(hass)
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()

    # The pre-existing row survived the table rebuild.
    old = await store.async_get_task_metadata("uid-old")
    assert old is not None
    assert old["type"] == "routine"
    assert old["summary"] == "Old routine"

    # A rotating insert now succeeds (would raise IntegrityError before the fix).
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-rotating-new",
        type="rotating",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
        summary="Pick up milk",
    )
    row = await store.async_get_task_metadata("uid-rotating-new")
    assert row is not None
    assert row["type"] == "rotating"

    # The member index was recreated on the rebuilt table.
    con = sqlite3.connect(db_path)
    index_names = {
        r[1] for r in con.execute("PRAGMA index_list(task_metadata)").fetchall()
    }
    con.close()
    assert "idx_task_metadata_member" in index_names


# ---------------------------------------------------------------------------
# CRUD — add and read back rotating task
# ---------------------------------------------------------------------------


async def test_add_rotating_task_roundtrip(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)

    owners = ["alice", "bob"]
    owners_str = serialize_owners(owners)

    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-rotating-1",
        type="rotating",
        rotation_owners=owners_str,
        current_owner="alice",
        summary="Pick up milk",
    )

    row = await store.async_get_task_metadata("uid-rotating-1")
    assert row is not None
    assert row["type"] == "rotating"
    assert row["rotation_owners"] == owners_str
    assert row["current_owner"] == "alice"
    assert row["member_slug"] == "household"
    assert row["summary"] == "Pick up milk"


async def test_update_rotating_task_owners(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)

    initial_owners = serialize_owners(["alice", "bob"])
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-rotating-2",
        type="rotating",
        rotation_owners=initial_owners,
        current_owner="alice",
        summary="Task",
    )

    new_owners = serialize_owners(["alice", "bob", "cara"])
    await store.async_update_task_metadata(
        "uid-rotating-2",
        rotation_owners=new_owners,
        current_owner="bob",
    )

    row = await store.async_get_task_metadata("uid-rotating-2")
    assert row is not None
    assert row["rotation_owners"] == new_owners
    assert row["current_owner"] == "bob"


# ---------------------------------------------------------------------------
# async_get_rotating_tasks
# ---------------------------------------------------------------------------


async def test_get_rotating_tasks_returns_only_rotating(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)

    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-rot",
        type="rotating",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
        summary="Rotating task",
    )
    await store.async_add_task_metadata(
        member_slug="alice",
        item_uid="uid-routine",
        type="routine",
        summary="Morning routine",
    )
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-chore",
        type="chore",
        summary="One-off chore",
    )

    rotating = await store.async_get_rotating_tasks()
    assert len(rotating) == 1
    assert rotating[0]["item_uid"] == "uid-rot"
    assert rotating[0]["type"] == "rotating"


async def test_get_rotating_tasks_empty_when_none(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)

    await store.async_add_task_metadata(
        member_slug="alice",
        item_uid="uid-routine",
        type="routine",
        summary="Morning routine",
    )

    rotating = await store.async_get_rotating_tasks()
    assert rotating == []


# ---------------------------------------------------------------------------
# Non-rotating tasks default to empty strings for new columns
# ---------------------------------------------------------------------------


async def test_non_rotating_task_has_empty_rotation_columns(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)

    await store.async_add_task_metadata(
        member_slug="alice",
        item_uid="uid-routine",
        type="routine",
        summary="Morning routine",
    )

    row = await store.async_get_task_metadata("uid-routine")
    assert row is not None
    assert row["rotation_owners"] == ""
    assert row["current_owner"] == ""


# ---------------------------------------------------------------------------
# Streak regression — rotating tasks excluded from recurrence evaluator
# ---------------------------------------------------------------------------


async def test_rotating_task_not_in_recurrence_evaluator(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """rotating tasks are never returned by make_recurrence_evaluator (type != routine)."""
    from datetime import date

    from custom_components.lucarne_family.recurrence import make_recurrence_evaluator

    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)

    # Add a rotating task under "household" (uses member_slug='household')
    await store.async_add_task_metadata(
        member_slug="household",
        item_uid="uid-rot-streak",
        type="rotating",
        summary="Rotating task",
        rotation_owners=serialize_owners(["alice", "bob"]),
        current_owner="alice",
    )
    # Add a routine for alice
    await store.async_add_task_metadata(
        member_slug="alice",
        item_uid="uid-routine-streak",
        type="routine",
        recurrence="FREQ=DAILY",
        summary="Daily routine",
    )

    # Evaluator for alice should only return the routine, not the rotating task
    evaluator = make_recurrence_evaluator(hass, store, "alice")
    today = date.today()
    expected_uids = evaluator(today)

    assert "uid-rot-streak" not in expected_uids
    assert "uid-routine-streak" in expected_uids
