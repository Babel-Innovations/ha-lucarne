"""SQLite-backed store for the Lucarne Family integration."""
from __future__ import annotations

import logging
import sqlite3
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta, tzinfo
from pathlib import Path
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_MEMBERS, STORAGE_VERSION
from .models import Member

_LOGGER = logging.getLogger(__name__)

_SCHEMA_SQL = Path(__file__).parent / "schema.sql"


def _init_db(db_path: str, schema_sql: str) -> None:
    """Open the database, apply schema, and insert schema_version row."""
    con = sqlite3.connect(db_path)
    try:
        con.executescript(schema_sql)
        con.execute(
            "INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)",
            (STORAGE_VERSION, datetime.now(UTC).isoformat()),
        )
        # Migration: add summary column if it doesn't exist (added in v0.2.0)
        existing_cols = {
            row[1]
            for row in con.execute("PRAGMA table_info(task_metadata)").fetchall()
        }
        if "summary" not in existing_cols:
            con.execute(
                "ALTER TABLE task_metadata ADD COLUMN summary TEXT NOT NULL DEFAULT ''"
            )
        # Migration: add time_of_day column if it doesn't exist (issue #12).
        # SQLite ALTER TABLE ADD COLUMN can't include a CHECK constraint, so the
        # CHECK only appears on fresh-install schemas; backfilled rows are still
        # constrained at write time by the voluptuous validator in task_service.
        if "time_of_day" not in existing_cols:
            con.execute(
                "ALTER TABLE task_metadata ADD COLUMN time_of_day "
                "TEXT NOT NULL DEFAULT 'anytime'"
            )
        # Migration: add rotating-task columns (Phase 2).
        if "rotation_owners" not in existing_cols:
            con.execute(
                "ALTER TABLE task_metadata ADD COLUMN rotation_owners "
                "TEXT NOT NULL DEFAULT ''"
            )
        if "current_owner" not in existing_cols:
            con.execute(
                "ALTER TABLE task_metadata ADD COLUMN current_owner "
                "TEXT NOT NULL DEFAULT ''"
            )
        # Migration: refresh the `type` CHECK constraint to allow 'rotating'.
        # Unlike ADD COLUMN, SQLite cannot ALTER a CHECK constraint, so an
        # existing table created with CHECK (type IN ('routine','chore'))
        # actively REJECTS rotating inserts at the SQLite level (the voluptuous
        # validator alone is not enough). Rebuild the table once: rename →
        # recreate with the new CHECK → copy rows → drop old. Detected by the
        # absence of 'rotating' in the stored CREATE TABLE SQL, so it runs at
        # most once and is a no-op on fresh installs (whose schema already has it).
        table_sql_row = con.execute(
            "SELECT sql FROM sqlite_master "
            "WHERE type='table' AND name='task_metadata'"
        ).fetchone()
        if table_sql_row and "rotating" not in (table_sql_row[0] or ""):
            # Defensive: clear any leftover temp table from a prior interrupted
            # rebuild so the RENAME below cannot fail with "table already exists".
            con.execute("DROP TABLE IF EXISTS _task_metadata_pre_rotating")
            con.execute(
                "ALTER TABLE task_metadata RENAME TO _task_metadata_pre_rotating"
            )
            con.execute(
                """
                CREATE TABLE task_metadata (
                    item_uid TEXT PRIMARY KEY NOT NULL,
                    member_slug TEXT NOT NULL,
                    assignee_slug TEXT NOT NULL DEFAULT '',
                    type TEXT NOT NULL CHECK (type IN ('routine','chore','rotating')),
                    recurrence TEXT NOT NULL DEFAULT '',
                    icon TEXT NOT NULL DEFAULT '',
                    source TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual','template','apple')),
                    apple_uid TEXT NOT NULL DEFAULT '',
                    summary TEXT NOT NULL DEFAULT '',
                    time_of_day TEXT NOT NULL DEFAULT 'anytime'
                        CHECK (time_of_day IN ('anytime','morning','afternoon','night')),
                    rotation_owners TEXT NOT NULL DEFAULT '',
                    current_owner TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL
                )
                """
            )
            con.execute(
                """
                INSERT INTO task_metadata
                  (item_uid, member_slug, assignee_slug, type, recurrence, icon,
                   source, apple_uid, summary, time_of_day, rotation_owners,
                   current_owner, created_at)
                SELECT
                  item_uid, member_slug, assignee_slug, type, recurrence, icon,
                  source, apple_uid, summary, time_of_day, rotation_owners,
                  current_owner, created_at
                FROM _task_metadata_pre_rotating
                """
            )
            con.execute("DROP TABLE _task_metadata_pre_rotating")
            # The member index was dropped with the old table; recreate it.
            con.execute(
                "CREATE INDEX IF NOT EXISTS idx_task_metadata_member "
                "ON task_metadata(member_slug)"
            )
        con.commit()
    finally:
        con.close()


def _read_schema() -> str:
    return _SCHEMA_SQL.read_text(encoding="utf-8")


class LucarneFamilyStore:
    """Thin wrapper around SQLite + config_entry data for the integration."""

    def __init__(self, hass: HomeAssistant, entry_id: str, db_path: str) -> None:
        self._hass = hass
        self._entry_id = entry_id
        self._db_path = db_path

    async def async_init(self) -> None:
        """Open SQLite, apply schema DDL, and record schema version."""
        schema_sql = await self._hass.async_add_executor_job(_read_schema)
        await self._hass.async_add_executor_job(_init_db, self._db_path, schema_sql)
        _LOGGER.debug("LucarneFamilyStore initialised at %s", self._db_path)

    async def async_migrate(self, from_version: int, to_version: int) -> None:
        """Stub for future schema migrations. Phase 1 only supports version 1."""

    async def async_close(self) -> None:
        """Release resources. Phase 1 uses per-call connections; this is a no-op."""

    def _entry(self) -> ConfigEntry:
        return self._hass.config_entries.async_get_entry(self._entry_id)  # type: ignore[return-value]

    def get_members(self) -> list[Member]:
        """Return members from config_entry.data (source of truth for member metadata)."""
        entry = self._entry()
        raw: list[dict[str, Any]] = entry.data.get(CONF_MEMBERS, [])
        return [Member.from_dict(m) for m in raw]

    async def async_save_members(self, members: list[Member]) -> None:
        """Persist members to config_entry.data via HA's config_entries API."""
        entry = self._entry()
        new_data = {**entry.data, CONF_MEMBERS: [m.to_dict() for m in members]}
        self._hass.config_entries.async_update_entry(entry, data=new_data)

    # ------------------------------------------------------------------
    # Task metadata CRUD (executor-wrapped; touches SQLite only)
    # ------------------------------------------------------------------

    def _db_connect(self) -> sqlite3.Connection:
        con = sqlite3.connect(self._db_path)
        con.row_factory = sqlite3.Row
        return con

    async def async_add_task_metadata(
        self,
        member_slug: str,
        item_uid: str,
        type: str,
        recurrence: str = "",
        icon: str = "",
        source: str = "manual",
        apple_uid: str = "",
        assignee_slug: str = "",
        summary: str = "",
        time_of_day: str = "anytime",
        rotation_owners: str = "",
        current_owner: str = "",
    ) -> None:
        """INSERT a new task_metadata row."""

        def _insert() -> None:
            with self._db_connect() as con:
                con.execute(
                    """
                    INSERT INTO task_metadata
                      (item_uid, member_slug, assignee_slug, type, recurrence,
                       icon, source, apple_uid, summary, time_of_day,
                       rotation_owners, current_owner, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item_uid, member_slug, assignee_slug, type, recurrence,
                        icon, source, apple_uid, summary, time_of_day,
                        rotation_owners, current_owner,
                        datetime.now(UTC).isoformat(),
                    ),
                )

        await self._hass.async_add_executor_job(_insert)

    async def async_update_task_metadata(self, item_uid: str, **fields: Any) -> None:
        """UPDATE allowed fields on a task_metadata row."""
        allowed = {
            "type", "recurrence", "icon", "source", "apple_uid",
            "assignee_slug", "time_of_day", "rotation_owners", "current_owner",
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = [*list(updates.values()), item_uid]

        def _update() -> None:
            with self._db_connect() as con:
                con.execute(
                    f"UPDATE task_metadata SET {set_clause} WHERE item_uid = ?",
                    values,
                )

        await self._hass.async_add_executor_job(_update)

    async def async_delete_task_metadata(self, item_uid: str) -> None:
        """DELETE task_metadata row (leaves completion_log intact)."""

        def _delete() -> None:
            with self._db_connect() as con:
                con.execute("DELETE FROM task_metadata WHERE item_uid = ?", (item_uid,))

        await self._hass.async_add_executor_job(_delete)

    async def async_get_task_metadata(self, item_uid: str) -> dict[str, Any] | None:
        """Return task_metadata row as dict, or None if not found."""

        def _get() -> dict[str, Any] | None:
            with self._db_connect() as con:
                row = con.execute(
                    "SELECT * FROM task_metadata WHERE item_uid = ?", (item_uid,)
                ).fetchone()
                return dict(row) if row else None

        return await self._hass.async_add_executor_job(_get)

    async def async_get_tasks_for_member(self, member_slug: str) -> list[dict[str, Any]]:
        """Return all task_metadata rows for `member_slug`."""

        def _get() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute(
                    "SELECT * FROM task_metadata WHERE member_slug = ?", (member_slug,)
                ).fetchall()
                return [dict(r) for r in rows]

        return await self._hass.async_add_executor_job(_get)

    async def async_get_all_task_metadata(self) -> list[dict[str, Any]]:
        """Return all task_metadata rows (used by the WebSocket get_family command)."""

        def _get() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute("SELECT * FROM task_metadata").fetchall()
                return [dict(r) for r in rows]

        return await self._hass.async_add_executor_job(_get)

    async def async_get_rotating_tasks(self) -> list[dict[str, Any]]:
        """Return all task_metadata rows where type='rotating'."""

        def _get() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute(
                    "SELECT * FROM task_metadata WHERE type = 'rotating'"
                ).fetchall()
                return [dict(r) for r in rows]

        return await self._hass.async_add_executor_job(_get)

    def get_task_metadata_sync(self, member_slug: str) -> list[dict[str, Any]]:
        """Sync helper used by make_recurrence_evaluator (called from executor context)."""
        with self._db_connect() as con:
            rows = con.execute(
                "SELECT * FROM task_metadata WHERE member_slug = ?", (member_slug,)
            ).fetchall()
            return [dict(r) for r in rows]

    async def async_rename_member_slug(self, old_slug: str, new_slug: str) -> None:
        """Update all slug-keyed rows in task_metadata and completion_log atomically."""

        def _rename() -> None:
            with self._db_connect() as con:
                con.execute(
                    "UPDATE task_metadata SET member_slug = ? WHERE member_slug = ?",
                    (new_slug, old_slug),
                )
                con.execute(
                    "UPDATE task_metadata SET assignee_slug = ? WHERE assignee_slug = ?",
                    (new_slug, old_slug),
                )
                con.execute(
                    "UPDATE completion_log SET member_slug = ? WHERE member_slug = ?",
                    (new_slug, old_slug),
                )

        await self._hass.async_add_executor_job(_rename)

    # ------------------------------------------------------------------
    # Completion log
    # ------------------------------------------------------------------

    async def async_append_completion(
        self,
        member_slug: str,
        item_uid: str,
        summary: str,
        action: str,
        recurrence_at_time: str = "",
    ) -> None:
        """INSERT a completion_log row."""

        def _insert() -> None:
            with self._db_connect() as con:
                con.execute(
                    """
                    INSERT INTO completion_log
                      (timestamp, member_slug, item_uid, summary, action, recurrence_at_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        datetime.now(UTC).isoformat(),
                        member_slug, item_uid, summary, action, recurrence_at_time,
                    ),
                )

        await self._hass.async_add_executor_job(_insert)

    async def async_get_streak(
        self,
        member_slug: str,
        today: date,
        recurrence_evaluator: Callable[[date], list[str]],
        tz: tzinfo | None = None,
    ) -> int:
        """Compute the current streak for `member_slug`.

        Walks from `today` backward one day at a time (hard cap: 365 days).
        `recurrence_evaluator(day)` returns the UIDs of routines expected on
        that day. Days with no expected routines are skipped. The streak
        increments for each day where ALL expected routines were completed.
        `tz` determines the local-day boundaries when querying completion_log
        (defaults to UTC).
        """
        effective_tz = tz if tz is not None else UTC

        def _get_completions(member: str, day: date) -> set[str]:
            day_start = (
                datetime(day.year, day.month, day.day, tzinfo=effective_tz).astimezone(UTC)
            )
            next_day = day + timedelta(days=1)
            day_end = (
                datetime(next_day.year, next_day.month, next_day.day, tzinfo=effective_tz)
                .astimezone(UTC)
            )
            with self._db_connect() as con:
                rows = con.execute(
                    """
                    SELECT item_uid FROM completion_log
                    WHERE member_slug = ? AND action = 'completed'
                      AND timestamp >= ? AND timestamp < ?
                    """,
                    (member, day_start.isoformat(), day_end.isoformat()),
                ).fetchall()
                return {r[0] for r in rows}

        def _compute() -> int:
            streak = 0
            for offset in range(365):
                current = today - timedelta(days=offset)
                expected = recurrence_evaluator(current)
                if not expected:
                    continue
                completed = _get_completions(member_slug, current)
                if all(uid in completed for uid in expected):
                    streak += 1
                else:
                    break
            return streak

        return await self._hass.async_add_executor_job(_compute)
