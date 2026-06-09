"""Config flow and options flow for the Lucarne Family integration."""
from __future__ import annotations

import logging
import re
import secrets
from typing import Any
from urllib.parse import urlparse

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from . import seed_preset_routines
from .const import (
    CONF_CUSTOM_PRESETS,
    CONF_FAMILY_NAME,
    CONF_MEMBERS,
    CONF_RESET_TIME,
    CONF_ROUND_TRIP,
    CONF_ROUND_TRIP_DEVICE_NAME,
    CONF_ROUND_TRIP_ENABLED,
    CONF_ROUND_TRIP_SECRET,
    CONF_ROUND_TRIP_WEBHOOK_URL,
    CONF_STREAK_CHECK_TIME,
    DEFAULT_RESET_TIME,
    DEFAULT_STREAK_CHECK_TIME,
    DOMAIN,
    PRESET_ADULT_NONE,
    PRESET_SCHOOL_AGE,
)
from .models import Member, RoutinePreset
from .presets import BUILTIN_PRESETS
from .recurrence import is_valid_rrule

_LOGGER = logging.getLogger(__name__)
_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def _make_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def _canonical_slug(slug: str) -> str:
    """Normalise hyphens/underscores so the slug-conflict check treats
    `school-age` (built-in style) and `school_age` (`_make_slug` output)
    as the same identifier."""
    return slug.replace("-", "_")


_BUILTIN_CANONICAL_SLUGS: frozenset[str] = frozenset(
    _canonical_slug(s) for s in BUILTIN_PRESETS
)


def _validate_name(name: str) -> str | None:
    """Return error key or None."""
    if not name or not name.strip():
        return "name_empty"
    if len(name) > 50:
        return "name_too_long"
    return None


def _validate_color(color: str) -> str | None:
    if not _HEX_COLOR_RE.match(color):
        return "invalid_color"
    return None


def _normalize_color(color: Any) -> str:
    """Convert a color submission to lower-case `#rrggbb`.

    ColorRGBSelector hands us `[r, g, b]` (ints 0-255). Existing callers
    (and most tests) still pass hex strings — accept both. Anything else
    (or out-of-range ints) returns `""` so `_validate_color` produces the
    user-facing "invalid_color" error instead of silently clamping.
    """
    if isinstance(color, (list, tuple)) and len(color) == 3:
        try:
            channels = [int(c) for c in color]
        except (TypeError, ValueError):
            return ""
        if not all(0 <= c <= 255 for c in channels):
            return ""
        return "#{:02x}{:02x}{:02x}".format(*channels)
    if isinstance(color, str):
        return color.strip().lower()
    return ""


def _hex_to_rgb(hex_color: str) -> list[int]:
    """Convert `#rrggbb` to `[r, g, b]`; falls back to `[74, 144, 226]`."""
    if not _HEX_COLOR_RE.match(hex_color or ""):
        return [74, 144, 226]
    return [int(hex_color[1:3], 16), int(hex_color[3:5], 16), int(hex_color[5:7], 16)]



def _default_entry_data(family_name: str) -> dict[str, Any]:
    return {
        CONF_FAMILY_NAME: family_name,
        CONF_MEMBERS: [],
        CONF_RESET_TIME: DEFAULT_RESET_TIME,
        CONF_STREAK_CHECK_TIME: DEFAULT_STREAK_CHECK_TIME,
        CONF_ROUND_TRIP: {
            CONF_ROUND_TRIP_ENABLED: False,
            CONF_ROUND_TRIP_WEBHOOK_URL: "",
            CONF_ROUND_TRIP_SECRET: "",
            CONF_ROUND_TRIP_DEVICE_NAME: "Sync device",
        },
        CONF_CUSTOM_PRESETS: [],
    }


class LucarneFamilyConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the initial config flow (runs once at install)."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            family_name = user_input.get(CONF_FAMILY_NAME, "").strip()
            err = _validate_name(family_name)
            if err:
                errors[CONF_FAMILY_NAME] = err
            elif self._async_current_entries():
                errors["base"] = "single_family_only"
            else:
                return self.async_create_entry(
                    title=family_name,
                    data=_default_entry_data(family_name),
                )

        schema = vol.Schema(
            {vol.Required(CONF_FAMILY_NAME, default="Family"): str}
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> LucarneFamilyOptionsFlow:
        return LucarneFamilyOptionsFlow(config_entry)


def _validate_url(url: str) -> bool:
    """Return True if url has http/https scheme and a non-empty host."""
    if not url:
        return False
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


class LucarneFamilyOptionsFlow(config_entries.OptionsFlow):
    """Handle ongoing configuration via the Configure button."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry
        self._selected_member_slug: str | None = None
        self._pending_rename: dict[str, Any] | None = None
        self._pending_preset_name: str | None = None
        self._pending_preset_routines: list[dict[str, Any]] = []
        # When set, `async_step_add_preset_routine` appends each submitted
        # routine to the existing custom preset with this slug instead of
        # building up a brand-new preset.
        self._editing_preset_slug: str | None = None

    def _get_members(self) -> list[Member]:
        raw: list[dict[str, Any]] = self._entry.data.get(CONF_MEMBERS, [])
        return [Member.from_dict(m) for m in raw]

    async def _save_members(self, members: list[Member]) -> None:
        from .const import DOMAIN
        from .store import LucarneFamilyStore

        store: LucarneFamilyStore = self.hass.data[DOMAIN][self._entry.entry_id]["store"]
        await store.async_save_members(members)

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        return self.async_show_menu(
            step_id="init",
            menu_options=["manage_members", "edit_schedule", "edit_round_trip", "edit_templates"],
        )

    async def async_step_back_to_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Back-navigation hook routed from sub-menus to the root menu.

        Exists as a real step so `async_show_menu` can list `back_to_init`
        as a menu option — HA dispatches the click to a step coroutine by
        name. Returning to `init` (instead of `async_create_entry`) keeps
        the dialog open so the user can immediately pick a sibling option
        without reopening from the gear icon.
        """
        return await self.async_step_init()

    async def async_step_edit_round_trip(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}
        current_rt: dict[str, Any] = self._entry.data.get(CONF_ROUND_TRIP, {})

        if user_input is not None:
            enabled = user_input.get(CONF_ROUND_TRIP_ENABLED, False)
            webhook_url = (user_input.get(CONF_ROUND_TRIP_WEBHOOK_URL) or "").strip()
            secret = (user_input.get(CONF_ROUND_TRIP_SECRET) or "").strip()
            device_name = (user_input.get(CONF_ROUND_TRIP_DEVICE_NAME) or "Sync device").strip()

            # Rotate the secret in place before validation so a generated value
            # both passes the >=32-char check and survives alongside the user's
            # other in-flight edits.
            if user_input.get("generate_secret"):
                secret = secrets.token_hex(16)

            if enabled:
                if not _validate_url(webhook_url):
                    errors[CONF_ROUND_TRIP_WEBHOOK_URL] = "invalid_url"
                if len(secret) < 32:
                    errors[CONF_ROUND_TRIP_SECRET] = "secret_too_short"

            if not errors:
                new_data = {
                    **self._entry.data,
                    CONF_ROUND_TRIP: {
                        CONF_ROUND_TRIP_ENABLED: enabled,
                        CONF_ROUND_TRIP_WEBHOOK_URL: webhook_url,
                        CONF_ROUND_TRIP_SECRET: secret,
                        CONF_ROUND_TRIP_DEVICE_NAME: device_name,
                    },
                }
                self.hass.config_entries.async_update_entry(self._entry, data=new_data)
                return await self.async_step_init()

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_ROUND_TRIP_ENABLED,
                    default=current_rt.get(CONF_ROUND_TRIP_ENABLED, False),
                ): bool,
                vol.Optional(
                    CONF_ROUND_TRIP_WEBHOOK_URL,
                    default=current_rt.get(CONF_ROUND_TRIP_WEBHOOK_URL, ""),
                ): str,
                vol.Optional(
                    CONF_ROUND_TRIP_SECRET,
                    default=current_rt.get(CONF_ROUND_TRIP_SECRET, ""),
                ): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
                ),
                vol.Optional(
                    CONF_ROUND_TRIP_DEVICE_NAME,
                    default=current_rt.get(CONF_ROUND_TRIP_DEVICE_NAME, "Sync device"),
                ): str,
                vol.Optional("generate_secret", default=False): bool,
            }
        )
        return self.async_show_form(
            step_id="edit_round_trip", data_schema=schema, errors=errors
        )

    async def async_step_edit_templates(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        custom_presets = self._entry.data.get(CONF_CUSTOM_PRESETS, [])
        menu_options: list[str] = ["add_custom_preset"]
        if custom_presets:
            menu_options.append("manage_existing_preset")
        menu_options.append("view_builtin_presets")
        menu_options.append("back_to_init")
        return self.async_show_menu(step_id="edit_templates", menu_options=menu_options)

    async def async_step_view_builtin_presets(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Read-only listing of the built-in presets and their routines.

        Empty routines render as a typographic em-dash placeholder (not user
        copy that needs translating). BUILTIN_PRESETS is hard-coded and
        non-empty, so there is no no-presets fallback.
        """
        if user_input is not None:
            return await self.async_step_edit_templates()

        none_label = "—"
        lines: list[str] = []
        for preset in BUILTIN_PRESETS.values():
            if preset.routines:
                routines_text = ", ".join(
                    f"{r.icon} {r.summary}".strip() for r in preset.routines
                )
            else:
                routines_text = none_label
            lines.append(f"**{preset.display_name}**: {routines_text}")
        description = "\n\n".join(lines)

        return self.async_show_form(
            step_id="view_builtin_presets",
            data_schema=vol.Schema({}),
            description_placeholders={"presets": description},
        )

    async def async_step_manage_existing_preset(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Pick which custom preset to edit/delete, then dispatch to edit_custom_preset."""
        custom_presets = self._entry.data.get(CONF_CUSTOM_PRESETS, [])
        if not custom_presets:
            # Bounced here via stale navigation — return to the menu.
            return await self.async_step_edit_templates()

        if user_input is not None:
            slug = user_input.get("preset_slug", "")
            if any(cp["slug"] == slug for cp in custom_presets):
                self._editing_preset_slug = slug
                return await self.async_step_edit_custom_preset()

        options = {cp["slug"]: cp["display_name"] for cp in custom_presets}
        schema = vol.Schema({vol.Required("preset_slug"): vol.In(options)})
        return self.async_show_form(
            step_id="manage_existing_preset", data_schema=schema
        )

    def _editing_preset(self) -> dict[str, Any] | None:
        """Return the preset dict currently being edited, or None if gone."""
        slug = self._editing_preset_slug
        if slug is None:
            return None
        custom_presets = self._entry.data.get(CONF_CUSTOM_PRESETS, [])
        return next((cp for cp in custom_presets if cp["slug"] == slug), None)

    async def async_step_edit_custom_preset(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Menu for managing a single custom preset.

        Modelled as `async_show_menu` (not a form selector) so each option's
        label is loaded from translations rather than hard-coded English in
        a `vol.In` mapping. Each option dispatches to a dedicated step.

        Slugs are immutable — `rename_custom_preset` only touches
        `display_name` so existing `member.preset` references keep
        resolving.
        """
        target = self._editing_preset()
        if target is None:
            self._editing_preset_slug = None
            return await self.async_step_edit_templates()

        routine_lines: list[str] = []
        for r in target["routines"]:
            icon = r.get("icon", "")
            routine_lines.append(
                f"- {icon} {r['summary']} ({r['recurrence']})".strip()
            )
        # Empty-state hyphen is a typographic placeholder, not user copy.
        routines_text = "\n".join(routine_lines) if routine_lines else "—"

        return self.async_show_menu(
            step_id="edit_custom_preset",
            menu_options=[
                "rename_custom_preset",
                "add_routine_to_preset",
                "delete_preset_confirm",
                "done_editing_preset",
            ],
            description_placeholders={
                "preset_name": target["display_name"],
                "routines": routines_text,
            },
        )

    async def async_step_rename_custom_preset(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Rename the preset under edit (display_name only — slug stays)."""
        target = self._editing_preset()
        if target is None:
            self._editing_preset_slug = None
            return await self.async_step_edit_templates()

        errors: dict[str, str] = {}

        if user_input is not None:
            new_name = (user_input.get("display_name") or "").strip()
            if not new_name:
                errors["display_name"] = "name_empty"
            else:
                err = _validate_name(new_name)
                if err:
                    errors["display_name"] = err
                else:
                    new_slug = _make_slug(new_name)
                    if not new_slug:
                        errors["display_name"] = "empty_slug"
                    elif new_name != target["display_name"]:
                        # Built-in slugs use hyphens; `_make_slug` produces
                        # underscores. Compare canonical forms so
                        # "School age" still clashes with `school-age`.
                        builtin_collision = (
                            _canonical_slug(new_slug) in _BUILTIN_CANONICAL_SLUGS
                            and new_slug != target["slug"]
                        )
                        # Compare against stored sibling slugs (which are
                        # immutable after their own rename) — not recomputed
                        # from display_name, which may have drifted.
                        custom_presets = self._entry.data.get(
                            CONF_CUSTOM_PRESETS, []
                        )
                        custom_collision = any(
                            cp["slug"] != target["slug"]
                            and cp["slug"] == new_slug
                            for cp in custom_presets
                        )
                        if builtin_collision or custom_collision:
                            errors["display_name"] = "slug_conflict"

            if not errors and new_name != target["display_name"]:
                custom_presets = list(
                    self._entry.data.get(CONF_CUSTOM_PRESETS, [])
                )
                for i, cp in enumerate(custom_presets):
                    if cp["slug"] == target["slug"]:
                        custom_presets[i] = {**cp, "display_name": new_name}
                        break
                new_data = {
                    **self._entry.data,
                    CONF_CUSTOM_PRESETS: custom_presets,
                }
                self.hass.config_entries.async_update_entry(
                    self._entry, data=new_data
                )

            if not errors:
                return await self.async_step_edit_custom_preset()

        schema = vol.Schema(
            {
                vol.Required(
                    "display_name", default=target["display_name"]
                ): str,
            }
        )
        return self.async_show_form(
            step_id="rename_custom_preset",
            data_schema=schema,
            errors=errors,
            description_placeholders={"preset_name": target["display_name"]},
        )

    async def async_step_add_routine_to_preset(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Dispatch into `add_preset_routine` with edit-mode state set."""
        if self._editing_preset() is None:
            self._editing_preset_slug = None
            return await self.async_step_edit_templates()
        self._pending_preset_routines = []
        # Signal to `async_step_add_preset_routine` that the routine
        # should append to the existing preset, not create a new one.
        self._pending_preset_name = None
        return await self.async_step_add_preset_routine()

    async def async_step_done_editing_preset(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Exit the per-preset edit menu and return to the templates menu."""
        self._editing_preset_slug = None
        return await self.async_step_edit_templates()

    async def async_step_delete_preset_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Confirm deletion. Removes the preset and migrates affected members to adult-none."""
        custom_presets = list(self._entry.data.get(CONF_CUSTOM_PRESETS, []))
        slug = self._editing_preset_slug
        target = next((cp for cp in custom_presets if cp["slug"] == slug), None)

        if slug is None or target is None:
            self._editing_preset_slug = None
            return await self.async_step_edit_templates()

        if user_input is not None:
            if not user_input.get("confirm"):
                # User declined deletion — return to the per-preset menu
                # so they see the preset still intact, rather than being
                # bounced two levels up to the templates list.
                return await self.async_step_edit_custom_preset()

            members = self._get_members()
            affected = [m for m in members if m.preset == slug]

            remaining_presets = [cp for cp in custom_presets if cp["slug"] != slug]
            new_data = {**self._entry.data, CONF_CUSTOM_PRESETS: remaining_presets}
            self.hass.config_entries.async_update_entry(self._entry, data=new_data)

            if affected:
                migrated = [
                    Member(
                        slug=m.slug,
                        name=m.name,
                        color=m.color,
                        avatar=m.avatar,
                        created_at=m.created_at,
                        preset=PRESET_ADULT_NONE if m.preset == slug else m.preset,
                        todo_entity_id=m.todo_entity_id,
                        streak_counter_id=m.streak_counter_id,
                    )
                    for m in members
                ]
                await self._save_members(migrated)

            self._editing_preset_slug = None
            return await self.async_step_edit_templates()

        members = self._get_members()
        affected_names = [m.name for m in members if m.preset == slug]
        fallback_preset_label = BUILTIN_PRESETS[PRESET_ADULT_NONE].display_name
        if affected_names:
            impact = (
                f"{len(affected_names)} member(s) currently use this preset "
                f"({', '.join(affected_names)}). Their preset will be reset "
                f"to '{fallback_preset_label}'. Already-seeded routine items "
                "are not removed."
            )
        else:
            impact = "No members currently reference this preset."

        schema = vol.Schema({vol.Required("confirm", default=False): bool})
        return self.async_show_form(
            step_id="delete_preset_confirm",
            data_schema=schema,
            description_placeholders={
                "preset_name": target["display_name"],
                "impact": impact,
            },
        )

    async def async_step_add_custom_preset(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            display_name = (user_input.get("display_name") or "").strip()
            if not display_name:
                errors["display_name"] = "name_empty"
            else:
                candidate_slug = _make_slug(display_name)
                existing_custom_slugs = {
                    cp["slug"] for cp in self._entry.data.get(CONF_CUSTOM_PRESETS, [])
                }
                if not candidate_slug:
                    errors["display_name"] = "empty_slug"
                elif (
                    _canonical_slug(candidate_slug) in _BUILTIN_CANONICAL_SLUGS
                    or candidate_slug in existing_custom_slugs
                ):
                    errors["display_name"] = "slug_conflict"
                else:
                    self._pending_preset_name = display_name
                    self._pending_preset_routines = []
                    return await self.async_step_add_preset_routine()

        schema = vol.Schema({vol.Required("display_name"): str})
        return self.async_show_form(
            step_id="add_custom_preset", data_schema=schema, errors=errors
        )

    async def async_step_add_preset_routine(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            summary = (user_input.get("summary") or "").strip()
            icon = (user_input.get("icon") or "").strip()
            recurrence = (user_input.get("recurrence") or "FREQ=DAILY").strip()
            time_of_day = (user_input.get("time_of_day") or "anytime").strip()
            add_another = user_input.get("add_another", False)

            if not summary:
                errors["summary"] = "name_empty"
            if not is_valid_rrule(recurrence):
                errors["recurrence"] = "invalid_rrule"

            if not errors:
                self._pending_preset_routines.append(
                    {
                        "summary": summary,
                        "icon": icon,
                        "recurrence": recurrence,
                        "time_of_day": time_of_day,
                    }
                )
                if add_another:
                    return await self.async_step_add_preset_routine()

                custom_presets: list[dict[str, Any]] = list(
                    self._entry.data.get(CONF_CUSTOM_PRESETS, [])
                )

                if self._editing_preset_slug is not None:
                    # Append the just-collected routines to an existing preset.
                    target_slug = self._editing_preset_slug
                    found = False
                    for i, cp in enumerate(custom_presets):
                        if cp["slug"] == target_slug:
                            custom_presets[i] = {
                                **cp,
                                "routines": [
                                    *cp.get("routines", []),
                                    *self._pending_preset_routines,
                                ],
                            }
                            found = True
                            break
                    if not found:
                        # Preset vanished mid-flow (e.g. deleted from
                        # another window). Log and bounce to the templates
                        # menu where the user will see the preset is gone —
                        # better than silently writing a `create_entry`
                        # success result on top of stale state.
                        _LOGGER.warning(
                            "Cannot append routines: preset %r no longer exists",
                            target_slug,
                        )
                        self._pending_preset_routines = []
                        self._editing_preset_slug = None
                        return await self.async_step_edit_templates()
                else:
                    # Save a brand-new custom preset.
                    slug = _make_slug(self._pending_preset_name or "custom")
                    custom_presets.append(
                        {
                            "slug": slug,
                            "display_name": self._pending_preset_name,
                            "routines": list(self._pending_preset_routines),
                        }
                    )

                new_data = {**self._entry.data, CONF_CUSTOM_PRESETS: custom_presets}
                self.hass.config_entries.async_update_entry(self._entry, data=new_data)
                self._pending_preset_name = None
                self._pending_preset_routines = []
                # Returning to `edit_custom_preset` when appending to an
                # existing preset (vs. `edit_templates` for brand-new
                # presets) keeps the user one click away from adding
                # another routine or renaming, instead of forcing them
                # to re-pick the preset.
                if self._editing_preset_slug is not None:
                    return await self.async_step_edit_custom_preset()
                return await self.async_step_edit_templates()

        schema = vol.Schema(
            {
                vol.Required("summary"): str,
                vol.Optional("icon", default=""): str,
                vol.Optional("recurrence", default="FREQ=DAILY"): str,
                vol.Required("time_of_day", default="anytime"): vol.In(
                    {
                        "anytime": "Anytime",
                        "morning": "Morning",
                        "afternoon": "Afternoon",
                        "night": "Night",
                    }
                ),
                vol.Optional("add_another", default=False): bool,
            }
        )
        return self.async_show_form(
            step_id="add_preset_routine", data_schema=schema, errors=errors
        )

    async def async_step_manage_members(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        members = self._get_members()
        menu: list[str] = ["add_member"]
        if members:
            menu += ["edit_member", "remove_member"]
        menu.append("back_to_init")
        return self.async_show_menu(step_id="manage_members", menu_options=menu)

    async def async_step_add_member(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            name = user_input.get("name", "").strip()
            color = _normalize_color(user_input.get("color"))
            preset = user_input.get("preset", PRESET_SCHOOL_AGE)

            err = _validate_name(name)
            if err:
                errors["name"] = err
            color_err = _validate_color(color)
            if color_err:
                errors["color"] = color_err

            if not errors:
                slug = _make_slug(name)
                if not slug:
                    errors["name"] = "empty_slug"
                else:
                    existing = self._get_members()
                    if any(m.slug == slug for m in existing):
                        errors["name"] = "slug_conflict"

                    if not errors:
                        from datetime import UTC, datetime

                        from .entity_manager import async_create_member_entities
                        from .store import LucarneFamilyStore

                        new_member = Member(
                            slug=slug,
                            name=name,
                            color=color,
                            avatar=None,
                            created_at=datetime.now(UTC),
                            preset=preset,
                        )

                        # Create managed entities and record their ids
                        from homeassistant.exceptions import HomeAssistantError

                        todo_id: str = ""
                        counter_id: str = ""
                        try:
                            todo_id, counter_id = await async_create_member_entities(
                                self.hass, new_member
                            )
                        except HomeAssistantError as exc:
                            _LOGGER.warning(
                                "Failed to create entities for member %r: %s", slug, exc
                            )
                            errors["base"] = "entity_create_failed"
                        except Exception:
                            _LOGGER.exception(
                                "Unexpected error creating entities for member %r", slug
                            )
                            errors["base"] = "entity_create_failed"

                        if not errors:
                            new_member = Member(
                                slug=slug,
                                name=name,
                                color=color,
                                avatar=None,
                                created_at=new_member.created_at,
                                preset=preset,
                                todo_entity_id=todo_id,
                                streak_counter_id=counter_id,
                            )
                            await self._save_members([*existing, new_member])

                            # Seed preset routines exactly once after entity creation
                            store: LucarneFamilyStore = self.hass.data[DOMAIN][
                                self._entry.entry_id
                            ]["store"]

                            extra_presets: dict[str, RoutinePreset] = {}
                            for cp in self._entry.data.get(CONF_CUSTOM_PRESETS, []):
                                extra_presets[cp["slug"]] = RoutinePreset.from_dict(cp)

                            try:
                                await seed_preset_routines(
                                    self.hass, store, new_member, extra_presets=extra_presets
                                )
                            except Exception as exc:
                                _LOGGER.warning(
                                    "Preset seeding failed for member %r: %s; "
                                    "member is still added",
                                    slug, exc,
                                )

                            return await self.async_step_manage_members()

        preset_options = {k: v.display_name for k, v in BUILTIN_PRESETS.items()}
        for cp in self._entry.data.get(CONF_CUSTOM_PRESETS, []):
            preset_options[cp["slug"]] = cp["display_name"]
        schema = vol.Schema(
            {
                vol.Required("name"): str,
                vol.Required("color", default=_hex_to_rgb("#4a90e2")): selector.ColorRGBSelector(),
                vol.Required("preset", default=PRESET_SCHOOL_AGE): vol.In(preset_options),
            }
        )
        return self.async_show_form(step_id="add_member", data_schema=schema, errors=errors)

    async def async_step_edit_member(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}
        members = self._get_members()

        if user_input is not None:
            if self._selected_member_slug is None:
                # First submit: pick the member
                self._selected_member_slug = user_input.get("member_slug", "")
                return await self.async_step_edit_member()

            name = user_input.get("name", "").strip()
            color = _normalize_color(user_input.get("color"))
            preset = user_input.get("preset", PRESET_SCHOOL_AGE)

            err = _validate_name(name)
            if err:
                errors["name"] = err
            color_err = _validate_color(color)
            if color_err:
                errors["color"] = color_err

            target = next(
                (m for m in members if m.slug == self._selected_member_slug), None
            )
            new_slug = _make_slug(name) if name else ""
            slug_is_changing = bool(
                target is not None and new_slug and new_slug != target.slug
            )

            if not errors and slug_is_changing and target is not None and any(
                m.slug == new_slug for m in members if m.slug != target.slug
            ):
                errors["name"] = "slug_conflict"

            if not errors and slug_is_changing:
                self._pending_rename = {
                    "name": name,
                    "color": color,
                    "preset": preset,
                }
                return await self.async_step_rename_confirm()

            if not errors:
                updated = [
                    Member(
                        slug=m.slug,
                        name=name if m.slug == self._selected_member_slug else m.name,
                        color=color if m.slug == self._selected_member_slug else m.color,
                        avatar=m.avatar,
                        created_at=m.created_at,
                        preset=preset if m.slug == self._selected_member_slug else m.preset,
                        todo_entity_id=m.todo_entity_id,
                        streak_counter_id=m.streak_counter_id,
                    )
                    for m in members
                ]
                await self._save_members(updated)
                self._selected_member_slug = None
                return await self.async_step_manage_members()

        if self._selected_member_slug is None:
            # Show member picker
            member_options = {m.slug: m.name for m in members}
            schema = vol.Schema({vol.Required("member_slug"): vol.In(member_options)})
            return self.async_show_form(
                step_id="edit_member", data_schema=schema, errors=errors
            )

        target = next((m for m in members if m.slug == self._selected_member_slug), None)
        if target is None:
            self._selected_member_slug = None
            return await self.async_step_manage_members()

        preset_options = {k: v.display_name for k, v in BUILTIN_PRESETS.items()}
        for cp in self._entry.data.get(CONF_CUSTOM_PRESETS, []):
            preset_options[cp["slug"]] = cp["display_name"]
        schema = vol.Schema(
            {
                vol.Required("name", default=target.name): str,
                vol.Required(
                    "color", default=_hex_to_rgb(target.color)
                ): selector.ColorRGBSelector(),
                vol.Required("preset", default=target.preset): vol.In(preset_options),
            }
        )
        return self.async_show_form(step_id="edit_member", data_schema=schema, errors=errors)

    async def async_step_rename_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Show rename impact and ask for confirmation when a slug change is detected."""
        members = self._get_members()
        target = next(
            (m for m in members if m.slug == self._selected_member_slug), None
        )

        if target is None or self._pending_rename is None:
            self._selected_member_slug = None
            self._pending_rename = None
            return await self.async_step_manage_members()

        errors: dict[str, str] = {}

        if user_input is not None:
            if user_input.get("confirm"):
                new_name: str = self._pending_rename["name"]
                new_slug = _make_slug(new_name)

                from .entity_manager import async_rename_member_entities
                from .store import LucarneFamilyStore

                store: LucarneFamilyStore = self.hass.data[DOMAIN][
                    self._entry.entry_id
                ]["store"]

                # Step 1: SQLite migration first — if this fails, nothing in the
                # entity registry has changed yet and the user can retry cleanly.
                try:
                    await store.async_rename_member_slug(target.slug, new_slug)
                except Exception as exc:
                    _LOGGER.warning(
                        "Failed to migrate SQLite rows for member %r: %s", target.slug, exc
                    )
                    errors["base"] = "entity_rename_failed"

                new_todo_id = target.todo_entity_id or f"todo.{target.slug}"
                new_counter_id = target.streak_counter_id or f"counter.{target.slug}_streak"

                # Step 2: Entity registry rename — if this fails, roll back SQLite.
                if not errors:
                    try:
                        new_todo_id, new_counter_id = await async_rename_member_entities(
                            self.hass,
                            target.todo_entity_id or f"todo.{target.slug}",
                            new_slug,
                            target.streak_counter_id or f"counter.{target.slug}_streak",
                        )
                    except Exception as exc:
                        _LOGGER.warning(
                            "Failed to rename entities for member %r: %s", target.slug, exc
                        )
                        try:
                            await store.async_rename_member_slug(new_slug, target.slug)
                        except Exception as rollback_exc:
                            _LOGGER.error(
                                "SQLite rollback failed for member %r after entity "
                                "rename failure: %s",
                                target.slug,
                                rollback_exc,
                            )
                        errors["base"] = "entity_rename_failed"

                if not errors:
                    sel = self._selected_member_slug
                    pend = self._pending_rename
                    updated = [
                        Member(
                            slug=new_slug if m.slug == sel else m.slug,
                            name=pend["name"] if m.slug == sel else m.name,
                            color=pend["color"] if m.slug == sel else m.color,
                            avatar=m.avatar,
                            created_at=m.created_at,
                            preset=pend["preset"] if m.slug == sel else m.preset,
                            todo_entity_id=new_todo_id if m.slug == sel else m.todo_entity_id,
                            streak_counter_id=(
                                new_counter_id if m.slug == sel else m.streak_counter_id
                            ),
                        )
                        for m in members
                    ]
                    await self._save_members(updated)
                    self._selected_member_slug = None
                    self._pending_rename = None
                    return await self.async_step_manage_members()

                # Rename failed (SQLite migration or entity rename + rollback).
                # Nothing avatar-specific to clean up — avatars aren't touched
                # by the Options flow anymore.

            else:
                self._selected_member_slug = None
                self._pending_rename = None
                return await self.async_step_manage_members()

        # Compute impact for display (first entry into step).
        from .rename import async_rename_member

        impact = await async_rename_member(self.hass, target, self._pending_rename["name"])
        impact_parts: list[str] = []
        if impact.automations:
            impact_parts.append(f"Automations: {', '.join(impact.automations)}")
        if impact.scripts:
            impact_parts.append(f"Scripts: {', '.join(impact.scripts)}")
        if impact.scenes:
            impact_parts.append(f"Scenes: {', '.join(impact.scenes)}")
        if impact.dashboards:
            impact_parts.append(f"Dashboards: {len(impact.dashboards)} reference(s)")
        impact_text = "\n".join(impact_parts) if impact_parts else "No downstream references found."

        schema = vol.Schema({vol.Required("confirm", default=False): bool})
        return self.async_show_form(
            step_id="rename_confirm",
            data_schema=schema,
            errors=errors,
            description_placeholders={
                "old_name": target.name,
                "new_name": self._pending_rename["name"],
                "impact": impact_text,
            },
        )

    async def async_step_remove_member(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}
        members = self._get_members()

        if user_input is not None:
            if self._selected_member_slug is None:
                self._selected_member_slug = user_input.get("member_slug", "")
                return await self.async_step_remove_member()

            target = next(
                (m for m in members if m.slug == self._selected_member_slug), None
            )
            confirm = user_input.get("confirm_name", "").strip()
            if target is None or confirm != target.name:
                errors["confirm_name"] = "confirm_mismatch"
            else:
                # Delete entities first; only remove member record when deletion succeeds
                # so the user can retry via "remove member" if deletion fails.
                if target.todo_entity_id or target.streak_counter_id:
                    from .entity_manager import async_delete_member_entities

                    try:
                        await async_delete_member_entities(
                            self.hass,
                            target.todo_entity_id,
                            target.streak_counter_id,
                        )
                    except Exception as exc:
                        _LOGGER.warning(
                            "Failed to delete entities for member %r: %s", target.slug, exc
                        )
                        errors["base"] = "entity_delete_failed"

                if not errors:
                    removed_slug = self._selected_member_slug
                    remaining = [m for m in members if m.slug != removed_slug]
                    await self._save_members(remaining)
                    await self._sanitize_rotating_tasks_after_removal(
                        removed_slug, remaining
                    )
                    self._selected_member_slug = None
                    return await self.async_step_manage_members()

        if self._selected_member_slug is None:
            member_options = {m.slug: m.name for m in members}
            schema = vol.Schema({vol.Required("member_slug"): vol.In(member_options)})
            return self.async_show_form(
                step_id="remove_member", data_schema=schema, errors=errors
            )

        schema = vol.Schema({vol.Required("confirm_name"): str})
        return self.async_show_form(
            step_id="remove_member", data_schema=schema, errors=errors
        )

    async def _sanitize_rotating_tasks_after_removal(
        self, removed_slug: str | None, remaining: list[Member]
    ) -> None:
        """Sanitize rotating tasks when a member is removed.

        Drops the removed member from each rotating task's owner list.
        If zero owners remain, deletes the task. If the current owner was removed,
        advances current_owner to the next remaining owner.
        """
        from homeassistant.components.todo.const import DATA_COMPONENT

        from .const import DOMAIN, HOUSEHOLD_ENTITY_ID
        from .rotation import next_owner, parse_owners, sanitize_owners, serialize_owners
        from .store import LucarneFamilyStore

        store: LucarneFamilyStore = self.hass.data[DOMAIN][self._entry.entry_id]["store"]
        remaining_slugs = {m.slug for m in remaining}

        try:
            rotating_tasks = await store.async_get_rotating_tasks()
        except Exception as exc:
            _LOGGER.debug(
                "Could not query rotating tasks during member removal: %s", exc
            )
            return
        if not rotating_tasks:
            return

        todo_component = self.hass.data.get(DATA_COMPONENT)
        entity = None
        if todo_component is not None:
            entity = todo_component.get_entity(HOUSEHOLD_ENTITY_ID)
        if entity is None:
            _LOGGER.warning(
                "Household todo entity not available during member removal; "
                "rotating task deletion may be incomplete"
            )

        for row in rotating_tasks:
            uid: str = row["item_uid"]
            current: str = row.get("current_owner", "")
            owners_prime = sanitize_owners(
                parse_owners(row.get("rotation_owners", "")), remaining_slugs
            )

            if not owners_prime:
                # No owners left — delete the task entirely.
                if entity is not None:
                    try:
                        await entity.async_delete_todo_items([uid])
                    except Exception as exc:
                        _LOGGER.warning(
                            "Failed to delete rotating todo item %s: %s", uid, exc
                        )
                await store.async_delete_task_metadata(uid)
                self.hass.bus.async_fire(
                    "lucarne_family_task_deleted", {"uid": uid}
                )
            else:
                new_current = current
                if current == removed_slug or current not in owners_prime:
                    # Advance to the next remaining owner.
                    new_current = (
                        next_owner(owners_prime, removed_slug or "", remaining_slugs)
                        or owners_prime[0]
                    )
                await store.async_update_task_metadata(
                    uid,
                    rotation_owners=serialize_owners(owners_prime),
                    current_owner=new_current,
                )

    async def async_step_edit_schedule(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            from datetime import time as time_type

            from homeassistant.util.dt import parse_time

            def _normalize(t: str) -> str:
                parsed = parse_time(t)
                if isinstance(parsed, time_type):
                    return parsed.strftime("%H:%M")
                return t

            new_data = {
                **self._entry.data,
                CONF_RESET_TIME: _normalize(user_input[CONF_RESET_TIME]),
                CONF_STREAK_CHECK_TIME: _normalize(user_input[CONF_STREAK_CHECK_TIME]),
            }
            self.hass.config_entries.async_update_entry(self._entry, data=new_data)
            return await self.async_step_init()

        current_reset = self._entry.data.get(CONF_RESET_TIME, DEFAULT_RESET_TIME)
        current_streak = self._entry.data.get(CONF_STREAK_CHECK_TIME, DEFAULT_STREAK_CHECK_TIME)
        schema = vol.Schema(
            {
                vol.Required(CONF_RESET_TIME, default=current_reset): selector.TimeSelector(),
                vol.Required(
                    CONF_STREAK_CHECK_TIME, default=current_streak
                ): selector.TimeSelector(),
            }
        )
        return self.async_show_form(
            step_id="edit_schedule", data_schema=schema, errors=errors
        )
