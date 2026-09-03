"""Tests for const.py."""
from __future__ import annotations

from custom_components.lucarne_family.const import (
    AVATAR_ALLOWED_MIME,
    AVATAR_MAX_BYTES,
    AVATAR_MAX_PIXELS,
    BRIDGE_PROTOCOL_VERSION,
    BRIDGE_SYNC_INTERVAL,
    CONF_APPLE_BRIDGE,
    CONF_FAMILY_NAME,
    CONF_HOUSEHOLD_LIST,
    CONF_MEMBERS,
    CONF_RESET_TIME,
    CONF_STREAK_CHECK_TIME,
    CONF_WEBHOOK_ID,
    DEFAULT_HOUSEHOLD_LIST,
    DEFAULT_RESET_TIME,
    DEFAULT_STREAK_CHECK_TIME,
    DOMAIN,
    ISSUE_APPLE_LIST_MISSING,
    PRESET_ADULT_NONE,
    PRESET_CUSTOM,
    PRESET_SCHOOL_AGE,
    PRESET_TODDLER,
    STORAGE_VERSION,
)


def test_domain() -> None:
    assert DOMAIN == "lucarne_family"


def test_storage_version() -> None:
    assert STORAGE_VERSION == 1


def test_default_times() -> None:
    assert DEFAULT_RESET_TIME == "04:00"
    assert DEFAULT_STREAK_CHECK_TIME == "21:00"


def test_conf_keys_exist() -> None:
    assert CONF_FAMILY_NAME == "family_name"
    assert CONF_MEMBERS == "members"
    assert CONF_RESET_TIME == "reset_time"
    assert CONF_STREAK_CHECK_TIME == "streak_check_time"


def test_preset_slugs() -> None:
    assert PRESET_SCHOOL_AGE == "school-age"
    assert PRESET_TODDLER == "toddler"
    assert PRESET_ADULT_NONE == "adult-none"
    assert PRESET_CUSTOM == "custom"


def test_avatar_limits() -> None:
    assert AVATAR_MAX_BYTES == 2 * 1024 * 1024
    assert AVATAR_MAX_PIXELS == 4096 * 4096
    assert "image/png" in AVATAR_ALLOWED_MIME
    assert "image/jpeg" in AVATAR_ALLOWED_MIME
    assert "image/webp" in AVATAR_ALLOWED_MIME


def test_apple_bridge_keys() -> None:
    assert CONF_WEBHOOK_ID == "webhook_id"
    assert CONF_APPLE_BRIDGE == "apple_bridge"
    assert CONF_HOUSEHOLD_LIST == "household_list"
    assert DEFAULT_HOUSEHOLD_LIST == "Family"
    assert BRIDGE_PROTOCOL_VERSION == 1
    assert BRIDGE_SYNC_INTERVAL == 300
    assert ISSUE_APPLE_LIST_MISSING == "apple_list_missing"
