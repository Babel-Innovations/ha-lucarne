"""Tests for apple_bridge.py — the in-integration Reminders bridge receiver."""
from __future__ import annotations

import asyncio
import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
import voluptuous as vol
from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from homeassistant.util.aiohttp import MockRequest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.apple_bridge import (
    POST_SCHEMA,
    BridgeRuntime,
    async_apply_sync,
    async_handle_webhook,
    mapping_payload,
)
from custom_components.lucarne_family.const import (
    CONF_APPLE_BRIDGE,
    CONF_HOUSEHOLD_LIST,
    DOMAIN,
    HOUSEHOLD_ENTITY_ID,
    ISSUE_APPLE_LIST_MISSING,
)
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore
from custom_components.lucarne_family.task_locks import lock_holders

WEBHOOK_ID = "a" * 64
APPLE_1 = "6B5B6E3E-1111-4F90-B9D5-6E6A12AE7E6D"
APPLE_2 = "6B5B6E3E-2222-4F90-B9D5-6E6A12AE7E6D"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _member(slug: str, apple_list: str = "") -> Member:
    return Member(
        slug=slug,
        name=slug.capitalize(),
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="adult-none",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
        apple_list=apple_list,
    )


async def _setup(
    hass: HomeAssistant,
    tmp_path: Path,
    *,
    household_list: str = "Family",
    members: list[Member] | None = None,
    todo_lists: tuple[str, ...] = ("anna", "lucarne_household"),
) -> tuple[MockConfigEntry, LucarneFamilyStore, BridgeRuntime]:
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()
    for name in todo_lists:
        await hass.config_entries.flow.async_init(
            "local_todo", context={"source": "user"}, data={"todo_list_name": name}
        )
    await hass.async_block_till_done()

    if members is None:
        members = [_member("anna", apple_list="Anna")]
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [m.to_dict() for m in members],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "custom_presets": [],
            "webhook_id": WEBHOOK_ID,
            CONF_APPLE_BRIDGE: {CONF_HOUSEHOLD_LIST: household_list},
        },
    )
    entry.add_to_hass(hass)
    store = LucarneFamilyStore(hass, entry.entry_id, str(tmp_path / "lucarne.db"))
    await store.async_init()
    runtime = BridgeRuntime(webhook_id=WEBHOOK_ID)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store, "bridge": runtime}
    return entry, store, runtime


def _entity(hass: HomeAssistant, entity_id: str) -> Any:
    entity = hass.data[DATA_COMPONENT].get_entity(entity_id)
    assert entity is not None, entity_id
    return entity


def _items(hass: HomeAssistant, entity_id: str) -> list[TodoItem]:
    return list(_entity(hass, entity_id).todo_items or [])


def _by_apple(hass: HomeAssistant, entity_id: str) -> dict[str, TodoItem]:
    out: dict[str, TodoItem] = {}
    for item in _items(hass, entity_id):
        desc = item.description or ""
        if desc.startswith("[apple:"):
            out[desc[len("[apple:") : desc.index("]")]] = item
    return out


def _reminder(
    apple_id: str, title: str, due: str | None = None, notes: str = ""
) -> dict[str, Any]:
    return {"id": apple_id, "title": title, "due": due, "notes": notes, "completed": False}


def _payload(
    *lists: tuple[str, list[dict[str, Any]]],
    available: list[str] | None = None,
    host: str = "mac-mini",
) -> dict[str, Any]:
    names = [name for name, _ in lists]
    return POST_SCHEMA(
        {
            "version": 1,
            "host": host,
            "bridge_version": "1.6.0",
            "available_lists": names if available is None else available,
            "lists": [{"name": name, "items": items} for name, items in lists],
        }
    )


async def _sync(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    store: LucarneFamilyStore,
    runtime: BridgeRuntime,
    *lists: tuple[str, list[dict[str, Any]]],
    **kwargs: Any,
) -> dict[str, Any]:
    result = await async_apply_sync(hass, store, entry, runtime, _payload(*lists, **kwargs))
    await hass.async_block_till_done()
    return result


# ---------------------------------------------------------------------------
# GET mapping
# ---------------------------------------------------------------------------


async def test_mapping_lists_household_then_synced_members(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, _ = await _setup(
        hass, tmp_path, members=[_member("anna", "Anna"), _member("ben", "")]
    )
    payload = mapping_payload(store, entry)
    assert payload["version"] == 1
    assert payload["sync_interval"] == 300
    assert payload["lists"] == [
        {"name": "Family", "target": "household", "entity_id": HOUSEHOLD_ENTITY_ID},
        {"name": "Anna", "target": "anna", "entity_id": "todo.anna"},
    ]


async def test_mapping_omits_a_blank_household_list(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, _ = await _setup(hass, tmp_path, household_list="  ")
    assert [m["target"] for m in mapping_payload(store, entry)["lists"]] == ["anna"]


# ---------------------------------------------------------------------------
# Apple → HA
# ---------------------------------------------------------------------------


async def test_new_reminder_creates_item_with_sentinel_and_apple_metadata(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)

    result = await _sync(
        hass, entry, store, runtime,
        ("Anna", [_reminder(APPLE_1, "Pack bag", notes="Gym kit too")]),
        ("Family", [_reminder(APPLE_2, "Buy milk", due="2026-09-04")]),
    )

    assert result["ok"] is True
    assert result["created"] == 2
    assert result["complete"] == []
    anna = _by_apple(hass, "todo.anna")[APPLE_1]
    assert anna.summary == "Pack bag"
    assert anna.description == f"[apple:{APPLE_1}] Gym kit too"
    assert anna.status == TodoItemStatus.NEEDS_ACTION
    assert anna.due is None
    household = _by_apple(hass, HOUSEHOLD_ENTITY_ID)[APPLE_2]
    assert household.due == date(2026, 9, 4)
    assert household.description == f"[apple:{APPLE_2}]"

    metadata = await store.async_get_task_metadata(anna.uid or "")
    assert metadata is not None
    assert metadata["source"] == "apple"
    assert metadata["apple_uid"] == APPLE_1
    assert metadata["member_slug"] == "anna"
    household_meta = await store.async_get_task_metadata(household.uid or "")
    assert household_meta is not None
    assert household_meta["member_slug"] == "household"

    (row,) = await store.async_get_apple_sync_state("anna")
    assert row["apple_uid"] == APPLE_1
    assert row["item_uid"] == anna.uid
    assert runtime.status is not None
    assert runtime.status.host == "mac-mini"
    assert runtime.status.created == 2
    assert runtime.available_lists == ["Anna", "Family"]


async def test_repeat_sync_is_a_noop(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    reminders = [_reminder(APPLE_1, "Pack bag", due="2026-09-04T17:00:00+02:00")]
    await _sync(hass, entry, store, runtime, ("Anna", reminders))
    before = _items(hass, "todo.anna")

    with patch.object(
        type(_entity(hass, "todo.anna")), "async_update_todo_item"
    ) as update:
        result = await _sync(hass, entry, store, runtime, ("Anna", reminders))

    update.assert_not_called()
    assert result["created"] == 0 and result["updated"] == 0
    assert _items(hass, "todo.anna") == before


async def test_changed_title_notes_and_due_update_by_apple_id(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Pack bag")]))
    uid = _by_apple(hass, "todo.anna")[APPLE_1].uid

    result = await _sync(
        hass, entry, store, runtime,
        ("Anna", [_reminder(APPLE_1, "Pack the bag", due="2026-09-05", notes="Shoes")]),
    )

    assert result["updated"] == 1
    assert len(_items(hass, "todo.anna")) == 1
    item = _by_apple(hass, "todo.anna")[APPLE_1]
    assert item.uid == uid
    assert item.summary == "Pack the bag"
    assert item.due == date(2026, 9, 5)
    assert item.description == f"[apple:{APPLE_1}] Shoes"


async def test_cleared_due_date_is_cleared_in_ha(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(
        hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Pack bag", due="2026-09-05")])
    )
    assert _by_apple(hass, "todo.anna")[APPLE_1].due == date(2026, 9, 5)

    await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Pack bag")]))

    assert _by_apple(hass, "todo.anna")[APPLE_1].due is None


async def test_datetime_due_keeps_its_offset(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(
        hass, entry, store, runtime,
        ("Anna", [_reminder(APPLE_1, "Dentist", due="2026-09-05T17:30:00+02:00")]),
    )
    due = _by_apple(hass, "todo.anna")[APPLE_1].due
    assert isinstance(due, datetime)
    assert due == datetime(2026, 9, 5, 15, 30, tzinfo=UTC)


async def test_blank_title_gets_a_placeholder(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "  ")]))
    assert _by_apple(hass, "todo.anna")[APPLE_1].summary == "Untitled reminder"


async def test_reminder_gone_from_active_set_completes_the_ha_item(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(
        hass, entry, store, runtime,
        ("Anna", [_reminder(APPLE_1, "Pack bag"), _reminder(APPLE_2, "Homework")]),
    )

    result = await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_2, "Homework")]))

    assert result["completed_in_ha"] == 1
    assert result["complete"] == []
    items = _by_apple(hass, "todo.anna")
    assert items[APPLE_1].status == TodoItemStatus.COMPLETED
    assert items[APPLE_2].status == TodoItemStatus.NEEDS_ACTION
    rows = {r["apple_uid"] for r in await store.async_get_apple_sync_state("anna")}
    assert rows == {APPLE_2}


async def test_reminder_reported_completed_is_treated_as_inactive(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Pack bag")]))

    done = {**_reminder(APPLE_1, "Pack bag"), "completed": True}
    await _sync(hass, entry, store, runtime, ("Anna", [done]))

    assert _by_apple(hass, "todo.anna")[APPLE_1].status == TodoItemStatus.COMPLETED


async def test_blueprint_era_item_without_a_row_is_adopted_and_completed(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A sentinel item the old blueprint wrote has no sync row; it is still ours."""
    entry, store, runtime = await _setup(hass, tmp_path)
    entity = _entity(hass, "todo.anna")
    await entity.async_create_todo_item(
        TodoItem(
            uid="legacy-uid",
            summary="Old task",
            status=TodoItemStatus.NEEDS_ACTION,
            description=f"[apple:{APPLE_1}] note",
        )
    )
    await hass.async_block_till_done()

    result = await _sync(
        hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Old task", notes="note")])
    )
    assert result["created"] == 0 and result["updated"] == 0
    (row,) = await store.async_get_apple_sync_state("anna")
    assert row["item_uid"] == "legacy-uid"
    # Adopted too, so the daily reset owns it once completed.
    metadata = await store.async_get_task_metadata("legacy-uid")
    assert metadata is not None
    assert metadata["source"] == "apple" and metadata["apple_uid"] == APPLE_1

    result = await _sync(hass, entry, store, runtime, ("Anna", []))
    assert result["completed_in_ha"] == 1
    assert _by_apple(hass, "todo.anna")[APPLE_1].status == TodoItemStatus.COMPLETED
    assert await store.async_get_apple_sync_state("anna") == []


# ---------------------------------------------------------------------------
# HA → Apple (response-driven)
# ---------------------------------------------------------------------------


async def test_item_completed_in_ha_is_reported_and_not_reopened(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    reminders = [_reminder(APPLE_1, "Pack bag")]
    await _sync(hass, entry, store, runtime, ("Anna", reminders))
    item = _by_apple(hass, "todo.anna")[APPLE_1]
    await _entity(hass, "todo.anna").async_update_todo_item(
        TodoItem(
            uid=item.uid,
            summary=item.summary,
            status=TodoItemStatus.COMPLETED,
            description=item.description,
        )
    )
    await hass.async_block_till_done()

    result = await _sync(hass, entry, store, runtime, ("Anna", reminders))

    assert result["complete"] == [APPLE_1]
    assert result["updated"] == 0
    assert _by_apple(hass, "todo.anna")[APPLE_1].status == TodoItemStatus.COMPLETED
    assert runtime.status is not None and runtime.status.sent_complete == 1
    # Still reported while Apple keeps listing it as open.
    assert (await _sync(hass, entry, store, runtime, ("Anna", reminders)))["complete"] == [
        APPLE_1
    ]


async def test_item_deleted_in_ha_is_reported_and_not_recreated(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    reminders = [_reminder(APPLE_1, "Pack bag")]
    await _sync(hass, entry, store, runtime, ("Anna", reminders))
    uid = _by_apple(hass, "todo.anna")[APPLE_1].uid
    await _entity(hass, "todo.anna").async_delete_todo_items([uid])
    await hass.async_block_till_done()

    result = await _sync(hass, entry, store, runtime, ("Anna", reminders))

    assert result["complete"] == [APPLE_1]
    assert result["created"] == 0
    assert _items(hass, "todo.anna") == []
    # Row survives until the reminder leaves the active set …
    assert [r["apple_uid"] for r in await store.async_get_apple_sync_state("anna")] == [APPLE_1]
    # … so a bridge that failed to complete it still cannot resurrect the task.
    result = await _sync(hass, entry, store, runtime, ("Anna", reminders))
    assert result["created"] == 0 and result["complete"] == [APPLE_1]
    # And once Apple confirms, the row is gone.
    result = await _sync(hass, entry, store, runtime, ("Anna", []))
    assert result["complete"] == []
    assert await store.async_get_apple_sync_state("anna") == []


async def test_unknown_reminder_with_no_row_is_created_not_completed(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await store.async_upsert_apple_sync_state(APPLE_2, "anna", "some-uid")

    result = await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "New")]))

    assert result["created"] == 1
    assert result["complete"] == []


# ---------------------------------------------------------------------------
# Readability, mapping, repairs
# ---------------------------------------------------------------------------


async def test_missing_entity_skips_the_list_without_writes(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(
        hass, tmp_path, members=[_member("anna", "Anna"), _member("ben", "Ben")]
    )
    await store.async_upsert_apple_sync_state(APPLE_2, "ben", "ben-uid")

    result = await _sync(
        hass, entry, store, runtime,
        ("Ben", [_reminder(APPLE_1, "Would be new")]),
        ("Anna", [_reminder(APPLE_1, "Created")]),
    )

    assert result["skipped_lists"] == ["Ben"]
    assert result["created"] == 1
    assert result["received"] == 1  # the skipped list's items are not counted
    assert result["complete"] == []
    assert len(await store.async_get_apple_sync_state("ben")) == 1


async def test_unavailable_entity_skips_the_list(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Pack bag")]))
    hass.states.async_set("todo.anna", STATE_UNAVAILABLE)

    result = await _sync(hass, entry, store, runtime, ("Anna", []))

    assert result["skipped_lists"] == ["Anna"]
    assert result["completed_in_ha"] == 0
    assert _by_apple(hass, "todo.anna")[APPLE_1].status == TodoItemStatus.NEEDS_ACTION
    assert len(await store.async_get_apple_sync_state("anna")) == 1


async def test_unloaded_items_skip_the_list(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Pack bag")]))

    with patch.object(
        type(_entity(hass, "todo.anna")), "todo_items", property(lambda _self: None)
    ):
        result = await _sync(hass, entry, store, runtime, ("Anna", []))

    assert result["skipped_lists"] == ["Anna"]
    assert _by_apple(hass, "todo.anna")[APPLE_1].status == TodoItemStatus.NEEDS_ACTION


async def test_unmapped_list_is_ignored_and_reported(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)

    result = await _sync(
        hass, entry, store, runtime, ("Groceries", [_reminder(APPLE_1, "Milk")])
    )

    assert result["unmapped_lists"] == ["Groceries"]
    assert result["received"] == 0
    assert _items(hass, HOUSEHOLD_ENTITY_ID) == [] and _items(hass, "todo.anna") == []


async def test_list_names_match_case_insensitively(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    result = await _sync(hass, entry, store, runtime, (" family ", [_reminder(APPLE_1, "Milk")]))
    assert result["created"] == 1
    assert APPLE_1 in _by_apple(hass, HOUSEHOLD_ENTITY_ID)


async def test_missing_mapped_list_raises_and_clears_a_repairs_issue(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    registry = ir.async_get(hass)
    issue_id = f"{ISSUE_APPLE_LIST_MISSING}_anna"

    await _sync(hass, entry, store, runtime, ("Family", []), available=["Family", "Groceries"])
    issue = registry.async_get_issue(DOMAIN, issue_id)
    assert issue is not None
    assert issue.translation_placeholders == {
        "list": "Anna",
        "target": "Anna",
        "host": "mac-mini",
        "available": "Family, Groceries",
    }
    assert registry.async_get_issue(DOMAIN, f"{ISSUE_APPLE_LIST_MISSING}_household") is None

    await _sync(hass, entry, store, runtime, ("Family", []), available=["Family", "anna"])
    assert registry.async_get_issue(DOMAIN, issue_id) is None


async def test_empty_available_lists_raises_no_issue(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(hass, entry, store, runtime, ("Family", []), available=[])
    assert not ir.async_get(hass).issues


# ---------------------------------------------------------------------------
# Lock discipline
# ---------------------------------------------------------------------------


async def test_create_holds_the_uid_lock_across_the_metadata_insert(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    observed: list[int] = []
    original = store.async_add_task_metadata

    async def _spy(**kwargs: Any) -> None:
        observed.append(lock_holders(kwargs["item_uid"]))
        await original(**kwargs)

    with patch.object(store, "async_add_task_metadata", side_effect=_spy):
        await _sync(hass, entry, store, runtime, ("Anna", [_reminder(APPLE_1, "Pack bag")]))

    assert observed == [1]


# ---------------------------------------------------------------------------
# Webhook handler
# ---------------------------------------------------------------------------


def _body(response: Any) -> Any:
    return json.loads(response.body)


def _request(method: str, body: Any = None) -> Any:
    if body is None:
        content = b""
    elif isinstance(body, bytes):
        content = body
    else:
        content = json.dumps(body).encode()
    return MockRequest(content=content, mock_source="test", method=method)


async def test_get_returns_mapping(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, _ = await _setup(hass, tmp_path)
    response = await async_handle_webhook(hass, WEBHOOK_ID, _request("GET"))
    assert response.status == 200
    assert _body(response) == mapping_payload(store, entry)


async def test_post_syncs_and_answers(hass: HomeAssistant, tmp_path: Path) -> None:
    await _setup(hass, tmp_path)
    body = {
        "version": 1,
        "host": "mini",
        "bridge_version": "1.6.0",
        "available_lists": ["Family", "Anna"],
        "lists": [{"name": "Anna", "items": [_reminder(APPLE_1, "Pack bag")]}],
    }
    response = await async_handle_webhook(hass, WEBHOOK_ID, _request("POST", body))
    await hass.async_block_till_done()
    assert response.status == 200
    assert _body(response)["created"] == 1
    assert APPLE_1 in _by_apple(hass, "todo.anna")


async def test_unknown_webhook_is_404(hass: HomeAssistant, tmp_path: Path) -> None:
    await _setup(hass, tmp_path)
    response = await async_handle_webhook(hass, "b" * 64, _request("GET"))
    assert response.status == 404


async def test_invalid_json_is_400(hass: HomeAssistant, tmp_path: Path) -> None:
    await _setup(hass, tmp_path)
    response = await async_handle_webhook(hass, WEBHOOK_ID, _request("POST", b"{not json"))
    assert response.status == 400
    assert _body(response)["error"] == "invalid_json"


@pytest.mark.parametrize(
    "body",
    [
        {"version": 1},
        {"version": 2, "lists": []},
        {"version": 1, "lists": [{"name": "Anna", "items": [{"title": "x"}]}]},
        {"version": 1, "lists": [{"name": "Anna", "items": [{"id": 7, "title": "x"}]}]},
    ],
)
async def test_invalid_payload_is_400(hass: HomeAssistant, tmp_path: Path, body: Any) -> None:
    await _setup(hass, tmp_path)
    response = await async_handle_webhook(hass, WEBHOOK_ID, _request("POST", body))
    assert response.status == 400
    assert _body(response)["error"] == "invalid_payload"


async def test_internal_failure_is_500_not_200(hass: HomeAssistant, tmp_path: Path) -> None:
    _, _, runtime = await _setup(hass, tmp_path)
    body = {"version": 1, "lists": [{"name": "Anna", "items": [_reminder(APPLE_1, "x")]}]}
    with patch(
        "custom_components.lucarne_family.apple_bridge.async_apply_sync",
        side_effect=RuntimeError("boom"),
    ):
        response = await async_handle_webhook(hass, WEBHOOK_ID, _request("POST", body))
    assert response.status == 500
    assert _body(response) == {"ok": False, "error": "internal", "detail": "boom"}
    assert runtime.status is not None and runtime.status.error == "boom"


async def test_concurrent_posts_serialize(hass: HomeAssistant, tmp_path: Path) -> None:
    _, _, runtime = await _setup(hass, tmp_path)
    body = {"version": 1, "lists": [{"name": "Anna", "items": [_reminder(APPLE_1, "x")]}]}
    active = 0
    peak = 0

    async def _slow(*args: Any, **kwargs: Any) -> dict[str, Any]:
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.01)
        active -= 1
        return {"ok": True}

    with patch("custom_components.lucarne_family.apple_bridge.async_apply_sync", side_effect=_slow):
        await asyncio.gather(
            async_handle_webhook(hass, WEBHOOK_ID, _request("POST", body)),
            async_handle_webhook(hass, WEBHOOK_ID, _request("POST", body)),
        )
    assert peak == 1
    assert not runtime.lock.locked()


async def test_last_seen_is_written_once_per_row(hass: HomeAssistant, tmp_path: Path) -> None:
    """A steady-state sync must not rewrite every row every five minutes."""
    entry, store, runtime = await _setup(hass, tmp_path)
    reminders = [_reminder(APPLE_1, "a"), _reminder(APPLE_2, "b")]
    await _sync(hass, entry, store, runtime, ("Anna", reminders))
    with patch.object(store, "async_upsert_apple_sync_state") as upsert:
        await _sync(hass, entry, store, runtime, ("Anna", reminders))
    upsert.assert_not_called()


def test_due_before_epoch_is_still_a_date() -> None:
    item = {"id": "a", "title": "t", "due": "1999-01-02"}
    parsed = POST_SCHEMA({"version": 1, "lists": [{"name": "x", "items": [item]}]})
    assert parsed["lists"][0]["items"][0]["due"] == date(1999, 1, 2)


def test_naive_datetime_gets_the_default_zone() -> None:
    item = {"id": "a", "title": "t", "due": "2026-09-05T10:00:00"}
    parsed = POST_SCHEMA({"version": 1, "lists": [{"name": "x", "items": [item]}]})
    due = parsed["lists"][0]["items"][0]["due"]
    assert isinstance(due, datetime)
    assert due.tzinfo is not None


async def test_household_repairs_issue_names_the_household(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path, household_list="Casa")
    await _sync(hass, entry, store, runtime, ("Anna", []), available=["Anna"])
    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"{ISSUE_APPLE_LIST_MISSING}_household")
    assert issue is not None
    assert issue.translation_placeholders is not None
    assert issue.translation_placeholders["target"] == "the household list"


async def test_unparseable_due_syncs_the_reminder_without_a_date(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    result = await _sync(
        hass, entry, store, runtime,
        ("Anna", [_reminder(APPLE_1, "Dentist", due="tomorrow"), _reminder(APPLE_2, "Bag")]),
    )
    assert result["created"] == 2
    assert _by_apple(hass, "todo.anna")[APPLE_1].due is None


async def test_unusable_id_is_skipped_not_fatal(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, store, runtime = await _setup(hass, tmp_path)
    result = await _sync(
        hass, entry, store, runtime,
        ("Anna", [_reminder("a]b", "Broken"), _reminder("", "Blank"), _reminder(APPLE_2, "Bag")]),
    )
    assert result["created"] == 1
    assert list(_by_apple(hass, "todo.anna")) == [APPLE_2]


async def test_clear_all_repairs_leaves_other_issues(hass: HomeAssistant, tmp_path: Path) -> None:
    from custom_components.lucarne_family.apple_bridge import async_clear_all_repairs

    entry, store, runtime = await _setup(hass, tmp_path)
    await _sync(hass, entry, store, runtime, ("Family", []), available=["Family"])
    registry = ir.async_get(hass)
    ir.async_create_issue(
        hass, DOMAIN, "something_else", is_fixable=False,
        severity=ir.IssueSeverity.WARNING, translation_key="something_else",
    )
    assert registry.async_get_issue(DOMAIN, f"{ISSUE_APPLE_LIST_MISSING}_anna") is not None

    async_clear_all_repairs(hass)

    assert registry.async_get_issue(DOMAIN, f"{ISSUE_APPLE_LIST_MISSING}_anna") is None
    assert registry.async_get_issue(DOMAIN, "something_else") is not None


async def test_sentinel_edited_away_relinks_instead_of_completing(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """HA's to-do panel shows the raw description; deleting the marker is not a delete."""
    entry, store, runtime = await _setup(hass, tmp_path)
    reminders = [_reminder(APPLE_1, "Pack bag", notes="Gym kit")]
    await _sync(hass, entry, store, runtime, ("Anna", reminders))
    item = _by_apple(hass, "todo.anna")[APPLE_1]
    await _entity(hass, "todo.anna").async_update_todo_item(
        TodoItem(uid=item.uid, summary="Pack bag", status=item.status, description="Gym kit")
    )
    await hass.async_block_till_done()
    assert _by_apple(hass, "todo.anna") == {}

    result = await _sync(hass, entry, store, runtime, ("Anna", reminders))

    assert result["complete"] == []
    assert result["created"] == 0
    assert result["updated"] == 1
    relinked = _by_apple(hass, "todo.anna")[APPLE_1]
    assert relinked.uid == item.uid
    assert relinked.description == f"[apple:{APPLE_1}] Gym kit"
    assert relinked.status == TodoItemStatus.NEEDS_ACTION
    assert len(_items(hass, "todo.anna")) == 1


async def test_client_strings_are_bounded_at_the_schema(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Everything that lands in frontend markdown is clipped once, in POST_SCHEMA."""
    entry, store, runtime = await _setup(hass, tmp_path)
    raw = {
        "version": 1,
        "host": "h" * 500,
        "bridge_version": "v" * 500,
        "available_lists": ["x" * 500],
        "lists": [{"name": "n" * 500, "items": []}],
    }
    data = POST_SCHEMA(raw)
    assert len(data["host"]) == 200
    assert len(data["bridge_version"]) == 200
    assert data["available_lists"] == ["x" * 200]
    assert data["lists"][0]["name"] == "n" * 200

    result = await async_apply_sync(hass, store, entry, runtime, data)
    assert result["unmapped_lists"] == ["n" * 200]
    assert runtime.status is not None
    assert len(runtime.status.host) == 200
    assert len(runtime.status.bridge_version) == 200

    # Too many lists is rejected outright rather than partially kept.
    with pytest.raises(vol.Invalid):
        POST_SCHEMA({**raw, "available_lists": ["a"] * 51})
    with pytest.raises(vol.Invalid):
        POST_SCHEMA({**raw, "lists": [{"name": f"l{i}", "items": []} for i in range(51)]})


async def test_error_path_status_uses_clipped_strings(hass: HomeAssistant, tmp_path: Path) -> None:
    _, _, runtime = await _setup(hass, tmp_path)
    body = {"version": 1, "host": "h" * 500, "bridge_version": "b" * 500, "lists": []}
    with patch(
        "custom_components.lucarne_family.apple_bridge.async_apply_sync",
        side_effect=RuntimeError("boom"),
    ):
        response = await async_handle_webhook(hass, WEBHOOK_ID, _request("POST", body))
    assert response.status == 500
    assert runtime.status is not None
    assert len(runtime.status.host) == 200
    assert len(runtime.status.bridge_version) == 200
