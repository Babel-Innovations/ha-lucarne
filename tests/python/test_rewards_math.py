"""cycle_date: the Python mirror of lastResetBoundary."""
from __future__ import annotations

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

import pytest

from custom_components.lucarne_family.models import StreakRun
from custom_components.lucarne_family.rewards import (
    cycle_date,
    effective_prev_streak,
    milestones_to_award,
    split_shares,
)

MADRID = ZoneInfo("Europe/Madrid")


def _at(y: int, m: int, d: int, hh: int, mm: int) -> datetime:
    return datetime(y, m, d, hh, mm, tzinfo=MADRID).astimezone(UTC)


@pytest.mark.parametrize(
    ("hh", "mm", "expected"),
    [(3, 59, date(2026, 6, 9)), (4, 0, date(2026, 6, 10)), (23, 0, date(2026, 6, 10))],
)
def test_boundary_at_four(hh: int, mm: int, expected: date) -> None:
    assert cycle_date(_at(2026, 6, 10, hh, mm), "04:00", MADRID) == expected


def test_dst_transition_day() -> None:
    assert cycle_date(_at(2026, 3, 29, 3, 30), "04:00", MADRID) == date(2026, 3, 28)
    assert cycle_date(_at(2026, 3, 29, 4, 30), "04:00", MADRID) == date(2026, 3, 29)


def test_garbage_reset_time_behaves_as_midnight() -> None:
    assert cycle_date(_at(2026, 6, 10, 0, 30), "nope", MADRID) == date(2026, 6, 10)
    assert cycle_date(_at(2026, 6, 10, 23, 0), "", MADRID) == date(2026, 6, 10)


@pytest.mark.parametrize(
    ("cost", "others", "expected"),
    [
        (10, [], {"a": 10}),
        (10, ["b", "c"], {"a": 4, "b": 3, "c": 3}),
        (10, ["a", "b"], {"a": 5, "b": 5}),
    ],
)
def test_split_shares(cost: int, others: list[str], expected: dict[str, int]) -> None:
    assert split_shares(cost, "a", others) == expected


def test_split_shares_more_people_than_points() -> None:
    with pytest.raises(ValueError):
        split_shares(2, "a", ["b", "c"])


def _run(length: int, start: date | None = date(2026, 6, 1)) -> StreakRun:
    return StreakRun(length, start, True)


def test_effective_prev_streak() -> None:
    assert effective_prev_streak(None, _run(10)) is None
    assert effective_prev_streak((10, "2026-06-01"), _run(0, None)) == 0
    assert effective_prev_streak((10, "2026-06-01"), _run(3, date(2026, 6, 9))) == 0
    # run_start shifted because routines were edited: still the same run.
    assert effective_prev_streak((10, "2026-06-01"), _run(11, date(2026, 5, 31))) == 10


def test_milestones_to_award() -> None:
    milestones = [(7, 10), (14, 25)]
    assert milestones_to_award(milestones, 6, 7) == [(7, 10)]
    assert milestones_to_award(milestones, 7, 7) == []
    assert milestones_to_award(milestones, 6, 20) == [(7, 10), (14, 25)]
