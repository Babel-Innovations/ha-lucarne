"""Tests for reset_logic.py (Phase 3-A)."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.reset_logic import async_perform_daily_reset
from custom_components.lucarne_family.store import LucarneFamilyStore


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
            "round_trip": {
                "enabled": False,
                "webhook_url": "",
                "secret": "",
                "device_name": "",
            },
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


async def _add_item_and_metadata(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entity_id: str,
    uid: str,
    summary: str,
    item_type: str,
    member_slug: str = "anna",
    recurrence: str = "",
) -> None:
    """Create a todo item and its metadata row."""
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity(entity_id)
    assert entity is not None, f"Entity {entity_id} not found"
    await entity.async_create_todo_item(
        TodoItem(uid=uid, summary=summary, status=TodoItemStatus.NEEDS_ACTION)
    )
    await store.async_add_task_metadata(
        member_slug=member_slug,
        item_uid=uid,
        type=item_type,
        recurrence=recurrence,
    )


async def _complete_item(hass: HomeAssistant, entity_id: str, uid: str, summary: str) -> None:
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity(entity_id)
    assert entity is not None
    await entity.async_update_todo_item(
        TodoItem(uid=uid, summary=summary, status=TodoItemStatus.COMPLETED)
    )


async def test_reset_flips_routines_and_deletes_completed_chores(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Reset flips completed routines back to needs_action and deletes completed chores."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item_and_metadata(hass, store, "todo.anna", "r-001", "Brush teeth", "routine")
    await _add_item_and_metadata(hass, store, "todo.anna", "c-001", "Wash dishes", "chore")

    await _complete_item(hass, "todo.anna", "r-001", "Brush teeth")
    await _complete_item(hass, "todo.anna", "c-001", "Wash dishes")
    await hass.async_block_till_done()

    reset_count = await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    # Return value counts routines flipped, not chores deleted.
    assert reset_count == 1

    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.anna")
    assert entity is not None
    items = {i.uid: i for i in (entity.todo_items or []) if i.uid}
    assert items["r-001"].status == TodoItemStatus.NEEDS_ACTION
    # The completed one-off chore is removed entirely, item and metadata.
    assert "c-001" not in items
    assert await store.async_get_task_metadata("c-001") is None


async def test_reset_keeps_incomplete_chores(hass: HomeAssistant, tmp_path: Path) -> None:
    """An incomplete one-off chore survives the reset (only completed ones go away)."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item_and_metadata(hass, store, "todo.anna", "c-keep", "Take out trash", "chore")
    await hass.async_block_till_done()

    reset_count = await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    assert reset_count == 0
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.anna")
    assert entity is not None
    items = {i.uid: i for i in (entity.todo_items or []) if i.uid}
    assert "c-keep" in items, "incomplete one-off chore is kept"
    assert items["c-keep"].status == TodoItemStatus.NEEDS_ACTION
    assert await store.async_get_task_metadata("c-keep") is not None


async def test_reset_deletes_completed_household_chore(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Completed one-off chores on the shared household list are deleted too."""
    await _setup_member_todo(hass, "anna")
    await _setup_member_todo(hass, "lucarne_household")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item_and_metadata(
        hass,
        store,
        "todo.lucarne_household",
        "h-001",
        "Clean up",
        "chore",
        member_slug="household",
    )
    await _complete_item(hass, "todo.lucarne_household", "h-001", "Clean up")
    await hass.async_block_till_done()

    deleted_events: list[dict] = []
    hass.bus.async_listen(
        "lucarne_family_task_deleted", lambda e: deleted_events.append(dict(e.data))
    )

    await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    assert entity is not None
    items = {i.uid: i for i in (entity.todo_items or []) if i.uid}
    assert "h-001" not in items, "completed household chore is deleted"
    assert await store.async_get_task_metadata("h-001") is None
    assert any(ev.get("uid") == "h-001" for ev in deleted_events), "delete event fired"


async def test_reset_flips_completed_household_routine(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Completed routines on the shared household list are flipped back too.

    Regression: a completed recurring household routine (e.g. a biweekly task)
    must be reset to needs_action so it shows fresh on its next due day instead
    of lingering crossed-out. The card hides it on off-days via its RRULE, but
    only the reset can clear the stale completion.
    """
    await _setup_member_todo(hass, "anna")
    await _setup_member_todo(hass, "lucarne_household")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item_and_metadata(
        hass,
        store,
        "todo.lucarne_household",
        "h-rt",
        "Take out Ridwell",
        "routine",
        member_slug="household",
        recurrence="FREQ=WEEKLY;BYDAY=WE;INTERVAL=2",
    )
    await _complete_item(hass, "todo.lucarne_household", "h-rt", "Take out Ridwell")
    await hass.async_block_till_done()

    reset_count = await async_perform_daily_reset(hass, store)
    await hass.async_block_till_done()

    assert reset_count == 1, "household routine counts toward the reset total"
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.lucarne_household")
    assert entity is not None
    items = {i.uid: i for i in (entity.todo_items or []) if i.uid}
    assert "h-rt" in items, "household routine is kept, not deleted"
    assert items["h-rt"].status == TodoItemStatus.NEEDS_ACTION, (
        "completed household routine is flipped back to needs_action"
    )
    assert await store.async_get_task_metadata("h-rt") is not None


async def test_reset_is_idempotent(hass: HomeAssistant, tmp_path: Path) -> None:
    """Calling reset twice: second call finds nothing completed, returns 0."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    await _add_item_and_metadata(
        hass, store, "todo.anna", "r-001", "Make bed", "routine", recurrence="FREQ=DAILY"
    )
    await _complete_item(hass, "todo.anna", "r-001", "Make bed")

    first_count = await async_perform_daily_reset(hass, store)
    assert first_count == 1

    second_count = await async_perform_daily_reset(hass, store)
    assert second_count == 0


async def test_reset_log_rows_match_reset_count(hass: HomeAssistant, tmp_path: Path) -> None:
    """Each reset appends exactly one 'reset' log row per item reset.

    Completion logging is handled by the completion_listener (Phase 3-C). The listener
    is started here so that the COMPLETED→NEEDS_ACTION transitions produced by
    async_perform_daily_reset are classified as action='reset' (via the reset-pending
    mechanism) and written to completion_log.
    """
    from custom_components.lucarne_family.completion_listener import async_start_completion_listener

    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    for i in range(3):
        uid = f"r-{i:03d}"
        await _add_item_and_metadata(
            hass, store, "todo.anna", uid, f"Routine {i}", "routine", recurrence="FREQ=DAILY"
        )
        await _complete_item(hass, "todo.anna", uid, f"Routine {i}")

    # Start listener after items are set to completed so the pre-populated snapshot
    # reflects the completed state. The reset will flip items to NEEDS_ACTION and the
    # listener will classify each as action='reset'.
    unsub_listener = async_start_completion_listener(hass, store, {"todo.anna"})

    reset_count = await async_perform_daily_reset(hass, store)
    assert reset_count == 3

    # Allow the async tasks created by the state-change listener to complete.
    await hass.async_block_till_done()

    def _count_reset_rows() -> int:
        with store._db_connect() as con:
            return con.execute(
                "SELECT COUNT(*) FROM completion_log WHERE member_slug='anna' AND action='reset'"
            ).fetchone()[0]

    count = await hass.async_add_executor_job(_count_reset_rows)
    unsub_listener()
    assert count == 3


async def test_reset_items_without_metadata_are_skipped(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Completed items that have no metadata row are not reset."""
    await _setup_member_todo(hass, "anna")
    entry = _make_entry(hass, "anna")
    store = await _make_store(hass, entry.entry_id, tmp_path)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}

    # Create item without metadata row
    todo_component = hass.data[DATA_COMPONENT]
    entity = todo_component.get_entity("todo.anna")
    assert entity is not None
    await entity.async_create_todo_item(
        TodoItem(uid="orphan-001", summary="Orphan item", status=TodoItemStatus.NEEDS_ACTION)
    )
    await _complete_item(hass, "todo.anna", "orphan-001", "Orphan item")

    reset_count = await async_perform_daily_reset(hass, store)
    assert reset_count == 0
