"""SQLite-backed store for the Lucarne Family integration."""
from __future__ import annotations

import asyncio
import logging
import sqlite3
from collections.abc import Callable, Iterable
from datetime import UTC, date, datetime, timedelta, tzinfo
from pathlib import Path
from typing import Any, TypeVar

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import CONF_MEMBERS, STORAGE_VERSION
from .models import Member

_LOGGER = logging.getLogger(__name__)

_SCHEMA_SQL = Path(__file__).parent / "schema.sql"

_T = TypeVar("_T")


class StoreError(HomeAssistantError):
    """A statement against Lucarne's own SQLite database failed (issue #127).

    ``sqlite3.Error`` and ``OSError`` are neither of them a ``HomeAssistantError``,
    so one reaching a service or WebSocket handler is reported as
    ``unknown_error``: the caller is told "Unknown error" and the log gets an
    "Unexpected exception" traceback naming neither the task nor the service.
    Translating here rather than in each handler means every caller benefits, and
    the store is the only layer that knows the failure came from Lucarne's
    database rather than from a todo platform (#119 wraps that half).
    """


class StoreIntegrityError(StoreError):
    """A write violated a constraint — in practice a lost ``item_uid`` race.

    Separate from :class:`StoreError` because ``async_adopt_item`` and
    ``async_backfill_apple_sentinel`` retreat quietly when they lose the PRIMARY
    KEY race (the row is there either way) while still surfacing a broken
    database. They caught ``sqlite3.IntegrityError`` before this translation
    existed; this is the same distinction, kept inside HA's exception hierarchy.
    """


def _store_error(operation: str, err: Exception) -> StoreError:
    """Name what failed, and keep the driver's own words on the wire.

    HA sends ``str(err)`` to the client for a ``HomeAssistantError``, so
    "database is locked" only survives by being interpolated here.
    """
    if isinstance(err, sqlite3.IntegrityError):
        cls: type[StoreError] = StoreIntegrityError
    else:
        cls = StoreError
    return cls(f"Could not {operation} in Lucarne's database: {err}")


async def _async_settled(job: asyncio.Future[Any]) -> None:
    """Await an executor job without ever cancelling it.

    ``await job`` cancels it — a cancellation delivered to the awaiting task goes
    straight to the future it is waiting on. ``asyncio.wait`` only ever adds and
    removes its own done-callback, so the job runs on untouched.

    ``asyncio.shield`` would also leave the job alone, but since 3.12 a shield
    whose outer future is cancelled attaches ``_log_on_exception`` to the inner
    one. A write that failed after its caller was cancelled would then reach the
    loop exception handler as well as ``_async_drain``'s own log line — duplicate
    ERRORs in the HA log, and a hard failure under the suite's cleanup checks.
    """
    await asyncio.wait({job})


async def _async_drain(job: asyncio.Future[Any]) -> None:
    """Wait out an executor job that can no longer be cancelled (issue #118).

    Loops rather than awaiting once, because a *second* cancellation would
    otherwise abandon the job all over again — and shutdown delivers more than
    one.

    It is not a poll and cannot spin: a delivered ``CancelledError`` is consumed,
    and a non-zero ``cancelling()`` is an inert counter that does not re-interrupt
    later awaits, so the ``await`` below suspends normally. The loop makes one
    blocking wait, plus one more turn per *further* ``cancel()`` — of which
    shutdown sends a small, fixed number. Measured against a one-second write:
    one iteration with no further cancellation, two with one, and so on.

    Swallowed cancellations are deliberately **not** balanced with
    ``task.uncancel()``. That looks tidier, but asyncio cannot attribute a
    cancellation to whoever asked for it: an enclosing ``asyncio.timeout``
    compares ``uncancel()`` against its own count, so handing one back lets a
    genuine external cancellation come out as ``TimeoutError`` and be swallowed by
    an ``except TimeoutError``. Leaving the count inflated means that caller sees
    ``CancelledError``, which is the truthful answer for a task that really was
    cancelled. A timeout firing on its own still converts normally — the drain
    swallows nothing in that case.

    How long this can take: only an already-submitted job is waited on, never work
    still to come — but there is no timeout bounding it. "Submitted" is not
    "running", so the wait is queue time in HA's shared default executor (behind
    whatever other integrations are doing) plus the statement itself, and
    ``sqlite3.connect``'s five-second busy timeout bounds each lock acquisition
    once a worker runs, not the drain. In practice a write of this size is
    sub-millisecond; under a saturated executor it is bounded by availability
    alone.

    It does not hold up ``async_stop`` at all, and the reason is the very
    ``uncancel()`` left undone above: ``cancelling()`` stays at 1 for the whole
    drain, and HA skips such a task everywhere. ``async_block_till_done`` filters
    its wait set with ``not cancelling(task)``, so stages 2, 3 and close never
    await this one; stage 4 opens with
    ``if task.done() or cancelling(task): continue``, so it is skipped rather than
    awaited — its ``asyncio.timeout(0.1)`` never applies and its "could not be
    canceled during final shutdown stage" can never name us. (A WebSocket-dispatched
    caller is a *background* task and is not in stage 4's set to begin with.)

    What picks it up instead is ``runner``, once ``async_stop`` has returned:
    ``_cancel_all_tasks_with_timeout(loop, 5)`` cancels again — swallowed here —
    and waits five seconds before logging "Task could not be canceled and was
    still running after shutdown". Then ``loop.shutdown_default_executor()``
    reaches ``InterruptibleThreadPoolExecutor.shutdown``, whose
    ``cancel_futures=True`` drops a job still *queued* (its future is cancelled,
    which ends the loop above and is why the ``job.cancelled()`` guard below
    exists) and whose ten-second join budget interrupts a worker that is genuinely
    running. So nothing here can wedge shutdown.

    A failure here belongs to nobody: the caller is being torn down and will
    never see a return value. Log it and let the ``CancelledError`` propagate —
    substituting the write's exception would tell the loop the task finished
    normally. Retrieving it also keeps asyncio from reporting it again at
    garbage-collection time.
    """
    while not job.done():
        try:
            await _async_settled(job)
        except asyncio.CancelledError:
            continue
    if not job.cancelled() and (exc := job.exception()) is not None:
        _LOGGER.error(
            "SQLite write failed after its caller was cancelled", exc_info=exc
        )


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
        """Open SQLite, apply schema DDL, and record schema version.

        One of the two writes outside ``_async_write``, and — like
        ``async_rename_member_slug`` — deliberately left untranslated by #127. A
        failure here propagates into HA's own config-entry setup, which already
        catches it and reports the entry as failed with this integration named;
        there is no path from here to a service or WebSocket caller, because
        nothing is registered until this returns.
        """
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

    async def _async_read(self, func: Callable[[], _T], operation: str) -> _T:
        """Run a blocking read in the executor, translating a failure (#127).

        Deliberately not routed through ``_async_write``: abandoning a ``SELECT``
        on cancellation costs nothing, and #118's drain exists only to order a
        write against the lock its caller holds. What reads *do* share is the
        failure mode — a locked or unreadable database fails them identically,
        and a read runs first on nearly every handler (``_resolve_task_target``),
        so leaving them raw would keep the whole #127 symptom reachable.
        """
        try:
            return await self._hass.async_add_executor_job(func)
        except (sqlite3.Error, OSError) as err:
            raise _store_error(operation, err) from err

    async def _async_write(self, func: Callable[[], _T], operation: str) -> _T:
        """Run a blocking write in the executor without ever abandoning it (#118).

        A plain ``await hass.async_add_executor_job(...)`` is abandonable:
        cancelling the awaiting task cancels the asyncio future, but
        ``concurrent.futures.Future.cancel()`` returns ``False`` for a worker that
        has already started, so the statement runs to completion regardless.

        For a write taken under ``task_locks.async_task_uid_lock`` that is issue
        #118. The ``async with`` unwinds and its ``finally`` releases while the
        INSERT is still in flight; a parked ``delete_task`` then runs both of its
        halves against a table with no row yet, and the INSERT commits afterwards
        — the unreapable #114 orphan, reached without any lock being skipped.

        Waiting on the job instead of awaiting it keeps it alive across the
        cancellation, and the drain holds this frame — and therefore whatever the
        caller holds — open until the statement has landed. Cancellation then
        orders the write *before* the lock release instead of after, which is the
        whole guarantee.

        **Submitted through the loop rather than ``hass.async_add_executor_job``,
        deliberately.** That helper registers the future it returns in
        ``hass._tasks`` or ``hass._background_tasks``, and ``async_stop`` cancels
        those futures *directly* — every ``_background_tasks`` entry at stage 2,
        and again whatever of the pre-stage-2 ``_tasks`` snapshot is left at stage
        4 (a bare future has no ``cancelling()``, so stage 4's skip does not spare
        it the way it spares a draining task). Cancelling an executor future marks it
        ``done()`` and ``cancelled()`` immediately while the worker thread runs on
        regardless, so a tracked job would sail straight through the drain's
        ``while not job.done()`` and reopen #118 on the shutdown path — the very
        one this exists for, and the commonest, since ``async_response`` dispatches
        each WebSocket command as a background task. Keeping the future private
        means nothing but this frame can cancel it, and ``asyncio.wait`` never
        does. It is the same pool either way: HA installs its executor as the
        loop's default. The awaiting task stays tracked, and on the uncancelled
        path it cannot finish before the write lands, so nothing is lost by not
        tracking the job too — with one caveat for future callers:
        ``async_block_till_done`` now reaches the write only *through* that task,
        so anything issuing one fire-and-forget must dispatch it with
        ``hass.async_create_task`` (as every caller here already does) rather than
        a bare ``asyncio.create_task``. Once cancelled the task drops out of
        ``async_block_till_done`` altogether — see ``_async_drain``, where that is
        the property that keeps a drain clear of shutdown.

        Reads go through ``_async_read`` instead: abandoning a ``SELECT`` costs
        nothing, and neither does abandoning ``async_init``, which runs before any
        service is registered.

        Only the ``job.result()`` path is translated (#127). The cancelled arm is
        left exactly as it is: ``CancelledError`` is a ``BaseException`` and must
        keep unwinding — swallowing one would release the caller's uid lock, which
        is the whole of #118 — and a write that fails *after* its caller is gone
        belongs to nobody, so ``_async_drain`` logs it rather than raising.
        """
        job = self._hass.loop.run_in_executor(None, func)
        try:
            await _async_settled(job)
        except asyncio.CancelledError:
            await _async_drain(job)
            raise
        try:
            return job.result()
        except (sqlite3.Error, OSError) as err:
            raise _store_error(operation, err) from err

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

        await self._async_write(_insert, f"save details for task {item_uid!r}")

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

        await self._async_write(_update, f"update details for task {item_uid!r}")

    async def async_delete_task_metadata(self, item_uid: str) -> None:
        """DELETE task_metadata row (leaves completion_log intact)."""

        def _delete() -> None:
            with self._db_connect() as con:
                con.execute("DELETE FROM task_metadata WHERE item_uid = ?", (item_uid,))

        await self._async_write(_delete, f"delete details for task {item_uid!r}")

    async def async_get_task_metadata(self, item_uid: str) -> dict[str, Any] | None:
        """Return task_metadata row as dict, or None if not found."""

        def _get() -> dict[str, Any] | None:
            with self._db_connect() as con:
                row = con.execute(
                    "SELECT * FROM task_metadata WHERE item_uid = ?", (item_uid,)
                ).fetchone()
                return dict(row) if row else None

        return await self._async_read(_get, f"read details for task {item_uid!r}")

    async def async_get_tasks_for_member(self, member_slug: str) -> list[dict[str, Any]]:
        """Return all task_metadata rows for `member_slug`."""

        def _get() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute(
                    "SELECT * FROM task_metadata WHERE member_slug = ?", (member_slug,)
                ).fetchall()
                return [dict(r) for r in rows]

        return await self._async_read(_get, f"list the tasks for {member_slug!r}")

    async def async_get_all_task_metadata(self) -> list[dict[str, Any]]:
        """Return all task_metadata rows (used by the WebSocket get_family command)."""

        def _get() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute("SELECT * FROM task_metadata").fetchall()
                return [dict(r) for r in rows]

        return await self._async_read(_get, "list every task")

    async def async_get_rotating_tasks(self) -> list[dict[str, Any]]:
        """Return all task_metadata rows where type='rotating'."""

        def _get() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute(
                    "SELECT * FROM task_metadata WHERE type = 'rotating'"
                ).fetchall()
                return [dict(r) for r in rows]

        return await self._async_read(_get, "list the rotating tasks")

    def get_task_metadata_sync(self, member_slug: str) -> list[dict[str, Any]]:
        """Sync helper used by make_recurrence_evaluator (called from executor context)."""
        with self._db_connect() as con:
            rows = con.execute(
                "SELECT * FROM task_metadata WHERE member_slug = ?", (member_slug,)
            ).fetchall()
            return [dict(r) for r in rows]

    async def async_rename_member_slug(self, old_slug: str, new_slug: str) -> None:
        """Update all slug-keyed rows atomically.

        Covers task_metadata (member and assignee), completion_log and
        apple_sync_state.

        Pointedly **not** routed through ``_async_write``. Nothing about #118 asks
        for it: no uid lock is held across it, and draining orders a write against
        its own caller's cancellation, which is not what this one is exposed to.
        (It *is* exposed to a writer — an ``add_task`` parked in
        ``async_create_todo_item`` while this UPDATE commits inserts its row under
        the old slug, which no member then reads. That window predates this change
        and no drain closes it; it belongs to the rename flow.) Draining would
        make things worse: the rename is step 1 of a three-step flow in
        ``config_flow`` whose later steps roll it back, and ``CancelledError`` is
        not caught by their ``except Exception``. Today a rename cancelled while
        still queued is cancelled outright and leaves SQLite untouched, which is
        the clean outcome the "SQLite first, so a failure is retryable" ordering
        was built for. Forcing it to land would commit the migration and then skip
        both the entity rename and the rollback, leaving rows on the new slug with
        the member, its entities and the config entry still on the old one.

        Left untranslated by #127 for a separate reason: its only caller is the
        options flow, which already catches ``Exception`` around both this call
        and its rollback and re-renders the form with ``entity_rename_failed``.
        A raw sqlite error cannot reach a user from here, so wrapping would change
        nothing but the text of a log line.
        """

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
                con.execute(
                    "UPDATE apple_sync_state SET member_slug = ? WHERE member_slug = ?",
                    (new_slug, old_slug),
                )

        await self._hass.async_add_executor_job(_rename)

    # ------------------------------------------------------------------
    # Apple Reminders sync state
    # ------------------------------------------------------------------
    # One row per reminder the bridge receiver has created (or re-seen) in HA,
    # keyed by the Apple id. Its only job is to make an HA-side deletion
    # observable: an id still active in Reminders whose HA item is gone but
    # whose row survives was deleted here, so the bridge is told to complete
    # it. Rows leave only when the id leaves Apple's active set.

    async def async_get_apple_sync_state(self, member_slug: str) -> list[dict[str, Any]]:
        """Return every apple_sync_state row for ``member_slug``."""

        def _get() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute(
                    "SELECT * FROM apple_sync_state WHERE member_slug = ?",
                    (member_slug,),
                ).fetchall()
                return [dict(r) for r in rows]

        return await self._async_read(_get, f"list the Reminders sync state for {member_slug!r}")

    async def async_upsert_apple_sync_state(
        self, apple_uid: str, member_slug: str, item_uid: str
    ) -> None:
        """Insert or refresh the row for ``apple_uid``."""
        now = datetime.now(UTC).isoformat()

        def _upsert() -> None:
            with self._db_connect() as con:
                con.execute(
                    "INSERT INTO apple_sync_state "
                    "(apple_uid, member_slug, item_uid, last_seen) VALUES (?, ?, ?, ?) "
                    "ON CONFLICT(apple_uid) DO UPDATE SET "
                    "member_slug = excluded.member_slug, "
                    "item_uid = excluded.item_uid, "
                    "last_seen = excluded.last_seen",
                    (apple_uid, member_slug, item_uid, now),
                )

        await self._async_write(_upsert, f"save the Reminders sync state for {apple_uid!r}")

    async def async_delete_apple_sync_state(self, apple_uids: Iterable[str]) -> None:
        """Delete the rows for ``apple_uids`` (missing ids are ignored)."""
        uids = list(apple_uids)
        if not uids:
            return

        def _delete() -> None:
            with self._db_connect() as con:
                con.executemany(
                    "DELETE FROM apple_sync_state WHERE apple_uid = ?",
                    [(uid,) for uid in uids],
                )

        await self._async_write(
            _delete, f"delete the Reminders sync state for {len(uids)} reminder(s)"
        )

    async def async_delete_apple_sync_state_for_member(self, member_slug: str) -> None:
        """Delete every row for ``member_slug`` (member removal)."""

        def _delete() -> None:
            with self._db_connect() as con:
                con.execute(
                    "DELETE FROM apple_sync_state WHERE member_slug = ?", (member_slug,)
                )

        await self._async_write(
            _delete, f"delete the Reminders sync state for {member_slug!r}"
        )

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

        await self._async_write(_insert, f"log the completion of task {item_uid!r}")

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

        return await self._async_read(
            _compute, f"compute the streak for {member_slug!r}"
        )
