"""Tests for the recurrence engine."""
from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path

import pytest

from custom_components.lucarne_family.recurrence import (
    friendly_summary,
    is_due_today,
    is_valid_rrule,
    next_due,
    parse,
)

# ---------------------------------------------------------------------------
# parse()
# ---------------------------------------------------------------------------


def test_parse_empty_returns_none() -> None:
    assert parse("") is None


def test_parse_daily_returns_rule() -> None:
    rule = parse("FREQ=DAILY")
    assert rule is not None


def test_parse_weekly_returns_rule() -> None:
    rule = parse("FREQ=WEEKLY;BYDAY=MO,WE,FR")
    assert rule is not None


# ---------------------------------------------------------------------------
# is_valid_rrule()
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "rrule_str",
    [
        "",
        "FREQ=DAILY",
        "FREQ=DAILY;INTERVAL=2",
        "FREQ=WEEKLY;BYDAY=MO",
        "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;INTERVAL=2",
        "FREQ=MONTHLY;BYMONTHDAY=15",
        "FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6",
        "FREQ=MONTHLY;BYDAY=1SA",
        "FREQ=MONTHLY;BYDAY=-1MO;INTERVAL=2",
        "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15",
        "FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=31;INTERVAL=2",
        "DTSTART:20261012\nRRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=2",
        "DTSTART:20240229\nRRULE:FREQ=DAILY",
    ],
)
def test_is_valid_rrule_allows_supported_patterns(rrule_str: str) -> None:
    assert is_valid_rrule(rrule_str)


@pytest.mark.parametrize(
    "rrule_str",
    [
        "FREQ=DAILY;COUNT=10",
        "FREQ=DAILY;UNTIL=20251231T000000Z",
        "FREQ=HOURLY",
        "FREQ=MINUTELY",
        "BYHOUR=8",
        "FREQ=DAILY;BYHOUR=8",
        "FREQ=WEEKLY",  # no BYDAY
        "FREQ=YEARLY;BYMONTH=3",  # missing BYMONTHDAY
        "FREQ=MONTHLY;BYMONTHDAY=15;BYHOUR=8",
        "FREQ=MONTHLY;BYSETPOS=1;BYDAY=MO",
        # boundary / semantic out-of-range cases
        "FREQ=DAILY;INTERVAL=0",  # INTERVAL=0 is illegal
        "FREQ=WEEKLY;BYDAY=XX",  # XX is not a weekday code
        "FREQ=WEEKLY;BYDAY=MO,",  # trailing comma
        "FREQ=MONTHLY;BYMONTHDAY=0",  # day 0 is out of range
        "FREQ=MONTHLY;BYMONTHDAY=32",  # day 32 is out of range
        "FREQ=YEARLY;BYMONTH=0;BYMONTHDAY=15",  # month 0
        "FREQ=YEARLY;BYMONTH=13;BYMONTHDAY=15",  # month 13
        "FREQ=MONTHLY;BYDAY=0MO",  # Nth=0 is RFC 5545 illegal
        "FREQ=MONTHLY;BYDAY=6MO",  # Nth=6 is beyond ±5 range
        # DTSTART prefix: only a real date, only date-only, only before a supported rule
        "DTSTART:20261399\nRRULE:FREQ=DAILY",
        "DTSTART:20250229\nRRULE:FREQ=DAILY",
        "DTSTART:20261012T080000\nRRULE:FREQ=DAILY",
        "DTSTART:20261012\nRRULE:FREQ=HOURLY",
        "DTSTART:20261012\nFREQ=DAILY",
        "DTSTART:20261012",
        "FREQ=DAILY\nDTSTART:20261012",
    ],
)
def test_is_valid_rrule_rejects_unsupported_patterns(rrule_str: str) -> None:
    assert not is_valid_rrule(rrule_str)


# ---------------------------------------------------------------------------
# next_due()
# ---------------------------------------------------------------------------


def test_next_due_empty_returns_none() -> None:
    after = datetime(2025, 1, 1, 12, 0, 0)
    assert next_due("", after) is None


def test_next_due_handles_aware_datetime() -> None:
    """next_due must not raise when given a timezone-aware after argument."""
    after = datetime(2025, 1, 1, 12, 0, 0, tzinfo=UTC)
    result = next_due("FREQ=DAILY", after)
    assert result is not None
    assert result.date() == date(2025, 1, 2)


def test_next_due_daily() -> None:
    after = datetime(2025, 1, 1, 12, 0, 0)
    result = next_due("FREQ=DAILY", after)
    assert result is not None
    assert result.date() == date(2025, 1, 2)


def test_next_due_every_other_week() -> None:
    # Biweekly Monday starting from a Wednesday
    after = datetime(2025, 1, 8, 0, 0, 0)  # Wednesday
    result = next_due("FREQ=WEEKLY;BYDAY=MO;INTERVAL=2", after)
    assert result is not None
    assert result.weekday() == 0  # Monday


def test_next_due_monthly_by_date() -> None:
    after = datetime(2025, 1, 16, 0, 0, 0)
    result = next_due("FREQ=MONTHLY;BYMONTHDAY=15", after)
    assert result is not None
    assert result.day == 15
    assert result.month == 2


def test_next_due_every_6_months() -> None:
    # Epoch-anchor: INTERVAL=6 monthly from 1970-01-01 fires on Jan 15 / Jul 15.
    # A task created in March 2025 still has its next occurrence on Jul 15 (not Sep 15).
    after = datetime(2025, 1, 16, 0, 0, 0)
    result = next_due("FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6", after)
    assert result is not None
    assert result.day == 15
    assert result.month == 7


def test_next_due_every_6_months_from_march_phases_to_epoch() -> None:
    """Confirm INTERVAL>1 rules phase to 1970 anchor, NOT to the query date.

    A task added in March 2025 with INTERVAL=6 monthly will fire next on Jul 15,
    not Sep 15. Phase 3 callers must bump `due` directly for per-task phasing.
    """
    after = datetime(2025, 3, 16, 0, 0, 0)  # after March 15 — if per-task, next would be Sep
    result = next_due("FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6", after)
    assert result is not None
    assert result.month == 7  # Jul 15 (epoch phase), not Sep 15 (task-relative phase)
    assert result.day == 15


def test_next_due_first_saturday() -> None:
    after = datetime(2025, 1, 5, 0, 0, 0)  # first Saturday is Jan 4
    result = next_due("FREQ=MONTHLY;BYDAY=1SA", after)
    assert result is not None
    assert result.weekday() == 5  # Saturday
    assert result.month == 2


def test_next_due_yearly_march_15() -> None:
    after = datetime(2025, 3, 16, 0, 0, 0)
    result = next_due("FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15", after)
    assert result is not None
    assert result.month == 3
    assert result.day == 15
    assert result.year == 2026


# ---------------------------------------------------------------------------
# is_due_today()
# ---------------------------------------------------------------------------


def test_is_due_today_daily() -> None:
    today = date(2025, 5, 20)
    assert is_due_today("FREQ=DAILY", today, UTC)


def test_is_due_today_weekly_matching_day() -> None:
    today = date(2025, 5, 19)  # Monday
    assert is_due_today("FREQ=WEEKLY;BYDAY=MO", today, UTC)


def test_is_due_today_weekly_non_matching_day() -> None:
    today = date(2025, 5, 20)  # Tuesday
    assert not is_due_today("FREQ=WEEKLY;BYDAY=MO,WE,FR", today, UTC)


def test_is_due_today_monthly_by_date() -> None:
    today = date(2025, 5, 15)
    assert is_due_today("FREQ=MONTHLY;BYMONTHDAY=15", today, UTC)
    assert not is_due_today("FREQ=MONTHLY;BYMONTHDAY=15", date(2025, 5, 14), UTC)


def test_is_due_today_empty_rrule() -> None:
    today = date(2025, 5, 20)
    assert not is_due_today("", today, UTC)


def test_is_due_today_yearly() -> None:
    assert is_due_today("FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15", date(2025, 3, 15), UTC)
    assert not is_due_today(
        "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15", date(2025, 3, 16), UTC
    )


def test_is_due_today_first_saturday() -> None:
    # Jan 4, 2025 is the first Saturday of 2025
    assert is_due_today("FREQ=MONTHLY;BYDAY=1SA", date(2025, 1, 4), UTC)
    assert not is_due_today("FREQ=MONTHLY;BYDAY=1SA", date(2025, 1, 11), UTC)


def test_is_due_today_dst_boundary() -> None:
    """DST boundary: March 9, 2025 (US spring forward). Daily rule should still trigger."""
    import zoneinfo

    tz = zoneinfo.ZoneInfo("America/New_York")
    today = date(2025, 3, 9)
    assert is_due_today("FREQ=DAILY", today, tz)


def test_is_due_today_leap_year() -> None:
    """Feb 29 yearly rule (dateutil behavior): verify occurrence in leap year."""
    leap_day = date(2024, 2, 29)
    # dateutil uses the actual rule; with BYMONTHDAY=29 it should fire on leap days only
    assert is_due_today(
        "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29", leap_day, UTC
    )
    # On a non-leap year Feb 29 doesn't exist; dateutil skips it entirely
    non_leap = date(2025, 2, 28)
    assert not is_due_today(
        "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29", non_leap, UTC
    )


# ---------------------------------------------------------------------------
# friendly_summary()
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("rrule_str", "expected"),
    [
        ("", "One-off"),
        ("FREQ=DAILY", "Daily"),
        ("FREQ=DAILY;INTERVAL=2", "Every 2 days"),
        ("FREQ=WEEKLY;BYDAY=MO", "Every Monday"),
        ("FREQ=WEEKLY;BYDAY=MO,WE,FR", "Every Monday, Wednesday, Friday"),
        ("FREQ=WEEKLY;BYDAY=MO;INTERVAL=2", "Every 2 weeks on Monday"),
        ("FREQ=MONTHLY;BYMONTHDAY=15", "Monthly on the 15th"),
        ("FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6", "Every 6 months on the 15th"),
        ("FREQ=MONTHLY;BYMONTHDAY=1", "Monthly on the 1st"),
        ("FREQ=MONTHLY;BYMONTHDAY=2", "Monthly on the 2nd"),
        ("FREQ=MONTHLY;BYMONTHDAY=3", "Monthly on the 3rd"),
        ("FREQ=MONTHLY;BYDAY=1SA", "Monthly on the 1st Saturday"),
        ("FREQ=MONTHLY;BYDAY=-1MO", "Monthly on the Last Monday"),
        ("FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15", "Yearly on March 15"),
        ("FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=31;INTERVAL=2", "Every 2 years on December 31"),
        (
            "DTSTART:20261012\nRRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=2",
            "Every 2 weeks on Monday, starting Oct 12, 2026",
        ),
    ],
)
def test_friendly_summary_known_patterns(rrule_str: str, expected: str) -> None:
    assert friendly_summary(rrule_str) == expected


# ---------------------------------------------------------------------------
# Shared fixture: the cards' isRoutineDueToday asserts the same cases (#133)
# ---------------------------------------------------------------------------

_CASES = json.loads(
    (Path(__file__).parents[1] / "fixtures" / "recurrence-cases.json").read_text()
)["cases"]


def test_is_due_today_matches_shared_fixture() -> None:
    wrong = [
        c
        for c in _CASES
        if is_due_today(str(c["rrule"]), date.fromisoformat(str(c["date"])), UTC) is not c["due"]
    ]
    assert wrong == []


def test_dtstart_moves_the_fortnight() -> None:
    """Two fortnightly Monday rules a week apart alternate (#133)."""
    a = "DTSTART:20261005\nRRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=2"
    b = "DTSTART:20261012\nRRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=2"
    mondays = [date(2026, 10, 5), date(2026, 10, 12), date(2026, 10, 19), date(2026, 10, 26)]
    assert [is_due_today(a, d, UTC) for d in mondays] == [True, False, True, False]
    assert [is_due_today(b, d, UTC) for d in mondays] == [False, True, False, True]
