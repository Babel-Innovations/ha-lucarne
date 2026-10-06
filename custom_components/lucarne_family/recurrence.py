"""Recurrence engine for the Lucarne Family integration.

Thin wrapper around dateutil.rrule for RRULE parsing and date math.
All callers must use these functions — never hand-roll date calculations.

Phasing note for INTERVAL>1 rules (e.g. every 6 months, every other week):
  A rule may carry an RFC 5545 start date, ``DTSTART:<YYYYMMDD>\nRRULE:<rule>``,
  which anchors its phase and suppresses every occurrence before it (#133).
  Without one, the rule is anchored to 1970-01-01 (_EPOCH), so its phase is
  fixed globally rather than per-task. Examples:
    - FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=6  fires on Jan 15 / Jul 15 every year
    - FREQ=WEEKLY;BYDAY=MO;INTERVAL=2        fires on bi-weekly Mondays from epoch
    - DTSTART:20261012\nRRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=2
                                             fires on Oct 12, Oct 26, ... 2026
  src/shared/recurrence.ts re-implements this for the cards;
  tests/fixtures/recurrence-cases.json holds both engines to the same answers.
"""
from __future__ import annotations

import re
from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from dateutil.rrule import rrule, rrulestr

if TYPE_CHECKING:

    from datetime import tzinfo

    from homeassistant.core import HomeAssistant

    from .store import LucarneFamilyStore

# Allowed RRULE patterns (see phase-2-task-model.md Supported RRULE pattern contract).
# Anything outside this set is rejected by the add_task service.
_WD = r"(?:MO|TU|WE|TH|FR|SA|SU)"
_POS_INTERVAL = r"[1-9]\d*"  # positive integer, no zero

_DAILY_RE = re.compile(rf"^FREQ=DAILY(?:;INTERVAL={_POS_INTERVAL})?$")
_WEEKLY_RE = re.compile(
    rf"^FREQ=WEEKLY;BYDAY=(?:{_WD})(?:,(?:{_WD}))*(?:;INTERVAL={_POS_INTERVAL})?$"
)
_MONTHLY_DATE_RE = re.compile(
    rf"^FREQ=MONTHLY;BYMONTHDAY=(?:[1-9]|[12]\d|3[01])(?:;INTERVAL={_POS_INTERVAL})?$"
)
_MONTHLY_NTH_RE = re.compile(
    rf"^FREQ=MONTHLY;BYDAY=[+-]?[1-5](?:{_WD[3:-1]})(?:;INTERVAL={_POS_INTERVAL})?$"
)
_YEARLY_RE = re.compile(
    rf"^FREQ=YEARLY;BYMONTH=(?:[1-9]|1[0-2]);BYMONTHDAY=(?:[1-9]|[12]\d|3[01])"
    rf"(?:;INTERVAL={_POS_INTERVAL})?$"
)

_ALLOWED_PATTERNS = (
    _DAILY_RE,
    _WEEKLY_RE,
    _MONTHLY_DATE_RE,
    _MONTHLY_NTH_RE,
    _YEARLY_RE,
)

# Weekday abbrev → human-readable
_WEEKDAY_NAMES = {
    "MO": "Monday",
    "TU": "Tuesday",
    "WE": "Wednesday",
    "TH": "Thursday",
    "FR": "Friday",
    "SA": "Saturday",
    "SU": "Sunday",
}

_MONTH_NAMES = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
}

_ORDINAL = {
    1: "1st", 2: "2nd", 3: "3rd",
    -1: "Last", -2: "2nd-to-last", -3: "3rd-to-last", -4: "4th-to-last", -5: "5th-to-last",
}


_DTSTART_RE = re.compile(r"^DTSTART:(\d{8})\nRRULE:(.+)$")


def _split_dtstart(rrule_str: str) -> tuple[date | None, str] | None:
    """Split an optional DTSTART line off; None if the line is malformed."""
    m = _DTSTART_RE.match(rrule_str)
    if m is None:
        return (None, rrule_str) if not rrule_str.startswith("DTSTART") else None
    try:
        start = datetime.strptime(m.group(1), "%Y%m%d").date()
    except ValueError:
        return None
    return start, m.group(2)


def is_valid_rrule(rrule_str: str) -> bool:
    """Return True if the RRULE string is in the allowed set (or empty)."""
    if not rrule_str:
        return True
    split = _split_dtstart(rrule_str)
    if split is None:
        return False
    return any(p.match(split[1]) for p in _ALLOWED_PATTERNS)


_EPOCH = datetime(1970, 1, 1, 0, 0, 0)


def parse(rrule_str: str) -> rrule | None:
    """Parse an RRULE string; return None for empty string.

    Anchors to the rule's own DTSTART line, else to 1970-01-01, so callers can
    query any date range.
    """
    if not rrule_str:
        return None
    return rrulestr(rrule_str, ignoretz=True, dtstart=_EPOCH)


def next_due(rrule_str: str, after: datetime) -> datetime | None:
    """Return the first occurrence strictly after `after`, or None.

    `after` may be timezone-aware; it is stripped to naive before comparison
    because our rules are anchored at naive _EPOCH.
    """
    rule = parse(rrule_str)
    if rule is None:
        return None
    naive_after = after.replace(tzinfo=None) if after.tzinfo is not None else after
    result: datetime | None = rule.after(naive_after, inc=False)
    return result


def is_due_today(rrule_str: str, today: date, _tz: tzinfo) -> bool:
    """Return True if the RRULE has any occurrence on `today`.

    `_tz` is accepted for API consistency with callers operating in a local
    timezone. Our RRULEs are date-only (no BYHOUR/BYMINUTE), so dateutil runs
    with naive datetimes and the day boundary is exact regardless of timezone.
    """
    rule = parse(rrule_str)
    if rule is None:
        return False
    start = datetime(today.year, today.month, today.day, 0, 0, 0)
    occ = rule.between(start, datetime(today.year, today.month, today.day, 23, 59, 59), inc=True)
    return len(occ) > 0


def friendly_summary(rrule_str: str) -> str:
    """Return a human-readable description of the RRULE."""
    if not rrule_str:
        return "One-off"
    split = _split_dtstart(rrule_str)
    if split is None:
        return _rule_summary(rrule_str)
    start, rule = split
    if start is None:
        return _rule_summary(rule)
    month = _MONTH_NAMES[start.month][:3]
    return f"{_rule_summary(rule)}, starting {month} {start.day}, {start.year}"


def _rule_summary(rrule_str: str) -> str:

    if _DAILY_RE.match(rrule_str):
        interval = _extract_interval(rrule_str)
        if interval == 1:
            return "Daily"
        return f"Every {interval} days"

    if _WEEKLY_RE.match(rrule_str):
        interval = _extract_interval(rrule_str)
        days_part = re.search(r"BYDAY=([A-Z,]+)", rrule_str)
        day_codes: list[str] = []
        days_str = ""
        if days_part:
            day_codes = days_part.group(1).split(",")
            day_names = [_WEEKDAY_NAMES.get(d, d) for d in day_codes]
            days_str = ", ".join(day_names)
        if interval == 1:
            return f"Every {days_str}"
        return f"Every {interval} weeks on {days_str}"

    if _MONTHLY_DATE_RE.match(rrule_str):
        interval = _extract_interval(rrule_str)
        day_match = re.search(r"BYMONTHDAY=(\d+)", rrule_str)
        day_num = int(day_match.group(1)) if day_match else 1
        ordinal = _ordinal_suffix(day_num)
        if interval == 1:
            return f"Monthly on the {ordinal}"
        return f"Every {interval} months on the {ordinal}"

    if _MONTHLY_NTH_RE.match(rrule_str):
        interval = _extract_interval(rrule_str)
        byday_match = re.search(r"BYDAY=([+-]?\d)([A-Z]{2})", rrule_str)
        if byday_match:
            n = int(byday_match.group(1))
            day = _WEEKDAY_NAMES.get(byday_match.group(2), byday_match.group(2))
            ord_str = _ORDINAL.get(n, f"{n}th")
            if interval == 1:
                return f"Monthly on the {ord_str} {day}"
            return f"Every {interval} months on the {ord_str} {day}"

    if _YEARLY_RE.match(rrule_str):
        interval = _extract_interval(rrule_str)
        month_match = re.search(r"BYMONTH=(\d{1,2})", rrule_str)
        day_match = re.search(r"BYMONTHDAY=(\d{1,2})", rrule_str)
        month_name = _MONTH_NAMES.get(int(month_match.group(1)), "") if month_match else ""
        day_num = int(day_match.group(1)) if day_match else 1
        if interval == 1:
            return f"Yearly on {month_name} {day_num}"
        return f"Every {interval} years on {month_name} {day_num}"

    return rrule_str  # fallback for unexpected patterns


def _extract_interval(rrule_str: str) -> int:
    m = re.search(r"INTERVAL=(\d+)", rrule_str)
    return int(m.group(1)) if m else 1


def _ordinal_suffix(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    suffixes = {1: "1st", 2: "2nd", 3: "3rd"}
    return suffixes.get(n % 10, f"{n}th")


def make_recurrence_evaluator(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    member_slug: str,
) -> Callable[[date], list[str]]:
    """Return a callable that lists routine task UIDs due on a given date.

    The returned function is synchronous (called from executor context by
    async_get_streak). Metadata and timezone are resolved once at first call
    and cached for the lifetime of the evaluator (one streak walk).
    """
    import zoneinfo as _zoneinfo

    try:
        local_tz: tzinfo = _zoneinfo.ZoneInfo(str(hass.config.time_zone))
    except Exception:
        local_tz = UTC

    _cache: list[dict[str, str]] = []
    _loaded = False

    def evaluator(day: date) -> list[str]:
        nonlocal _cache, _loaded
        if not _loaded:
            _cache = store.get_task_metadata_sync(member_slug)
            _loaded = True
        return [
            t["item_uid"]
            for t in _cache
            if t.get("type") == "routine" and is_due_today(t.get("recurrence", ""), day, local_tz)
        ]

    return evaluator
