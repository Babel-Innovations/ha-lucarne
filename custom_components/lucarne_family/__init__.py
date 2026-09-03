"""Lucarne Family integration."""
from __future__ import annotations

import dataclasses
import hashlib
import logging
import os
import uuid
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from homeassistant.components import webhook
from homeassistant.components.frontend import DATA_THEMES, add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import TodoItemStatus
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_THEMES_UPDATED
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.loader import async_get_integration

from .const import (
    CONF_APPLE_BRIDGE,
    CONF_HOUSEHOLD_LIST,
    CONF_WEBHOOK_ID,
    DEFAULT_HOUSEHOLD_LIST,
    DOMAIN,
    FRONTEND_URL,
    LOADER_URL,
    PRESET_ADULT_NONE,
    THEME_FILE,
    THEME_NAME,
)
from .models import Member, RoutinePreset
from .presets import BUILTIN_PRESETS
from .store import LucarneFamilyStore
from .task_adoption import managed_todo_entity_ids
from .task_locks import async_task_uid_lock

_LOGGER = logging.getLogger(__name__)


def _bundle_digest(*paths: Path) -> str:
    """Short content hash of the frontend artifacts, used to cache-bust the ?v= query.

    The URL changes whenever the bytes change, so a rebuilt card busts the browser
    and frontend service-worker caches without a manifest version bump. Reading the
    files is blocking I/O — call via async_add_executor_job.

    Hash EVERY artifact the query is appended to, not just the card bundle. Both
    URLs are served with ``cache_headers=True`` (a 31-day ``Cache-Control`` —
    ``CACHE_TIME`` in homeassistant/components/http/static.py), so
    an artifact whose bytes changed while the query did not stays cached on the
    device effectively forever. Hashing only ha-lucarne.js meant a loader-only
    change never busted — which is the common case while debugging #101, since the
    loader is the diagnostic instrument and the bundle is the thing under test.

    Order matters (the hash is over concatenated bytes), so keep the call site's
    argument order stable; it only ever needs to be self-consistent.
    """
    digest = hashlib.sha256()
    for path in paths:
        try:
            digest.update(path.read_bytes())
        except OSError as err:
            _LOGGER.warning("Could not hash frontend artifact %s for cache-busting: %s", path, err)
            return "0"
    return digest.hexdigest()[:8]


def _load_theme(path: Path) -> dict[str, Any]:
    """Parse the bundled theme YAML into a {theme_name: tokens} mapping.

    Blocking file read + YAML parse — call via async_add_executor_job. Returns an
    empty dict on any failure so a missing/corrupt theme never blocks setup.
    """
    from homeassistant.util.yaml import load_yaml

    try:
        parsed = load_yaml(str(path))
    except (OSError, HomeAssistantError) as err:
        _LOGGER.warning("Could not load bundled theme %s: %s", path, err)
        return {}
    if not isinstance(parsed, dict):
        _LOGGER.warning("Bundled theme %s did not parse to a mapping; skipping", path)
        return {}
    return parsed


async def async_setup(hass: HomeAssistant, _config: dict[str, Any]) -> bool:
    """Set up the Lucarne Family integration.

    Serves the bundled Lovelace card JS and registers the loader shim that imports
    it — the bundle itself must never be a frontend module, see the add_extra_js_url
    block below (#101). No separate HACS plugin or manual Lovelace resource needed.

    Also registers the bundled "Lucarne" theme in-process so it appears under
    Profile → Theme without any configuration.yaml edits.
    """
    frontend_dir = Path(__file__).parent / "frontend"
    js_file = frontend_dir / "ha-lucarne.js"
    loader_file = frontend_dir / "ha-lucarne-loader.js"
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(FRONTEND_URL, str(js_file), cache_headers=True),
            StaticPathConfig(LOADER_URL, str(loader_file), cache_headers=True),
        ]
    )
    integration = await async_get_integration(hass, DOMAIN)
    digest = await hass.async_add_executor_job(_bundle_digest, js_file, loader_file)
    # ONLY the loader is registered as a frontend module. This is the fix for #101
    # and the bundle URL must NOT be added here.
    #
    # Home Assistant's app entrypoint imports
    # @webcomponents/scoped-custom-element-registry, whose final statement is:
    #
    #     Object.defineProperty(window, "customElements",
    #       {value: new CustomElementRegistry, configurable: true, writable: true})
    #
    # It installs a brand-new registry, discarding everything defined before it. A
    # directly-registered bundle evaluated first, registered all 31 elements into
    # the native registry, and had them thrown away — define() returning cleanly,
    # nothing thrown, and every card becoming HA's "Custom element doesn't exist"
    # panel.
    #
    # That polyfill is in frontend_latest/app.js as well as frontend_es5/app.js
    # (verified on a live instance), so this is NOT es5-only. What differs is
    # ORDERING: index.html carries <link rel="modulepreload"> for the latest
    # core/app, so on a modern device they evaluate — and swap — before our bundle
    # and our registrations survive. The es5 path has no preload and is loaded by
    # _ls(...) from a script block after ours, so there we registered first and were
    # wiped. A race, which is why it presented as intermittent and device-specific.
    #
    # Registering only the loader hands it control of *when* the bundle is imported,
    # and module evaluation is what registers — so it waits for the swap on every
    # path before importing. See whenRegistryIsFinal in src/loader/boot.ts. It also
    # means the loader is the sole importer, so its `.catch` sees any parse or
    # evaluation failure, which HA's own un-caught `import(...)` would discard.
    #
    # The bundle stays served at FRONTEND_URL above; the loader resolves it relative
    # to its own URL and carries this same ?v= across, and the digest covers both
    # files so editing either one busts the cache (see _bundle_digest).
    version_query = f"?v={integration.version}.{digest}"
    add_extra_js_url(hass, f"{LOADER_URL}{version_query}")

    await _async_register_theme(hass)
    return True


async def _async_register_theme(hass: HomeAssistant) -> None:
    """Merge the bundled theme into the frontend theme registry.

    Mirrors how the card bundle is wired up: the integration registers the theme
    itself rather than relying on a `frontend: themes:` include the user would
    have to add by hand. Injecting into hass.data[DATA_THEMES] is the only
    in-process path HA offers — there is no public register-theme helper. A manual
    `frontend.reload_themes` rebuilds that dict from config and drops the theme
    until the next restart re-runs async_setup; that is the documented trade-off.
    """
    theme_path = Path(__file__).parent / THEME_FILE
    theme = await hass.async_add_executor_job(_load_theme, theme_path)
    tokens = theme.get(THEME_NAME)
    if not isinstance(tokens, dict) or not tokens:
        _LOGGER.warning(
            "Bundled theme %s is missing or has an invalid %r mapping; theme not registered",
            theme_path,
            THEME_NAME,
        )
        return
    themes = hass.data.setdefault(DATA_THEMES, {})
    # Never clobber a theme the user already defined under this name. On a normal
    # restart DATA_THEMES is rebuilt from config before this runs, so a present
    # entry means the user customized "Lucarne" by hand — leave it untouched.
    existing = themes.get(THEME_NAME)
    if existing is not None:
        if existing != tokens:
            _LOGGER.debug(
                "A %r theme is already registered; leaving the existing one untouched",
                THEME_NAME,
            )
        return
    themes[THEME_NAME] = tokens
    hass.bus.async_fire(EVENT_THEMES_UPDATED)
    _LOGGER.debug("Registered bundled %r theme", THEME_NAME)


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate a config entry written by an older version.

    1.1 → 1.2 (Apple Reminders bridge): mint ``webhook_id``, seed ``apple_bridge``,
    and drop the old ``round_trip`` block — its webhook URL / HMAC secret were
    for a push to the Mac that was never built; the bridge now learns what to
    complete from the webhook *response*.
    """
    if entry.version > 1:
        return False
    if entry.minor_version < 2:
        data = _bridge_migrated_data(entry.data)
        hass.config_entries.async_update_entry(entry, data=data, minor_version=2)
        _LOGGER.info("Migrated Lucarne Family entry %s to 1.2", entry.entry_id)
    return True


def _bridge_migrated_data(data: Mapping[str, Any]) -> dict[str, Any]:
    new_data = {k: v for k, v in data.items() if k != "round_trip"}
    if not new_data.get(CONF_WEBHOOK_ID):
        new_data[CONF_WEBHOOK_ID] = webhook.async_generate_id()
    bridge = dict(new_data.get(CONF_APPLE_BRIDGE) or {})
    bridge.setdefault(CONF_HOUSEHOLD_LIST, DEFAULT_HOUSEHOLD_LIST)
    new_data[CONF_APPLE_BRIDGE] = bridge
    return new_data


def _register_bridge_webhook(hass: HomeAssistant, entry: ConfigEntry, webhook_id: str) -> None:
    from .apple_bridge import async_handle_webhook

    webhook.async_register(
        hass,
        DOMAIN,
        f"Lucarne Family Apple Reminders bridge ({entry.title})",
        webhook_id,
        async_handle_webhook,
        local_only=False,
        allowed_methods=["GET", "POST"],
    )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Lucarne Family from a config entry.

    Setup order is load-bearing — do NOT reorder these steps:
    1. Init store (SQLite ready before anything reads tasks)
    2. Ensure entities (todo + counter entities exist before services reference them)
    3. Register services (must exist before managed automations can call them)
    4. Register WebSocket command (once per process, guarded)
    4b. Register the Apple Reminders bridge webhook (needs the store + entities)
    5. Start completion listener (needs entity set from step 2)
    6. Write managed automations (time-change listeners call services from step 3)
    7. Register options-update listener (last, so re-setup uses the populated state)
    """
    # Step 1: Initialize store.
    db_path = os.path.join(hass.config.config_dir, f"lucarne_family_{entry.entry_id}.db")
    store = LucarneFamilyStore(hass, entry.entry_id, db_path)
    await store.async_init()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {"store": store}

    # Step 2: Ensure household + per-member entities.
    from .entity_manager import async_ensure_household_entity

    try:
        await async_ensure_household_entity(hass)
    except Exception as exc:
        _LOGGER.warning("Failed to ensure household entity during setup: %s", exc)

    await _async_reconcile_member_entities(hass, store)

    # Step 3: Register all lucarne_family.* services.
    from .avatar_service import async_setup_avatar_service
    from .member_service import async_setup_member_service
    from .task_service import async_setup_services

    await async_setup_services(hass, entry.entry_id)
    await async_setup_avatar_service(hass, entry.entry_id)
    await async_setup_member_service(hass, entry.entry_id)

    # Step 4: Register WebSocket command (once per HA process, guarded).
    from .websocket_api import async_register_websocket_commands

    async_register_websocket_commands(hass)

    # Step 4b: Apple Reminders bridge webhook. One per entry; the id is the
    # bridge's credential and local_only is off on purpose (Tailscale).
    from .apple_bridge import BridgeRuntime

    if not entry.data.get(CONF_WEBHOOK_ID):
        # An entry that skipped async_migrate_entry (tests build entries by hand).
        hass.config_entries.async_update_entry(
            entry, data=_bridge_migrated_data(entry.data)
        )
    webhook_id: str = entry.data[CONF_WEBHOOK_ID]
    runtime = BridgeRuntime(webhook_id=webhook_id)
    hass.data[DOMAIN][entry.entry_id]["bridge"] = runtime
    _register_bridge_webhook(hass, entry, webhook_id)
    # Read the id at unload time: async_options_updated may have rotated it.
    entry.async_on_unload(lambda: webhook.async_unregister(hass, runtime.webhook_id))

    # Step 5: Start completion listener (state-change listener for managed entities).
    from .completion_listener import async_start_completion_listener

    managed_entity_ids = set(managed_todo_entity_ids(store))
    unsub_listener = async_start_completion_listener(
        hass, store, managed_entity_ids, entry_id=entry.entry_id
    )
    hass.data[DOMAIN][entry.entry_id]["unsub_listener"] = unsub_listener

    # Step 6: Write managed automations (time-change listeners) — LAST before
    # options listener so services from step 3 are guaranteed registered.
    from .automation_writer import async_write_managed_automations

    unsub_automations = await async_write_managed_automations(hass, entry)
    hass.data[DOMAIN][entry.entry_id]["unsub_automations"] = unsub_automations

    # Step 7: Register options-update listener.
    entry.async_on_unload(entry.add_update_listener(async_options_updated))

    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Drop the Reminders bridge's Repairs issues with the entry that raised them."""
    from .apple_bridge import async_clear_all_repairs

    async_clear_all_repairs(hass)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    domain_data = hass.data.get(DOMAIN, {})
    entry_data = domain_data.pop(entry.entry_id, None)
    if entry_data:
        # Unsubscribe time-change listeners.
        unsub_automations = entry_data.get("unsub_automations")
        if unsub_automations is not None:
            unsub_automations()

        # Unsubscribe completion listener.
        unsub_listener = entry_data.get("unsub_listener")
        if unsub_listener is not None:
            unsub_listener()

        await entry_data["store"].async_close()

    # Unload services when the last entry is removed.
    remaining_entries = {
        k: v for k, v in domain_data.items() if isinstance(v, dict) and "store" in v
    }
    if not remaining_entries:
        from .avatar_service import async_unload_avatar_service
        from .member_service import async_unload_member_service
        from .task_service import async_unload_services

        await async_unload_services(hass)
        await async_unload_avatar_service(hass)
        await async_unload_member_service(hass)

    return True


async def async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update — rewire time-change listeners and completion listener."""
    _LOGGER.debug("Options updated: %s", entry.entry_id)

    entry_data = hass.data.get(DOMAIN, {}).get(entry.entry_id, {})

    # Re-register the bridge webhook if the options flow rotated its id.
    runtime = entry_data.get("bridge")
    new_webhook_id = entry.data.get(CONF_WEBHOOK_ID)
    if runtime is not None and new_webhook_id and runtime.webhook_id != new_webhook_id:
        webhook.async_unregister(hass, runtime.webhook_id)
        runtime.webhook_id = new_webhook_id
        _register_bridge_webhook(hass, entry, new_webhook_id)

    # Rewire time-change listeners for new reset/streak times.
    old_unsub = entry_data.pop("unsub_automations", None)
    if old_unsub is not None:
        old_unsub()

    # Restart completion listener so newly-added members are tracked.
    old_listener = entry_data.pop("unsub_listener", None)
    if old_listener is not None:
        old_listener()

    from .automation_writer import async_write_managed_automations
    from .completion_listener import async_start_completion_listener

    store: LucarneFamilyStore = entry_data["store"]
    managed_entity_ids = set(managed_todo_entity_ids(store))
    entry_data["unsub_listener"] = async_start_completion_listener(
        hass, store, managed_entity_ids, entry_id=entry.entry_id
    )

    new_unsub = await async_write_managed_automations(hass, entry)
    entry_data["unsub_automations"] = new_unsub


async def _async_reconcile_member_entities(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
) -> None:
    """Reconcile per-member todo+counter entities with stored member data.

    - Member exists in data but todo or counter entity is missing → warn and recreate both.
    - Local-todo entity not tracked by any member → warn (possible orphan from deleted member).

    Does not reseed preset routines for recreated entities — seeding is one-time on member add.
    Phase 3 replaces this with an explicit seven-step setup order.
    """
    from homeassistant.helpers.entity_registry import async_get as er_get

    from .entity_manager import async_create_member_entities

    er = er_get(hass)
    members = store.get_members()
    updated_members = list(members)
    dirty = False

    for i, member in enumerate(members):
        expected_todo = member.todo_entity_id or f"todo.{member.slug}"
        expected_counter = member.streak_counter_id or f"counter.{member.slug}_streak"
        todo_present = er.async_get(expected_todo) is not None
        counter_present = er.async_get(expected_counter) is not None

        if todo_present and counter_present:
            continue

        # Partial state (one entity present, one missing): async_create_member_entities
        # would fail because it guards against existing entity_ids and the IDManager
        # would assign a suffixed id for the missing side. Warn and skip — Phase 3
        # introduces explicit per-side recovery helpers.
        if todo_present and not counter_present:
            _LOGGER.warning(
                "Streak counter %s for member %r is missing but todo entity is present. "
                "Re-add the counter helper manually or re-add the member to restore it.",
                expected_counter,
                member.slug,
            )
            continue
        if not todo_present and counter_present:
            _LOGGER.warning(
                "Todo entity %s for member %r is missing but streak counter is present. "
                "Re-add the todo helper manually or re-add the member to restore it.",
                expected_todo,
                member.slug,
            )
            continue

        # Both missing — safe to call async_create_member_entities.
        _LOGGER.warning(
            "Both entities for member %r are missing; attempting to recreate (todo=%s, counter=%s)",
            member.slug,
            expected_todo,
            expected_counter,
        )
        try:
            new_todo_id, new_counter_id = await async_create_member_entities(hass, member)
            updated_members[i] = dataclasses.replace(
                member,
                todo_entity_id=new_todo_id,
                streak_counter_id=new_counter_id,
            )
            dirty = True
        except Exception as exc:
            _LOGGER.error(
                "Failed to recreate entities for member %r during reconciliation: %s",
                member.slug,
                exc,
            )

    if dirty:
        await store.async_save_members(updated_members)

    # Warn about local_todo entities not tracked by any member (possible orphans).
    # Use the same fallback as the loop above so legacy members without stored entity_ids
    # don't trigger false-positive orphan warnings.
    known_todo_ids = {
        m.todo_entity_id or f"todo.{m.slug}" for m in updated_members
    } | {"todo.lucarne_household"}
    for ce in hass.config_entries.async_entries("local_todo"):
        for er_entry in list(er.entities.values()):
            if er_entry.config_entry_id == ce.entry_id and er_entry.domain == "todo":
                if er_entry.entity_id not in known_todo_ids:
                    _LOGGER.warning(
                        "Todo entity %s is not tracked by any lucarne_family member; "
                        "it may be an orphaned entity from a deleted member",
                        er_entry.entity_id,
                    )


# ---------------------------------------------------------------------------
# Preset seeding
# ---------------------------------------------------------------------------


async def seed_preset_routines(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    member: Member,
    extra_presets: dict[str, RoutinePreset] | None = None,
) -> None:
    """Add preset routine items to a member's todo entity and insert task_metadata rows.

    Called exactly once after a new member's entities are created. Never called
    during reload / reconciliation to prevent duplicate rows.

    extra_presets: mapping of slug → RoutinePreset for custom presets from entry.data.
    """
    all_presets = {**BUILTIN_PRESETS, **(extra_presets or {})}
    preset = all_presets.get(member.preset)
    if preset is None or member.preset == PRESET_ADULT_NONE or not preset.routines:
        return

    if not member.todo_entity_id:
        _LOGGER.warning(
            "seed_preset_routines called for member %r without todo_entity_id", member.slug
        )
        return

    from homeassistant.components.todo.const import DATA_COMPONENT

    todo_component = hass.data.get(DATA_COMPONENT)
    if todo_component is None:
        _LOGGER.warning("todo component not loaded; skipping preset seeding for %s", member.slug)
        return

    entity = todo_component.get_entity(member.todo_entity_id)
    if entity is None:
        _LOGGER.warning(
            "Todo entity %s not found; skipping preset seeding for %s",
            member.todo_entity_id,
            member.slug,
        )
        return

    # Idempotency guard: skip if template rows already exist for this member.
    existing = await store.async_get_tasks_for_member(member.slug)
    if any(t["source"] == "template" for t in existing):
        return

    for template in preset.routines:
        item_uid = str(uuid.uuid4())
        # Same create-then-INSERT gap as add_task, so the same uid lock — see
        # task_locks (issue #114).
        async with async_task_uid_lock(item_uid):
            await entity.async_create_todo_item(
                TodoItem(
                    uid=item_uid,
                    summary=template.summary,
                    status=TodoItemStatus.NEEDS_ACTION,
                )
            )
            await store.async_add_task_metadata(
                member_slug=member.slug,
                item_uid=item_uid,
                type="routine",
                recurrence=template.recurrence,
                icon=template.icon,
                source="template",
                summary=template.summary,
                time_of_day=template.time_of_day,
            )
