"""Admin gate on the ``points`` field of add_task / update_task_metadata."""
from __future__ import annotations

from pathlib import Path

import pytest
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import ServiceValidationError, Unauthorized

from custom_components.lucarne_family.const import DOMAIN

from .test_task_service_rotating import _setup_with_household


async def _user_context(hass: HomeAssistant, *, admin: bool) -> Context:
    # "system-users" is full-policy, so is_admin is true for it; the read-only
    # group is the only built-in non-admin one.
    group = "system-admin" if admin else "system-read-only"
    if not any(u.is_owner for u in await hass.auth.async_get_users()):
        # The first non-system user becomes the owner, who is always admin.
        await hass.auth.async_create_user("owner", group_ids=["system-admin"])
    user = await hass.auth.async_create_user(
        "parent" if admin else "kid", group_ids=[group]
    )
    return Context(user_id=user.id)


async def _add(hass: HomeAssistant, data: dict, context: Context | None = None) -> None:
    await hass.services.async_call(
        DOMAIN, "add_task", data, blocking=True, context=context
    )
    await hass.async_block_till_done()


async def _tasks(store, slug: str):
    return await store.async_get_tasks_for_member(slug)


async def test_non_admin_cannot_set_points_on_add(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    _entry, store = await _setup_with_household(hass, tmp_path, ["anna"])
    ctx = await _user_context(hass, admin=False)

    with pytest.raises(Unauthorized):
        await _add(hass, {"member": "anna", "summary": "x", "points": 5}, ctx)

    assert await _tasks(store, "anna") == []
    entity = hass.data["todo"].get_entity("todo.anna")
    assert not entity.todo_items


async def test_admin_and_userless_can_set_points_on_add(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    _entry, store = await _setup_with_household(hass, tmp_path, ["anna"])
    ctx = await _user_context(hass, admin=True)

    await _add(hass, {"member": "anna", "summary": "a", "points": 5}, ctx)
    await _add(hass, {"member": "anna", "summary": "b", "points": 7}, Context())

    assert sorted(t["points"] for t in await _tasks(store, "anna")) == [5, 7]


async def test_non_admin_can_add_without_points(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    _entry, store = await _setup_with_household(hass, tmp_path, ["anna"])
    ctx = await _user_context(hass, admin=False)

    await _add(hass, {"member": "anna", "summary": "x"}, ctx)

    tasks = await _tasks(store, "anna")
    assert len(tasks) == 1
    assert tasks[0]["points"] == 0


async def test_non_admin_points_update_does_not_adopt(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    from homeassistant.components.todo import TodoItem
    from homeassistant.components.todo.const import TodoItemStatus

    _entry, store = await _setup_with_household(hass, tmp_path, ["anna"])
    entity = hass.data["todo"].get_entity("todo.anna")
    await entity.async_create_todo_item(
        TodoItem(uid="orphan-1", summary="x", status=TodoItemStatus.NEEDS_ACTION)
    )
    await hass.async_block_till_done()
    ctx = await _user_context(hass, admin=False)

    with pytest.raises(Unauthorized):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": "orphan-1", "points": 5},
            blocking=True,
            context=ctx,
        )

    assert await store.async_get_task_metadata("orphan-1") is None


async def test_household_chore_rejects_points(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await _setup_with_household(hass, tmp_path, ["anna", "bob"])

    with pytest.raises(ServiceValidationError, match="Household tasks"):
        await _add(hass, {"member": "household", "summary": "x", "points": 5})


async def test_household_rotating_accepts_points_and_type_change_raises(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    _entry, store = await _setup_with_household(hass, tmp_path, ["anna", "bob"])
    await _add(
        hass,
        {
            "member": "household",
            "summary": "bins",
            "type": "rotating",
            "rotation_owners": ["anna", "bob"],
            "points": 5,
        },
    )
    [task] = await store.async_get_rotating_tasks()
    assert task["points"] == 5

    with pytest.raises(ServiceValidationError, match="Household tasks"):
        await hass.services.async_call(
            DOMAIN,
            "update_task_metadata",
            {"uid": task["item_uid"], "type": "chore"},
            blocking=True,
        )
    assert (await store.async_get_task_metadata(task["item_uid"]))["type"] == "rotating"


# ---------------------------------------------------------------------------
# grant_points
# ---------------------------------------------------------------------------


async def _grant_setup(hass: HomeAssistant, tmp_path: Path):
    from custom_components.lucarne_family.rewards import async_setup_rewards_services

    entry, store = await _setup_with_household(hass, tmp_path, ["anna"])
    await async_setup_rewards_services(hass, entry.entry_id)
    return store


async def _grant(hass: HomeAssistant, data: dict, context: Context | None = None):
    return await hass.services.async_call(
        DOMAIN, "grant_points", data, blocking=True, context=context,
        return_response=True,
    )


def _ledger_actor_rows(store) -> list[tuple[str, str | None]]:
    with store._db_connect() as con:
        return [
            (r[0], r[1])
            for r in con.execute("SELECT reason, actor_user_id FROM points_ledger")
        ]


async def test_grant_points_non_admin_refused(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _grant_setup(hass, tmp_path)
    ctx = await _user_context(hass, admin=False)

    with pytest.raises(Unauthorized):
        await _grant(hass, {"member": "anna", "points": 5}, ctx)

    assert _ledger_actor_rows(store) == []


async def test_grant_points_records_actor(hass: HomeAssistant, tmp_path: Path) -> None:
    store = await _grant_setup(hass, tmp_path)
    ctx = await _user_context(hass, admin=True)

    result = await _grant(hass, {"member": "anna", "points": 5, "reason": " well done "}, ctx)
    assert result == {"balance": 5}
    assert await _grant(hass, {"member": "anna", "points": 2}, Context()) == {"balance": 7}

    assert _ledger_actor_rows(store) == [("well done", ctx.user_id), ("", None)]


@pytest.mark.parametrize(
    "data",
    [
        {"member": "anna", "points": 0},
        {"member": "anna", "points": 10001},
        {"member": "anna", "points": 1, "reason": "x" * 201},
    ],
)
async def test_grant_points_schema_rejects(
    hass: HomeAssistant, tmp_path: Path, data: dict
) -> None:
    import voluptuous as vol

    await _grant_setup(hass, tmp_path)
    with pytest.raises(vol.Invalid):
        await _grant(hass, data)


async def test_grant_points_unknown_or_household_member(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await _grant_setup(hass, tmp_path)
    for member in ("nobody", "household"):
        with pytest.raises(ServiceValidationError):
            await _grant(hass, {"member": member, "points": 1})
