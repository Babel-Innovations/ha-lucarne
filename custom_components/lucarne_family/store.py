"""SQLite-backed store for the Lucarne Family integration."""
from __future__ import annotations

import asyncio
import json
import logging
import sqlite3
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta, tzinfo
from pathlib import Path
from typing import Any, TypeVar

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import CONF_MEMBERS, STORAGE_VERSION
from .models import Member, StreakRun

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


class RewardsRuleError(HomeAssistantError):
    """A rewards business rule refused the write (not enough points, wrong state).

    Raised inside a ``_async_rewards_write`` function so the transaction rolls
    back; the service handler re-raises it as ``ServiceValidationError``.
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


_OPEN_EARN_SQL = """
SELECT e.id, e.member_slug, e.delta, e.summary FROM points_ledger e
WHERE e.kind = 'earn' AND e.item_uid = :uid AND e.cycle = :cycle
  AND NOT EXISTS (SELECT 1 FROM points_ledger r WHERE r.reverses_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM completion_log c
                  WHERE c.item_uid = :uid AND c.action = 'reset'
                    AND c.timestamp > e.created_at)
ORDER BY e.id DESC LIMIT 1
"""


def _open_earn(con: sqlite3.Connection, item_uid: str, cycle: date) -> sqlite3.Row | None:
    """The uid's un-reversed, un-reset ``earn`` for ``cycle``, if any."""
    row: sqlite3.Row | None = con.execute(
        _OPEN_EARN_SQL, {"uid": item_uid, "cycle": cycle.isoformat()}
    ).fetchone()
    return row


_CLAIM_TRANSITIONS = {
    ("pending", "approved"),
    ("pending", "rejected"),
    ("pending", "cancelled"),
    ("approved", "refunded"),
}


def _release_shares(
    con: sqlite3.Connection,
    claim_id: int,
    reward_name: str,
    contributors: list[sqlite3.Row],
    actor_user_id: str | None,
    now: str,
) -> None:
    """Give every contributor their snapshotted share back."""
    for row in contributors:
        con.execute(
            "INSERT INTO points_ledger (created_at, member_slug, delta, kind,"
            " claim_id, summary, actor_user_id)"
            " VALUES (?, ?, ?, 'claim_release', ?, ?, ?)",
            (now, row["member_slug"], row["share"], claim_id, reward_name, actor_user_id),
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
        # Migration: add per-task points. ALTER cannot add the CHECK, so on
        # existing databases the voluptuous range in task_service is the gate.
        if "points" not in existing_cols:
            con.execute(
                "ALTER TABLE task_metadata ADD COLUMN points "
                "INTEGER NOT NULL DEFAULT 0"
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
                    points INTEGER NOT NULL DEFAULT 0
                        CHECK (points BETWEEN 0 AND 1000),
                    created_at TEXT NOT NULL
                )
                """
            )
            con.execute(
                """
                INSERT INTO task_metadata
                  (item_uid, member_slug, assignee_slug, type, recurrence, icon,
                   source, apple_uid, summary, time_of_day, rotation_owners,
                   current_owner, points, created_at)
                SELECT
                  item_uid, member_slug, assignee_slug, type, recurrence, icon,
                  source, apple_uid, summary, time_of_day, rotation_owners,
                  current_owner, points, created_at
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
        # Serialises every points_ledger write. Never held together with a
        # task_locks.async_task_uid_lock, in either order: rewards code takes no
        # uid lock, and uid-lock holders never call rewards code.
        self.rewards_lock = asyncio.Lock()

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
        points: int = 0,
    ) -> None:
        """INSERT a new task_metadata row."""

        def _insert() -> None:
            with self._db_connect() as con:
                con.execute(
                    """
                    INSERT INTO task_metadata
                      (item_uid, member_slug, assignee_slug, type, recurrence,
                       icon, source, apple_uid, summary, time_of_day,
                       rotation_owners, current_owner, points, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item_uid, member_slug, assignee_slug, type, recurrence,
                        icon, source, apple_uid, summary, time_of_day,
                        rotation_owners, current_owner, points,
                        datetime.now(UTC).isoformat(),
                    ),
                )

        await self._async_write(_insert, f"save details for task {item_uid!r}")

    async def async_update_task_metadata(self, item_uid: str, **fields: Any) -> None:
        """UPDATE allowed fields on a task_metadata row."""
        allowed = {
            "type", "recurrence", "icon", "source", "apple_uid",
            "assignee_slug", "time_of_day", "rotation_owners", "current_owner",
            "points",
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
        """Update all slug-keyed rows in task_metadata and completion_log atomically.

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
                    "UPDATE points_ledger SET member_slug = ? WHERE member_slug = ?",
                    (new_slug, old_slug),
                )
                con.execute(
                    "UPDATE claims SET claimer_slug = ? WHERE claimer_slug = ?",
                    (new_slug, old_slug),
                )
                con.execute(
                    "UPDATE claim_contributors SET member_slug = ? WHERE member_slug = ?",
                    (new_slug, old_slug),
                )
                con.execute(
                    "UPDATE streak_bonus_state SET member_slug = ? WHERE member_slug = ?",
                    (new_slug, old_slug),
                )

        await self._hass.async_add_executor_job(_rename)

    # ------------------------------------------------------------------
    # Points ledger (the only source of balances; see features/rewards)
    # ------------------------------------------------------------------

    async def _async_rewards_write(
        self, func: Callable[[sqlite3.Connection], _T], operation: str
    ) -> _T:
        """Run ``func`` in one ``BEGIN IMMEDIATE`` transaction; needs ``rewards_lock``."""
        assert self.rewards_lock.locked(), "rewards writes require rewards_lock"

        def _job() -> _T:
            con = self._db_connect()
            con.isolation_level = None
            try:
                con.execute("BEGIN IMMEDIATE")
                try:
                    result = func(con)
                    con.execute("COMMIT")
                except Exception:
                    # SQLite may already have rolled back on its own; a second
                    # ROLLBACK would then mask the original error.
                    if con.in_transaction:
                        con.execute("ROLLBACK")
                    raise
                return result
            finally:
                con.close()

        return await self._async_write(_job, operation)

    async def async_ledger_record_earn(
        self,
        item_uid: str,
        member_slug: str,
        points: int,
        cycle: date,
        summary: str,
        actor_user_id: str | None,
    ) -> bool:
        """Insert an ``earn`` unless the uid already has an open one this cycle."""

        def _earn(con: sqlite3.Connection) -> bool:
            if _open_earn(con, item_uid, cycle) is not None:
                return False
            con.execute(
                "INSERT INTO points_ledger (created_at, member_slug, delta, kind,"
                " item_uid, cycle, summary, actor_user_id)"
                " VALUES (?, ?, ?, 'earn', ?, ?, ?, ?)",
                (
                    datetime.now(UTC).isoformat(), member_slug, points, item_uid,
                    cycle.isoformat(), summary, actor_user_id,
                ),
            )
            return True

        return await self._async_rewards_write(_earn, f"record points for task {item_uid!r}")

    async def async_ledger_record_revoke(
        self, item_uid: str, cycle: date, actor_user_id: str | None
    ) -> bool:
        """Reverse the uid's open earn, taking member and delta from that row."""

        def _revoke(con: sqlite3.Connection) -> bool:
            earn = _open_earn(con, item_uid, cycle)
            if earn is None:
                return False
            con.execute(
                "INSERT INTO points_ledger (created_at, member_slug, delta, kind,"
                " item_uid, reverses_id, summary, actor_user_id)"
                " VALUES (?, ?, ?, 'revoke', ?, ?, ?, ?)",
                (
                    datetime.now(UTC).isoformat(), earn["member_slug"],
                    -earn["delta"], item_uid, earn["id"], earn["summary"],
                    actor_user_id,
                ),
            )
            return True

        return await self._async_rewards_write(
            _revoke, f"revoke points for task {item_uid!r}"
        )

    async def async_ledger_grant(
        self, member_slug: str, points: int, reason: str, actor_user_id: str | None
    ) -> int:
        """Insert a ``grant`` and return the member's new balance."""

        def _grant(con: sqlite3.Connection) -> int:
            con.execute(
                "INSERT INTO points_ledger (created_at, member_slug, delta, kind,"
                " reason, actor_user_id) VALUES (?, ?, ?, 'grant', ?, ?)",
                (datetime.now(UTC).isoformat(), member_slug, points, reason, actor_user_id),
            )
            row = con.execute(
                "SELECT SUM(delta) FROM points_ledger WHERE member_slug = ?",
                (member_slug,),
            ).fetchone()
            return int(row[0])

        return await self._async_rewards_write(_grant, f"grant points to {member_slug!r}")

    async def async_get_balances(self) -> dict[str, int]:
        """Return ``SUM(delta)`` per member that has rows; the caller fills zeros."""

        def _read() -> dict[str, int]:
            with self._db_connect() as con:
                rows = con.execute(
                    "SELECT member_slug, SUM(delta) FROM points_ledger"
                    " GROUP BY member_slug"
                ).fetchall()
            return {r[0]: int(r[1]) for r in rows}

        return await self._async_read(_read, "read points balances")

    async def async_get_ledger_history(self, limit: int) -> list[dict[str, Any]]:
        """Return the newest ``limit`` ledger rows, newest first."""

        def _read() -> list[dict[str, Any]]:
            with self._db_connect() as con:
                rows = con.execute(
                    "SELECT id, created_at, member_slug, delta, kind, summary,"
                    " reason, claim_id, actor_user_id FROM points_ledger"
                    " ORDER BY id DESC LIMIT ?",
                    (limit,),
                ).fetchall()
            return [dict(r) for r in rows]

        return await self._async_read(_read, "read points history")

    # ------------------------------------------------------------------
    # Rewards catalog and settings
    # ------------------------------------------------------------------

    async def async_create_reward(
        self, name: str, cost: int, description: str, poolable: bool
    ) -> int:
        """Insert a reward and return its id."""

        def _create(con: sqlite3.Connection) -> int:
            now = datetime.now(UTC).isoformat()
            cur = con.execute(
                "INSERT INTO rewards (name, cost, description, poolable,"
                " created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (name, cost, description, int(poolable), now, now),
            )
            return int(cur.lastrowid or 0)

        return await self._async_rewards_write(_create, f"create reward {name!r}")

    async def async_update_reward(self, reward_id: int, **fields: Any) -> None:
        """Partial update of an active reward."""
        allowed = {"name", "cost", "description", "poolable"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if "poolable" in updates:
            updates["poolable"] = int(updates["poolable"])

        def _update(con: sqlite3.Connection) -> None:
            row = con.execute(
                "SELECT archived_at FROM rewards WHERE id = ?", (reward_id,)
            ).fetchone()
            if row is None or row["archived_at"] is not None:
                raise RewardsRuleError("This reward is no longer available")
            updates["updated_at"] = datetime.now(UTC).isoformat()
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            con.execute(
                f"UPDATE rewards SET {set_clause} WHERE id = ?",
                [*updates.values(), reward_id],
            )

        await self._async_rewards_write(_update, f"update reward {reward_id}")

    async def async_archive_reward(self, reward_id: int) -> bool:
        """Archive a reward. Returns False when it was already archived."""

        def _archive(con: sqlite3.Connection) -> bool:
            row = con.execute(
                "SELECT archived_at FROM rewards WHERE id = ?", (reward_id,)
            ).fetchone()
            if row is None:
                raise RewardsRuleError("This reward is no longer available")
            if row["archived_at"] is not None:
                return False
            now = datetime.now(UTC).isoformat()
            con.execute(
                "UPDATE rewards SET archived_at = ?, updated_at = ? WHERE id = ?",
                (now, now, reward_id),
            )
            return True

        return await self._async_rewards_write(_archive, f"archive reward {reward_id}")

    async def async_get_rewards(self, include_archived: bool = False) -> list[dict[str, Any]]:
        """Return rewards, active only unless ``include_archived``."""

        def _read() -> list[dict[str, Any]]:
            where = "" if include_archived else " WHERE archived_at IS NULL"
            with self._db_connect() as con:
                rows = con.execute(
                    f"SELECT * FROM rewards{where} ORDER BY id"
                ).fetchall()
            return [{**dict(r), "poolable": bool(r["poolable"])} for r in rows]

        return await self._async_read(_read, "read rewards")

    async def async_get_rewards_settings(self) -> dict[str, Any]:
        """Return the family-wide settings; defaults when never written."""

        def _read() -> dict[str, Any]:
            with self._db_connect() as con:
                row = con.execute(
                    "SELECT streak_daily_bonus, streak_milestones"
                    " FROM rewards_settings WHERE id = 1"
                ).fetchone()
            if row is None:
                return {"streak_daily_bonus": 0, "streak_milestones": []}
            return {
                "streak_daily_bonus": int(row["streak_daily_bonus"]),
                "streak_milestones": json.loads(row["streak_milestones"]),
            }

        return await self._async_read(_read, "read rewards settings")

    async def async_set_rewards_settings(
        self,
        streak_daily_bonus: int | None = None,
        streak_milestones: list[dict[str, int]] | None = None,
    ) -> None:
        """Upsert the singleton settings row; ``None`` keeps the stored value."""

        def _set(con: sqlite3.Connection) -> None:
            row = con.execute(
                "SELECT streak_daily_bonus, streak_milestones"
                " FROM rewards_settings WHERE id = 1"
            ).fetchone()
            bonus = int(row["streak_daily_bonus"]) if row else 0
            milestones = row["streak_milestones"] if row else "[]"
            if streak_daily_bonus is not None:
                bonus = streak_daily_bonus
            if streak_milestones is not None:
                milestones = json.dumps(
                    sorted(streak_milestones, key=lambda m: m["days"])
                )
            con.execute(
                "INSERT INTO rewards_settings (id, streak_daily_bonus, streak_milestones)"
                " VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET"
                " streak_daily_bonus = excluded.streak_daily_bonus,"
                " streak_milestones = excluded.streak_milestones",
                (bonus, milestones),
            )

        await self._async_rewards_write(_set, "save rewards settings")

    # ------------------------------------------------------------------
    # Claims
    # ------------------------------------------------------------------

    async def async_create_claim(
        self,
        reward_id: int,
        claimer: str,
        shares: dict[str, int],
        actor_user_id: str | None,
    ) -> int:
        """Check every share and reserve it in one transaction; return the claim id."""
        names = {m.slug: m.name for m in self.get_members()}

        def _create(con: sqlite3.Connection) -> int:
            reward = con.execute(
                "SELECT name, cost, poolable, archived_at FROM rewards WHERE id = ?",
                (reward_id,),
            ).fetchone()
            if reward is None or reward["archived_at"] is not None:
                raise RewardsRuleError("This reward is no longer available")
            if sum(shares.values()) != reward["cost"]:
                # The handler split a cost read before the lock; the reward was
                # edited in between, and reserving the old split would underprice it.
                raise RewardsRuleError("This reward's price just changed. Please try again")
            if len(shares) > 1 and not reward["poolable"]:
                raise RewardsRuleError("This reward can't be shared")
            marks = ", ".join("?" for _ in shares)
            balances = {
                r[0]: int(r[1])
                for r in con.execute(
                    "SELECT member_slug, SUM(delta) FROM points_ledger"
                    f" WHERE member_slug IN ({marks}) GROUP BY member_slug",
                    list(shares),
                )
            }
            for slug, share in shares.items():
                short = share - balances.get(slug, 0)
                if short > 0:
                    raise RewardsRuleError(
                        f"Not enough points: {names.get(slug, slug)} needs {short} more"
                    )
            now = datetime.now(UTC).isoformat()
            cur = con.execute(
                "INSERT INTO claims (reward_id, reward_name, cost, claimer_slug,"
                " status, created_at, created_by) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
                (reward_id, reward["name"], reward["cost"], claimer, now, actor_user_id),
            )
            claim_id = int(cur.lastrowid or 0)
            for slug, share in shares.items():
                con.execute(
                    "INSERT INTO claim_contributors (claim_id, member_slug, share)"
                    " VALUES (?, ?, ?)",
                    (claim_id, slug, share),
                )
                con.execute(
                    "INSERT INTO points_ledger (created_at, member_slug, delta, kind,"
                    " claim_id, summary, actor_user_id)"
                    " VALUES (?, ?, ?, 'claim_reserve', ?, ?, ?)",
                    (now, slug, -share, claim_id, reward["name"], actor_user_id),
                )
            return claim_id

        return await self._async_rewards_write(_create, f"claim reward {reward_id}")

    async def async_transition_claim(
        self,
        claim_id: int,
        from_status: str,
        to_status: str,
        actor_user_id: str | None,
    ) -> list[str]:
        """Move a claim between states, releasing its shares when it ends; return contributors."""
        if (from_status, to_status) not in _CLAIM_TRANSITIONS:
            raise ValueError(f"Invalid claim transition {from_status} -> {to_status}")

        def _transition(con: sqlite3.Connection) -> list[str]:
            now = datetime.now(UTC).isoformat()
            cur = con.execute(
                "UPDATE claims SET status = ?, resolved_at = ?, resolved_by = ?"
                " WHERE id = ? AND status = ?",
                (to_status, now, actor_user_id, claim_id, from_status),
            )
            if cur.rowcount != 1:
                row = con.execute(
                    "SELECT status FROM claims WHERE id = ?", (claim_id,)
                ).fetchone()
                if row is None:
                    raise RewardsRuleError("This claim no longer exists")
                raise RewardsRuleError(f"This claim was already {row['status']}")
            claim = con.execute(
                "SELECT reward_name FROM claims WHERE id = ?", (claim_id,)
            ).fetchone()
            contributors = con.execute(
                "SELECT member_slug, share FROM claim_contributors WHERE claim_id = ?",
                (claim_id,),
            ).fetchall()
            if to_status in ("rejected", "cancelled", "refunded"):
                _release_shares(
                    con, claim_id, claim["reward_name"], contributors, actor_user_id, now
                )
            return [r["member_slug"] for r in contributors]

        return await self._async_rewards_write(
            _transition, f"mark claim {claim_id} {to_status}"
        )

    async def async_release_member_claims(
        self, member_slug: str, actor_user_id: str | None
    ) -> int:
        """Reject every pending claim the member claimed or contributed to; return the count."""

        def _release(con: sqlite3.Connection) -> int:
            now = datetime.now(UTC).isoformat()
            claims = con.execute(
                "SELECT id, reward_name FROM claims WHERE status = 'pending' AND"
                " (claimer_slug = :s OR id IN"
                "  (SELECT claim_id FROM claim_contributors WHERE member_slug = :s))",
                {"s": member_slug},
            ).fetchall()
            for claim in claims:
                con.execute(
                    "UPDATE claims SET status = 'rejected', resolved_at = ?,"
                    " resolved_by = ? WHERE id = ?",
                    (now, actor_user_id, claim["id"]),
                )
                contributors = con.execute(
                    "SELECT member_slug, share FROM claim_contributors WHERE claim_id = ?",
                    (claim["id"],),
                ).fetchall()
                _release_shares(
                    con, claim["id"], claim["reward_name"], contributors, actor_user_id, now
                )
            return len(claims)

        return await self._async_rewards_write(
            _release, f"release the claims of {member_slug!r}"
        )

    async def async_get_claims(
        self,
        statuses: list[str],
        limit: int | None = None,
        ids: list[int] | None = None,
    ) -> list[dict[str, Any]]:
        """Return claims in ``statuses`` (and ``ids``), newest first, with contributors."""

        def _read() -> list[dict[str, Any]]:
            marks = ", ".join("?" for _ in statuses)
            sql = f"SELECT * FROM claims WHERE status IN ({marks})"
            params: list[Any] = list(statuses)
            if ids is not None:
                sql += f" AND id IN ({', '.join('?' for _ in ids)})"
                params.extend(ids)
            sql += " ORDER BY id DESC"
            if limit is not None:
                sql += " LIMIT ?"
                params.append(limit)
            with self._db_connect() as con:
                claims = [dict(r) for r in con.execute(sql, params)]
                for claim in claims:
                    claim["contributors"] = [
                        {"member_slug": r["member_slug"], "share": r["share"]}
                        for r in con.execute(
                            "SELECT member_slug, share FROM claim_contributors"
                            " WHERE claim_id = ? ORDER BY rowid",
                            (claim["id"],),
                        )
                    ]
            return claims

        return await self._async_read(_read, "read claims")

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
        """Compute the current streak length for `member_slug`."""
        run = await self.async_get_streak_run(member_slug, today, recurrence_evaluator, tz)
        return run.length

    async def async_get_streak_run(
        self,
        member_slug: str,
        today: date,
        recurrence_evaluator: Callable[[date], list[str]],
        tz: tzinfo | None = None,
    ) -> StreakRun:
        """Compute the current streak for `member_slug`.

        Walks from `today` backward one day at a time (hard cap: 365 days).
        `recurrence_evaluator(day)` returns the UIDs of routines expected on
        that day. Days with no expected routines are skipped. The streak
        increments for each day where ALL expected routines were completed.
        `run_start` is the oldest counted day, so it skips no-routine days;
        `today_counted` is whether today itself had routines and all were done.
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

        def _compute() -> StreakRun:
            streak = 0
            run_start: date | None = None
            today_counted = False
            for offset in range(365):
                current = today - timedelta(days=offset)
                expected = recurrence_evaluator(current)
                if not expected:
                    continue
                completed = _get_completions(member_slug, current)
                if all(uid in completed for uid in expected):
                    streak += 1
                    run_start = current
                    if offset == 0:
                        today_counted = True
                else:
                    break
            return StreakRun(streak, run_start, today_counted)

        return await self._async_read(
            _compute, f"compute the streak for {member_slug!r}"
        )

    async def async_apply_streak_bonus(
        self,
        member_slug: str,
        run: StreakRun,
        today: date,
        daily_bonus: int,
        milestones: list[tuple[int, int]],
    ) -> int:
        """Pay the daily bonus and crossed milestones; return the ledger rows inserted."""
        from .rewards import effective_prev_streak, milestones_to_award

        def _apply(con: sqlite3.Connection) -> int:
            row = con.execute(
                "SELECT last_streak, last_run_start FROM streak_bonus_state"
                " WHERE member_slug = ?",
                (member_slug,),
            ).fetchone()
            state = (int(row["last_streak"]), row["last_run_start"]) if row else None
            prev = effective_prev_streak(state, run)
            now = datetime.now(UTC).isoformat()
            inserted = 0

            def _insert(kind: str, delta: int, idem_key: str, summary: str) -> None:
                nonlocal inserted
                cur = con.execute(
                    "INSERT INTO points_ledger (created_at, member_slug, delta, kind,"
                    " idem_key, summary, reason) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    " ON CONFLICT DO NOTHING",
                    (now, member_slug, delta, kind, idem_key, summary, summary),
                )
                inserted += max(cur.rowcount, 0)

            if daily_bonus > 0 and run.today_counted:
                _insert(
                    "streak_daily", daily_bonus, f"daily:{today.isoformat()}",
                    "Daily streak bonus",
                )
            if prev is not None:
                start = run.run_start.isoformat() if run.run_start else ""
                for days, points in milestones_to_award(milestones, prev, run.length):
                    _insert(
                        "streak_milestone", points, f"ms:{days}:{start}",
                        f"{days}-day streak",
                    )
            # A zero-length run never overwrites the state: it only means today's
            # routines were not done *yet* at check time, and overwriting the
            # baseline with 0 would re-pay milestones already passed. A member with
            # no state gets a zero baseline stamped with today, so their first run
            # pays its milestones (see effective_prev_streak).
            if run.length == 0 and state is None:
                con.execute(
                    "INSERT INTO streak_bonus_state (member_slug, last_streak, last_run_start)"
                    " VALUES (?, 0, ?) ON CONFLICT(member_slug) DO NOTHING",
                    (member_slug, today.isoformat()),
                )
            if run.length > 0:
                con.execute(
                    "INSERT INTO streak_bonus_state (member_slug, last_streak, last_run_start)"
                    " VALUES (?, ?, ?) ON CONFLICT(member_slug) DO UPDATE SET"
                    " last_streak = excluded.last_streak,"
                    " last_run_start = excluded.last_run_start",
                    (
                        member_slug, run.length,
                        run.run_start.isoformat() if run.run_start else "",
                    ),
                )
            return inserted

        return await self._async_rewards_write(
            _apply, f"award streak bonuses to {member_slug!r}"
        )
