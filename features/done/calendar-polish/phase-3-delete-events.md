---
status: done
---

# Phase 3: Delete events

Add the ability to delete a single, non-recurring event from the event-detail modal. Recurring-event delete is out of scope for this phase (see [README.md](./README.md) non-goals).

## Context

> **Status note (2026-05-23)**: this phase is shipped. The Delete button, inline confirm step, optimistic removal, and supported-features gating all live in `src/components/calendar-event-popover.ts` and `src/cards/lucarne-calendar-card.ts`. This Context paragraph captures the *pre-implementation* state for narrative purposes.

At the start of this phase, the detail modal (`src/components/calendar-event-popover.ts`) showed event info and a Google Calendar deep-link, but no destructive actions. The card already created events via `hass.callService('calendar', 'create_event', ...)` in `create-event-popover.ts` (`_create` method) and optimistically inserted them into `_pendingEvents` via `_onEventCreated` in `lucarne-calendar-card.ts` — symbol names instead of line numbers since the latter bit-rot quickly.

For delete, we mirror that optimistic pattern:

1. Detect per-entity delete support via `attributes.supported_features & 2` (the `CalendarEntityFeature.DELETE_EVENT` bit — full enum: CREATE=1, DELETE=2, UPDATE=4).
2. Add a `deleteCalendarEvent` helper in `src/shared/ha-subscriptions.ts`. **Shipped form uses the `calendar/event/delete` WebSocket command, not `callService` — see implementation note in Sub-Phase 3A. HA exposes no `calendar.delete_event` service.**
3. Add a Delete button + inline confirm step in `calendar-event-popover.ts`, gated on the supported-features bit.
4. On success, the popover dispatches `lucarne-event-deleted`, the card adds the event's uid to a `_deletedUids` set, and the recompute step filters it out. The next 5-minute background poll converges canonical state.

## Structure

```
src/shared/
  ha-subscriptions.ts          # MODIFY: add deleteCalendarEvent()
  types.ts                     # MODIFY (maybe): re-check whether CalendarEvent has the fields we need (uid, rrule)
src/components/
  calendar-event-popover.ts    # MODIFY: add Delete button, confirm step, error slot, supported-features check
src/cards/
  lucarne-calendar-card.ts     # MODIFY: handle @lucarne-event-deleted, maintain _deletedUids set, filter in _recompute, pass supported_features info into popover (via hass)
tests/shared/
  ha-subscriptions.test.ts     # NEW (if no file exists): test deleteCalendarEvent sends the calendar/event/delete WS command with the right shape
tests/components/
  calendar-event-popover.test.ts # NEW: test Delete button visibility based on supported_features, confirm step, delete dispatch
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline verification

- [x] Phase 1 (pan fixes) merged — the Chrome-desktop click → detail-modal path must work end-to-end to validate the new Delete button on a laptop. Phase 2 (event dialog) is independent and may be merged in any order.
- [x] Confirm the Family calendar entity has `supported_features` including the DELETE_EVENT bit (2). Read via MCP: `mcp__home-assistant__ha_get_state(entity_id="calendar.family")` and check `attributes.supported_features`. The local calendar integration and CalDAV both set this bit; some integrations do not.
- [x] Note the `supported_features` value for one supporting entity and one non-supporting entity (if available) for end-to-end verification.

### Sub-Phase 3A: `deleteCalendarEvent` helper + types

Deployable when: the helper is unit-tested and importable, even if no UI uses it yet.

#### Tests

- [x] Create or extend `tests/shared/ha-subscriptions.test.ts` to assert `deleteCalendarEvent` sends the `calendar/event/delete` WebSocket message via `hass.connection.sendMessagePromise` with:
  - `type: 'calendar/event/delete'`
  - `entity_id: <entityId>`
  - `uid: <uid>`
  - `recurrence_id` / `recurrence_range` forwarded when provided (omitted/undefined for non-recurring deletes)
- [x] Test rejection path: when the WS command rejects, the helper rejects with the same error (no swallow).
- [x] Regression guard: assert `hass.callService` is NEVER invoked (HA has no `calendar.delete_event` service — the originally-spec'd service-call path fails at runtime with "Action calendar.delete_event not found").

#### Implementation

- [x] Add at the end of `src/shared/ha-subscriptions.ts`. **NOTE (post-implementation, 2026-05-23)**: HA does NOT expose a `calendar.delete_event` service — only `calendar.create_event` and `calendar.get_events` are services (verified via `ha_list_services`). Delete must go through HA's WebSocket command, the same path HA's own frontend uses. The originally-spec'd `hass.callService('calendar', 'delete_event', ...)` form fails at runtime with "Action calendar.delete_event not found"; the shipped helper uses the WS command:

  ```typescript
  export async function deleteCalendarEvent(
    hass: HomeAssistant,
    entityId: string,
    uid: string,
    recurrenceId?: string,
    recurrenceRange?: string, // '' or 'THISANDFUTURE'
  ): Promise<void> {
    await hass.connection.sendMessagePromise({
      type: 'calendar/event/delete',
      entity_id: entityId,
      uid,
      recurrence_id: recurrenceId,
      recurrence_range: recurrenceRange,
    });
  }
  ```

  Inspired by HA frontend's `deleteCalendarEvent` in `home-assistant/frontend/src/data/calendar.ts`. A regression test in `tests/shared/ha-subscriptions.test.ts` asserts `callService` is never invoked.

- [x] Verify `HomeAssistant` type exposes `connection.sendMessagePromise` (it does — already used by `subscribeTodoItems` in `src/shared/ha-subscriptions.ts`). Note: the rolling-window calendar fetcher uses `hass.callApi` instead (REST `GET /api/calendars/<entity>`) — only delete goes through `sendMessagePromise`.
- [x] Inspect `CalendarEvent` in `src/shared/types.ts` and add `rrule?: string` if not already present — we use its presence to detect recurring events in Sub-Phase C. The card's REST fetcher (`fetchCalendarEvents`, post-implementation update) returns `uid`, `rrule`, and `recurrence_id` directly from `GET /api/calendars/<entity_id>` — these are stripped from the `calendar.get_events` service response, which is why the fetcher was rewritten to use REST instead.

### Sub-Phase 3B: Supported-features detection helper

Deployable when: a pure helper exists and is unit-tested.

#### Tests

- [x] Add `tests/shared/calendar-features.test.ts` (or extend an existing helpers test file):
  - `entitySupportsDelete(hass, "calendar.family")` returns `true` when `attributes.supported_features` includes bit 2 (DELETE_EVENT).
  - Returns `false` when the bit is absent.
  - Returns `false` when the entity does not exist in `hass.states`.

#### Implementation

- [x] Add a small helper to `src/shared/ha-subscriptions.ts` (or a new `src/shared/calendar-features.ts` if you prefer a dedicated file):

  ```typescript
  // HA's CalendarEntityFeature: CREATE_EVENT=1, DELETE_EVENT=2, UPDATE_EVENT=4
  const CALENDAR_DELETE_EVENT_FEATURE = 2;

  export function entitySupportsDelete(hass: HomeAssistant, entityId: string): boolean {
    const features = hass.states[entityId]?.attributes?.supported_features;
    if (typeof features !== 'number') return false;
    return (features & CALENDAR_DELETE_EVENT_FEATURE) !== 0;
  }
  ```

  Constant name documents the HA enum value; see https://developers.home-assistant.io/docs/core/entity/calendar#supported-features.

### Sub-Phase 3C: Delete button + confirm in event-detail popover

Deployable when: the user can delete a non-recurring event end-to-end and see the result.

#### Tests

- [x] `tests/components/calendar-event-popover.test.ts`:
  - Renders Delete button when `hass` reports the entity supports delete AND the event is non-recurring.
  - Does NOT render Delete button when the entity does not support delete.
  - Does NOT render Delete button when the event is recurring (has `rrule` or `recurrence_id`).
  - First Delete tap shows the confirm state (button text changes to "Confirm delete?", second button "Cancel" appears).
  - Second Delete tap dispatches `lucarne-event-deleted` with `{ entityId, uid }` detail.
  - Cancel tap returns to the non-confirm state.
  - On `deleteCalendarEvent` rejection, error message renders in an inline `.error-msg` slot; popover does not close; dispatches no `lucarne-event-deleted`.

#### Implementation

- [x] Add new properties to `LucarneCalendarEventPopover`:
  - `@property({ attribute: false }) hass!: HomeAssistant;` — needed to call the delete service and check supported_features
  - `@property({ type: String }) entityId = '';` — the calendar entity id this event belongs to (passed from the card)
- [x] Add internal state:
  - `@state() private _confirmingDelete = false;`
  - `@state() private _deleting = false;`
  - `@state() private _deleteError = '';`
- [x] In `render()`, after the existing details and before the closing `</div>`, add an actions row:

  ```typescript
  const canDelete = this.entityId
    && this.event.uid
    && entitySupportsDelete(this.hass, this.entityId)
    && !this._isRecurring(this.event);

  // ...inside the popover div, after the last detail row...
  ${this._deleteError ? html`<div class="error-msg">${this._deleteError}</div>` : ''}
  ${canDelete ? html`
    <div class="actions">
      ${this._confirmingDelete
        ? html`
            <button class="btn btn-cancel" @click=${this._cancelDelete} ?disabled=${this._deleting}>Cancel</button>
            <button class="btn btn-delete" @click=${this._confirmDelete} ?disabled=${this._deleting}>Confirm delete?</button>
          `
        : html`<button class="btn btn-delete" @click=${this._startDelete}>Delete</button>`}
    </div>
  ` : ''}
  ```

- [x] Add CSS for `.btn-delete` (re-use the existing `.btn` base; add a destructive color):

  ```css
  .btn-delete {
    background: #c62828;
    color: #fff;
  }
  .btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
  .actions {
    display: flex;
    gap: var(--lucarne-spacing-sm);
    justify-content: flex-start;
    margin-top: var(--lucarne-spacing-md);
  }
  ```

  (Re-use the `.actions` rule from `create-event-popover.ts:147` if patterns overlap — but here it's left-aligned, vs right-aligned for create. Keep distinct rules to avoid coupling.)

- [x] Methods:

  ```typescript
  private _isRecurring(e: CalendarEvent): boolean {
    return Boolean(e.rrule) || Boolean(e.recurrence_id);
  }

  private _startDelete() {
    this._confirmingDelete = true;
    this._deleteError = '';
  }

  private _cancelDelete() {
    this._confirmingDelete = false;
  }

  private async _confirmDelete() {
    if (!this.event?.uid || !this.entityId) return;
    this._deleting = true;
    this._deleteError = '';
    // The card stores uid as "entityId::originalUid" for color lookup.
    // Strip the prefix before calling the service — HA expects the original uid.
    const rawUid = this.event.uid.includes('::')
      ? this.event.uid.split('::').slice(1).join('::')
      : this.event.uid;
    try {
      await deleteCalendarEvent(this.hass, this.entityId, rawUid);
    } catch (err) {
      this._deleteError = err instanceof Error ? err.message : 'Failed to delete event';
      this._deleting = false;
      this._confirmingDelete = false;
      return;
    }
    this.dispatchEvent(new CustomEvent('lucarne-event-deleted', {
      detail: { entityId: this.entityId, uid: this.event.uid },
      bubbles: true,
      composed: true,
    }));
    this._deleting = false;
    this._confirmingDelete = false;
    // Card closes the popover via _onEventDeleted handler
  }
  ```

### Sub-Phase 3D: Card wiring + optimistic cache removal

Deployable when: deleting an event removes it from the visible grid immediately and stays removed across reloads.

#### Tests

- [x] Extend `tests/shared/rolling-window.test.ts` (or wherever `_recompute` is exercised in card-level tests):
  - When the card has `_deletedUids` containing `"calendar.family::abc-123"`, the recompute output excludes any event with that uid.
  - Optimistic removal survives across renders until a real fetch returns without the event (the set is cleared on fetch success).

#### Implementation

- [x] In `src/cards/lucarne-calendar-card.ts`:
  - Add state: `@state() private _deletedUids = new Set<string>();`
  - Add handler:

    ```typescript
    private _onEventDeleted(e: CustomEvent<{ entityId: string; uid: string }>) {
      this._deletedUids = new Set([...this._deletedUids, e.detail.uid]);
      this._openEvent = null; // close popover
      this._recompute();
    }
    ```
  - In `_recompute()` (or wherever the events list is assembled from controller + pending), filter out any event whose uid is in `_deletedUids`.
  - After a successful background fetch in `RollingWindowController`, the new event list will exclude the deleted event server-side — that's the canonical state, and the `_deletedUids` entries can be pruned (any uid not present in any fetched event can be dropped). Add this prune step in the fetch-success handler (or once on each `_recompute` after the controller's cache updates).
  - Pass `.entityId=${this._openEvent?.uid?.split('::')[0] ?? ''}` and `.hass=${this.hass}` to `<lucarne-calendar-event-popover>` in the render block at line 440.
  - Wire `@lucarne-event-deleted=${this._onEventDeleted}` next to the existing `@popover-close` handler.

### Manual verification (end-to-end)

- [ ] Create a test event via `mcp__home-assistant__ha_config_set_calendar_event(entity_id="calendar.family", summary="Delete me", dtstart="2026-05-25T14:00:00", dtend="2026-05-25T15:00:00")`.
- [ ] Reload the card. Tap the event → detail modal opens → Delete button visible.
- [ ] Tap Delete → button text changes to "Confirm delete?" + Cancel appears.
- [ ] Tap Confirm delete? → event disappears from grid; modal closes.
- [ ] Reload the page → event is still gone.
- [ ] Verify server-side: `mcp__home-assistant__ha_config_get_calendar_events(entity_id="calendar.family", start_date_time="...", end_date_time="...")` returns no event with the deleted uid.
- [ ] **Error path**: temporarily edit `_confirmDelete` to call with a bogus uid; tap Delete → Confirm. Error appears in inline `.error-msg` slot; popover stays open. Revert.
- [ ] **Recurring path**: identify a recurring event (e.g. weekly chores reminder). Tap → modal opens → Delete button is NOT shown.
- [ ] **Non-supporting calendar**: if any of the configured calendar entities lacks the DELETE_EVENT bit, tap an event from that calendar → Delete button is NOT shown.

### Final verification

- [x] All four gates green:
  - [x] `npm run typecheck`
  - [x] `npm run lint`
  - [x] `npm test`
  - [x] `npm run build`
- [x] Commit message format: `feat(calendar-polish): Phase 3 — delete events (single, non-recurring)`.

## Out of scope for this phase

- **Recurring events**: delete-this-instance, delete-this-and-future, delete-all variants. These require additional UI (a modal-on-modal or radio choice), the `recurrence_id` and `recurrence_range` service-data fields, and careful test coverage. Defer to a future phase if requested.
- **Edit events**: only delete + create stay in scope.
- **Undo**: no toast-with-undo affordance. The inline confirm step is the safety net.
- **Multi-select / batch delete**.
- **Confirmation modal** (full overlay) — the inline "Confirm delete?" step is intentionally lighter-weight.
