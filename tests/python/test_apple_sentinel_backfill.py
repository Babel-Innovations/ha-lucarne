"""Tests for apple_sentinel_backfill.py (Phase 3-D).

Verifies that newly-appeared todo items are checked for the Apple sentinel
[apple:UUID] and that metadata rows are written correctly.
"""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.apple_sentinel_backfill import (
    APPLE_SENTINEL_RE,
    async_backfill_apple_sentinel,
)
from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.store import LucarneFamilyStore

# ---------------------------------------------------------------------------
# Shared helpers (mirrors test_completion_listener.py helpers)
# ---------------------------------------------------------------------------


def _make_entry(hass: HomeAssistant, slug: str = "anna") -> MockConfigEntry:
    member = Member(
        slug=slug,
        name=slug.capitalize(),
        color="#ff0000",
        avatar=None,
        created_at=datetime.now(UTC),
        preset="school-age",
        todo_entity_id=f"todo.{slug}",
        streak_counter_id=f"counter.{slug}_streak",
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": [member.to_dict()],
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _setup_member_todo(hass: HomeAssistant, slug: str = "anna") -> None:
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()
    result = await hass.config_entries.flow.async_init(
        "local_todo",
        context={"source": "user"},
        data={"todo_list_name": slug},
    )
    await hass.async_block_till_done()
    assert result.get("type") == "create_entry"


async def _make_store(
    hass: HomeAssistant, entry_id: str, tmp_path: Path
) -> LucarneFamilyStore:
    db_path = str(tmp_path / "lucarne.db")
    store = LucarneFamilyStore(hass, entry_id, db_path)
    await store.async_init()
    return store


def _get_entity(hass: HomeAssistant, entity_id: str):
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity(entity_id)
    assert entity is not None, f"Entity {entity_id} not found"
    return entity


async def _add_item_with_description(
    hass: HomeAssistant,
    entity_id: str,
    uid: str,
    summary: str,
    description: str | None = None,
) -> None:
    entity = _get_entity(hass, entity_id)
    await entity.async_create_todo_item(
        TodoItem(
            uid=uid,
            summary=summary,
            status=TodoItemStatus.NEEDS_ACTION,
            description=description,
        )
    )
    await hass.async_block_till_done()


# ---------------------------------------------------------------------------
# Regex tests
# ---------------------------------------------------------------------------


def test_apple_sentinel_re_matches_standard_uuid() -> None:
    """Regex matches [apple:UUID] pattern."""
    text = "Clean room [apple:abc123]"
    m = APPLE_SENTINEL_RE.search(text)
    assert m is not None
    assert m.group(1) == "abc123"


def test_apple_sentinel_re_matches_dashed_uuid() -> None:
    """Regex matches Apple UUID with dashes."""
    text = "Feed cat [apple:A1B2-C3D4-E5F6]"
    m = APPLE_SENTINEL_RE.search(text)
    assert m is not None
    assert m.group(1) == "A1B2-C3D4-E5F6"


def test_apple_sentinel_re_no_match_missing_prefix() -> None:
    """Regex does not match without the apple: prefix."""
    text = "Clean room [uuid:abc123]"
    m = APPLE_SENTINEL_RE.search(text)
    assert m is None


def test_apple_sentinel_re_no_match_empty_description() -> None:
    """Regex does not match empty string."""
    assert APPLE_SENTINEL_RE.search("") is None


# ---------------------------------------------------------------------------
# Integration tests
# ---------------------------------------------------------------------------


async def test_backfill_writes_metadata_on_apple_sentinel(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Item with [apple:abc123] in description → metadata row written with source=apple."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)

    await _add_item_with_description(
        hass, "todo.anna", "uid-apple-1", "Clean room", description="[apple:abc123]"
    )

    result = await async_backfill_apple_sentinel(
        hass, store, "todo.anna", "uid-apple-1", "anna"
    )

    assert result is True
    metadata = await store.async_get_task_metadata("uid-apple-1")
    assert metadata is not None
    assert metadata["source"] == "apple"
    assert metadata["apple_uid"] == "abc123"
    assert metadata["type"] == "chore"
    assert metadata["member_slug"] == "anna"


async def test_backfill_no_sentinel_returns_false(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Item without Apple sentinel → returns False and no metadata row written."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)

    await _add_item_with_description(
        hass, "todo.anna", "uid-no-sentinel", "Brush teeth", description="Just a note"
    )

    result = await async_backfill_apple_sentinel(
        hass, store, "todo.anna", "uid-no-sentinel", "anna"
    )

    assert result is False
    metadata = await store.async_get_task_metadata("uid-no-sentinel")
    assert metadata is None


async def test_backfill_empty_description_returns_false(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Item with empty description → returns False."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)

    await _add_item_with_description(
        hass, "todo.anna", "uid-empty", "Make bed", description=None
    )

    result = await async_backfill_apple_sentinel(
        hass, store, "todo.anna", "uid-empty", "anna"
    )

    assert result is False
    assert await store.async_get_task_metadata("uid-empty") is None


async def test_backfill_idempotent_existing_metadata(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """If metadata row already exists, backfill does not overwrite and returns False."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)

    await _add_item_with_description(
        hass, "todo.anna", "uid-existing", "Feed cat", description="[apple:existing-id]"
    )

    # Pre-existing metadata row with a different source.
    await store.async_add_task_metadata(
        member_slug="anna",
        item_uid="uid-existing",
        type="routine",
        recurrence="daily",
        source="manual",
        apple_uid="",
    )

    result = await async_backfill_apple_sentinel(
        hass, store, "todo.anna", "uid-existing", "anna"
    )

    assert result is False
    # Original metadata must be preserved.
    metadata = await store.async_get_task_metadata("uid-existing")
    assert metadata is not None
    assert metadata["source"] == "manual"
    assert metadata["type"] == "routine"


async def test_backfill_sentinel_embedded_in_longer_description(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Sentinel embedded anywhere in description text is detected."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)

    long_desc = "From iPhone\nAdded via Shortcuts\n[apple:shortcut-uuid-001]\nExtra notes"
    await _add_item_with_description(
        hass, "todo.anna", "uid-long", "Walk the dog", description=long_desc
    )

    result = await async_backfill_apple_sentinel(
        hass, store, "todo.anna", "uid-long", "anna"
    )

    assert result is True
    metadata = await store.async_get_task_metadata("uid-long")
    assert metadata is not None
    assert metadata["apple_uid"] == "shortcut-uuid-001"


async def test_backfill_via_completion_listener_on_item_appear(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Integration: completion listener calls backfill when a new item appears with sentinel."""
    from custom_components.lucarne_family.completion_listener import (
        async_start_completion_listener,
    )

    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    # Add item with Apple sentinel via the entity — listener should pick it up.
    entity = _get_entity(hass, "todo.anna")
    await entity.async_create_todo_item(
        TodoItem(
            uid="uid-via-listener",
            summary="Apple synced task",
            status=TodoItemStatus.NEEDS_ACTION,
            description="[apple:bridge-uuid-42]",
        )
    )
    await hass.async_block_till_done()

    metadata = await store.async_get_task_metadata("uid-via-listener")
    unsub()
    assert metadata is not None
    assert metadata["source"] == "apple"
    assert metadata["apple_uid"] == "bridge-uuid-42"
