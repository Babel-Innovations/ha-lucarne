"""Repairs issues for member/entity states a user has to resolve by hand."""
from __future__ import annotations

from typing import Literal

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN

ORPHAN_ISSUE_PREFIX = "orphaned_entities_"


BROKEN_MEMBER_SIDES: tuple[str, ...] = ("todo", "counter")


def _broken_member_issue_id(slug: str, side: str) -> str:
    # Per side, not per member: the two failures are independent and carry
    # different text, so a shared id would make the last writer win and let a
    # partial repair clear the other side's still-valid warning.
    return f"broken_member_{side}_{slug}"


def _orphan_issue_id(slug: str) -> str:
    return f"{ORPHAN_ISSUE_PREFIX}{slug}"


@callback
def async_report_broken_member(
    hass: HomeAssistant,
    slug: str,
    name: str,
    missing_entity_id: str,
    detail: str,
    *,
    side: Literal["todo", "counter"],
) -> None:
    """Flag a member whose entities could not be reconciled automatically.

    `side` picks the wording, because the two are not equally severe: a missing
    todo list means `ws_get_family` drops the member entirely, while a missing
    counter costs only the streak. One message claiming the member is "skipped"
    would be wrong half the time.
    """
    ir.async_create_issue(
        hass,
        DOMAIN,
        _broken_member_issue_id(slug, side),
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key=f"broken_member_{side}",
        translation_placeholders={
            "name": name,
            "slug": slug,
            "entity_id": missing_entity_id,
            "detail": detail,
        },
    )


@callback
def async_clear_broken_member(
    hass: HomeAssistant, slug: str, *, side: str | None = None
) -> None:
    """Drop a member's broken-member issues.

    `side=None` clears both, for when the member is gone or fully healthy.
    Pass a side to clear only that one, so repairing the todo list does not
    silence a counter warning that still applies.
    """
    sides = BROKEN_MEMBER_SIDES if side is None else (side,)
    for s in sides:
        ir.async_delete_issue(hass, DOMAIN, _broken_member_issue_id(slug, s))


@callback
def async_report_orphaned_entities(
    hass: HomeAssistant, slug: str, entity_ids: list[str]
) -> None:
    """Flag helpers left behind when a member record was removed anyway.

    Persistent, because the condition outlives the process: the member record is
    already gone, so nothing re-derives this at the next startup. It is withdrawn
    by `async_prune_resolved_orphan_issues` once the helpers are actually gone.
    """
    ir.async_create_issue(
        hass,
        DOMAIN,
        _orphan_issue_id(slug),
        is_fixable=False,
        is_persistent=True,
        severity=ir.IssueSeverity.WARNING,
        translation_key="orphaned_entities",
        translation_placeholders={
            "slug": slug,
            "entity_ids": ", ".join(entity_ids),
        },
    )


@callback
def async_prune_resolved_orphan_issues(hass: HomeAssistant) -> None:
    """Withdraw orphan issues whose helpers the user has since deleted.

    Without this the warning would outlive the problem: the user deletes the
    leftover helper as instructed and the issue stays in Settings > Repairs
    forever, since it is persistent and nothing else clears it.
    """
    from homeassistant.helpers.entity_registry import async_get as er_get

    er = er_get(hass)
    registry = ir.async_get(hass)
    for (domain, issue_id), issue in list(registry.issues.items()):
        if domain != DOMAIN or not issue_id.startswith(ORPHAN_ISSUE_PREFIX):
            continue
        raw = (issue.translation_placeholders or {}).get("entity_ids", "")
        entity_ids = [e.strip() for e in raw.split(",") if e.strip()]
        if entity_ids and all(er.async_get(e) is None for e in entity_ids):
            ir.async_delete_issue(hass, DOMAIN, issue_id)


@callback
def async_clear_orphaned_entities(hass: HomeAssistant, slug: str) -> None:
    """Drop a slug's orphan issue (e.g. the slug is re-added as a member)."""
    ir.async_delete_issue(hass, DOMAIN, _orphan_issue_id(slug))
