"""Points and rewards: admin gate, earn/revoke, grants (feature: rewards)."""
from __future__ import annotations

import logging
from collections.abc import Callable, Coroutine
from datetime import UTC, date, datetime, time, timedelta, tzinfo
from typing import Any, cast
from zoneinfo import ZoneInfo

import homeassistant.helpers.config_validation as cv
import voluptuous as vol
from homeassistant.core import (
    Context,
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.exceptions import ServiceValidationError, Unauthorized

from .const import (
    CONF_RESET_TIME,
    DEFAULT_RESET_TIME,
    DOMAIN,
    EVENT_REWARDS_UPDATED,
    HOUSEHOLD_SLUG,
)
from .models import Member, StreakRun
from .store import LucarneFamilyStore, RewardsRuleError

_LOGGER = logging.getLogger(__name__)


def _parse_hm(value: str) -> time:
    try:
        hh, mm = value.split(":")
        return time(int(hh), int(mm))
    except (ValueError, AttributeError):
        return time(0, 0)


def cycle_date(now: datetime, reset_time: str, tz: tzinfo) -> date:
    """Local date of the last reset boundary at or before ``now``.

    Python mirror of ``lastResetBoundary`` in ``src/shared/date-helpers.ts``.
    """
    local = now.astimezone(tz)
    boundary = datetime.combine(local.date(), _parse_hm(reset_time), tzinfo=tz)
    day = local.date()
    if boundary > local:
        day -= timedelta(days=1)
    return day


async def async_require_admin(hass: HomeAssistant, context: Context) -> None:
    """Allow admins and userless (automation/system) calls; refuse everyone else."""
    if context.user_id is None:
        return
    user = await hass.auth.async_get_user(context.user_id)
    if user is None or not user.is_admin:
        raise Unauthorized(context=context)


async def async_record_task_transition(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    *,
    entity_id: str,
    uid: str,
    action: str,
    metadata: dict[str, Any] | None,
    member_slug: str,
    summary: str,
    actor_user_id: str | None,
    read_status: Callable[[], str | None],
) -> None:
    """Earn or revoke points for a completed/undone transition.

    Never takes a uid lock (see ``LucarneFamilyStore.rewards_lock``).
    """
    if action == "reset" or metadata is None:
        return
    if action == "completed" and (
        not metadata.get("points")
        or (
            metadata.get("member_slug") == HOUSEHOLD_SLUG
            and metadata.get("type") != "rotating"
        )
    ):
        # An undone never returns early on current metadata: a rotating task
        # that earned and was then converted to a household chore must still
        # have that earn revoked.
        return

    cycle = cycle_date(
        datetime.now(UTC),
        str(store._entry().data.get(CONF_RESET_TIME, DEFAULT_RESET_TIME)),
        ZoneInfo(str(hass.config.time_zone)),
    )
    wrote = False
    async with store.rewards_lock:
        # Each state change runs in its own listener task, so a quick tick then
        # untick can arrive out of order; act on the item's current status.
        current = read_status()
        if action == "completed":
            if current is not None and current != "completed":
                return
            wrote = await store.async_ledger_record_earn(
                uid, member_slug, int(metadata["points"]), cycle, summary, actor_user_id
            )
        else:
            if current == "completed":
                return
            wrote = await store.async_ledger_record_revoke(uid, cycle, actor_user_id)
    if wrote:
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})


def split_shares(cost: int, claimer: str, others: list[str]) -> dict[str, int]:
    """Split ``cost`` over the claimer and the others; the claimer takes the remainder."""
    contributors = list(dict.fromkeys([claimer, *others]))
    n = len(contributors)
    if n > cost:
        raise ValueError(f"{n} contributors cannot share a cost of {cost}")
    shares = dict.fromkeys(contributors, cost // n)
    shares[claimer] += cost % n
    return shares


GRANT_POINTS_SCHEMA = vol.Schema(
    {
        vol.Required("member"): cv.string,
        vol.Required("points"): vol.All(vol.Coerce(int), vol.Range(min=1, max=10000)),
        vol.Optional("reason", default=""): vol.All(
            cv.string, vol.Length(max=200), lambda v: v.strip()
        ),
    }
)

_NAME = vol.All(cv.string, lambda v: v.strip(), vol.Length(min=1, max=60))
_COST = vol.All(vol.Coerce(int), vol.Range(min=1, max=100000))
_DESCRIPTION = vol.All(cv.string, lambda v: v.strip(), vol.Length(max=500))


def _unique_days(milestones: list[dict[str, int]]) -> list[dict[str, int]]:
    days = [m["days"] for m in milestones]
    if len(set(days)) != len(days):
        raise vol.Invalid("Milestone days must be unique")
    return sorted(milestones, key=lambda m: m["days"])


_MILESTONES = vol.All(
    [
        vol.Schema(
            {
                vol.Required("days"): vol.All(vol.Coerce(int), vol.Range(min=1, max=365)),
                vol.Required("points"): vol.All(
                    vol.Coerce(int), vol.Range(min=1, max=10000)
                ),
            }
        )
    ],
    vol.Length(max=20),
    _unique_days,
)

CREATE_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required("name"): _NAME,
        vol.Required("cost"): _COST,
        vol.Optional("description", default=""): _DESCRIPTION,
        vol.Optional("poolable", default=False): cv.boolean,
    }
)
UPDATE_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required("reward_id"): vol.Coerce(int),
        vol.Optional("name"): _NAME,
        vol.Optional("cost"): _COST,
        vol.Optional("description"): _DESCRIPTION,
        vol.Optional("poolable"): cv.boolean,
    }
)
ARCHIVE_REWARD_SCHEMA = vol.Schema({vol.Required("reward_id"): vol.Coerce(int)})
SET_REWARDS_SETTINGS_SCHEMA = vol.Schema(
    {
        vol.Optional("streak_daily_bonus"): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=1000)
        ),
        vol.Optional("streak_milestones"): _MILESTONES,
    }
)

def effective_prev_streak(state: tuple[int, str] | None, run: StreakRun) -> int | None:
    """The streak length milestones are measured against, or None for a first baseline.

    A shifted ``run_start`` (routines edited mid-run) does not restart the run:
    only a shorter length does, which keeps milestones from being paid twice.
    """
    if state is None:
        return None
    last_streak, _last_run_start = state
    if run.length == 0 or run.length < last_streak:
        return 0
    return last_streak


def milestones_to_award(
    milestones: list[tuple[int, int]], prev: int, new: int
) -> list[tuple[int, int]]:
    """The ``(days, points)`` milestones crossed going from ``prev`` to ``new``."""
    return [(days, points) for days, points in milestones if prev < days <= new]


async def async_award_streak_bonus(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    member: Member,
    run: StreakRun,
    today: date,
) -> None:
    """Pay the member's streak bonuses for ``today`` under the configured settings."""
    settings = await store.async_get_rewards_settings()
    milestones = [(m["days"], m["points"]) for m in settings["streak_milestones"]]
    async with store.rewards_lock:
        inserted = await store.async_apply_streak_bonus(
            member.slug, run, today, settings["streak_daily_bonus"], milestones
        )
    if inserted:
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})


async def async_release_member_claims(
    hass: HomeAssistant, store: LucarneFamilyStore, slug: str
) -> None:
    """Reject the removed member's pending claims, returning every contributor's share."""
    async with store.rewards_lock:
        count = await store.async_release_member_claims(slug, None)
    if count:
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})


CLAIM_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required("member"): cv.string,
        vol.Required("reward_id"): vol.Coerce(int),
        vol.Optional("pool_with", default=[]): vol.All(cv.ensure_list, [cv.string]),
    }
)
CLAIM_ID_SCHEMA = vol.Schema({vol.Required("claim_id"): vol.Coerce(int)})

_SERVICES = (
    "grant_points",
    "create_reward",
    "update_reward",
    "archive_reward",
    "set_rewards_settings",
    "claim_reward",
    "cancel_claim",
    "approve_claim",
    "reject_claim",
    "refund_claim",
)


async def async_setup_rewards_services(hass: HomeAssistant, entry_id: str) -> None:
    """Register the rewards services. Re-registration replaces the handler."""

    def _store() -> LucarneFamilyStore:
        store: LucarneFamilyStore = hass.data[DOMAIN][entry_id]["store"]
        return store

    async def handle_grant_points(call: ServiceCall) -> ServiceResponse:
        await async_require_admin(hass, call.context)
        store = _store()
        member: str = call.data["member"]
        if member not in {m.slug for m in store.get_members()}:
            raise ServiceValidationError(f"Unknown member: {member!r}")
        async with store.rewards_lock:
            balance = await store.async_ledger_grant(
                member, call.data["points"], call.data["reason"], call.context.user_id
            )
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})
        return {"balance": balance}

    async def handle_create_reward(call: ServiceCall) -> ServiceResponse:
        await async_require_admin(hass, call.context)
        store = _store()
        async with store.rewards_lock:
            reward_id = await store.async_create_reward(
                call.data["name"],
                call.data["cost"],
                call.data["description"],
                call.data["poolable"],
            )
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})
        return {"id": reward_id}

    async def handle_update_reward(call: ServiceCall) -> None:
        await async_require_admin(hass, call.context)
        store = _store()
        fields = {k: v for k, v in call.data.items() if k != "reward_id"}
        try:
            async with store.rewards_lock:
                await store.async_update_reward(call.data["reward_id"], **fields)
        except RewardsRuleError as err:
            raise ServiceValidationError(str(err)) from err
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})

    async def handle_archive_reward(call: ServiceCall) -> None:
        await async_require_admin(hass, call.context)
        store = _store()
        try:
            async with store.rewards_lock:
                changed = await store.async_archive_reward(call.data["reward_id"])
        except RewardsRuleError as err:
            raise ServiceValidationError(str(err)) from err
        if changed:
            hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})

    async def handle_set_rewards_settings(call: ServiceCall) -> None:
        await async_require_admin(hass, call.context)
        store = _store()
        async with store.rewards_lock:
            await store.async_set_rewards_settings(
                call.data.get("streak_daily_bonus"), call.data.get("streak_milestones")
            )
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})

    async def handle_claim_reward(call: ServiceCall) -> ServiceResponse:
        store = _store()
        member: str = call.data["member"]
        others: list[str] = call.data["pool_with"]
        known = {m.slug for m in store.get_members()}
        for slug in (member, *others):
            if slug not in known:
                raise ServiceValidationError(f"Unknown member: {slug!r}")
        reward = next(
            (r for r in await store.async_get_rewards() if r["id"] == call.data["reward_id"]),
            None,
        )
        if reward is None:
            raise ServiceValidationError("This reward is no longer available")
        try:
            shares = split_shares(reward["cost"], member, others)
        except ValueError as err:
            raise ServiceValidationError("Too many people for this reward") from err
        try:
            async with store.rewards_lock:
                claim_id = await store.async_create_claim(
                    call.data["reward_id"], member, shares, call.context.user_id
                )
        except RewardsRuleError as err:
            raise ServiceValidationError(str(err)) from err
        hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})
        return cast(ServiceResponse, {"claim_id": claim_id, "shares": shares})

    def _transition_handler(
        from_status: str, to_status: str, admin: bool
    ) -> Callable[[ServiceCall], Coroutine[Any, Any, ServiceResponse]]:
        async def handler(call: ServiceCall) -> ServiceResponse:
            if admin:
                await async_require_admin(hass, call.context)
            store = _store()
            try:
                async with store.rewards_lock:
                    await store.async_transition_claim(
                        call.data["claim_id"], from_status, to_status, call.context.user_id
                    )
            except RewardsRuleError as err:
                raise ServiceValidationError(str(err)) from err
            hass.bus.async_fire(EVENT_REWARDS_UPDATED, {})
            return None

        return handler

    hass.services.async_register(
        DOMAIN,
        "claim_reward",
        handle_claim_reward,
        schema=CLAIM_REWARD_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    for service, from_status, to_status, admin in (
        ("cancel_claim", "pending", "cancelled", False),
        ("approve_claim", "pending", "approved", True),
        ("reject_claim", "pending", "rejected", True),
        ("refund_claim", "approved", "refunded", True),
    ):
        hass.services.async_register(
            DOMAIN,
            service,
            _transition_handler(from_status, to_status, admin),
            schema=CLAIM_ID_SCHEMA,
        )
    hass.services.async_register(
        DOMAIN,
        "grant_points",
        handle_grant_points,
        schema=GRANT_POINTS_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        "create_reward",
        handle_create_reward,
        schema=CREATE_REWARD_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN, "update_reward", handle_update_reward, schema=UPDATE_REWARD_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "archive_reward", handle_archive_reward, schema=ARCHIVE_REWARD_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        "set_rewards_settings",
        handle_set_rewards_settings,
        schema=SET_REWARDS_SETTINGS_SCHEMA,
    )


async def async_unload_rewards_services(hass: HomeAssistant) -> None:
    """Remove the rewards services."""
    for service in _SERVICES:
        hass.services.async_remove(DOMAIN, service)
