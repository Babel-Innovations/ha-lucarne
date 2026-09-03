"""State-change listener for managed todo entities (Phase 3-C).

Listens to state changes on all managed todo entities and appends
completion_log rows for every status transition. This is the authoritative
source for the completion log — toggle_task and other callers must NOT append
rows directly.

Reset suppression:
  reset_logic.async_perform_daily_reset marks each UID it is about to reset in
  hass.data["_lucarne_reset_pending"] (a set) before calling
  async_update_todo_item.  When this listener sees a COMPLETED→NEEDS_ACTION
  transition for a UID in that set it logs action="reset" (not "undone") and
  removes the UID from the set, so the row is written exactly once.
"""
from __future__ import annotations

import logging

from homeassistant.components.todo.const import DATA_COMPONENT, TodoItemStatus
from homeassistant.core import CALLBACK_TYPE, CoreState, Event, HomeAssistant, callback
from homeassistant.helpers.event import EventStateChangedData, async_track_state_change_event

from .apple_sentinel_backfill import async_backfill_apple_sentinel
from .store import LucarneFamilyStore
from .task_adoption import resolve_member_slug

_LOGGER = logging.getLogger(__name__)

# Domain-level key for the reset-pending UID set (shared across entries).
_RESET_PENDING_KEY = "_lucarne_reset_pending"
# Stash for the prev owner of a rotating task at reset time. reset_logic writes
# {uid: prev_slug} before the flip; the listener pops it to attribute the reset
# log row to the person who completed the task, not the newly-advanced owner.
# This avoids a read-ordering race: the listener runs async (hass.async_create_task)
# so by the time it reads metadata, current_owner has already been advanced in the DB.
_RESET_ROTATING_PREV_KEY = "_lucarne_reset_rotating_prev"


@callback
def async_start_completion_listener(
    hass: HomeAssistant,
    store: LucarneFamilyStore,
    managed_todo_entity_ids: set[str],
    entry_id: str = "",
) -> CALLBACK_TYPE:
    """Register state-change listener for managed todo entities.

    Returns an unsubscribe callback. Store it in hass.data so it can be
    cancelled on entry unload or member set change.

    State-change compatibility note (pinned HA version):
    HA's local_todo entity does NOT expose an `items` attribute on its state
    object. Instead we maintain an in-memory snapshot per entity and diff
    old-snapshot vs new-snapshot to identify which item changed status.
    A naive `if old_state != new_state: log` would fire on every attribute
    change (e.g. summary renames), producing incorrect log rows.

    HA fires state_changed during the initial state restoration window (~30 s
    after startup). Logging those would produce spurious rows for items that
    were completed before the restart. We guard with a started flag and
    EVENT_HOMEASSISTANT_STARTED.
    """
    if not managed_todo_entity_ids:
        return lambda: None

    # Per-entity item snapshots: {entity_id: {uid: (status, summary)}}
    _snapshots: dict[str, dict[str, tuple[str, str]]] = {}
    # Ignore state changes during HA startup state restoration.
    _started: list[bool] = [False]

    def _read_entity_snapshot(entity_id: str) -> dict[str, tuple[str, str]]:
        """Read the current {uid: (status, summary)} snapshot from the todo entity."""
        todo_component = hass.data.get(DATA_COMPONENT)
        if todo_component is None:
            return {}
        entity = todo_component.get_entity(entity_id)
        if entity is None:
            return {}
        result: dict[str, tuple[str, str]] = {}
        for item in entity.todo_items or []:
            if not item.uid:
                continue
            status_str = (
                "completed"
                if item.status == TodoItemStatus.COMPLETED
                else "needs_action"
            )
            result[item.uid] = (status_str, item.summary or "")
        return result

    @callback
    def _on_ha_started(_event: Event) -> None:
        # Re-snapshot all entities at start so the baseline reflects the world as
        # the user sees it. Entities may materialize asynchronously during the startup
        # state restoration window; the initial pre-population below may have seen
        # empty todo_items for those entities.
        for eid in managed_todo_entity_ids:
            _snapshots[eid] = _read_entity_snapshot(eid)
        _started[0] = True
        _LOGGER.debug("Completion listener active (HA started)")

    unsub_started = hass.bus.async_listen_once("homeassistant_started", _on_ha_started)

    # If HA is already running (integration reload after startup), mark started now.
    if hass.state is CoreState.running:
        _started[0] = True
        unsub_started()

    # Pre-populate snapshots so the first user-driven status change is classified
    # correctly. Without this, the old_snapshot would be empty and the first toggle
    # of any item would look like an "appeared" event and be silently skipped.
    for _eid in managed_todo_entity_ids:
        _snapshots[_eid] = _read_entity_snapshot(_eid)

    @callback
    def _on_state_changed(event: Event[EventStateChangedData]) -> None:
        if not _started[0]:
            return
        entity_id: str = event.data.get("entity_id", "")
        if entity_id not in managed_todo_entity_ids:
            return
        hass.async_create_task(
            _async_handle_state_change(entity_id),
            name=f"lucarne_completion_{entity_id}",
        )

    async def _async_handle_state_change(entity_id: str) -> None:
        old_snapshot = _snapshots.get(entity_id, {})
        new_snapshot = _read_entity_snapshot(entity_id)
        _snapshots[entity_id] = new_snapshot

        members_with_completions: set[str] = set()

        # Find status transitions by comparing snapshots.
        for uid in set(old_snapshot) | set(new_snapshot):
            old_entry = old_snapshot.get(uid)
            new_entry = new_snapshot.get(uid)

            if old_entry is None or new_entry is None:
                # Item appeared: check for Apple-sentinel in description and backfill metadata.
                #
                # Deliberately narrow — only bridge-synced items are enrolled here.
                # Adopting *every* appeared uid would hand a `type="chore"` row to
                # items Lucarne did not create (HA's to-do panel, voice, the
                # Companion app), and reset_logic deletes completed chores at the
                # daily reset window: ticking one off in HA's own to-do panel would
                # silently destroy it at 04:00. `metadata is None` is what keeps
                # those items out of the sweep. Un-adopted items are still fully
                # deletable and toggleable — task_service resolves them against the
                # todo entity (issue #111) — and update_task_metadata adopts one on
                # demand when the user actually edits it in Lucarne.
                if old_entry is None and new_entry is not None:
                    metadata = await store.async_get_task_metadata(uid)
                    member_slug_for_backfill = (
                        metadata["member_slug"]
                        if metadata
                        else _resolve_member(entity_id, store)
                    )
                    if member_slug_for_backfill:
                        await async_backfill_apple_sentinel(
                            hass, store, entity_id, uid, member_slug_for_backfill
                        )
                # Item appeared or disappeared — not a status transition to log.
                continue

            old_status, _ = old_entry
            new_status, summary = new_entry

            if old_status == new_status:
                continue

            if old_status != "completed" and new_status == "completed":
                action = "completed"
            elif old_status == "completed" and new_status != "completed":
                # Check if this transition was triggered by daily reset logic.
                # reset_logic marks UIDs in hass.data[_RESET_PENDING_KEY] before
                # calling async_update_todo_item so we log "reset" instead of "undone".
                reset_pending: set[str] = hass.data.get(_RESET_PENDING_KEY, set())
                if uid in reset_pending:
                    reset_pending.discard(uid)
                    action = "reset"
                else:
                    action = "undone"
            else:
                continue

            metadata = await store.async_get_task_metadata(uid)
            member_slug = (
                metadata["member_slug"]
                if metadata
                else _resolve_member(entity_id, store)
            )
            if not member_slug:
                _LOGGER.debug(
                    "No member found for entity %s uid %s; skipping log", entity_id, uid
                )
                continue

            # For rotating tasks, attribute the log row to the completer, not "household".
            # For reset rows, use the stash set by reset_logic before the flip (the DB
            # has already been advanced by the time this async handler runs).
            # For completed rows, current_owner in the DB is still correct.
            if metadata and metadata.get("type") == "rotating":
                rotating_prev: dict[str, str] = hass.data.get(
                    _RESET_ROTATING_PREV_KEY, {}
                )
                if uid in rotating_prev:
                    member_slug = rotating_prev.pop(uid)
                else:
                    member_slug = metadata.get("current_owner") or member_slug

            await store.async_append_completion(
                member_slug=member_slug,
                item_uid=uid,
                summary=summary,
                action=action,
                recurrence_at_time=metadata.get("recurrence", "") if metadata else "",
            )

            # Per-item completion event — only fires for "completed" transitions.
            # "undone" and "reset" transitions should not trigger automation triggers
            # that listen for "lucarne_family_task_completed".
            if action == "completed":
                hass.bus.async_fire(
                    "lucarne_family_task_completed",
                    {"member": member_slug, "uid": uid, "summary": summary},
                )
                members_with_completions.add(member_slug)

        # Check all-routines-done for each member that had at least one completion.
        # Called once per member (not per UID) to avoid firing the composite event
        # multiple times when several routines complete in the same state change.
        for member_slug in members_with_completions:
            await _maybe_fire_all_routines_done(member_slug, old_snapshot, new_snapshot)

    async def _maybe_fire_all_routines_done(
        member_slug: str,
        old_snapshot: dict[str, tuple[str, str]],
        new_snapshot: dict[str, tuple[str, str]],
    ) -> None:
        """Fire all_routines_done only on the False→True transition.

        Comparing old_snapshot vs new_snapshot ensures the event fires exactly
        once per day per member: when the last outstanding routine is checked off.
        """
        tasks = await store.async_get_tasks_for_member(member_slug)
        routine_uids = {t["item_uid"] for t in tasks if t.get("type") == "routine"}
        if not routine_uids:
            return

        def _all_done(snapshot: dict[str, tuple[str, str]]) -> bool:
            completed = {uid for uid, (status, _) in snapshot.items() if status == "completed"}
            return routine_uids.issubset(completed)

        if _all_done(new_snapshot) and not _all_done(old_snapshot):
            hass.bus.async_fire(
                "lucarne_family_all_routines_done", {"member": member_slug}
            )
            # Phase 3-F: also fire legacy event for backwards compatibility.
            hass.bus.async_fire(
                "ha_lucarne_chores_all_done", {"member": member_slug}
            )

    unsub_track = async_track_state_change_event(
        hass, list(managed_todo_entity_ids), _on_state_changed
    )

    @callback
    def unsub() -> None:
        unsub_track()
        if not _started[0]:
            unsub_started()

    return unsub


def _resolve_member(entity_id: str, store: LucarneFamilyStore) -> str:
    """Return the member slug for a todo entity_id, or empty string if not found.

    Delegates to the household-aware resolver: the shared list has no ``Member``
    row, so a plain scan over ``get_members()`` returned "" for it and both
    callers here gate on a truthy slug — which silently dropped every completion
    logged against an un-adopted household item (issue #111).
    """
    return resolve_member_slug(entity_id, store)
