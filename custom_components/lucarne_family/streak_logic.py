"""Streak computation for the Lucarne Family integration."""
from __future__ import annotations

import logging
from datetime import UTC, datetime

from homeassistant.core import HomeAssistant

from .models import Member, StreakRun
from .recurrence import make_recurrence_evaluator
from .store import LucarneFamilyStore

_LOGGER = logging.getLogger(__name__)


async def async_evaluate_streak(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    member: Member,
    as_of: datetime,
) -> int:
    """Recompute member's streak length; see ``async_evaluate_streak_run``."""
    return (await async_evaluate_streak_run(hass, store, member, as_of)).length


async def async_evaluate_streak_run(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    member: Member,
    as_of: datetime,
) -> StreakRun:
    """Recompute member's streak from completion_log as of `as_of`.

    completion_log is the authoritative source; the counter entity is only a
    derived mirror and must NOT be read as an input here.

    Local timezone is passed to store.async_get_streak so completion-log
    day boundaries match the recurrence evaluator's notion of "today" in
    non-UTC installs (e.g. a completion at 22:00 Europe/Madrid must land on
    the same local date that the recurrence engine evaluated).
    """
    import zoneinfo
    from datetime import timezone as _tz

    local_tz: zoneinfo.ZoneInfo | _tz
    try:
        local_tz = zoneinfo.ZoneInfo(str(hass.config.time_zone))
    except Exception:
        local_tz = UTC

    today = as_of.astimezone(local_tz).date()
    evaluator = make_recurrence_evaluator(hass, store, member.slug)
    return await store.async_get_streak_run(member.slug, today, evaluator, tz=local_tz)


async def async_apply_streak(
    hass: HomeAssistant,
    _store: LucarneFamilyStore,
    member: Member,
    new_streak: int,
) -> None:
    """Write the new streak value to the derived counter mirror.

    The counter is external state; completion_log is authoritative.
    """
    if not member.streak_counter_id:
        _LOGGER.warning(
            "Member %r has no streak_counter_id; skipping apply_streak", member.slug
        )
        return

    await hass.services.async_call(
        "counter",
        "set_value",
        {"entity_id": member.streak_counter_id, "value": new_streak},
        blocking=True,
    )
