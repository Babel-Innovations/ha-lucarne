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
  todoItems?: Record<string, { uid: string; summary: string; status: string }[]>;
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
      if (payload.type === 'subscribe_trigger') {
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
      (todoCallback as unknown as (msg: unknown) => void)({
        variables: { trigger: { to_state: { state: 'on', attributes: {} } } },
      });
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
      // Capture the subscription for the streak counter entity
      if (
        payload.type === 'subscribe_trigger' &&
        (payload.trigger as { entity_id?: string })?.entity_id === 'counter.anna_streak'
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
    streakCallback!({
      variables: { trigger: { to_state: { state: '7', attributes: {} } } },
    });

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
    for (let i = 0; i < 5; i++) await new Promise((r) => process.nextTick(r));
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

describe('SYNTHETIC_HOUSEHOLD', () => {
  it('has slug "household" and todo_entity_id "todo.lucarne_household"', () => {
    assert.equal(SYNTHETIC_HOUSEHOLD.slug, 'household');
    assert.equal(SYNTHETIC_HOUSEHOLD.todo_entity_id, 'todo.lucarne_household');
    assert.equal(SYNTHETIC_HOUSEHOLD.streak_counter_id, '');
    assert.equal(SYNTHETIC_HOUSEHOLD.avatar, null);
  });
});
