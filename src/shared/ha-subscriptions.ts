import type { HomeAssistant, CalendarEvent, TodoItem } from './types.js';

/**
 * The fields we read out of HA's compressed `subscribe_entities` payload.
 *
 * HA sends `{a: {id: {s, a, lc, lu, c}}}` (add — the initial snapshot, plus any
 * entity that appears later), `{c: {id: {'+': partial, '-': partial}}}` (change)
 * and `{r: [ids]}` (removed). Only the state string (`s`) is consumed here.
 */
interface CompressedStateAdd {
  s?: string;
}
interface CompressedStateChange {
  '+'?: CompressedStateAdd;
}
interface SubscribeEntitiesEvent {
  a?: Record<string, CompressedStateAdd>;
  c?: Record<string, CompressedStateChange>;
  r?: string[];
}

/**
 * Why a callback is told whether a value came from a snapshot.
 *
 * `subscribe_entities` answers with the *current* state of everything watched
 * (an `a` frame) before it sends any change. Callers need to tell the two
 * apart: a value is worth seeding from, but not always worth reacting to (a
 * caller that already fetched for itself would double-fetch).
 */
export type EntityStatePhase = 'snapshot' | 'change';

export type EntityStateCallback = (
  entityId: string,
  state: string,
  phase: EntityStatePhase,
) => void;

export interface SubscribeEntityStatesOptions {
  /** Called if the subscription itself is rejected, so callers can retry. */
  onError?: (err: unknown) => void;
}

/** State reported for an entity that HA has removed (an `r` frame). */
const REMOVED_STATE = 'unavailable';

/**
 * Watch a set of entities for state changes over a single websocket subscription.
 *
 * Why `subscribe_entities` and not `subscribe_trigger`: HA gates
 * `subscribe_trigger` behind `@decorators.require_admin`
 * (`homeassistant/components/websocket_api/commands.py`). The wall-tablet kiosk
 * signs in through trusted_networks as a **non-admin** user, so every
 * subscription was rejected — HA logged one `Unauthorized` per attempt, live
 * updates never worked at all, and because the cards rebuilt their
 * subscriptions on every fallback poll the rejections became a permanent error
 * flood (2N+1 of them every 20s). `subscribe_entities` is not admin-gated and
 * applies the connection's own per-entity read policy server-side. This is the
 * same class of bug already worked around for `subscribeEvents` — see the note
 * on the `lucarne_family/subscribe` relay in `family-subscription.ts`.
 *
 * One subscription covers every id, so the cost no longer scales with family
 * size. Every frame is delivered, tagged `'snapshot'` or `'change'`; removals
 * (`r`) arrive as a `'change'` to `'unavailable'`, which is what a caller needs
 * in order to stop showing a list that no longer exists.
 */
export function subscribeEntityStates(
  hass: HomeAssistant,
  entityIds: string[],
  callback: EntityStateCallback,
  options: SubscribeEntityStatesOptions = {},
): () => void {
  let unsubFn: (() => void) | undefined;
  let cancelled = false;

  if (entityIds.length === 0) return () => {};

  const watched = new Set(entityIds);
  let seenSnapshot = false;
  /** Bumped per open attempt, so a late resolve/reject cannot win. */
  let generation = 0;

  const handleEvent = (event: SubscribeEntitiesEvent) => {
    if (cancelled) return;
    // The `a` frame that opens a subscription is current state; later `a`
    // frames (an entity appearing, or a replay after a reconnect) are news.
    // `seenSnapshot` lives out here, not per-subscription, so a reconnect
    // replay is reported as a change — a client that has been off the socket
    // needs to act on it, not treat it as already-known state.
    const phase: EntityStatePhase = seenSnapshot ? 'change' : 'snapshot';
    seenSnapshot = true;

    for (const [entityId, added] of Object.entries(event.a ?? {})) {
      if (watched.has(entityId) && added.s !== undefined) {
        callback(entityId, added.s, phase);
      }
    }
    for (const [entityId, changed] of Object.entries(event.c ?? {})) {
      const state = changed['+']?.s;
      // A `c` frame carrying only attribute changes has no `s`; there is no new
      // state to report and every caller keys off the state string.
      if (watched.has(entityId) && state !== undefined) {
        callback(entityId, state, 'change');
      }
    }
    for (const entityId of event.r ?? []) {
      if (watched.has(entityId)) callback(entityId, REMOVED_STATE, 'change');
    }
  };

  /**
   * Open the subscription, routing a rejection to `options.onError`.
   *
   * `resubscribe: false` and a hand-rolled `ready` listener, because the
   * library's own resubscribe path calls `info.subscribe()` with a bare
   * `.then()` and no `.catch()` (`connection.js` `_setSocket`). A rejected
   * resubscribe after a reconnect would therefore skip `onError` entirely —
   * the caller would never learn to retry, and the rejection would surface as
   * the unhandled promise rejection this helper exists to avoid.
   */
  const open = () => {
    const gen = ++generation;
    hass.connection
      .subscribeMessage<SubscribeEntitiesEvent>(
        handleEvent,
        { type: 'subscribe_entities', entity_ids: entityIds },
        { resubscribe: false },
      )
      .then((fn) => {
        // A newer attempt (or teardown) has superseded this one; release it
        // rather than letting it overwrite the handle that is actually live.
        if (cancelled || gen !== generation) fn();
        else unsubFn = fn;
      })
      .catch((err) => {
        if (gen !== generation) return;
        unsubFn = undefined;
        if (cancelled) return;
        console.warn('[lucarne] subscribe_entities failed for', entityIds, err);
        options.onError?.(err);
      });
  };

  const onReady = () => {
    if (cancelled) return;
    // Drop the pre-disconnect handle before re-opening. The library resets its
    // command counter on close (`_handleClose` sets `commandId = 1`), so ids are
    // reused across reconnects — and the unsubscribe closure captured the old
    // id. Calling it after a reconnect would send `unsubscribe_events` for an id
    // that now belongs to a different, live subscription, silently killing
    // another card's feed.
    unsubFn = undefined;
    open();
  };
  hass.connection.addEventListener('ready', onReady);
  open();

  return () => {
    cancelled = true;
    hass.connection.removeEventListener('ready', onReady);
    unsubFn?.();
    unsubFn = undefined;
  };
}

/** Single-entity convenience wrapper over {@link subscribeEntityStates}. */
export function subscribeEntityState(
  hass: HomeAssistant,
  entityId: string,
  callback: (state: string, phase: EntityStatePhase) => void,
): () => void {
  return subscribeEntityStates(hass, [entityId], (_entityId, state, phase) =>
    callback(state, phase),
  );
}

/**
 * Result of `fetchCalendarEvents`.
 * - `events`: per-entity event list. Failed entities still appear here with
 *   `[]` so callers that don't care about failure (e.g. simple "render what
 *   we have") don't need to handle a missing key.
 * - `failed`: entity ids whose calendar fetch threw. Callers that need to
 *   distinguish "really empty" from "fetch failed" (e.g. the optimistic-delete
 *   tombstone prune in `lucarne-calendar-card`) should check this set before
 *   treating an entity's empty list as authoritative.
 */
export interface FetchCalendarEventsResult {
  events: Map<string, CalendarEvent[]>;
  failed: Set<string>;
}

/**
 * Raw event shape returned by `GET /api/calendars/<entity_id>`. HA wraps
 * start/end in `{dateTime}` (timed) or `{date}` (all-day) — the Google
 * Calendar v3 format. We normalise to a flat string in `normaliseEvent`.
 */
interface RawCalendarEventResponse {
  start: string | { dateTime?: string; date?: string };
  end: string | { dateTime?: string; date?: string };
  summary?: string;
  description?: string;
  location?: string;
  uid?: string;
  recurrence_id?: string | null;
  rrule?: string | null;
}

function flattenDateField(field: RawCalendarEventResponse['start'] | undefined): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    // Prefer dateTime (timed event); fall back to date (all-day, YYYY-MM-DD).
    return field.dateTime ?? field.date ?? '';
  }
  return '';
}

function normaliseEvent(raw: RawCalendarEventResponse): CalendarEvent {
  const event: CalendarEvent = {
    start: flattenDateField(raw.start),
    end: flattenDateField(raw.end),
    summary: raw.summary ?? '',
  };
  if (raw.description) event.description = raw.description;
  if (raw.location) event.location = raw.location;
  if (raw.uid) event.uid = raw.uid;
  // Convert null → undefined to match the CalendarEvent shape.
  if (raw.recurrence_id) event.recurrence_id = raw.recurrence_id;
  if (raw.rrule) event.rrule = raw.rrule;
  return event;
}

/**
 * Fetch calendar events via HA's REST endpoint
 * `GET /api/calendars/<entity_id>?start=<ISO>&end=<ISO>`.
 *
 * Why REST and not the `calendar.get_events` service: the service response
 * deliberately strips `uid`, leaving downstream consumers unable to delete
 * events (the card needs uid for the `calendar/event/delete` WebSocket
 * command — see `deleteCalendarEvent` below; HA exposes no
 * `calendar.delete_event` service). The REST endpoint returns the full
 * event including uid, recurrence_id, and rrule.
 */
export async function fetchCalendarEvents(
  hass: HomeAssistant,
  entityIds: string[],
  start: Date,
  end: Date,
): Promise<FetchCalendarEventsResult> {
  const failed = new Set<string>();
  const startParam = encodeURIComponent(start.toISOString());
  const endParam = encodeURIComponent(end.toISOString());
  const results = await Promise.all(
    entityIds.map((entityId) =>
      hass.callApi<RawCalendarEventResponse[]>(
        'GET',
        `calendars/${encodeURIComponent(entityId)}?start=${startParam}&end=${endParam}`,
      )
        .then((raw) => [entityId, raw.map(normaliseEvent)] as const)
        .catch((err) => {
          console.warn(`[lucarne] GET /api/calendars/${entityId} failed:`, err);
          failed.add(entityId);
          return [entityId, [] as CalendarEvent[]] as const;
        }),
    ),
  );
  return { events: new Map(results), failed };
}

/**
 * Delete a calendar event via the WebSocket `calendar/event/delete` command.
 *
 * HA does NOT expose a `calendar.delete_event` service — only `create_event`
 * and `get_events` exist as services. Deletion (and update) go through the
 * WebSocket API, same as HA's own frontend calendar dashboard. The card's
 * `entitySupportsDelete` capability check is still based on the entity's
 * `supported_features & CalendarEntityFeature.DELETE_EVENT` bit, which
 * remains the authoritative signal for whether the entity supports delete.
 *
 * @param recurrenceId  For recurring events: pass the instance's
 *   `recurrence_id` to scope the delete to a single occurrence (or
 *   together with `recurrenceRange` to a range). Omit for non-recurring.
 * @param recurrenceRange  Omit (the default) to delete only this
 *   instance; pass `'THISANDFUTURE'` to delete this and all future
 *   occurrences. Only relevant when `recurrenceId` is set.
 */
export async function deleteCalendarEvent(
  hass: HomeAssistant,
  entityId: string,
  uid: string,
  recurrenceId?: string,
  recurrenceRange?: string,
): Promise<void> {
  await hass.connection.sendMessagePromise({
    type: 'calendar/event/delete',
    entity_id: entityId,
    uid,
    recurrence_id: recurrenceId,
    recurrence_range: recurrenceRange,
  });
}

// HA's CalendarEntityFeature: CREATE_EVENT=1, DELETE_EVENT=2, UPDATE_EVENT=4
const CALENDAR_DELETE_EVENT_FEATURE = 2;

export function entitySupportsDelete(hass: HomeAssistant, entityId: string): boolean {
  const features = hass.states[entityId]?.attributes?.['supported_features'];
  if (typeof features !== 'number') return false;
  return (features & CALENDAR_DELETE_EVENT_FEATURE) !== 0;
}

/**
 * Read a todo list's items via the `todo.get_items` service.
 *
 * Never rejects: a failure (missing entity, denied permission) is logged and
 * reported as an empty list, so one broken list cannot stall a caller that is
 * refreshing several.
 */
export async function fetchTodoItems(
  hass: HomeAssistant,
  entityId: string,
): Promise<TodoItem[]> {
  try {
    const result = await hass.connection.sendMessagePromise<{
      response: Record<string, { items: TodoItem[] }>;
    }>({
      type: 'call_service',
      domain: 'todo',
      service: 'get_items',
      service_data: {},
      target: { entity_id: entityId },
      return_response: true,
    });
    return result?.response?.[entityId]?.items ?? [];
  } catch (err) {
    console.warn(`[lucarne] todo.get_items failed for ${entityId}:`, err);
    return [];
  }
}

export function subscribeTodoItems(
  hass: HomeAssistant,
  entityId: string,
  callback: (items: TodoItem[]) => void,
): () => void {
  let cancelled = false;
  const fetchItems = () => {
    void fetchTodoItems(hass, entityId).then((items) => {
      if (!cancelled) callback(items);
    });
  };

  fetchItems();
  const unsub = subscribeEntityState(hass, entityId, (_state, phase) => {
    // `'snapshot'` is emitted at most once per handle and repeats what the
    // fetch above already covers. Everything after — including a
    // post-reconnect replay, which arrives as `'change'` — is worth re-reading.
    if (phase === 'snapshot') return;
    fetchItems();
  });
  return () => {
    cancelled = true;
    unsub();
  };
}
