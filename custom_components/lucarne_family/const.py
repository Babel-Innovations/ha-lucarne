"""Constants for the Lucarne Family integration."""
from __future__ import annotations

from homeassistant.const import CONF_WEBHOOK_ID as HA_CONF_WEBHOOK_ID

DOMAIN = "lucarne_family"
STORAGE_VERSION = 1

# Frontend bundle. SERVED as a static path but deliberately NOT registered as a
# frontend module — see the add_extra_js_url block in __init__.async_setup. The loader
# below is the only thing that imports it.
FRONTEND_URL = "/lucarne_family_frontend/ha-lucarne.js"

# The only module registered with the frontend. It waits for Home Assistant's legacy
# (es5) build to finish replacing window.customElements — which discards every element
# defined before it — and only then imports FRONTEND_URL, with a .catch attached that
# HA's own import in index.html does not have. Both halves are the fix for issue #101;
# see the file header in src/loader/boot.ts. Must live in the same
# served directory as FRONTEND_URL: it resolves the bundle relative to its own URL.
LOADER_URL = "/lucarne_family_frontend/ha-lucarne-loader.js"

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
CONF_CUSTOM_PRESETS = "custom_presets"
# Apple Reminders bridge. The webhook id is the bridge's credential: a 64-hex
# token minted once per entry by webhook.async_generate_id(). Same key HA's
# own integrations use for theirs.
CONF_WEBHOOK_ID = HA_CONF_WEBHOOK_ID
CONF_APPLE_BRIDGE = "apple_bridge"
CONF_HOUSEHOLD_LIST = "household_list"
DEFAULT_HOUSEHOLD_LIST = "Family"
BRIDGE_PROTOCOL_VERSION = 1
BRIDGE_SYNC_INTERVAL = 300
ISSUE_APPLE_LIST_MISSING = "apple_list_missing"

# Preset slugs
PRESET_SCHOOL_AGE = "school-age"
PRESET_TODDLER = "toddler"
PRESET_ADULT_NONE = "adult-none"
PRESET_CUSTOM = "custom"

# Avatar constraints
AVATAR_MAX_BYTES = 2 * 1024 * 1024
AVATAR_MAX_PIXELS = 4096 * 4096
AVATAR_ALLOWED_MIME: frozenset[str] = frozenset({"image/png", "image/jpeg", "image/webp"})

# Rotating-task event names
EVENT_ROTATION_ADVANCED = "lucarne_family_rotation_advanced"
