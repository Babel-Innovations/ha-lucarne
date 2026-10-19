"""Listener-driven earn/revoke of task points."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

from homeassistant.components.todo import TodoItem
from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import Context, HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lucarne_family.completion_listener import (
    _RESET_PENDING_KEY,
    async_start_completion_listener,
)
from custom_components.lucarne_family.const import DOMAIN
from custom_components.lucarne_family.models import Member
from custom_components.lucarne_family.rewards import async_record_task_transition
from custom_components.lucarne_family.rotation import serialize_owners
from custom_components.lucarne_family.store import LucarneFamilyStore, StoreError

_SLUGS = ["anna", "bob"]


def _make_entry(hass: HomeAssistant) -> MockConfigEntry:
    members = [
        Member(
            slug=slug, name=slug.capitalize(), color="#ff0000", avatar=None,
            created_at=datetime.now(UTC), preset="adult-none",
            todo_entity_id=f"todo.{slug}", streak_counter_id="",
        ).to_dict()
        for slug in _SLUGS
    ]
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Family",
        data={
            "family_name": "Family",
            "members": members,
            "reset_time": "04:00",
            "streak_check_time": "21:00",
            "round_trip": {"enabled": False, "webhook_url": "", "secret": "", "device_name": ""},
            "custom_presets": [],
        },
    )
    entry.add_to_hass(hass)
    return entry


async def _setup(hass: HomeAssistant, tmp_path: Path) -> LucarneFamilyStore:
    await async_setup_component(hass, "local_todo", {})
    await async_setup_component(hass, "todo", {})
    await hass.async_block_till_done()
    for name in ["lucarne_household", *_SLUGS]:
        await hass.config_entries.flow.async_init(
            "local_todo", context={"source": "user"}, data={"todo_list_name": name}
        )
    await hass.async_block_till_done()
    entry = _make_entry(hass)
    store = LucarneFamilyStore(hass, entry.entry_id, str(tmp_path / "lucarne.db"))
    await store.async_init()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"store": store}
    return store


def _entity(hass: HomeAssistant, entity_id: str) -> Any:
    entity = hass.data[DATA_COMPONENT].get_entity(entity_id)
    assert entity is not None
    return entity


async def _add_item(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    entity_id: str,
    uid: str,
    *,
    with_metadata: bool = True,
    **meta: Any,
) -> None:
    await _entity(hass, entity_id).async_create_todo_item(
        TodoItem(uid=uid, summary=f"task {uid}", status=TodoItemStatus.NEEDS_ACTION)
    )
    if with_metadata:
        meta.setdefault("member_slug", entity_id.removeprefix("todo."))
        meta.setdefault("type", "routine")
        await store.async_add_task_metadata(item_uid=uid, **meta)
    await hass.async_block_till_done()


async def _set(
    hass: HomeAssistant, entity_id: str, uid: str, status: TodoItemStatus
) -> None:
    await _entity(hass, entity_id).async_update_todo_item(
        TodoItem(uid=uid, summary=f"task {uid}", status=status)
    )
    await hass.async_block_till_done()


def _ledger(store: LucarneFamilyStore) -> list[tuple[str, str, int]]:
    with store._db_connect() as con:
        rows = con.execute(
            "SELECT kind, member_slug, delta FROM points_ledger ORDER BY id"
        ).fetchall()
    return [(r[0], r[1], r[2]) for r in rows]


async def _balances(store: LucarneFamilyStore) -> dict[str, int]:
    return await store.async_get_balances()


async def test_complete_earns_points(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})
    events: list[Any] = []
    hass.bus.async_listen("lucarne_family_rewards_updated", events.append)

    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)

    unsub()
    assert await _balances(store) == {"anna": 5}
    assert len(events) == 1


async def test_tick_untick_tick_nets_one_award(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)
    await _set(hass, "todo.anna", "u1", TodoItemStatus.NEEDS_ACTION)
    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)

    unsub()
    assert await _balances(store) == {"anna": 5}
    assert [r[0] for r in _ledger(store)] == ["earn", "revoke", "earn"]


async def test_reset_flip_neither_revokes_nor_blocks_next_earn(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)
    hass.data.setdefault(_RESET_PENDING_KEY, set()).add("u1")
    await _set(hass, "todo.anna", "u1", TodoItemStatus.NEEDS_ACTION)
    assert await _balances(store) == {"anna": 5}
    assert [r[0] for r in _ledger(store)] == ["earn"]

    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)
    unsub()
    assert await _balances(store) == {"anna": 10}


async def test_unadopted_item_earns_nothing(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", with_metadata=False)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)

    unsub()
    assert _ledger(store) == []


async def _add_rotating(hass: HomeAssistant, store: LucarneFamilyStore, uid: str) -> None:
    await _add_item(
        hass, store, "todo.lucarne_household", uid,
        member_slug="household", type="rotating", points=5,
        rotation_owners=serialize_owners(["anna", "bob"]), current_owner="anna",
    )


async def test_rotating_credits_owner_and_revokes_from_same_member(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_rotating(hass, store, "r1")
    unsub = async_start_completion_listener(hass, store, {"todo.lucarne_household"})

    await _set(hass, "todo.lucarne_household", "r1", TodoItemStatus.COMPLETED)
    assert await _balances(store) == {"anna": 5}

    await store.async_update_task_metadata("r1", current_owner="bob")
    await _set(hass, "todo.lucarne_household", "r1", TodoItemStatus.NEEDS_ACTION)

    unsub()
    assert await _balances(store) == {"anna": 0}
    assert _ledger(store)[-1] == ("revoke", "anna", -5)


async def test_revoke_uses_earned_points_not_current(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})

    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)
    await store.async_update_task_metadata("u1", points=8)
    await _set(hass, "todo.anna", "u1", TodoItemStatus.NEEDS_ACTION)

    unsub()
    assert _ledger(store)[-1] == ("revoke", "anna", -5)


async def test_undo_revokes_after_rotating_task_became_household_chore(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_rotating(hass, store, "r1")
    unsub = async_start_completion_listener(hass, store, {"todo.lucarne_household"})

    await _set(hass, "todo.lucarne_household", "r1", TodoItemStatus.COMPLETED)
    await store.async_update_task_metadata("r1", type="chore", points=0)
    await _set(hass, "todo.lucarne_household", "r1", TodoItemStatus.NEEDS_ACTION)

    unsub()
    assert await _balances(store) == {"anna": 0}


async def test_stale_completed_transition_is_skipped(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    metadata = await store.async_get_task_metadata("u1")

    await async_record_task_transition(
        hass, store, entity_id="todo.anna", uid="u1", action="completed",
        metadata=metadata, member_slug="anna", summary="s", actor_user_id=None,
        read_status=lambda: "needs_action",
    )

    assert _ledger(store) == []


async def test_rewards_failure_does_not_break_completion_logging(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})
    completed: list[Any] = []
    hass.bus.async_listen("lucarne_family_task_completed", completed.append)

    with patch.object(
        store, "async_ledger_record_earn", AsyncMock(side_effect=StoreError("boom"))
    ):
        await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)

    unsub()
    with store._db_connect() as con:
        n = con.execute("SELECT COUNT(*) FROM completion_log").fetchone()[0]
    assert n == 1
    assert len(completed) == 1


async def test_plain_household_chore_earns_nothing(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(
        hass, store, "todo.lucarne_household", "h1", member_slug="household",
        type="chore", points=5,
    )
    unsub = async_start_completion_listener(hass, store, {"todo.lucarne_household"})

    await _set(hass, "todo.lucarne_household", "h1", TodoItemStatus.COMPLETED)

    unsub()
    assert _ledger(store) == []


async def test_stale_undone_transition_is_skipped(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})
    await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)
    unsub()
    metadata = await store.async_get_task_metadata("u1")

    await async_record_task_transition(
        hass, store, entity_id="todo.anna", uid="u1", action="undone",
        metadata=metadata, member_slug="anna", summary="s", actor_user_id=None,
        read_status=lambda: "completed",
    )

    assert await _balances(store) == {"anna": 5}


async def test_earn_credits_the_user_who_ticked_not_a_later_writer(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    unsub = async_start_completion_listener(hass, store, {"todo.anna"})
    original = store.async_append_completion

    async def _someone_else_writes_meanwhile(**kwargs: Any) -> None:
        # Another user changes the list while the handler is between awaits.
        state = hass.states.get("todo.anna")
        assert state is not None
        hass.states.async_set(
            "todo.anna",
            state.state,
            state.attributes,
            force_update=True,
            context=Context(user_id="later"),
        )
        await original(**kwargs)

    with patch.object(store, "async_append_completion", _someone_else_writes_meanwhile):
        _entity(hass, "todo.anna").async_set_context(Context(user_id="ticker"))
        await _set(hass, "todo.anna", "u1", TodoItemStatus.COMPLETED)

    unsub()
    with store._db_connect() as con:
        actors = [r[0] for r in con.execute("SELECT actor_user_id FROM points_ledger")]
    assert actors == ["ticker"]


async def test_earn_for_a_member_gone_while_waiting_writes_nothing(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.anna", "u1", points=5)
    metadata = await store.async_get_task_metadata("u1")
    # anna is removed while the earn waits on the lock.
    await store.async_save_members([m for m in store.get_members() if m.slug != "anna"])

    await async_record_task_transition(
        hass, store, entity_id="todo.anna", uid="u1", action="completed",
        metadata=metadata, member_slug="anna", summary="s",
        actor_user_id=None, read_status=lambda: "completed",
    )

    assert _ledger(store) == []


async def test_earn_resolved_before_a_rename_credits_the_new_slug(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    store = await _setup(hass, tmp_path)
    await _add_item(hass, store, "todo.bob", "u1", points=5)
    metadata = await store.async_get_task_metadata("u1")

    # The listener resolved "anna_before_rename"; the store now says bob owns it.
    await async_record_task_transition(
        hass, store, entity_id="todo.bob", uid="u1", action="completed",
        metadata=metadata, member_slug="anna_before_rename", summary="s",
        actor_user_id=None, read_status=lambda: "completed",
    )

    assert _ledger(store) == [("earn", "bob", 5)]
