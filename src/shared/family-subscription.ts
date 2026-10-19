import type {
  HomeAssistant,
  MemberSummary,
  TaskMetadata,
  RenderableTask,
  GetRewardsResponse,
  RewardsState,
} from './types.js';
import { fetchTodoItems, subscribeEntityStates } from './ha-subscriptions.js';
import type { EntityStatePhase } from './ha-subscriptions.js';
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
  /** Null until fetched, when the subscriber did not opt in, or when `get_rewards` failed. */
  rewards: RewardsState | null;
  /** `Date.now()` taken before the `get_rewards` request was sent; 0 when `rewards` is null. */
  rewardsFetchedAt: number;
}

export interface FamilySubscribeOptions {
  /** Also fetch `get_rewards` on every refresh. */
  rewards?: boolean;
  /** Implies `rewards`; asks for this many ledger rows plus archived rewards. */
  rewardsHistory?: number;
}

interface GetFamilyResponse {
  members: MemberSummary[];
  task_metadata: TaskMetadata[];
  reset_time: string;
  streak_check_time: string;
  household_entity_id: string;
}

const HOUSEHOLD_ENTITY_ID = 'todo.lucarne_household';

export const SYNTHETIC_HOUSEHOLD: MemberSummary = {
  slug: 'household',
  name: 'Household',
  color: 'var(--primary-color)',
  avatar: null,
  todo_entity_id: HOUSEHOLD_ENTITY_ID,
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
  opts?: FamilySubscribeOptions,
): () => void {
  const wantsRewards = opts?.rewards === true || opts?.rewardsHistory !== undefined;
  let cancelled = false;
  let rewards: RewardsState | null = null;
  let rewardsFetchedAt = 0;
  let metadataByUid = new Map<string, TaskMetadata>();
  let allMembers: MemberSummary[] = [];
  const todoItemsByEntity = new Map<string, TodoItem[]>();
  let streakBySlug = new Map<string, number>();
  let resetTime = '';
  let streakCheckTime = '';

  /**
   * The entity subscription is rebuilt only when the watched set changes.
   *
   * `doRefreshOnce` used to tear down and re-create every per-entity
   * subscription on each pass of the 20s fallback poll — 2N+1 subscribe
   * round-trips every 20 seconds for a set that changes about once a month.
   * `watchedKey` is the fingerprint of the current set; an unchanged key keeps
   * the existing subscription alive, so steady state is one subscription for
   * the lifetime of this handle.
   */
  let unsubEntities: (() => void) | null = null;
  let watchedKey = '';
  let watchedTodoIds: string[] = [];
  let streakSlugByCounter = new Map<string, string>();

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
    const householdItems = todoItemsByEntity.get(HOUSEHOLD_ENTITY_ID) ?? [];
    tasksByMember.set('household', buildRenderableTasks(householdItems, 'household', metadataByUid));
    callback({
      members: allMembers,
      tasksByMember,
      streakByMember: new Map(streakBySlug),
      taskMetadataByUid: new Map(metadataByUid),
      resetTime,
      streakCheckTime,
      integrationError: currentError,
      rewards,
      rewardsFetchedAt,
    });
  }

  /**
   * Coalesce overlapping refreshes: the event, poll, and visibility paths can
   * all fire close together, and each refresh re-reads every todo list —
   * concurrent runs would race those fetches and could drop a todo update.
   * (This covers the refresh paths only; a pushed state change calls
   * `refreshTodo` directly, which carries its own per-entity ordering guard.)
   * While one refresh is in flight, additional callers get
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
      // Taken before the request is sent: a mutation that succeeded earlier has
      // `appliedAt` below this, so the overlay can tell this fetch already
      // includes it.
      const fetchStartedAt = Date.now();
      const rewardsMsg: { type: string; history_limit?: number; include_archived?: boolean } = {
        type: 'lucarne_family/get_rewards',
      };
      if (opts?.rewardsHistory !== undefined) {
        rewardsMsg.history_limit = opts.rewardsHistory;
        rewardsMsg.include_archived = true;
      }
      const [familyResult, rewardsResult] = await Promise.allSettled([
        hass.connection.sendMessagePromise<GetFamilyResponse>({
          type: 'lucarne_family/get_family',
        }),
        wantsRewards
          ? hass.connection.sendMessagePromise<GetRewardsResponse>(rewardsMsg)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (familyResult.status === 'rejected') throw familyResult.reason;
      const resp = familyResult.value;
      if (wantsRewards) {
        // An older integration may lack the command: isolate it from the family state.
        const ok = rewardsResult.status === 'fulfilled' && rewardsResult.value;
        rewards = ok ? rewardsResult.value : null;
        rewardsFetchedAt = ok ? fetchStartedAt : 0;
      }

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
        metaMap.set(t.item_uid, { ...t, rotation_owners, points: Number(t.points ?? 0) });
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

      // Seed streaks we have no value for yet, so a card renders the right
      // number without waiting for a push. Deliberately NOT a wholesale reset:
      // `hass` is the snapshot captured when this handle was created, so its
      // `states` map is frozen at that moment. Re-seeding from it on every poll
      // would overwrite values pushed since — harmless while the push path was
      // broken (see subscribeEntityStates), a visible bug now that it works: an
      // incremented streak would appear and then revert 20s later.
      const liveSlugs = new Set(allMembers.map((m) => m.slug));
      for (const slug of [...streakBySlug.keys()]) {
        if (!liveSlugs.has(slug)) streakBySlug.delete(slug);
      }
      for (const m of allMembers) {
        if (!m.streak_counter_id || streakBySlug.has(m.slug)) continue;
        const currentState = hass.states?.[m.streak_counter_id]?.state;
        if (currentState !== undefined) {
          const v = parseInt(currentState, 10);
          streakBySlug.set(m.slug, isNaN(v) ? 0 : v);
        }
      }

      // Household tasks are always fetched; they go into tasksByMember['household']
      // whether or not household is a configured column.
      const todoIds = [...allMembers.map((m) => m.todo_entity_id), HOUSEHOLD_ENTITY_ID];
      const streaks = new Map(
        allMembers
          .filter((m) => m.streak_counter_id)
          .map((m) => [m.streak_counter_id, m.slug] as const),
      );
      resubscribeIfChanged(todoIds, streaks);

      // This is the fallback path for clients that don't deliver inbound pushes,
      // so re-read every list on each pass even when nothing was re-subscribed.
      await Promise.all(todoIds.map((id) => refreshTodo(id)));
      if (cancelled) return;

      emitState();
    } catch (err) {
      // Debug, not warn: the Today card subscribes for metadata enrichment even
      // in raw-only mode (no integration), so this firing on every reconnect is
      // an expected fallback path — not an actionable problem for the user.
      console.debug('[lucarne] get_family failed — integration may not be installed:', err);
      if (!cancelled) {
        currentError = err instanceof Error ? err : new Error(String(err));
        teardownEntities();
        allMembers = [];
        metadataByUid = new Map();
        streakBySlug = new Map();
        todoItemsByEntity.clear();
        resetTime = '';
        streakCheckTime = '';
        rewards = null;
        emitState();
      }
    }
  }

  function teardownEntities() {
    unsubEntities?.();
    unsubEntities = null;
    watchedKey = '';
    watchedTodoIds = [];
    streakSlugByCounter = new Map();
  }

  /**
   * Point the single entity subscription at `todoIds` + the streak counters,
   * re-creating it only when that set differs from the one already watched.
   */
  function resubscribeIfChanged(todoIds: string[], streaks: Map<string, string>) {
    watchedTodoIds = todoIds;
    streakSlugByCounter = streaks;
    // Drop cached items for lists nobody watches any more (e.g. a removed
    // member) so a later emitState can't resurrect them.
    for (const entityId of [...todoItemsByEntity.keys()]) {
      if (!todoIds.includes(entityId)) todoItemsByEntity.delete(entityId);
    }
    for (const entityId of [...todoFetchSeq.keys()]) {
      if (!todoIds.includes(entityId)) todoFetchSeq.delete(entityId);
    }

    const watched = [...todoIds, ...streaks.keys()];
    const key = [...watched].sort().join('|');
    if (key === watchedKey && unsubEntities) return;

    watchedKey = key;
    unsubEntities?.();
    unsubEntities = subscribeEntityStates(hass, watched, onEntityState, {
      // Clear the fingerprint so the next poll retries. Without this a single
      // rejected subscribe would silently cost live updates for the lifetime of
      // the handle: `unsubEntities` is still set, so the key check short-circuits.
      onError: () => {
        watchedKey = '';
      },
    });
  }

  function onEntityState(entityId: string, state: string, phase: EntityStatePhase) {
    if (cancelled) return;
    const slug = streakSlugByCounter.get(entityId);
    if (slug !== undefined) {
      // Snapshots included: a counter that has just entered the watched set
      // (member added or renamed) is not in the frozen `hass.states` the
      // seeding loop reads, so the snapshot is the only place its current
      // value ever appears.
      const v = parseInt(state, 10);
      streakBySlug.set(slug, isNaN(v) ? 0 : v);
      emitState();
      return;
    }
    if (!watchedTodoIds.includes(entityId)) return;
    // `'snapshot'` marks a subscription's opening frame and nothing else, so
    // this skips exactly the frame that duplicates the fetch doRefreshOnce runs
    // right after subscribing. A post-reconnect replay arrives as `'change'`
    // (the closure's snapshot flag survives the reconnect) and does re-fetch,
    // which is what a client that has been off the socket needs.
    if (phase === 'snapshot') return;
    void refreshTodo(entityId).then(emitState);
  }

  /**
   * Per-entity fetch sequence, so a slow response cannot overwrite a newer one.
   *
   * Two paths call `refreshTodo` concurrently — the poll's `Promise.all` and a
   * pushed state change — and neither goes through `refreshMetadata`'s
   * coalescer. Without a generation guard a fetch issued first but answered
   * second wins, and the card shows a stale list until the next cycle.
   */
  const todoFetchSeq = new Map<string, number>();

  async function refreshTodo(entityId: string) {
    const seq = (todoFetchSeq.get(entityId) ?? 0) + 1;
    todoFetchSeq.set(entityId, seq);
    const items = await fetchTodoItems(hass, entityId);
    if (cancelled) return;
    // A newer fetch for this entity has since been issued; its answer wins.
    if (todoFetchSeq.get(entityId) !== seq) return;
    // Re-check membership too: a fetch in flight when a member is removed would
    // otherwise re-insert the key that resubscribeIfChanged just pruned.
    if (!watchedTodoIds.includes(entityId)) return;
    todoItemsByEntity.set(entityId, items);
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
    teardownEntities();
    eventUnsubs.forEach((fn) => fn());
  };
}
