import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { subscribeFamilyState, SYNTHETIC_HOUSEHOLD } from '../../src/shared/family-subscription.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';
import type { MemberSummary, TaskMetadata } from '../../src/shared/types.js';

const MEMBER_ANNA: MemberSummary = {
  slug: 'anna',
  name: 'Anna',
  color: '#f5c89c',
  avatar: null,
  todo_entity_id: 'todo.anna',
  streak_counter_id: 'counter.anna_streak',
};

const TASK_META: TaskMetadata = {
  item_uid: 'uid-1',
  member_slug: 'anna',
  assignee_slug: '',
  type: 'routine',
  recurrence: 'FREQ=DAILY',
  icon: '🪥',
  source: 'template',
};

function makeFamilyHass(opts: {
  members?: MemberSummary[];
  taskMetadata?: TaskMetadata[];
  todoItems?: Record<string, { uid: string; summary: string; status: string; completed?: string }[]>;
  getItemsError?: boolean;
}) {
  const fakeHass = makeFakeHass();

  fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
    if (payload.type === 'lucarne_family/get_family') {
      return {
        members: opts.members ?? [],
        task_metadata: opts.taskMetadata ?? [],
        reset_time: '07:00',
        streak_check_time: '22:00',
        household_entity_id: 'todo.lucarne_household',
      };
    }
    if (payload.type === 'call_service' && payload.domain === 'todo' && payload.service === 'get_items') {
      if (opts.getItemsError) throw new Error('todo.get_items failed');
      const entityId = (payload.target as { entity_id: string })?.entity_id ?? '';
      const items = (opts.todoItems ?? {})[entityId] ?? [];
      return { response: { [entityId]: { items } } };
    }
    return undefined;
  };

  return fakeHass;
}

describe('subscribeFamilyState', () => {
  it('fires callback with merged state on initial fetch', async () => {
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [TASK_META],
      todoItems: {
        'todo.anna': [{ uid: 'uid-1', summary: 'Brush teeth', status: 'needs_action' }],
      },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    // Wait for async refresh to resolve
    await new Promise((r) => setTimeout(r, 50));
    unsub();

    assert.ok(states.length >= 1, 'callback fired at least once');
    const last = states[states.length - 1];
    assert.equal(last.members.length, 1);
    assert.equal(last.members[0].slug, 'anna');
    assert.equal(last.resetTime, '07:00');
    assert.equal(last.streakCheckTime, '22:00');

    const annaTasks = last.tasksByMember.get('anna') ?? [];
    assert.equal(annaTasks.length, 1);
    assert.equal(annaTasks[0].summary, 'Brush teeth');
    assert.equal(annaTasks[0].metadata.type, 'routine');
    assert.equal(annaTasks[0].metadata.icon, '🪥');
  });

  it("carries HA's completion timestamp through to the renderable task", async () => {
    // The cards date a completion off TodoItem.completed to tell "ticked off
    // today" from a crossed-out row left over from a previous day.
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [TASK_META],
      todoItems: {
        'todo.anna': [
          {
            uid: 'uid-1',
            summary: 'Brush teeth',
            status: 'completed',
            completed: '2026-08-25T16:58:26+00:00',
          },
        ],
      },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });
    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const annaTasks = states[states.length - 1].tasksByMember.get('anna') ?? [];
    assert.equal(annaTasks[0].completed, '2026-08-25T16:58:26+00:00');
  });

  it('leaves completed undefined when HA sends no timestamp', async () => {
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [TASK_META],
      todoItems: {
        'todo.anna': [{ uid: 'uid-1', summary: 'Brush teeth', status: 'completed' }],
      },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });
    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const annaTasks = states[states.length - 1].tasksByMember.get('anna') ?? [];
    assert.equal(annaTasks[0].completed, undefined);
  });

  it('includes todo items without metadata using fallback chore metadata', async () => {
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [],
      todoItems: {
        'todo.anna': [{ uid: 'orphan-uid', summary: 'Unknown task', status: 'needs_action' }],
      },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const last = states[states.length - 1];
    const annaTasks = last.tasksByMember.get('anna') ?? [];
    assert.equal(annaTasks.length, 1);
    assert.equal(annaTasks[0].uid, 'orphan-uid');
    assert.equal(annaTasks[0].metadata.type, 'chore', 'orphan items get fallback type=chore');
    assert.equal(annaTasks[0].metadata.source, 'manual', 'orphan items get fallback source=manual');
    assert.equal(annaTasks[0].metadata.member_slug, 'anna');
  });

  it('skips members whose todo_entity_id is empty string', async () => {
    const memberNoEntity: MemberSummary = {
      slug: 'ghost',
      name: 'Ghost',
      color: '#aaa',
      avatar: null,
      todo_entity_id: '',
      streak_counter_id: '',
    };

    const fakeHass = makeFamilyHass({
      members: [memberNoEntity, MEMBER_ANNA],
      taskMetadata: [],
      todoItems: { 'todo.anna': [] },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const last = states[states.length - 1];
    const slugs = last.members.map((m) => m.slug);
    assert.ok(!slugs.includes('ghost'), 'member with empty todo_entity_id is excluded');
    assert.ok(slugs.includes('anna'));
  });

  it('unsubscribe stops further callbacks', async () => {
    let todoCallback: ((items: unknown[]) => void) | null = null;
    const fakeHass = makeFakeHass();
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/get_family') {
        return {
          members: [MEMBER_ANNA],
          task_metadata: [],
          reset_time: '07:00',
          streak_check_time: '22:00',
          household_entity_id: 'todo.lucarne_household',
        };
      }
      if (payload.type === 'call_service' && payload.domain === 'todo') {
        const entityId = (payload.target as { entity_id: string })?.entity_id ?? '';
        return { response: { [entityId]: { items: [] } } };
      }
      return undefined;
    };
    fakeHass.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      if (payload.type === 'subscribe_entities') {
        todoCallback = cb as unknown as (items: unknown[]) => void;
      }
      return async () => {};
    };

    let callCount = 0;
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, () => {
      callCount++;
    });

    await new Promise((r) => setTimeout(r, 50));
    const countAfterInit = callCount;
    assert.ok(countAfterInit >= 1, 'at least one call before unsub');

    unsub();
    const countAfterUnsub = callCount;

    // Simulate a state change after unsubscribe — should NOT fire callback
    if (todoCallback) {
      const push = todoCallback as unknown as (msg: unknown) => void;
      push({ a: { 'todo.anna': { s: '0' } } }); // initial snapshot
      push({ c: { 'todo.anna': { '+': { s: '1' } } } });
    }
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(callCount, countAfterUnsub, 'no callbacks after unsubscribe');
  });

  it('handles get_family failure gracefully (empty members, no throw)', async () => {
    const fakeHass = makeFakeHass();
    fakeHass.connection.sendMessagePromise = async () => {
      throw new Error('integration not installed');
    };

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const last = states[states.length - 1];
    assert.equal(last.members.length, 0, 'no members when integration unavailable');
  });

  it('seeds initial streak from hass.states without waiting for a counter state change', async () => {
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [],
      todoItems: { 'todo.anna': [] },
    });
    // Pre-set the counter state so it's available at subscribe time
    (fakeHass as unknown as Record<string, unknown>).states = {
      'counter.anna_streak': { state: '5', attributes: {} },
    };

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const last = states[states.length - 1];
    assert.equal(last.streakByMember.get('anna'), 5, 'initial streak seeded from hass.states');
  });

  it('emits streak values in streakByMember when counter state changes', async () => {
    let streakCallback: ((msg: unknown) => void) | null = null;
    const fakeHass = makeFakeHass();
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/get_family') {
        return {
          members: [MEMBER_ANNA],
          task_metadata: [],
          reset_time: '07:00',
          streak_check_time: '22:00',
          household_entity_id: 'todo.lucarne_household',
        };
      }
      if (payload.type === 'call_service' && payload.domain === 'todo') {
        const entityId = (payload.target as { entity_id: string })?.entity_id ?? '';
        return { response: { [entityId]: { items: [] } } };
      }
      return undefined;
    };
    fakeHass.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      // One subscription covers every watched entity, streak counters included.
      if (
        payload.type === 'subscribe_entities' &&
        (payload.entity_ids as string[] | undefined)?.includes('counter.anna_streak')
      ) {
        streakCallback = cb;
      }
      return async () => {};
    };

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));

    // Simulate a counter state change
    assert.ok(streakCallback !== null, 'streak counter subscribeMessage was called');
    streakCallback!({ a: { 'counter.anna_streak': { s: '3' } } }); // initial snapshot
    streakCallback!({ c: { 'counter.anna_streak': { '+': { s: '7' } } } });

    await new Promise((r) => setTimeout(r, 20));
    unsub();

    const last = states[states.length - 1];
    assert.equal(last.streakByMember.get('anna'), 7, 'streak value from counter state propagates');
  });

  it('parses rotation_owners JSON string into string[]', async () => {
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [
        {
          ...TASK_META,
          item_uid: 'rot-1',
          member_slug: 'household',
          type: 'rotating',
          recurrence: '',
          // Wire sends rotation_owners as a JSON string
          ...(({ rotation_owners: '["alice","bob","cara"]' } as unknown) as Partial<TaskMetadata>),
          current_owner: 'alice',
        } as TaskMetadata,
      ],
      todoItems: {
        'todo.anna': [],
        'todo.lucarne_household': [{ uid: 'rot-1', summary: 'Clean bathroom', status: 'needs_action' }],
      },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const last = states[states.length - 1];
    const meta = last.taskMetadataByUid.get('rot-1');
    assert.ok(meta, 'metadata found for rotating task');
    assert.deepEqual(meta!.rotation_owners, ['alice', 'bob', 'cara'], 'rotation_owners parsed from JSON string');
    assert.equal(meta!.current_owner, 'alice');
  });

  it('produces [] for malformed rotation_owners JSON string', async () => {
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [
        {
          ...TASK_META,
          item_uid: 'rot-bad',
          member_slug: 'household',
          type: 'rotating',
          recurrence: '',
          ...(({ rotation_owners: 'not-json' } as unknown) as Partial<TaskMetadata>),
        } as TaskMetadata,
      ],
      todoItems: {
        'todo.anna': [],
        'todo.lucarne_household': [{ uid: 'rot-bad', summary: 'Broken', status: 'needs_action' }],
      },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const last = states[states.length - 1];
    const meta = last.taskMetadataByUid.get('rot-bad');
    assert.ok(meta, 'metadata found for bad rotating task');
    assert.deepEqual(meta!.rotation_owners, [], 'malformed JSON produces []');
  });

  it('includes household tasks in tasksByMember under slug "household"', async () => {
    const fakeHass = makeFamilyHass({
      members: [MEMBER_ANNA],
      taskMetadata: [],
      todoItems: {
        'todo.anna': [],
        'todo.lucarne_household': [{ uid: 'h-uid-1', summary: 'Feed dog', status: 'needs_action' }],
      },
    });

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(fakeHass as unknown as import('../../src/shared/types.js').HomeAssistant, (s) => {
      states.push(s);
    });

    await new Promise((r) => setTimeout(r, 50));
    unsub();

    const last = states[states.length - 1];
    const householdTasks = last.tasksByMember.get('household') ?? [];
    assert.equal(householdTasks.length, 1);
    assert.equal(householdTasks[0].summary, 'Feed dog');
  });
});

describe('subscribeFamilyState fallback refresh', () => {
  const HA = (h: unknown) => h as unknown as import('../../src/shared/types.js').HomeAssistant;

  /** Build a hass mock that counts `lucarne_family/get_family` round-trips. */
  function makeCountingHass() {
    const counter = { getFamily: 0 };
    const fakeHass = makeFakeHass();
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/get_family') {
        counter.getFamily += 1;
        return {
          members: [MEMBER_ANNA],
          task_metadata: [],
          reset_time: '07:00',
          streak_check_time: '22:00',
          household_entity_id: 'todo.lucarne_household',
        };
      }
      if (payload.type === 'call_service' && payload.domain === 'todo' && payload.service === 'get_items') {
        const entityId = (payload.target as { entity_id: string })?.entity_id ?? '';
        return { response: { [entityId]: { items: [] } } };
      }
      return undefined;
    };
    return { fakeHass, counter };
  }

  /** Flush pending microtasks so an in-flight async refresh settles. */
  const flush = async () => {
    for (let i = 0; i < 25; i++) await new Promise((r) => process.nextTick(r));
  };

  it('re-fetches on the poll interval, then stops after unsub', async () => {
    const { fakeHass, counter } = makeCountingHass();
    try {
      // Enable mock timers before subscribing so the poll's setTimeout is captured.
      // Promises still resolve on the real microtask queue, so `flush` works.
      mock.timers.enable({ apis: ['setTimeout'] });

      const unsub = subscribeFamilyState(HA(fakeHass), () => {});
      await flush();
      assert.equal(counter.getFamily, 1, 'initial fetch');

      // One poll interval elapses → an unsolicited re-fetch, no pushed event.
      mock.timers.tick(20_000);
      await flush();
      assert.equal(counter.getFamily, 2, 'poll re-fetched after the interval');

      // A second interval → another re-fetch (self-rescheduling).
      mock.timers.tick(20_000);
      await flush();
      assert.equal(counter.getFamily, 3, 'poll reschedules itself');

      // After teardown the timer is cleared — no further fetches.
      unsub();
      mock.timers.tick(20_000);
      await flush();
      assert.equal(counter.getFamily, 3, 'poll stops after unsub');
    } finally {
      mock.timers.reset();
    }
  });

  it('re-fetches immediately when the page becomes visible, and stops after unsub', async () => {
    const { fakeHass, counter } = makeCountingHass();
    const unsub = subscribeFamilyState(HA(fakeHass), () => {});

    // Let the initial fetch settle (real timers; the 20s poll won't fire here).
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(counter.getFamily, 1, 'initial fetch');

    // visibilityState defaults to 'visible' in happy-dom, so a visibilitychange
    // forces an immediate catch-up refresh (the manual "switch tabs" automated).
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    assert.equal(counter.getFamily, 2, 'visibilitychange triggered an immediate re-fetch');

    // Listener is removed on teardown.
    unsub();
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    assert.equal(counter.getFamily, 2, 'no re-fetch after unsub');
  });

  it('coalesces refresh requests that arrive during an in-flight refresh into one trailing fetch', async () => {
    // get_family blocks on a gate so the initial refresh stays in flight while we
    // pile on more requests; releasing it should produce exactly one trailing fetch.
    let getFamily = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const fakeHass = makeFakeHass();
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/get_family') {
        getFamily += 1;
        await gate;
        return { members: [MEMBER_ANNA], task_metadata: [], reset_time: '07:00', streak_check_time: '22:00', household_entity_id: 'todo.lucarne_household' };
      }
      if (payload.type === 'call_service' && payload.domain === 'todo' && payload.service === 'get_items') {
        return { response: { [(payload.target as { entity_id: string })?.entity_id ?? '']: { items: [] } } };
      }
      return undefined;
    };

    const unsub = subscribeFamilyState(HA(fakeHass), () => {});
    // The initial refresh is in flight (awaiting the gate).
    assert.equal(getFamily, 1, 'initial fetch started');

    // Three more requests arrive while the first is still running.
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(getFamily, 1, 'no concurrent fetches while one is in flight');

    release();
    await flush();
    // Exactly one trailing fetch covers all three queued requests — not three.
    assert.equal(getFamily, 2, 'one trailing refresh coalesces the queued requests');
    unsub();
  });

  it('backs off the poll to 5 minutes while the integration is absent', async () => {
    let getFamily = 0;
    const fakeHass = makeFakeHass();
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/get_family') {
        getFamily += 1;
        throw new Error('Unknown command'); // integration not installed
      }
      return undefined;
    };
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(fakeHass), () => {});
      await flush();
      assert.equal(getFamily, 1, 'initial fetch failed (integration absent)');

      // The normal 20s interval must NOT fire — the poll backed off after the failure.
      mock.timers.tick(20_000);
      await flush();
      assert.equal(getFamily, 1, 'no 20s poll while integration is absent');

      // At the 5-minute backoff interval it retries (so it recovers if installed later).
      mock.timers.tick(5 * 60 * 1000 - 20_000);
      await flush();
      assert.equal(getFamily, 2, 'retries at the backed-off interval');
      unsub();
    } finally {
      mock.timers.reset();
    }
  });
});

describe('subscribeFamilyState entity subscription lifecycle', () => {
  const HA = (h: unknown) => h as unknown as import('../../src/shared/types.js').HomeAssistant;
  const flush = async () => {
    for (let i = 0; i < 25; i++) await new Promise((r) => process.nextTick(r));
  };

  function makeSubCountingHass(members: MemberSummary[]) {
    const subs: Array<Record<string, unknown>> = [];
    let unsubs = 0;
    const fakeHass = makeFakeHass();
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/get_family') {
        return {
          members,
          task_metadata: [],
          reset_time: '07:00',
          streak_check_time: '22:00',
          household_entity_id: 'todo.lucarne_household',
        };
      }
      if (payload.type === 'call_service' && payload.domain === 'todo') {
        const entityId = (payload.target as { entity_id: string })?.entity_id ?? '';
        return { response: { [entityId]: { items: [] } } };
      }
      return undefined;
    };
    fakeHass.connection.subscribeMessage = async (
      _cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      const isEntitySub = payload.type === 'subscribe_entities';
      if (isEntitySub) subs.push(payload);
      return async () => {
        // Count only entity-subscription teardowns; the lucarne_family/subscribe
        // relay is a separate, unrelated subscription on the same channel.
        if (isEntitySub) unsubs++;
      };
    };
    return { fakeHass, subs, unsubCount: () => unsubs };
  }

  it('opens ONE subscription covering every member todo, streak counter and the household list', async () => {
    const { fakeHass, subs } = makeSubCountingHass([MEMBER_ANNA]);
    const unsub = subscribeFamilyState(HA(fakeHass), () => {});
    await flush();
    unsub();

    assert.equal(subs.length, 1, 'a single subscription, not one per entity');
    assert.deepEqual(subs[0].entity_ids, [
      'todo.anna',
      'todo.lucarne_household',
      'counter.anna_streak',
    ]);
  });

  // Regression guard. doRefreshOnce used to tear down and rebuild every
  // subscription on each pass of the 20s fallback poll. With N members that is
  // 2N+1 subscribe round-trips every 20 seconds for a set that changes about
  // once a month — and while those subscriptions were being rejected it was
  // 2N+1 server-side errors every 20 seconds, indefinitely.
  it('regression: an unchanged member set across polls does NOT re-subscribe', async () => {
    const { fakeHass, subs, unsubCount } = makeSubCountingHass([MEMBER_ANNA]);
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(fakeHass), () => {});
      await flush();
      assert.equal(subs.length, 1, 'initial subscription');

      mock.timers.tick(20_000);
      await flush();
      mock.timers.tick(20_000);
      await flush();

      assert.equal(subs.length, 1, 'two more polls, still the same one subscription');
      assert.equal(unsubCount(), 0, 'nothing was torn down');
      unsub();
      assert.equal(unsubCount(), 1, 'released once, on teardown');
    } finally {
      mock.timers.reset();
    }
  });

  // Regression guard. doRefreshOnce reset streakByMember and re-seeded it from
  // `hass.states` on every pass — but `hass` is the snapshot captured when the
  // handle was created, so its states map is frozen. That clobbered any streak
  // pushed since. It was invisible while the push path was admin-blocked; with
  // subscribe_entities working, an incremented streak would revert after 20s.
  it('regression: a polled refresh does not clobber a pushed streak value', async () => {
    const { fakeHass, subs } = makeSubCountingHass([MEMBER_ANNA]);
    // The captured snapshot says 5 — it will never change, exactly like the
    // real frozen `hass` object a card hands over at subscribe time.
    (fakeHass as unknown as Record<string, unknown>).states = {
      'counter.anna_streak': { state: '5', attributes: {} },
    };
    let pushEntities!: (msg: unknown) => void;
    const realSubscribe = fakeHass.connection.subscribeMessage;
    fakeHass.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      if (payload.type === 'subscribe_entities') pushEntities = cb;
      return realSubscribe(cb, payload);
    };

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(fakeHass), (st) => states.push(st));
      await flush();
      assert.equal(states[states.length - 1].streakByMember.get('anna'), 5, 'seeded from the snapshot');
      assert.equal(subs.length, 1);

      pushEntities({ a: { 'counter.anna_streak': { s: '5' } } }); // snapshot frame
      pushEntities({ c: { 'counter.anna_streak': { '+': { s: '9' } } } });
      await flush();
      assert.equal(states[states.length - 1].streakByMember.get('anna'), 9, 'push applied');

      mock.timers.tick(20_000);
      await flush();
      assert.equal(
        states[states.length - 1].streakByMember.get('anna'),
        9,
        'the poll must not revert the streak to the stale snapshot value',
      );
      unsub();
    } finally {
      mock.timers.reset();
    }
  });

  // Regression guard for the fix to the fix: `subscribeEntityStates` used to
  // swallow every opening snapshot. That is right for a reconnect replay (the
  // closure survives) but wrong for a deliberate re-subscribe — a member added
  // while a card is open gets a brand-new subscription whose snapshot is the
  // ONLY place its streak value ever appears, since the seeding loop reads the
  // `hass.states` snapshot frozen at subscribe time.
  it('regression: a counter added mid-session gets its value from the snapshot', async () => {
    const MEMBER_BOB: MemberSummary = {
      slug: 'bob',
      name: 'Bob',
      color: '#9cc8f5',
      avatar: null,
      todo_entity_id: 'todo.bob',
      streak_counter_id: 'counter.bob_streak',
    };
    const members: MemberSummary[] = [MEMBER_ANNA];
    const { fakeHass, subs } = makeSubCountingHass(members);
    // The frozen snapshot knows nothing about Bob — he did not exist yet.
    (fakeHass as unknown as Record<string, unknown>).states = {
      'counter.anna_streak': { state: '1', attributes: {} },
    };
    const pushes: Array<(msg: unknown) => void> = [];
    const realSubscribe = fakeHass.connection.subscribeMessage;
    fakeHass.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      if (payload.type === 'subscribe_entities') pushes.push(cb);
      return realSubscribe(cb, payload);
    };

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(fakeHass), (st) => states.push(st));
      await flush();

      members.push(MEMBER_BOB);
      mock.timers.tick(20_000);
      await flush();
      assert.equal(subs.length, 2, 'the new member forced a fresh subscription');

      // The new subscription opens with a snapshot carrying Bob's real value.
      pushes[1]({
        a: {
          'counter.anna_streak': { s: '1' },
          'counter.bob_streak': { s: '6' },
          'todo.anna': { s: '0' },
          'todo.bob': { s: '0' },
          'todo.lucarne_household': { s: '0' },
        },
      });
      await flush();

      assert.equal(
        states[states.length - 1].streakByMember.get('bob'),
        6,
        "the snapshot is the only source for a counter that isn't in the frozen hass.states",
      );
      unsub();
    } finally {
      mock.timers.reset();
    }
  });

  // The opening snapshot repeats what doRefreshOnce fetches right after
  // subscribing; reacting to it would double every todo read on re-subscribe.
  it('does not re-fetch todo lists in response to the opening snapshot', async () => {
    const { fakeHass, subs } = makeSubCountingHass([MEMBER_ANNA]);
    let getItems = 0;
    const realSend = fakeHass.connection.sendMessagePromise;
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'call_service' && payload.domain === 'todo') getItems++;
      return realSend(payload);
    };
    let push!: (msg: unknown) => void;
    const realSubscribe = fakeHass.connection.subscribeMessage;
    fakeHass.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      if (payload.type === 'subscribe_entities') push = cb;
      return realSubscribe(cb, payload);
    };

    const unsub = subscribeFamilyState(HA(fakeHass), () => {});
    await flush();
    assert.equal(subs.length, 1);
    const afterInitialFetch = getItems;
    assert.equal(afterInitialFetch, 2, 'todo.anna + todo.lucarne_household, once each');

    push({ a: { 'todo.anna': { s: '0' }, 'todo.lucarne_household': { s: '0' } } });
    await flush();
    assert.equal(getItems, afterInitialFetch, 'the snapshot did not duplicate the fetch');

    push({ c: { 'todo.anna': { '+': { s: '1' } } } });
    await flush();
    assert.equal(getItems, afterInitialFetch + 1, 'a real change does re-fetch');
    unsub();
  });

  // Regression guard. `subscribeEntityStates` always returns a truthy unsub
  // wrapper, and `resubscribeIfChanged` has already committed `watchedKey` by
  // the time a rejection lands — so without routing the failure back, the
  // `key === watchedKey && unsubEntities` short-circuit made every later poll
  // believe the subscription was live. One rejected subscribe would have cost
  // pushes for the lifetime of the card.
  it('regression: retries on the next poll after a rejected subscribe', async () => {
    const { fakeHass, subs } = makeSubCountingHass([MEMBER_ANNA]);
    let rejectNext = true;
    const realSubscribe = fakeHass.connection.subscribeMessage;
    fakeHass.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      if (payload.type === 'subscribe_entities' && rejectNext) {
        rejectNext = false;
        throw new Error('Unauthorized');
      }
      return realSubscribe(cb, payload);
    };

    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(fakeHass), () => {});
      await flush();
      assert.equal(subs.length, 0, 'the first subscribe was rejected');

      mock.timers.tick(20_000);
      await flush();
      assert.equal(subs.length, 1, 'the next poll retried rather than giving up');
      unsub();
    } finally {
      mock.timers.reset();
      console.warn = originalWarn;
    }
  });

  // The poll's Promise.all and a pushed change both call refreshTodo directly,
  // outside refreshMetadata's coalescer. Without a per-entity generation guard
  // a fetch issued first but answered second wins, and the card shows a stale
  // list until the next cycle.
  it('regression: a slow earlier todo fetch cannot clobber a newer one', async () => {
    const fakeHass = makeFakeHass();
    const gates: Array<() => void> = [];
    let getItems = 0;
    fakeHass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/get_family') {
        return {
          members: [MEMBER_ANNA],
          task_metadata: [],
          reset_time: '07:00',
          streak_check_time: '22:00',
          household_entity_id: 'todo.lucarne_household',
        };
      }
      if (payload.type === 'call_service' && payload.domain === 'todo') {
        const entityId = (payload.target as { entity_id: string })?.entity_id ?? '';
        if (entityId !== 'todo.anna') return { response: { [entityId]: { items: [] } } };
        getItems += 1;
        const n = getItems;
        // Fetch #2 answers immediately; fetch #1 is held open and released last.
        if (n === 1) {
          await new Promise<void>((r) => gates.push(r));
          return { response: { 'todo.anna': { items: [{ uid: 'stale', summary: 'Stale', status: 'needs_action' }] } } };
        }
        return { response: { 'todo.anna': { items: [{ uid: 'fresh', summary: 'Fresh', status: 'needs_action' }] } } };
      }
      return undefined;
    };
    let push!: (msg: unknown) => void;
    fakeHass.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      if (payload.type === 'subscribe_entities') push = cb;
      return async () => {};
    };

    const states: import('../../src/shared/family-subscription.js').FamilyState[] = [];
    const unsub = subscribeFamilyState(HA(fakeHass), (st) => states.push(st));
    await flush();
    assert.equal(getItems, 1, 'the initial fetch is in flight, held on its gate');

    // A pushed change issues fetch #2, which answers first with the new items.
    push({ a: {} });
    push({ c: { 'todo.anna': { '+': { s: '1' } } } });
    await flush();
    assert.equal(getItems, 2);
    assert.deepEqual(
      (states[states.length - 1].tasksByMember.get('anna') ?? []).map((t) => t.uid),
      ['fresh'],
    );

    // Now the stale first fetch finally answers. It must be discarded.
    gates.forEach((release) => release());
    await flush();
    assert.deepEqual(
      (states[states.length - 1].tasksByMember.get('anna') ?? []).map((t) => t.uid),
      ['fresh'],
      'the superseded fetch does not overwrite the newer result',
    );
    unsub();
  });

  it('re-subscribes when the member set actually changes', async () => {
    const MEMBER_BOB: MemberSummary = {
      slug: 'bob',
      name: 'Bob',
      color: '#9cc8f5',
      avatar: null,
      todo_entity_id: 'todo.bob',
      streak_counter_id: 'counter.bob_streak',
    };
    const members: MemberSummary[] = [MEMBER_ANNA];
    const { fakeHass, subs } = makeSubCountingHass(members);
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(fakeHass), () => {});
      await flush();
      assert.equal(subs.length, 1);

      members.push(MEMBER_BOB); // a member is added between polls
      mock.timers.tick(20_000);
      await flush();

      assert.equal(subs.length, 2, 'the new member forces a fresh subscription');
      assert.ok((subs[1].entity_ids as string[]).includes('todo.bob'));
      unsub();
    } finally {
      mock.timers.reset();
    }
  });
});

describe('subscribeFamilyState rewards opt-in', () => {
  type FS = import('../../src/shared/family-subscription.js').FamilyState;
  const HA = (h: unknown) => h as import('../../src/shared/types.js').HomeAssistant;
  // nextTick, not setTimeout: the mock-timer tests below fake setTimeout.
  const flush = async () => {
    for (let i = 0; i < 25; i++) await new Promise((r) => process.nextTick(r));
  };
  const REWARDS = {
    is_admin: true,
    balances: { anna: 3 },
    rewards: [],
    claims: [],
    settings: { streak_daily_bonus: 0, streak_milestones: [] },
  };

  function makeHass(opts: { rewardsFails?: boolean } = {}) {
    const sent: Record<string, unknown>[] = [];
    let relay: ((m: unknown) => void) | null = null;
    let entityPush: ((m: unknown) => void) | null = null;
    const hass = makeFakeHass();
    hass.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      sent.push(payload);
      if (payload.type === 'lucarne_family/get_family') {
        return {
          members: [MEMBER_ANNA],
          task_metadata: [{ ...TASK_META, points: '4' }],
          reset_time: '07:00',
          streak_check_time: '22:00',
          household_entity_id: 'todo.lucarne_household',
        };
      }
      if (payload.type === 'lucarne_family/get_rewards') {
        if (opts.rewardsFails) throw new Error('unknown command');
        return REWARDS;
      }
      if (payload.type === 'call_service' && payload.domain === 'todo') {
        const entityId = (payload.target as { entity_id: string })?.entity_id ?? '';
        return { response: { [entityId]: { items: [] } } };
      }
      return undefined;
    };
    hass.connection.subscribeMessage = async (cb: (m: unknown) => void, payload: Record<string, unknown>) => {
      if (payload.type === 'lucarne_family/subscribe') relay = cb;
      if (payload.type === 'subscribe_entities') entityPush = cb;
      return async () => {};
    };
    const rewardsMsgs = () => sent.filter((m) => m.type === 'lucarne_family/get_rewards');
    return { hass, sent, rewardsMsgs, relay: () => relay!, entityPush: () => entityPush! };
  }

  it('without opts sends no get_rewards on refresh, poll or relayed event', async () => {
    const h = makeHass();
    const states: FS[] = [];
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(h.hass), (s) => states.push(s));
      await flush();
      mock.timers.tick(20_000);
      await flush();
      h.relay()({ event_type: 'lucarne_family_rewards_updated' });
      mock.timers.tick(1000);
      await flush();
      unsub();
    } finally {
      mock.timers.reset();
    }
    assert.ok(h.sent.filter((m) => m.type === 'lucarne_family/get_family').length >= 3);
    assert.equal(h.rewardsMsgs().length, 0);
    assert.ok(states.length > 0);
    for (const s of states) {
      assert.equal(s.rewards, null);
      assert.equal(s.rewardsFetchedAt, 0);
    }
  });

  it('{ rewards: true } fetches alongside get_family, including on a relayed event', async () => {
    const h = makeHass();
    const states: FS[] = [];
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const unsub = subscribeFamilyState(HA(h.hass), (s) => states.push(s), { rewards: true });
      await flush();
      assert.equal(h.rewardsMsgs().length, 1);
      h.relay()({ event_type: 'lucarne_family_rewards_updated' });
      mock.timers.tick(1000);
      await flush();
      assert.equal(h.rewardsMsgs().length, 2, 'relayed event refetches rewards');
      unsub();
    } finally {
      mock.timers.reset();
    }
    for (const m of h.rewardsMsgs()) {
      assert.deepEqual(Object.keys(m), ['type']);
    }
    assert.equal(states[states.length - 1].rewards?.balances.anna, 3);
  });

  it('{ rewardsHistory: 50 } alone fetches with history_limit and include_archived', async () => {
    const h = makeHass();
    const unsub = subscribeFamilyState(HA(h.hass), () => {}, { rewardsHistory: 50 });
    await flush();
    unsub();
    assert.equal(h.rewardsMsgs().length, 1);
    assert.equal(h.rewardsMsgs()[0].history_limit, 50);
    assert.equal(h.rewardsMsgs()[0].include_archived, true);
  });

  it('a rejecting get_rewards yields rewards null without an integrationError', async () => {
    const h = makeHass({ rewardsFails: true });
    const states: FS[] = [];
    const unsub = subscribeFamilyState(HA(h.hass), (s) => states.push(s), { rewards: true });
    await flush();
    unsub();
    const last = states[states.length - 1];
    assert.equal(last.rewards, null);
    assert.equal(last.rewardsFetchedAt, 0);
    assert.equal(last.integrationError, null);
    assert.equal(last.members.length, 1);
  });

  it('rewardsFetchedAt is taken before the response resolves', async () => {
    const h = makeHass();
    const states: FS[] = [];
    const unsub = subscribeFamilyState(HA(h.hass), (s) => states.push(s), { rewards: true });
    await flush();
    const resolvedAt = Date.now();
    unsub();
    const last = states[states.length - 1];
    assert.ok(last.rewardsFetchedAt > 0);
    assert.ok(last.rewardsFetchedAt <= resolvedAt);
  });

  it('a state emitted by a todo push still carries rewards and rewardsFetchedAt', async () => {
    const h = makeHass();
    const states: FS[] = [];
    const unsub = subscribeFamilyState(HA(h.hass), (s) => states.push(s), { rewards: true });
    await flush();
    const before = states[states.length - 1];
    const count = states.length;
    h.entityPush()({ a: { 'todo.anna': { s: '0' } } });
    h.entityPush()({ c: { 'todo.anna': { '+': { s: '1' } } } });
    await flush();
    unsub();
    assert.ok(states.length > count, 'the push emitted a state');
    const last = states[states.length - 1];
    assert.deepEqual(last.rewards, before.rewards);
    assert.equal(last.rewardsFetchedAt, before.rewardsFetchedAt);
  });

  it('normalizes task points to a number', async () => {
    const h = makeHass();
    const states: FS[] = [];
    const unsub = subscribeFamilyState(HA(h.hass), (s) => states.push(s));
    await flush();
    unsub();
    assert.strictEqual(states[states.length - 1].taskMetadataByUid.get('uid-1')?.points, 4);
  });
});

describe('SYNTHETIC_HOUSEHOLD', () => {
  it('has slug "household" and todo_entity_id "todo.lucarne_household"', () => {
    assert.equal(SYNTHETIC_HOUSEHOLD.slug, 'household');
    assert.equal(SYNTHETIC_HOUSEHOLD.todo_entity_id, 'todo.lucarne_household');
    assert.equal(SYNTHETIC_HOUSEHOLD.streak_counter_id, '');
    assert.equal(SYNTHETIC_HOUSEHOLD.avatar, null);
  });
});
