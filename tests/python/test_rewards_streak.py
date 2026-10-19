"""Streak bonuses: run computation, daily bonus, milestones, idempotency."""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import patch

from homeassistant.core import HomeAssistant

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.streak_logic import async_evaluate_streak_run

from .test_streak_logic import _insert_completion, _member, _midday
from .test_task_service_rotating import _setup_with_household

UID = "routine-001"
JAN1 = date(2025, 1, 1)


async def _setup(hass: HomeAssistant, tmp_path: Path, members=("anna",), recurrence="FREQ=DAILY"):
    await hass.config.async_set_time_zone("UTC")
    entry, store = await _setup_with_household(hass, tmp_path, list(members))
    for slug in members:
        await store.async_add_task_metadata(
            slug, f"{UID}-{slug}", type="routine", recurrence=recurrence
        )
    return entry, store


def _complete(store, day: date, slug: str = "anna") -> None:
    _insert_completion(store, slug, f"{UID}-{slug}", "Brush", "completed", _midday(day))


def _complete_range(store, first: date, last: date, slug: str = "anna") -> None:
    day = first
    while day <= last:
        _complete(store, day, slug)
        day += timedelta(days=1)


async def _settings(store, daily: int = 0, milestones: list[tuple[int, int]] | None = None):
    async with store.rewards_lock:
        await store.async_set_rewards_settings(
            daily, [{"days": d, "points": p} for d, p in (milestones or [])]
        )


async def _evaluate(hass: HomeAssistant, freezer: Any, day: date) -> None:
    freezer.move_to(datetime(day.year, day.month, day.day, 21, 0, tzinfo=UTC))
    await hass.services.async_call(DOMAIN, "evaluate_all_streaks", blocking=True)
    await hass.async_block_till_done()


def _rows(store, kind: str, slug: str = "anna") -> list[tuple[str, int]]:
    with store._db_connect() as con:
        return [
            (r[0], r[1])
            for r in con.execute(
                "SELECT idem_key, delta FROM points_ledger"
                " WHERE member_slug = ? AND kind = ? ORDER BY id",
                (slug, kind),
            )
        ]


def _state(store, slug: str = "anna") -> tuple[int, str] | None:
    with store._db_connect() as con:
        row = con.execute(
            "SELECT last_streak, last_run_start FROM streak_bonus_state WHERE member_slug = ?",
            (slug,),
        ).fetchone()
    return (row[0], row[1]) if row else None


async def test_first_evaluation_is_a_baseline_with_no_backpay(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path)
    await _settings(store, milestones=[(7, 10)])
    _complete_range(store, JAN1, date(2025, 1, 10))

    await _evaluate(hass, freezer, date(2025, 1, 10))

    assert _rows(store, "streak_milestone") == []
    assert _state(store) == (10, "2025-01-01")


async def test_crossing_a_milestone_pays_once_and_rerun_is_idempotent(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path)
    await _settings(store, milestones=[(7, 10), (14, 25)])
    _complete_range(store, JAN1, date(2025, 1, 10))
    await _evaluate(hass, freezer, date(2025, 1, 10))

    _complete_range(store, date(2025, 1, 11), date(2025, 1, 14))
    await _evaluate(hass, freezer, date(2025, 1, 14))
    assert _rows(store, "streak_milestone") == [("ms:14:2025-01-01", 25)]

    await _evaluate(hass, freezer, date(2025, 1, 14))
    assert len(_rows(store, "streak_milestone")) == 1


async def test_daily_bonus_only_on_counted_days(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path)
    await _settings(store, daily=2)
    _complete(store, date(2025, 1, 1))
    _complete(store, date(2025, 1, 2))
    await _evaluate(hass, freezer, date(2025, 1, 1))
    await _evaluate(hass, freezer, date(2025, 1, 2))
    await _evaluate(hass, freezer, date(2025, 1, 2))  # same day again
    await _evaluate(hass, freezer, date(2025, 1, 3))  # routine not done

    assert _rows(store, "streak_daily") == [("daily:2025-01-01", 2), ("daily:2025-01-02", 2)]


async def test_no_daily_bonus_on_a_day_without_routines(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path, recurrence="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")
    await _settings(store, daily=2)
    _complete(store, date(2025, 1, 10))  # Friday
    await _evaluate(hass, freezer, date(2025, 1, 10))
    await _evaluate(hass, freezer, date(2025, 1, 11))  # Saturday: streak holds

    assert _rows(store, "streak_daily") == [("daily:2025-01-10", 2)]
    assert _state(store) == (1, "2025-01-10")


async def test_milestone_pays_again_in_a_new_run(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path)
    await _settings(store, milestones=[(7, 10)])
    _complete_range(store, JAN1, date(2025, 1, 3))
    await _evaluate(hass, freezer, date(2025, 1, 3))  # baseline at 3
    _complete_range(store, date(2025, 1, 4), date(2025, 1, 7))
    await _evaluate(hass, freezer, date(2025, 1, 7))
    await _evaluate(hass, freezer, date(2025, 1, 9))  # missed 8th and 9th

    _complete_range(store, date(2025, 1, 10), date(2025, 1, 16))
    for offset in range(7):
        await _evaluate(hass, freezer, date(2025, 1, 10) + timedelta(days=offset))

    assert _rows(store, "streak_milestone") == [
        ("ms:7:2025-01-01", 10),
        ("ms:7:2025-01-10", 10),
    ]


async def test_one_members_failure_does_not_skip_the_next(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path, members=("anna", "bob"))
    await _settings(store, daily=2)
    day = date(2025, 1, 5)
    _complete(store, day, "anna")
    _complete(store, day, "bob")

    real = async_evaluate_streak_run

    async def flaky(hass_, store_, member, as_of):
        if member.slug == "anna":
            raise RuntimeError("boom")
        return await real(hass_, store_, member, as_of)

    with patch("custom_components.lucarne_family.streak_logic.async_evaluate_streak_run", flaky):
        await _evaluate(hass, freezer, day)

    assert _rows(store, "streak_daily", "anna") == []
    assert _rows(store, "streak_daily", "bob") == [("daily:2025-01-05", 2)]


async def test_a_zero_length_evaluation_never_overwrites_the_baseline(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path)
    await _settings(store, milestones=[(7, 10)])
    _complete_range(store, JAN1, date(2025, 1, 10))
    await _evaluate(hass, freezer, date(2025, 1, 10))

    await _evaluate(hass, freezer, date(2025, 1, 11))  # ticked only after the check
    assert _state(store) == (10, "2025-01-01")

    _complete_range(store, date(2025, 1, 11), date(2025, 1, 12))
    await _evaluate(hass, freezer, date(2025, 1, 12))

    assert _rows(store, "streak_milestone") == []
    assert _state(store) == (12, "2025-01-01")


async def test_streak_run_matches_streak_and_run_start_skips_no_routine_days(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await hass.config.async_set_time_zone("UTC")
    _entry, store = await _setup_with_household(hass, tmp_path, ["anna"])
    await store.async_add_task_metadata(
        "anna", UID, type="routine", recurrence="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
    )
    # Mon 6 .. Fri 10 and Mon 13 done; the Friday before (3rd) was missed.
    for day in (6, 7, 8, 9, 10, 13):
        _insert_completion(store, "anna", UID, "x", "completed", _midday(date(2025, 1, day)))

    as_of = datetime(2025, 1, 13, 21, 0, tzinfo=UTC)
    run = await async_evaluate_streak_run(hass, store, _member(), as_of)

    assert (run.length, run.run_start, run.today_counted) == (6, date(2025, 1, 6), True)
    assert run.length == await store.async_get_streak(
        "anna", date(2025, 1, 13), lambda d: [UID] if d.weekday() < 5 else []
    )


async def test_a_new_members_first_day_pays_a_one_day_milestone(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path)
    await _settings(store, milestones=[(1, 5)])

    await _evaluate(hass, freezer, JAN1)  # nothing done yet: a zero baseline
    assert _state(store) == (0, "2025-01-01")

    _complete(store, date(2025, 1, 2))
    await _evaluate(hass, freezer, date(2025, 1, 2))

    assert _rows(store, "streak_milestone") == [("ms:1:2025-01-02", 5)]


async def test_a_zero_first_check_on_an_older_run_still_pays_no_backpay(
    hass: HomeAssistant, tmp_path: Path, freezer: Any
) -> None:
    _entry, store = await _setup(hass, tmp_path)
    await _settings(store, milestones=[(7, 10)])
    _complete_range(store, JAN1, date(2025, 1, 10))

    await _evaluate(hass, freezer, date(2025, 1, 11))  # Jan 11 ticked only after the check
    assert _state(store) == (0, "2025-01-11")

    _complete_range(store, date(2025, 1, 11), date(2025, 1, 12))
    await _evaluate(hass, freezer, date(2025, 1, 12))

    assert _rows(store, "streak_milestone") == []
    assert _state(store) == (12, "2025-01-01")
