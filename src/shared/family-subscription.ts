import type { HomeAssistant, MemberSummary, TaskMetadata, RenderableTask } from './types.js';
import { subscribeEntityState, subscribeTodoItems } from './ha-subscriptions.js';
import type { TodoItem } from './types.js';

export interface FamilyState {
  members: MemberSummary[];
  tasksByMember: Map<string, RenderableTask[]>;
  streakByMember: Map<string, number>;
  /**
   * Integration-tracked metadata keyed by todo item uid. Use this to enrich
   * tasks fetched from a raw todo entity that the integration also tracks
   * (e.g. a per-member list shown directly in another card).
   */
  taskMetadataByUid: Map<string, TaskMetadata>;
  resetTime: string;
  streakCheckTime: string;
  integrationError: Error | null;
}

interface GetFamilyResponse {
  members: MemberSummary[];
  task_metadata: TaskMetadata[];
  reset_time: string;
  streak_check_time: string;
  household_entity_id: string;
}

export const SYNTHETIC_HOUSEHOLD: MemberSummary = {
  slug: 'household',
  name: 'Household',
  color: 'var(--primary-color)',
  avatar: null,
  todo_entity_id: 'todo.lucarne_household',
  streak_counter_id: '',
};

/**
 * How often an open card re-fetches family + todo state as a fallback, in ms.
 *
 * The live-update path relies entirely on server→client WebSocket pushes
 * (`lucarne_family_*` events + per-todo state triggers). On an idle iOS WKWebView
 * — e.g. the always-on Companion-app kiosk parked on the chores tab — those
 * *inbound* frames stall and aren't delivered to JS until a user interaction
 * wakes the runloop, so a change made on another device never appears on its own.
 * Outbound request/response calls keep working though, so this timer issues a
 * periodic `get_family` + `todo.get_items` whose *responses* carry current state,
 * independent of push delivery. ~20s balances freshness against re-fetch load.
 */
const FAMILY_POLL_INTERVAL_MS = 20_000;

/**
 * Backed-off poll interval used while the integration is absent (the last
 * `get_family` failed). A raw-only / no-integration client has nothing to catch
 * up, so polling every 20s would just generate continuous failing WS traffic and
 * debug logs. Keep polling — but slowly — so a card still recovers if the
 * integration is installed later.
 */
const FAMILY_POLL_BACKOFF_MS = 5 * 60 * 1000;

function buildRenderableTasks(
  items: TodoItem[],
  memberSlug: string,
  metadataByUid: Map<string, TaskMetadata>,
): RenderableTask[] {
  return items.map((item) => {
    const meta = metadataByUid.get(item.uid);
    // Fallback for an item Lucarne never adopted (HA's to-do panel, voice, an
    // agent's todo.add_item, the Reminders bridge). It is why every such task
    // renders as a chore in the Anytime bucket — and, since the daily reset
    // skips rows it has no metadata for, why those are the ones that used to
    // linger crossed out forever.
    const metadata: TaskMetadata = meta ?? {
      item_uid: item.uid,
      member_slug: memberSlug,
      assignee_slug: '',
      type: 'chore',
      recurrence: '',
      icon: '',
      source: 'manual',
      time_of_day: 'anytime',
    };
    return {
      uid: item.uid,
      summary: item.summary,
      status: item.status,
      due: item.due ?? null,
      description: item.description ?? '',
      completed: item.completed,
      metadata,
    };
  });
}

export function subscribeFamilyState(
  hass: HomeAssistant,
  callback: (state: FamilyState) => void,
): () => void {
  let cancelled = false;
  const unsubFns: (() => void)[] = [];
  let metadataByUid = new Map<string, TaskMetadata>();
  let allMembers: MemberSummary[] = [];
  const todoItemsByEntity = new Map<string, TodoItem[]>();
  let streakBySlug = new Map<string, number>();
  let resetTime = '';
  let streakCheckTime = '';

  let metadataRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshInFlight: Promise<void> | null = null;
  let refreshQueued = false;
  let currentError: Error | null = null;

  function emitState() {
    if (cancelled) return;
    const tasksByMember = new Map<string, RenderableTask[]>();
    for (const m of allMembers) {
      const items = todoItemsByEntity.get(m.todo_entity_id) ?? [];
      tasksByMember.set(m.slug, buildRenderableTasks(items, m.slug, metadataByUid));
    }
    // Always include household tasks regardless of whether household is a configured column
    const householdItems = todoItemsByEntity.get('todo.lucarne_household') ?? [];
    tasksByMember.set('household', buildRenderableTasks(householdItems, 'household', metadataByUid));
    callback({
      members: allMembers,
      tasksByMember,
      streakByMember: new Map(streakBySlug),
      taskMetadataByUid: new Map(metadataByUid),
      resetTime,
      streakCheckTime,
      integrationError: currentError,
    });
  }

  /**
   * Coalesce overlapping refreshes: the event, poll, and visibility paths can
   * all fire close together, and each refresh tears down + re-subscribes every
   * todo entity — concurrent runs would race those re-subscriptions and could
   * drop a todo update. While one refresh is in flight, additional callers get
   * the same promise and flag a single trailing refresh, so no request is lost
   * (the latest state is always captured) and callers that reschedule off the
   * returned promise (the poll) only do so once the work has actually settled.
   */
  function refreshMetadata(): Promise<void> {
    if (refreshInFlight) {
      refreshQueued = true;
      return refreshInFlight;
    }
    refreshInFlight = (async () => {
      try {
        do {
          refreshQueued = false;
          await doRefreshOnce();
        } while (refreshQueued && !cancelled);
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  async function doRefreshOnce() {
    try {
      const resp = await hass.connection.sendMessagePromise<GetFamilyResponse>({
        type: 'lucarne_family/get_family',
      });
      if (cancelled) return;

      const metaMap = new Map<string, TaskMetadata>();
      for (const t of resp.task_metadata ?? []) {
        let rotation_owners: string[] = [];
        const raw = (t as unknown as { rotation_owners?: unknown }).rotation_owners;
        if (typeof raw === 'string' && raw !== '') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) rotation_owners = parsed.map(String);
          } catch {
            // malformed JSON — keep []
          }
        } else if (Array.isArray(raw)) {
          rotation_owners = raw.map(String);
        }
        metaMap.set(t.item_uid, { ...t, rotation_owners });
      }
      metadataByUid = metaMap;
      resetTime = resp.reset_time ?? '';
      streakCheckTime = resp.streak_check_time ?? '';

      const realMembers = (resp.members ?? []).filter((m) => {
        if (!m.todo_entity_id) {
          console.debug(`[lucarne] skipping member ${m.slug}: no todo_entity_id yet`);
          return false;
        }
        return true;
      });

      allMembers = realMembers;
      currentError = null;
      streakBySlug = new Map();

      unsubFns.forEach((fn) => fn());
      unsubFns.length = 0;

      for (const m of allMembers) {
        const todoUnsub = subscribeTodoItems(hass, m.todo_entity_id, (items) => {
          todoItemsByEntity.set(m.todo_entity_id, items);
          emitState();
        });
        unsubFns.push(todoUnsub);

        if (m.streak_counter_id) {
          // Seed current streak value before subscribing to changes
          const currentState = hass.states?.[m.streak_counter_id]?.state;
          if (currentState !== undefined) {
            const v = parseInt(currentState, 10);
            streakBySlug.set(m.slug, isNaN(v) ? 0 : v);
          }
          const streakUnsub = subscribeEntityState(hass, m.streak_counter_id, (entity) => {
            const v = parseInt(entity.state, 10);
            streakBySlug.set(m.slug, isNaN(v) ? 0 : v);
            emitState();
          });
          unsubFns.push(streakUnsub);
        }
      }

      // Always subscribe household todo; household tasks go into tasksByMember['household']
      const householdTodoUnsub = subscribeTodoItems(hass, 'todo.lucarne_household', (items) => {
        todoItemsByEntity.set('todo.lucarne_household', items);
        emitState();
      });
      unsubFns.push(householdTodoUnsub);

      emitState();
    } catch (err) {
      // Debug, not warn: the Today card subscribes for metadata enrichment even
      // in raw-only mode (no integration), so this firing on every reconnect is
      // an expected fallback path — not an actionable problem for the user.
      console.debug('[lucarne] get_family failed — integration may not be installed:', err);
      if (!cancelled) {
        currentError = err instanceof Error ? err : new Error(String(err));
        unsubFns.forEach((fn) => fn());
        unsubFns.length = 0;
        allMembers = [];
        metadataByUid = new Map();
        streakBySlug = new Map();
        todoItemsByEntity.clear();
        resetTime = '';
        streakCheckTime = '';
        emitState();
      }
    }
  }

  function scheduleMetadataRefresh() {
    if (metadataRefreshTimer !== null) return;
    metadataRefreshTimer = setTimeout(() => {
      metadataRefreshTimer = null;
      refreshMetadata();
    }, 1000);
  }

  /**
   * Self-rescheduling fallback poll. Re-fetches current state on a timer so
   * clients that don't deliver inbound WebSocket pushes (idle iOS WKWebView
   * kiosks) still catch up. Skips the actual fetch while the page is hidden so
   * background browser tabs don't poll needlessly; the visibility listener below
   * forces an immediate refresh when the page comes back. Reschedules itself
   * only after the in-flight refresh settles to avoid pile-up on a slow client,
   * and backs off hard while the integration is absent (`currentError` set).
   */
  function schedulePoll() {
    const interval = currentError !== null ? FAMILY_POLL_BACKOFF_MS : FAMILY_POLL_INTERVAL_MS;
    pollTimer = setTimeout(() => {
      pollTimer = null;
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const done = hidden ? Promise.resolve() : refreshMetadata();
      done.finally(() => {
        if (!cancelled) schedulePoll();
      });
    }, interval);
  }

  // Catch up the instant the page becomes visible again (tab refocus, app
  // foreground, bfcache restore) — faster than waiting for the next poll tick.
  const refreshIfVisible = () => {
    if (cancelled) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    refreshMetadata();
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', refreshIfVisible);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', refreshIfVisible);
  }

  // Subscribe to family changes via the integration's relay command to re-fetch
  // on changes. We deliberately do NOT use connection.subscribeEvents() on the
  // raw lucarne_family_* bus events: HA forbids non-admin clients (e.g. the
  // kiosk tablet) from subscribing to arbitrary bus events, and the cards'
  // auto-resubscribe-on-reconnect turned each rejection into a steady flood of
  // server-side Unauthorized errors. The lucarne_family/subscribe command relays
  // the same events server-side and works for non-admin users.
  const eventUnsubs: (() => void)[] = [];
  hass.connection
    .subscribeMessage<{ event_type: string }>(
      () => {
        scheduleMetadataRefresh();
      },
      { type: 'lucarne_family/subscribe' },
    )
    .then((fn) => {
      if (cancelled) {
        fn();
      } else {
        eventUnsubs.push(fn);
      }
    })
    .catch((err) => {
      console.debug('[lucarne] could not subscribe to family updates:', err);
    });

  // Kick off the initial fetch, then start the self-rescheduling poll once it
  // settles so the first interval already reflects integration presence (no
  // 20s burst of failing fetches in a no-integration setup).
  refreshMetadata().finally(() => {
    if (!cancelled) schedulePoll();
  });

  return () => {
    cancelled = true;
    if (metadataRefreshTimer !== null) {
      clearTimeout(metadataRefreshTimer);
    }
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', refreshIfVisible);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pageshow', refreshIfVisible);
    }
    unsubFns.forEach((fn) => fn());
    eventUnsubs.forEach((fn) => fn());
  };
}
