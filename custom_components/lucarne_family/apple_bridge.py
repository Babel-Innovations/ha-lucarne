"""Apple Reminders bridge receiver.

The ``lucarne-bridge`` CLI on a Mac reads Reminders through EventKit and talks
to one HA webhook, registered per config entry with the entry's ``webhook_id``
as the credential (``local_only=False`` on purpose — the Mac may reach HA over
Tailscale). ``GET`` returns which Reminders lists to send and where they land;
``POST`` carries every *incomplete* reminder of those lists and is answered
with the Apple ids the Mac must mark completed. Nothing here ever pushes to
the Mac: the write-back direction rides entirely on the ``POST`` response.

Two rules from elsewhere in the integration apply verbatim:

* A list that cannot be read is **skipped**, never treated as empty
  (:func:`reconcile.readable_todo_entity`, issue #116). Every write below is
  driven by an *absence* — an HA item missing for an active reminder, a
  reminder missing from the active set — so a list read as empty while it is
  reloading would complete or re-create everything in it.
* Creating an item and INSERTing its metadata row happens under the uid lock
  (#114), through the same locked backfill body the completion listener uses.

HA's webhook dispatcher answers ``200`` for anything the handler raises, so the
handler below catches everything itself and returns explicit JSON errors — a
bare ``200`` would read as a successful sync to the Mac.
"""
from __future__ import annotations

import asyncio
import dataclasses
import logging
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

import voluptuous as vol
from aiohttp import web
from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import TodoItemStatus
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util

from .apple_sentinel_backfill import (
    APPLE_SENTINEL_RE,
    async_backfill_apple_sentinel_locked,
)
from .const import (
    BRIDGE_PROTOCOL_VERSION,
    BRIDGE_SYNC_INTERVAL,
    CONF_APPLE_BRIDGE,
    CONF_HOUSEHOLD_LIST,
    DOMAIN,
    HOUSEHOLD_ENTITY_ID,
    HOUSEHOLD_SLUG,
    ISSUE_APPLE_LIST_MISSING,
)
from .reconcile import readable_todo_entity
from .store import LucarneFamilyStore
from .task_locks import async_task_uid_lock

_LOGGER = logging.getLogger(__name__)

UNTITLED = "Untitled reminder"
# Client-supplied strings that reach frontend-rendered markdown (options dialog,
# Repairs) are clipped once, at the schema, so every path inherits the bound.
# Generous enough that a real Reminders list name is never truncated into a
# mapping that cannot match.
_MAX_NAME = 200
_MAX_LISTS = 50


@dataclass(frozen=True, slots=True)
class ListMapping:
    """One Reminders list → one managed todo entity."""

    name: str
    target: str  # member slug or HOUSEHOLD_SLUG
    entity_id: str
    label: str = ""  # human name for Repairs text


@dataclass(slots=True)
class BridgeStatus:
    """What the last POST did — shown in the options flow."""

    synced_at: datetime
    host: str
    bridge_version: str
    received: int = 0
    created: int = 0
    updated: int = 0
    completed_in_ha: int = 0
    sent_complete: int = 0
    skipped_lists: list[str] = field(default_factory=list)
    unmapped_lists: list[str] = field(default_factory=list)
    error: str = ""


@dataclass(slots=True)
class BridgeRuntime:
    """Per-entry receiver state, kept in ``hass.data`` (never in the entry)."""

    webhook_id: str
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    status: BridgeStatus | None = None
    # List names the Mac last reported. Held here rather than in entry.data so
    # a five-minute POST never rewrites the config entry (and never fires the
    # options-update listener).
    available_lists: list[str] = field(default_factory=list)


def _list_key(name: str) -> str:
    """Normalise a Reminders list name for matching (trimmed, case-folded)."""
    return name.strip().casefold()


def mapping_for_entry(store: LucarneFamilyStore, entry: ConfigEntry) -> list[ListMapping]:
    """Lists the bridge should send, in the order the options flow shows them."""
    mappings: list[ListMapping] = []
    bridge_cfg: dict[str, Any] = entry.data.get(CONF_APPLE_BRIDGE, {})
    household_list = (bridge_cfg.get(CONF_HOUSEHOLD_LIST) or "").strip()
    if household_list:
        mappings.append(
            ListMapping(household_list, HOUSEHOLD_SLUG, HOUSEHOLD_ENTITY_ID, "the household list")
        )
    for member in store.get_members():
        name = (member.apple_list or "").strip()
        if name and member.todo_entity_id:
            mappings.append(ListMapping(name, member.slug, member.todo_entity_id, member.name))
    return mappings


def mapping_payload(store: LucarneFamilyStore, entry: ConfigEntry) -> dict[str, Any]:
    """Body of the ``GET`` response."""
    return {
        "version": BRIDGE_PROTOCOL_VERSION,
        "sync_interval": BRIDGE_SYNC_INTERVAL,
        "lists": [
            {"name": m.name, "target": m.target, "entity_id": m.entity_id}
            for m in mapping_for_entry(store, entry)
        ],
    }


# ---------------------------------------------------------------------------
# POST payload
# ---------------------------------------------------------------------------


def _parse_due(value: str | None) -> date | datetime | None:
    """``YYYY-MM-DD`` → date, RFC 3339 → aware datetime; anything else → ``None``.

    Lenient on purpose: one reminder with a due date the bridge could not
    format must not stop every list from syncing, so it syncs without a date
    (and the bridge's log line names it).
    """
    if value is None or value == "":
        return None
    if len(value) == 10:
        parsed_date = dt_util.parse_date(value)
        if parsed_date is None:
            _LOGGER.warning("Ignoring unparseable reminder due date %r", value)
        return parsed_date
    parsed = dt_util.parse_datetime(value)
    if parsed is None:
        _LOGGER.warning("Ignoring unparseable reminder due date %r", value)
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt_util.get_default_time_zone())
    return parsed


def _usable_apple_id(apple_id: str) -> bool:
    """The id lands inside ``[apple:...]``; a ``]`` or whitespace would break the sentinel."""
    return bool(apple_id) and "]" not in apple_id and not any(ch.isspace() for ch in apple_id)


ITEM_SCHEMA = vol.Schema(
    {
        vol.Required("id"): str,
        vol.Required("title"): vol.Any(None, str),
        vol.Optional("due", default=None): vol.Any(None, vol.All(str, _parse_due)),
        vol.Optional("notes", default=""): vol.Any(None, str),
        vol.Optional("completed", default=False): bool,
    },
    extra=vol.ALLOW_EXTRA,
)

def _clip(value: str) -> str:
    return value.strip()[:_MAX_NAME]


_CLIPPED = vol.All(str, _clip)

LIST_SCHEMA = vol.Schema(
    {vol.Required("name"): _CLIPPED, vol.Required("items"): [ITEM_SCHEMA]},
    extra=vol.ALLOW_EXTRA,
)

POST_SCHEMA = vol.Schema(
    {
        vol.Required("version"): vol.All(int, vol.Range(min=1, max=BRIDGE_PROTOCOL_VERSION)),
        vol.Optional("host", default=""): _CLIPPED,
        vol.Optional("bridge_version", default=""): _CLIPPED,
        vol.Optional("available_lists", default=list): vol.All(
            [_CLIPPED], vol.Length(max=_MAX_LISTS)
        ),
        vol.Required("lists"): vol.All([LIST_SCHEMA], vol.Length(max=_MAX_LISTS)),
    },
    extra=vol.ALLOW_EXTRA,
)


def _description_for(apple_uid: str, notes: str | None) -> str:
    note = (notes or "").strip()
    sentinel = f"[apple:{apple_uid}]"
    return f"{sentinel} {note}" if note else sentinel


def _sentinel_uid(item: TodoItem) -> str | None:
    match = APPLE_SENTINEL_RE.search(item.description or "")
    return match.group(1) if match else None


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class _SyncResult:
    complete: list[str] = field(default_factory=list)
    received: int = 0
    created: int = 0
    updated: int = 0
    completed_in_ha: int = 0
    skipped_lists: list[str] = field(default_factory=list)
    unmapped_lists: list[str] = field(default_factory=list)

    def as_response(self) -> dict[str, Any]:
        return {
            "ok": True,
            "complete": self.complete,
            "received": self.received,
            "created": self.created,
            "updated": self.updated,
            "completed_in_ha": self.completed_in_ha,
            "skipped_lists": self.skipped_lists,
            "unmapped_lists": self.unmapped_lists,
        }


async def _sync_list(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    mapping: ListMapping,
    incoming: list[dict[str, Any]],
    result: _SyncResult,
) -> None:
    readable = readable_todo_entity(hass, mapping.entity_id)
    if readable is None:
        _LOGGER.debug(
            "Reminders list %r skipped: %s is not readable", mapping.name, mapping.entity_id
        )
        result.skipped_lists.append(mapping.name)
        return
    entity, items = readable
    result.received += len(incoming)

    # Apple id → HA item, by sentinel only. Titles are never a key.
    ha_by_apple: dict[str, TodoItem] = {}
    by_uid: dict[str, TodoItem] = {}
    for item in items:
        if item.uid:
            by_uid[item.uid] = item
        apple_uid = _sentinel_uid(item)
        if apple_uid and item.uid and apple_uid not in ha_by_apple:
            ha_by_apple[apple_uid] = item

    rows = {
        row["apple_uid"]: row for row in await store.async_get_apple_sync_state(mapping.target)
    }
    active: dict[str, dict[str, Any]] = {}
    for inc in incoming:
        if not _usable_apple_id(inc["id"]):
            _LOGGER.warning("Skipping reminder %r with unusable id %r", inc["title"], inc["id"])
            continue
        if not inc["completed"]:
            active.setdefault(inc["id"], inc)

    for apple_uid, inc in active.items():
        title = (inc["title"] or "").strip() or UNTITLED
        due: date | datetime | None = inc["due"]
        description = _description_for(apple_uid, inc["notes"])
        ha_item = ha_by_apple.get(apple_uid)

        if ha_item is None and (row := rows.get(apple_uid)) is not None:
            unlinked = by_uid.get(row["item_uid"])
            if unlinked is not None and unlinked.uid:
                # The sentinel was edited out of the description (HA's to-do
                # panel shows it raw) but the item is still here: re-link it
                # rather than mistake it for a deletion and check the
                # reminder off in Apple.
                await entity.async_update_todo_item(
                    TodoItem(
                        uid=unlinked.uid,
                        summary=unlinked.summary,
                        status=unlinked.status,
                        due=unlinked.due,
                        description=description,
                    )
                )
                ha_item = dataclasses.replace(unlinked, description=description)
                result.updated += 1

        if ha_item is None:
            if apple_uid in rows:
                # We created it once and it is gone: deleted in HA. The row
                # stays until the id leaves Apple's active set, so a bridge
                # that fails to complete it cannot make us re-create it.
                result.complete.append(apple_uid)
                continue
            new_uid = str(uuid.uuid4())
            # Same shape as add_task: the entity publishes the uid to every
            # subscriber before async_create_todo_item returns (#114).
            async with async_task_uid_lock(new_uid):
                await entity.async_create_todo_item(
                    TodoItem(
                        uid=new_uid,
                        summary=title,
                        status=TodoItemStatus.NEEDS_ACTION,
                        due=due,
                        description=description,
                    )
                )
                await async_backfill_apple_sentinel_locked(
                    hass, store, mapping.entity_id, new_uid, mapping.target
                )
            await store.async_upsert_apple_sync_state(apple_uid, mapping.target, new_uid)
            result.created += 1
            continue

        ha_uid = ha_item.uid or ""
        row = rows.get(apple_uid)
        if row is None or row["item_uid"] != ha_uid:
            # First sight of an item we did not create (the old blueprint's, or
            # one restored from backup): enrol it so the daily reset owns it.
            async with async_task_uid_lock(ha_uid):
                await async_backfill_apple_sentinel_locked(
                    hass, store, mapping.entity_id, ha_uid, mapping.target
                )
            await store.async_upsert_apple_sync_state(apple_uid, mapping.target, ha_uid)

        if ha_item.status == TodoItemStatus.COMPLETED:
            # Completed here, still open there: HA wins until Apple confirms.
            result.complete.append(apple_uid)
            continue

        if (
            ha_item.summary != title
            or ha_item.due != due
            or (ha_item.description or "") != description
        ):
            await entity.async_update_todo_item(
                TodoItem(
                    uid=ha_uid,
                    summary=title,
                    status=TodoItemStatus.NEEDS_ACTION,
                    due=due,
                    description=description,
                )
            )
            result.updated += 1

    # Anything with a sentinel that Apple no longer lists as open was completed
    # (or removed) in Reminders: mirror that, then forget the row.
    for apple_uid, ha_item in ha_by_apple.items():
        if apple_uid in active or ha_item.status != TodoItemStatus.NEEDS_ACTION:
            continue
        await entity.async_update_todo_item(
            TodoItem(
                uid=ha_item.uid,
                summary=ha_item.summary,
                status=TodoItemStatus.COMPLETED,
                due=ha_item.due,
                description=ha_item.description,
            )
        )
        result.completed_in_ha += 1
    await store.async_delete_apple_sync_state(
        [apple_uid for apple_uid in rows if apple_uid not in active]
    )


def _sync_repairs(
    hass: HomeAssistant,
    mappings: list[ListMapping],
    available_lists: list[str],
    host: str,
) -> None:
    """Raise a Repairs issue per mapped list the Mac does not have."""
    if not available_lists:
        # An empty report says nothing about the Mac; don't alarm on it.
        return
    available = {_list_key(name) for name in available_lists}
    for mapping in mappings:
        issue_id = f"{ISSUE_APPLE_LIST_MISSING}_{mapping.target}"
        if _list_key(mapping.name) in available:
            ir.async_delete_issue(hass, DOMAIN, issue_id)
            continue
        ir.async_create_issue(
            hass,
            DOMAIN,
            issue_id,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key=ISSUE_APPLE_LIST_MISSING,
            translation_placeholders={
                "list": mapping.name,
                "target": mapping.label or mapping.target,
                "host": host or "the Mac",
                "available": ", ".join(available_lists),
            },
        )


def async_clear_repairs_for_target(hass: HomeAssistant, target: str) -> None:
    """Drop the missing-list issue for a member being removed, renamed or unmapped."""
    ir.async_delete_issue(hass, DOMAIN, f"{ISSUE_APPLE_LIST_MISSING}_{target}")


def async_clear_all_repairs(hass: HomeAssistant) -> None:
    """Drop every missing-list issue (config entry removal)."""
    registry = ir.async_get(hass)
    for domain, issue_id in list(registry.issues):
        if domain == DOMAIN and issue_id.startswith(f"{ISSUE_APPLE_LIST_MISSING}_"):
            registry.async_delete(domain, issue_id)


async def async_apply_sync(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entry: ConfigEntry,
    runtime: BridgeRuntime,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Apply one validated POST payload and return the response body.

    Callers serialize on ``runtime.lock``; this does not take it itself so
    tests can drive it directly.
    """
    mappings = mapping_for_entry(store, entry)
    by_key = {_list_key(m.name): m for m in mappings}
    available_lists = [name for name in data["available_lists"] if name]
    host = data["host"]

    result = _SyncResult()
    seen_targets: set[str] = set()
    for incoming_list in data["lists"]:
        mapping = by_key.get(_list_key(incoming_list["name"]))
        if mapping is None:
            result.unmapped_lists.append(incoming_list["name"])
            continue
        if mapping.target in seen_targets:
            continue
        seen_targets.add(mapping.target)
        await _sync_list(hass, store, mapping, incoming_list["items"], result)

    runtime.available_lists = available_lists
    _sync_repairs(hass, mappings, available_lists, host)
    runtime.status = BridgeStatus(
        synced_at=dt_util.utcnow(),
        host=host,
        bridge_version=data["bridge_version"],
        received=result.received,
        created=result.created,
        updated=result.updated,
        completed_in_ha=result.completed_in_ha,
        sent_complete=len(result.complete),
        skipped_lists=list(result.skipped_lists),
        unmapped_lists=list(result.unmapped_lists),
    )
    return result.as_response()


# ---------------------------------------------------------------------------
# Webhook handler
# ---------------------------------------------------------------------------


def _json_error(status: int, error: str, detail: str = "") -> web.Response:
    body: dict[str, Any] = {"ok": False, "error": error}
    if detail:
        body["detail"] = detail
    return web.json_response(body, status=status)


def _runtime_for(hass: HomeAssistant, webhook_id: str) -> tuple[Any, Any, Any] | None:
    for entry_id, entry_data in hass.data.get(DOMAIN, {}).items():
        if not isinstance(entry_data, dict):
            continue
        runtime = entry_data.get("bridge")
        if runtime is None or runtime.webhook_id != webhook_id:
            continue
        entry = hass.config_entries.async_get_entry(entry_id)
        if entry is None:
            return None
        return entry, entry_data["store"], runtime
    return None


async def async_handle_webhook(
    hass: HomeAssistant, webhook_id: str, request: web.Request
) -> web.Response:
    """Serve ``GET`` (mapping) and ``POST`` (sync) for one entry's webhook."""
    located = _runtime_for(hass, webhook_id)
    if located is None:
        return _json_error(404, "unknown_webhook")
    entry, store, runtime = located

    if request.method == "GET":
        return web.json_response(mapping_payload(store, entry))

    try:
        payload = await request.json()
    except ValueError as err:
        return _json_error(400, "invalid_json", str(err))
    try:
        data = POST_SCHEMA(payload)
    except vol.Invalid as err:
        return _json_error(400, "invalid_payload", str(err))

    async with runtime.lock:
        try:
            body = await async_apply_sync(hass, store, entry, runtime, data)
        except Exception as err:
            _LOGGER.exception("Apple Reminders sync failed")
            runtime.status = BridgeStatus(
                synced_at=dt_util.utcnow(),
                host=data["host"],
                bridge_version=data["bridge_version"],
                error=str(err) or err.__class__.__name__,
            )
            return _json_error(500, "internal", str(err) or err.__class__.__name__)
    return web.json_response(body)
