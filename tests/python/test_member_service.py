"""Tests for member_service.py — set_member_avatar service."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
import voluptuous as vol
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore


def _make_member(slug: str = "anna") -> Member:
    return Member(
        slug=slug,
        name=slug.capitalize(),
        color="#aabbcc",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
    )


def _make_entry(hass: HomeAssistant, members: list[dict[str, Any]]) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": members,
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _make_store(hass: HomeAssistant, entry_id: str, tmp_path: Path) -> LucarneFamilyStore:
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry_id, db_path)
    await store.async_init()
    return store


async def _setup(
    hass: HomeAssistant,
    tmp_path: Path,
    members: list[Member] | None = None,
) -> tuple[MockConfigEntry, LucarneFamilyStore]:
    member_list = members or [_make_member()]
    entry = _make_entry(hass, [m.to_dict() for m in member_list])
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    from custom_components.lucarne_family.member_service import async_setup_member_service

    await async_setup_member_service(hass, entry.entry_id)
    return entry, store


# ---------------------------------------------------------------------------
# set_member_avatar — emoji mode
# ---------------------------------------------------------------------------


async def test_set_member_avatar_emoji_updates_member(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Emoji avatar is saved and lucarne_family_member_updated event fires."""
    _entry, store = await _setup(hass, tmp_path)

    fired: list[dict] = []
    hass.bus.async_listen("lucarne_family_member_updated", lambda e: fired.append(e.data))

    await hass.services.async_call(
        DOMAIN,
        "set_member_avatar",
        {"member": "anna", "avatar": "🧒"},
        blocking=True,
    )

    members = store.get_members()
    anna = next(m for m in members if m.slug == "anna")
    assert anna.avatar == "🧒"
    assert len(fired) == 1
    assert fired[0]["member"] == "anna"
    assert fired[0]["field"] == "avatar"


async def test_set_member_avatar_path_updates_member(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A /local/lucarne/avatars/ path is accepted."""
    _entry, store = await _setup(hass, tmp_path)

    await hass.services.async_call(
        DOMAIN,
        "set_member_avatar",
        {"member": "anna", "avatar": "/local/lucarne/avatars/anna.png"},
        blocking=True,
    )

    members = store.get_members()
    anna = next(m for m in members if m.slug == "anna")
    assert anna.avatar == "/local/lucarne/avatars/anna.png"


async def test_set_member_avatar_unknown_member_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Unknown member slug raises ServiceValidationError."""
    await _setup(hass, tmp_path)

    with pytest.raises(ServiceValidationError, match="Unknown member"):
        await hass.services.async_call(
            DOMAIN,
            "set_member_avatar",
            {"member": "nobody", "avatar": "🎉"},
            blocking=True,
        )


async def test_set_member_avatar_arbitrary_url_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """An arbitrary URL is rejected."""
    await _setup(hass, tmp_path)

    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN,
            "set_member_avatar",
            {"member": "anna", "avatar": "https://evil.com/img.png"},
            blocking=True,
        )


async def test_set_member_avatar_path_traversal_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Path traversal in avatar path is rejected."""
    await _setup(hass, tmp_path)

    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN,
            "set_member_avatar",
            {"member": "anna", "avatar": "/local/lucarne/avatars/../../../etc/passwd"},
            blocking=True,
        )


async def test_set_member_avatar_empty_string_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Empty avatar string is rejected."""
    await _setup(hass, tmp_path)

    with pytest.raises(vol.Invalid):
        await hass.services.async_call(
            DOMAIN,
            "set_member_avatar",
            {"member": "anna", "avatar": ""},
            blocking=True,
        )


async def test_set_member_avatar_ascii_text_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Plain ASCII text is rejected — avatar must be emoji or /local/ path."""
    await _setup(hass, tmp_path)

    for bad_value in ("hello", "---", "<script>", "abc 123", "!!!"):
        with pytest.raises(vol.Invalid, match=r"(?i)avatar"):
            await hass.services.async_call(
                DOMAIN,
                "set_member_avatar",
                {"member": "anna", "avatar": bad_value},
                blocking=True,
            )


async def test_set_member_avatar_invisible_chars_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Bare ZWJ / VS-16 / keycap combiner are rejected (invisible-only strings)."""
    await _setup(hass, tmp_path)

    for bad_value in ("‍", "️", "⃣"):
        with pytest.raises(vol.Invalid, match=r"(?i)avatar"):
            await hass.services.async_call(
                DOMAIN,
                "set_member_avatar",
                {"member": "anna", "avatar": bad_value},
                blocking=True,
            )


async def test_set_member_avatar_multi_emoji_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Multiple concatenated unrelated emoji are rejected (exactly one emoji expected)."""
    await _setup(hass, tmp_path)

    for bad_value in ("🧒🧒", "⭐🌟", "🎯🎨🎈"):
        with pytest.raises(vol.Invalid, match=r"(?i)avatar"):
            await hass.services.async_call(
                DOMAIN,
                "set_member_avatar",
                {"member": "anna", "avatar": bad_value},
                blocking=True,
            )


async def test_set_member_avatar_compound_emoji_accepted(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """ZWJ-compound emoji (family, etc.) are a single grapheme and accepted."""
    _entry, store = await _setup(hass, tmp_path)

    compound = "👨‍👩‍👧‍👦"  # family: man-woman-girl-boy
    await hass.services.async_call(
        DOMAIN,
        "set_member_avatar",
        {"member": "anna", "avatar": compound},
        blocking=True,
    )

    members = store.get_members()
    anna = next(m for m in members if m.slug == "anna")
    assert anna.avatar == compound
