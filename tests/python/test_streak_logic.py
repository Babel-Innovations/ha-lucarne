"""Tests for streak_logic.py (Phase 3-A)."""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.streak_logic import async_evaluate_streak


def _make_entry(hass: HomeAssistant, slug: str = "anna") -> MockConfigEntry:
    member = Member(
        slug=slug,
        name=slug.capitalize(),
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [member.to_dict()],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _make_store(
    hass: HomeAssistant, entry_id: str, tmp_path: Path
) -> LucarneFamilyStore:
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry_id, db_path)
    await store.async_init()
    return store


def _insert_completion(
    store: LucarneFamilyStore,
    member_slug: str,
    item_uid: str,
    summary: str,
    action: str,
    ts: datetime,
) -> None:
    """Insert a completion_log row with a specific timestamp."""
    with store._db_connect() as con:
        con.execute(
            "INSERT INTO completion_log"
            " (timestamp, member_slug, item_uid, summary, action, recurrence_at_time)"
            " VALUES (?, ?, ?, ?, ?, '')",
            (ts.isoformat(), member_slug, item_uid, summary, action),
        )


def _midday(d: date) -> datetime:
    """Return noon UTC on the given date."""
    return datetime(d.year, d.month, d.day, 12, 0, 0, tzinfo=UTC)


def _member(slug: str = "anna") -> Member:
    return Member(
        slug=slug,
        name=slug.capitalize(),
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
    )


async def test_three_consecutive_daily_completions_streak_3(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """3 consecutive days with all routines completed → streak = 3."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    uid = "routine-001"
    await store.async_add_task_metadata("anna", uid, type="routine", recurrence="FREQ=DAILY")

    today = date(2025, 1, 3)
    for offset in range(3):
        d = today - timedelta(days=offset)
        _insert_completion(store, "anna", uid, "Brush teeth", "completed", _midday(d))

    member = _member()
    streak = await async_evaluate_streak(
        hass, store, member, datetime(2025, 1, 3, 21, 0, tzinfo=UTC)
    )
    assert streak == 3


async def test_missed_day_resets_streak_to_zero(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Today's routine not completed → streak = 0."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    uid = "routine-001"
    await store.async_add_task_metadata("anna", uid, type="routine", recurrence="FREQ=DAILY")

    today = date(2025, 1, 3)
    # Completed Jan 1 and Jan 2, but NOT Jan 3 (today)
    for offset in range(1, 3):
        d = today - timedelta(days=offset)
        _insert_completion(store, "anna", uid, "Brush teeth", "completed", _midday(d))

    member = _member()
    streak = await async_evaluate_streak(
        hass, store, member, datetime(2025, 1, 3, 21, 0, tzinfo=UTC)
    )
    assert streak == 0


async def test_no_routine_today_skips_to_yesterday(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """No routine due today (weekly Mon, today Tue) → streak equals yesterday's streak."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    uid = "routine-001"
    # Monday-only routine
    await store.async_add_task_metadata(
        "anna", uid, type="routine", recurrence="FREQ=WEEKLY;BYDAY=MO"
    )

    # 2025-01-06 = Monday (completed), 2025-01-07 = Tuesday (no routine)
    monday = date(2025, 1, 6)
    _insert_completion(store, "anna", uid, "Weekly task", "completed", _midday(monday))

    member = _member()
    # as_of = Tuesday: no routine today → skip → Monday had routine + completed → streak=1
    streak_tuesday = await async_evaluate_streak(
        hass, store, member, datetime(2025, 1, 7, 21, 0, tzinfo=UTC)
    )
    assert streak_tuesday == 1


async def test_mixed_schedule_weekly_streak_6(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Weekly Mon/Wed/Fri over two weeks: 6 completion days → streak = 6."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    uid = "routine-001"
    await store.async_add_task_metadata(
        "anna", uid, type="routine", recurrence="FREQ=WEEKLY;BYDAY=MO,WE,FR"
    )

    # Two weeks of Mon/Wed/Fri starting from 2025-01-06
    # Week 1: Mon Jan 6, Wed Jan 8, Fri Jan 10
    # Week 2: Mon Jan 13, Wed Jan 15, Fri Jan 17
    due_dates = [
        date(2025, 1, 6),
        date(2025, 1, 8),
        date(2025, 1, 10),
        date(2025, 1, 13),
        date(2025, 1, 15),
        date(2025, 1, 17),
    ]
    for d in due_dates:
        _insert_completion(store, "anna", uid, "Weekly routine", "completed", _midday(d))

    member = _member()
    # as_of = Fri Jan 17; expect streak=6
    streak = await async_evaluate_streak(
        hass, store, member, datetime(2025, 1, 17, 21, 0, tzinfo=UTC)
    )
    assert streak == 6


async def test_365_day_cap_honored(hass: HomeAssistant, tmp_path: Path) -> None:
    """Streak walk capped at 365 days even with 400 days of completions."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    uid = "routine-001"
    await store.async_add_task_metadata("anna", uid, type="routine", recurrence="FREQ=DAILY")

    today = date(2025, 1, 1)
    # Insert 400 days of completions (far exceeds the 365-day cap)
    for offset in range(400):
        d = today - timedelta(days=offset)
        _insert_completion(store, "anna", uid, "Daily task", "completed", _midday(d))

    member = _member()
    streak = await async_evaluate_streak(
        hass, store, member, datetime(2025, 1, 1, 21, 0, tzinfo=UTC)
    )
    assert streak == 365


async def test_recurrence_evaluator_uses_current_routine_set(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Streak evaluator uses the member's CURRENT metadata rows (acknowledged limitation)."""
    entry = _make_entry(hass)
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    uid_a = "routine-a"
    uid_b = "routine-b"
    await store.async_add_task_metadata("anna", uid_a, type="routine", recurrence="FREQ=DAILY")
    await store.async_add_task_metadata("anna", uid_b, type="routine", recurrence="FREQ=DAILY")

    today = date(2025, 1, 3)
    # Complete uid_a every day for 3 days but uid_b is only added today.
    # Because the evaluator uses CURRENT metadata, it will expect BOTH uid_a and uid_b
    # for all 3 days. uid_b is missing on days 1 and 2 → streak breaks.
    for offset in range(3):
        d = today - timedelta(days=offset)
        _insert_completion(store, "anna", uid_a, "Routine A", "completed", _midday(d))
    # uid_b only completed today
    _insert_completion(store, "anna", uid_b, "Routine B", "completed", _midday(today))

    member = _member()
    streak = await async_evaluate_streak(
        hass, store, member, datetime(2025, 1, 3, 21, 0, tzinfo=UTC)
    )
    # Today: uid_a + uid_b both completed → streak=1
    # Yesterday: uid_b not completed → break
    assert streak == 1
