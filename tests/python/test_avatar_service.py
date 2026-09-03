"""Tests for avatar_service.py (Sub-Phase E)."""
from __future__ import annotations

import base64
import io
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import AVATAR_MAX_BYTES, DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


def _make_member(slug: str = "anna") -> Member:
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


def _png_bytes(width: int = 1, height: int = 1) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(255, 0, 0)).save(buf, format="PNG")
    return buf.getvalue()


def _jpeg_bytes(width: int = 1, height: int = 1) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(0, 255, 0)).save(buf, format="JPEG")
    return buf.getvalue()


def _webp_bytes(width: int = 1, height: int = 1) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(0, 0, 255)).save(buf, format="WEBP")
    return buf.getvalue()


async def _setup(
    hass: HomeAssistant,
    tmp_path: Path,
    slug: str = "anna",
) -> tuple[MockConfigEntry, LucarneFamilyStore, Member]:
    member = _make_member(slug)
    entry = _make_entry(hass, [member.to_dict()])
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    from custom_components.lucarne_family.avatar_service import async_setup_avatar_service

    await async_setup_avatar_service(hass, entry.entry_id)
    return entry, store, member


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_upload_avatar_png(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Happy path: PNG upload writes file and updates member.avatar."""
    _entry, store, _member = await _setup(hass, tmp_path)

    raw = _png_bytes()
    b64 = base64.b64encode(raw).decode()

    events: list[Any] = []
    hass.bus.async_listen("lucarne_family_avatar_uploaded", lambda e: events.append(e))

    await hass.services.async_call(
        DOMAIN,
        "upload_avatar",
        {"member": "anna", "image_data": b64, "mime_type": "image/png"},
        blocking=True,
    )
    await hass.async_block_till_done()

    dest = Path(hass.config.config_dir) / "www" / "lucarne" / "avatars" / "anna.png"
    assert dest.exists()
    assert dest.read_bytes() == raw

    members = store.get_members()
    anna = next(m for m in members if m.slug == "anna")
    # `?v=<hash>` cache buster is appended; assert the path prefix.
    assert anna.avatar is not None
    assert anna.avatar.split("?", 1)[0] == "/local/lucarne/avatars/anna.png"
    assert "?v=" in anna.avatar

    assert len(events) == 1
    assert events[0].data["member"] == "anna"


async def test_upload_avatar_jpeg(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Happy path: JPEG upload writes file and updates member.avatar."""
    _entry, store, _member = await _setup(hass, tmp_path)

    raw = _jpeg_bytes()
    b64 = base64.b64encode(raw).decode()

    await hass.services.async_call(
        DOMAIN,
        "upload_avatar",
        {"member": "anna", "image_data": b64, "mime_type": "image/jpeg"},
        blocking=True,
    )

    dest = Path(hass.config.config_dir) / "www" / "lucarne" / "avatars" / "anna.jpg"
    assert dest.exists()
    anna = next(m for m in store.get_members() if m.slug == "anna")
    assert anna.avatar is not None
    assert anna.avatar.split("?", 1)[0] == "/local/lucarne/avatars/anna.jpg"
    assert "?v=" in anna.avatar


async def test_upload_avatar_webp(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Happy path: WebP upload writes file and updates member.avatar."""
    _entry, store, _member = await _setup(hass, tmp_path)

    raw = _webp_bytes()
    b64 = base64.b64encode(raw).decode()

    await hass.services.async_call(
        DOMAIN,
        "upload_avatar",
        {"member": "anna", "image_data": b64, "mime_type": "image/webp"},
        blocking=True,
    )

    dest = Path(hass.config.config_dir) / "www" / "lucarne" / "avatars" / "anna.webp"
    assert dest.exists()
    anna = next(m for m in store.get_members() if m.slug == "anna")
    assert anna.avatar is not None
    assert anna.avatar.split("?", 1)[0] == "/local/lucarne/avatars/anna.webp"
    assert "?v=" in anna.avatar


async def test_upload_avatar_wrong_mime_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """PNG bytes declared as JPEG are rejected via magic-byte check."""
    await _setup(hass, tmp_path)

    raw = _png_bytes()
    b64 = base64.b64encode(raw).decode()

    with pytest.raises(ServiceValidationError, match="does not match detected format"):
        await hass.services.async_call(
            DOMAIN,
            "upload_avatar",
            {"member": "anna", "image_data": b64, "mime_type": "image/jpeg"},
            blocking=True,
        )


async def test_upload_avatar_oversized_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Images larger than AVATAR_MAX_BYTES are rejected."""
    await _setup(hass, tmp_path)

    raw = b"\x89PNG\r\n\x1a\n" + b"\x00" * (AVATAR_MAX_BYTES + 1)
    b64 = base64.b64encode(raw).decode()

    with pytest.raises(ServiceValidationError, match="exceeds maximum"):
        await hass.services.async_call(
            DOMAIN,
            "upload_avatar",
            {"member": "anna", "image_data": b64, "mime_type": "image/png"},
            blocking=True,
        )


async def test_upload_avatar_overdimensioned_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Images whose pixel count exceeds AVATAR_MAX_PIXELS are rejected."""
    await _setup(hass, tmp_path)

    # 4097 x 4097 = 16,785,409 > AVATAR_MAX_PIXELS (4096 x 4096 = 16,777,216)
    raw = _png_bytes(4097, 4097)
    b64 = base64.b64encode(raw).decode()

    with pytest.raises(ServiceValidationError, match="exceed the maximum"):
        await hass.services.async_call(
            DOMAIN,
            "upload_avatar",
            {"member": "anna", "image_data": b64, "mime_type": "image/png"},
            blocking=True,
        )


async def test_upload_avatar_unknown_member_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Uploading for an unknown member slug raises ServiceValidationError."""
    await _setup(hass, tmp_path)

    raw = _png_bytes()
    b64 = base64.b64encode(raw).decode()

    with pytest.raises(ServiceValidationError, match="Unknown member"):
        await hass.services.async_call(
            DOMAIN,
            "upload_avatar",
            {"member": "nobody", "image_data": b64, "mime_type": "image/png"},
            blocking=True,
        )


async def test_upload_avatar_truncated_png_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A mid-IDAT-truncated PNG is rejected cleanly (img.load() forces full decode)."""
    await _setup(hass, tmp_path)

    full = _png_bytes(64, 64)
    truncated = full[: len(full) // 2]  # cut in the middle of pixel data
    b64 = base64.b64encode(truncated).decode()

    with pytest.raises(ServiceValidationError, match="could not be decoded"):
        await hass.services.async_call(
            DOMAIN,
            "upload_avatar",
            {"member": "anna", "image_data": b64, "mime_type": "image/png"},
            blocking=True,
        )


async def test_upload_avatar_invalid_base64_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Invalid base64 data raises ServiceValidationError."""
    await _setup(hass, tmp_path)

    with pytest.raises(ServiceValidationError, match="Invalid base64"):
        await hass.services.async_call(
            DOMAIN,
            "upload_avatar",
            {"member": "anna", "image_data": "not-valid-base64!!!", "mime_type": "image/png"},
            blocking=True,
        )


async def test_upload_avatar_replaces_previous_extension(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Uploading WebP after a PNG removes the old PNG file."""
    _entry, _store, _member = await _setup(hass, tmp_path)
    avatar_dir = Path(hass.config.config_dir) / "www" / "lucarne" / "avatars"

    await hass.services.async_call(
        DOMAIN,
        "upload_avatar",
        {
            "member": "anna",
            "image_data": base64.b64encode(_png_bytes()).decode(),
            "mime_type": "image/png",
        },
        blocking=True,
    )
    assert (avatar_dir / "anna.png").exists()

    await hass.services.async_call(
        DOMAIN,
        "upload_avatar",
        {
            "member": "anna",
            "image_data": base64.b64encode(_webp_bytes()).decode(),
            "mime_type": "image/webp",
        },
        blocking=True,
    )
    assert (avatar_dir / "anna.webp").exists()
    assert not (avatar_dir / "anna.png").exists()


async def test_upload_avatar_unsafe_slug_rejected(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A member slug with path traversal characters is rejected before file I/O."""
    _entry, store, _member = await _setup(hass, tmp_path)

    # Seed a member with an unsafe slug directly into the store so the lookup
    # passes but the path-safety check fires.
    from datetime import UTC, datetime

    from custom_components.lucarne_family.models import Member

    unsafe_member = Member(
        slug="../evil",
        name="Evil",
        color="#000000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="adult-none",
        todo_entity_id="todo.evil",
        streak_counter_id="counter.evil_streak",
    )
    await store.async_save_members([*store.get_members(), unsafe_member])

    raw = _png_bytes()
    b64 = base64.b64encode(raw).decode()

    with pytest.raises(ServiceValidationError, match="not safe for filenames"):
        await hass.services.async_call(
            DOMAIN,
            "upload_avatar",
            {"member": "../evil", "image_data": b64, "mime_type": "image/png"},
            blocking=True,
        )
