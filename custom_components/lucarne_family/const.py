"""Constants for the Lucarne Family integration."""
from __future__ import annotations

DOMAIN = "lucarne_family"
STORAGE_VERSION = 1

# Frontend bundle served + auto-registered by the integration (see __init__.async_setup).
FRONTEND_URL = "/lucarne_family_frontend/ha-lucarne.js"

# Pastel theme bundled with the integration and auto-registered in async_setup.
# THEME_NAME must match the top-level key inside THEME_FILE.
THEME_FILE = "themes/lucarne.yaml"
THEME_NAME = "Lucarne"

DEFAULT_RESET_TIME = "04:00"
DEFAULT_STREAK_CHECK_TIME = "21:00"

# Shared household list (the synthetic "household" member). Single source of
# truth for both task_service.py and reset_logic.py.
HOUSEHOLD_SLUG = "household"
HOUSEHOLD_ENTITY_ID = "todo.lucarne_household"

# Config entry keys
CONF_FAMILY_NAME = "family_name"
CONF_MEMBERS = "members"
CONF_RESET_TIME = "reset_time"
CONF_STREAK_CHECK_TIME = "streak_check_time"
CONF_ROUND_TRIP = "round_trip"
CONF_ROUND_TRIP_ENABLED = "enabled"
CONF_ROUND_TRIP_WEBHOOK_URL = "webhook_url"
CONF_ROUND_TRIP_SECRET = "secret"
CONF_ROUND_TRIP_DEVICE_NAME = "device_name"
CONF_CUSTOM_PRESETS = "custom_presets"

# Preset slugs
PRESET_SCHOOL_AGE = "school-age"
PRESET_TODDLER = "toddler"
PRESET_ADULT_NONE = "adult-none"
PRESET_CUSTOM = "custom"

# Avatar constraints
AVATAR_MAX_BYTES = 2 * 1024 * 1024
AVATAR_MAX_PIXELS = 4096 * 4096
AVATAR_ALLOWED_MIME: frozenset[str] = frozenset({"image/png", "image/jpeg", "image/webp"})

# Round-trip event names
EVENT_APPLE_WRITEBACK_REQUESTED = "lucarne_family_apple_writeback_requested"
