import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneChoresCard } from '../../src/cards/lucarne-chores-card.js';
import type { HomeAssistant, RenderableTask } from '../../src/shared/types.js';
import type { FamilyState } from '../../src/shared/family-subscription.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

await import('../../src/cards/lucarne-chores-card.js');

const GET_FAMILY_RESPONSE = {
  members: [
    {
      slug: 'anna',
      name: 'Anna',
      color: '#f5c89c',
      avatar: null,
      todo_entity_id: 'todo.anna',
      streak_counter_id: 'counter.anna_streak',
    },
    {
      slug: 'bob',
      name: 'Bob',
      color: '#b8e0d2',
      avatar: null,
      todo_entity_id: 'todo.bob',
      streak_counter_id: 'counter.bob_streak',
    },
  ],
  task_metadata: [],
  reset_time: '03:00',
  streak_check_time: '02:00',
  household_entity_id: 'todo.lucarne_household',
};

function makeFakeHassWithMembers() {
  const base = makeFakeHass();
  const conn = {
    ...base.connection,
    async sendMessagePromise(payload: Record<string, unknown>) {
      if (payload['type'] === 'lucarne_family/get_family') return GET_FAMILY_RESPONSE;
      return { response: {} };
    },
  };
  return { ...base, connection: conn };
}

function makeFakeHassIntegrationMissing() {
  const base = makeFakeHass();
  const conn = {
    ...base.connection,
    async sendMessagePromise(payload: Record<string, unknown>) {
      if (payload['type'] === 'lucarne_family/get_family') throw new Error('Unknown command');
      return undefined;
    },
  };
  return { ...base, connection: conn };
}

async function makeCard(members: string[], hass = makeFakeHassWithMembers()): Promise<LucarneChoresCard> {
  const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
  el.setConfig({ type: 'custom:lucarne-chores-card', members });
  el.hass = hass as unknown as HomeAssistant;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 50));
  await el.updateComplete;
  return el;
}

function shadow(el: LucarneChoresCard, sel: string) {
  return el.shadowRoot?.querySelector(sel) ?? null;
}

afterEach(() => {
  document.querySelectorAll('lucarne-chores-card').forEach((el) => el.remove());
});

describe('lucarne-chores-card', () => {
  it('setConfig throws when members is not an array', () => {
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    assert.throws(
      () => el.setConfig({ type: 'custom:lucarne-chores-card', members: 'bad' as unknown as string[] }),
      /members must be an array/,
    );
  });

  it('setConfig accepts empty members array without throwing', () => {
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    assert.doesNotThrow(() => el.setConfig({ type: 'custom:lucarne-chores-card', members: [] }));
  });

  it('renders a member column for each configured member slug', async () => {
    const el = await makeCard(['anna', 'bob']);
    const cells = el.shadowRoot!.querySelectorAll('.member-cell');
    assert.equal(cells.length, 2, 'one cell per configured member');
  });

  it('renders only configured slugs — not all integration members', async () => {
    const el = await makeCard(['anna']);
    const cells = el.shadowRoot!.querySelectorAll('.member-cell');
    assert.equal(cells.length, 1, 'only anna column shown');
  });

  it('forwards hide_names to member columns', async () => {
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    el.setConfig({ type: 'custom:lucarne-chores-card', members: ['anna'], hide_names: true });
    el.hass = makeFakeHassWithMembers() as unknown as HomeAssistant;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const col = el.shadowRoot!.querySelector('lucarne-member-column') as HTMLElement & { hideName: boolean };
    assert.ok(col, 'member column rendered');
    assert.equal(col.hideName, true, 'hide-name forwarded to column');
  });

  it('defaults hide_names to false (names shown)', async () => {
    const el = await makeCard(['anna']);
    const col = el.shadowRoot!.querySelector('lucarne-member-column') as HTMLElement & { hideName: boolean };
    assert.ok(col, 'member column rendered');
    assert.equal(col.hideName, false, 'names shown by default');
  });

  it('forwards a valid scroll-to-bucket to each column by default (auto-scroll on)', async () => {
    const el = await makeCard(['anna']);
    const col = el.shadowRoot!.querySelector('lucarne-member-column')!;
    const bucket = col.getAttribute('scroll-to-bucket');
    assert.ok(
      ['morning', 'afternoon', 'night'].includes(bucket ?? ''),
      `scroll-to-bucket is a valid time-of-day bucket (got ${bucket})`,
    );
  });

  it('forces the bucket the configured thresholds select', async () => {
    // night_start 00:00 → every local time is at/after night → always 'night'.
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    el.setConfig({ type: 'custom:lucarne-chores-card', members: ['anna'], night_start: '00:00' });
    el.hass = makeFakeHassWithMembers() as unknown as HomeAssistant;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const col = el.shadowRoot!.querySelector('lucarne-member-column')!;
    assert.equal(col.getAttribute('scroll-to-bucket'), 'night');
  });

  it('passes an empty scroll-to-bucket when auto_scroll is disabled', async () => {
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    el.setConfig({ type: 'custom:lucarne-chores-card', members: ['anna'], auto_scroll: false });
    el.hass = makeFakeHassWithMembers() as unknown as HomeAssistant;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const col = el.shadowRoot!.querySelector('lucarne-member-column')!;
    assert.equal(col.getAttribute('scroll-to-bucket'), '', 'auto-scroll off → empty bucket');
  });

  it('skips hidden_members but keeps the others', async () => {
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    el.setConfig({ type: 'custom:lucarne-chores-card', members: ['anna', 'bob'], hidden_members: ['bob'] });
    el.hass = makeFakeHassWithMembers() as unknown as HomeAssistant;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const cells = el.shadowRoot!.querySelectorAll('.member-cell');
    assert.equal(cells.length, 1, 'only the non-hidden member renders');
  });

  it('renders integration error block when integration is not installed', async () => {
    const el = await makeCard(['anna'], makeFakeHassIntegrationMissing());
    const errorBlock = shadow(el, '.error-block');
    assert.ok(errorBlock, 'error block shown');
    assert.ok(
      errorBlock!.textContent!.toLowerCase().includes('lucarne family') ||
        errorBlock!.textContent!.toLowerCase().includes('not set up'),
      'error mentions integration',
    );
  });

  it('renders upgrade message text for old kids: config after hass is set', async () => {
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    el.setConfig({
      type: 'custom:lucarne-chores-card',
      kids: [{ name: 'Alice', chores: [] }],
    } as unknown as Parameters<LucarneChoresCard['setConfig']>[0]);
    el.hass = makeFakeHassWithMembers() as unknown as HomeAssistant;
    document.body.appendChild(el);
    await el.updateComplete;

    const errorBlock = shadow(el, '.error-block');
    assert.ok(errorBlock, 'upgrade error block rendered');
    const text = errorBlock!.textContent!.toLowerCase();
    assert.ok(
      text.includes('upgraded') || text.includes('update your yaml') || text.includes('card upgraded'),
      'upgrade message displayed',
    );
  });

  it('shows loading state before family state arrives', async () => {
    // Use a hass whose get_family never resolves during the test
    const base = makeFakeHass();
    let resolveFamily!: (v: unknown) => void;
    const conn = {
      ...base.connection,
      sendMessagePromise(payload: Record<string, unknown>) {
        if (payload['type'] === 'lucarne_family/get_family') {
          return new Promise((r) => { resolveFamily = r; });
        }
        return Promise.resolve({ response: {} });
      },
    };
    const el = document.createElement('lucarne-chores-card') as LucarneChoresCard;
    el.setConfig({ type: 'custom:lucarne-chores-card', members: ['anna'] });
    el.hass = { ...base, connection: conn } as unknown as HomeAssistant;
    document.body.appendChild(el);
    await el.updateComplete;

    const loading = shadow(el, '.loading');
    assert.ok(loading, 'loading state shown before data arrives');

    // Resolve so teardown doesn't hang
    resolveFamily(GET_FAMILY_RESPONSE);
    el.remove();
  });

  it('members grid uses single-row flex with horizontal overflow scroll', async () => {
    const el = await makeCard(['anna', 'bob']);
    const grid = shadow(el, '.members-grid') as HTMLElement;
    assert.ok(grid, 'members-grid present');
    const styleText = (el.constructor as unknown as { styles: { cssText: string }[] | { cssText: string } }).styles;
    const allCss = Array.isArray(styleText)
      ? styleText.map((s) => s.cssText).join('\n')
      : styleText.cssText;
    // Outer grid should be flex row, not grid wrap, so members lay out in a single
    // row and overflow horizontally instead of wrapping to a new row.
    assert.match(allCss, /\.members-grid\s*\{[^}]*display:\s*flex/, 'grid uses flex');
    assert.match(
      allCss,
      /\.members-grid\s*\{[^}]*overflow-x:\s*auto/,
      'grid scrolls horizontally',
    );
    assert.match(
      allCss,
      /\.members-grid\s*\{[^}]*flex-wrap:\s*nowrap/,
      'grid does not wrap',
    );
  });

  it('card re-renders when _familyState is updated', async () => {
    const el = await makeCard(['anna']);
    const initial = el.shadowRoot!.querySelectorAll('.member-cell').length;
    assert.equal(initial, 1);

    // Directly update the reactive _familyState to simulate a live push
    const newState: FamilyState = {
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
        { slug: 'bob', name: 'Bob', color: '#b8e0d2', avatar: null, todo_entity_id: 'todo.bob', streak_counter_id: 'counter.bob_streak' },
      ],
      tasksByMember: new Map([['anna', []], ['bob', []]]),
      streakByMember: new Map([['anna', 3], ['bob', 1]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    };
    (el as unknown as { _familyState: FamilyState })._familyState = newState;
    // Also update config to include bob
    el.setConfig({ type: 'custom:lucarne-chores-card', members: ['anna', 'bob'] });
    await el.updateComplete;

    const after = el.shadowRoot!.querySelectorAll('.member-cell').length;
    assert.equal(after, 2, 'card re-renders with updated family state');
  });

  function makeChore(status: RenderableTask['status'] = 'needs_action'): RenderableTask {
    return {
      uid: 'c-1',
      summary: 'Clean up',
      status,
      due: null,
      description: '',
      metadata: {
        item_uid: 'c-1',
        member_slug: 'anna',
        assignee_slug: '',
        type: 'chore',
        recurrence: '',
        icon: '',
        source: 'manual',
        time_of_day: 'anytime',
      },
    };
  }

  function makeRotatingTask(currentOwner = 'bob'): RenderableTask {
    return {
      uid: 'r-1',
      summary: 'Vacuum',
      status: 'needs_action',
      due: null,
      description: '',
      metadata: {
        item_uid: 'r-1',
        member_slug: 'household',
        assignee_slug: '',
        type: 'rotating',
        recurrence: '',
        icon: '',
        source: 'manual',
        time_of_day: 'anytime',
        rotation_owners: ['anna', 'bob'],
        current_owner: currentOwner,
      },
    };
  }

  function seedHouseholdRotating(el: LucarneChoresCard, task: RenderableTask) {
    const state: FamilyState = {
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
        { slug: 'bob', name: 'Bob', color: '#b8e0d2', avatar: null, todo_entity_id: 'todo.bob', streak_counter_id: 'counter.bob_streak' },
      ],
      tasksByMember: new Map([
        ['anna', []],
        ['bob', []],
        ['household', [task]],
      ]),
      streakByMember: new Map([['anna', 0], ['bob', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    };
    (el as unknown as { _familyState: FamilyState })._familyState = state;
  }

  function seedAnnaTask(el: LucarneChoresCard, task: RenderableTask) {
    const state: FamilyState = {
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
      ],
      tasksByMember: new Map([['anna', [task]]]),
      streakByMember: new Map([['anna', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    };
    (el as unknown as { _familyState: FamilyState })._familyState = state;
  }

  function annaTaskRow(el: LucarneChoresCard): (HTMLElement & { task: RenderableTask }) | null {
    const col = el.shadowRoot!.querySelector('lucarne-member-column');
    return (col?.shadowRoot?.querySelector('lucarne-task-row') ?? null) as
      | (HTMLElement & { task: RenderableTask })
      | null;
  }

  it('optimistically flips a toggled task before the server confirms', async () => {
    const el = await makeCard(['anna']);
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;

    const row = annaTaskRow(el);
    assert.ok(row, 'task row rendered');
    assert.equal(row!.task.status, 'needs_action', 'row starts incomplete');

    // Dispatch the toggle the way lucarne-task-row does; no family-state push follows.
    row!.dispatchEvent(
      new CustomEvent('task-toggle', { detail: { task: row!.task }, bubbles: true, composed: true }),
    );
    await el.updateComplete;

    const after = annaTaskRow(el);
    assert.equal(after!.task.status, 'completed', 'row flips immediately without a server refetch');

    const hass = el.hass as unknown as { calls: { callService: { domain: string; service: string }[] } };
    assert.ok(
      hass.calls.callService.some((c) => c.domain === 'todo' && c.service === 'update_item'),
      'todo.update_item was called',
    );
  });

  it('reverts the optimistic toggle when the service call fails', async () => {
    const base = makeFakeHassWithMembers();
    const hass = {
      ...base,
      async callService(): Promise<undefined> {
        throw new Error('service failed');
      },
    } as unknown as ReturnType<typeof makeFakeHassWithMembers>;
    const el = await makeCard(['anna'], hass);
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;

    const task = annaTaskRow(el)!.task;
    // Call the handler directly so the rejected promise is awaited and swallowed.
    await (el as unknown as { _handleTaskToggle(e: Event): Promise<void> })
      ._handleTaskToggle(new CustomEvent('task-toggle', { detail: { task } }))
      .catch(() => {});
    await el.updateComplete;

    assert.equal(annaTaskRow(el)!.task.status, 'needs_action', 'row reverts after failure');
  });

  it('drops the optimistic override when the task disappears (e.g. deleted at reset)', async () => {
    const el = await makeCard(['anna']);
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;

    const task = annaTaskRow(el)!.task;
    annaTaskRow(el)!.dispatchEvent(
      new CustomEvent('task-toggle', { detail: { task }, bubbles: true, composed: true }),
    );
    await el.updateComplete;

    const internals = el as unknown as {
      _optimistic: Map<string, RenderableTask['status']>;
      _onFamilyState: (s: FamilyState) => void;
    };
    assert.equal(internals._optimistic.size, 1, 'override recorded after toggle');

    // Simulate a push where the chore was deleted (no longer present).
    internals._onFamilyState({
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
      ],
      tasksByMember: new Map([['anna', []]]),
      streakByMember: new Map([['anna', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    });

    assert.equal(internals._optimistic.size, 0, 'override pruned for the vanished task');
  });

  it('rotating task with current_owner=bob renders in Bob column, not household', async () => {
    const el = await makeCard(['anna', 'bob']);
    seedHouseholdRotating(el, makeRotatingTask('bob'));
    await el.updateComplete;

    type ColEl = HTMLElement & { member: { slug: string }; tasks: RenderableTask[] };
    const cols = Array.from(el.shadowRoot!.querySelectorAll('lucarne-member-column')) as ColEl[];
    const bobCol = cols.find((c) => c.member.slug === 'bob');
    const annaCol = cols.find((c) => c.member.slug === 'anna');
    assert.ok(bobCol, 'bob column exists');
    assert.equal(bobCol!.tasks.length, 1, 'rotating task in bob column');
    assert.equal(bobCol!.tasks[0].uid, 'r-1', 'correct task uid');
    assert.equal(annaCol!.tasks.length, 0, 'anna column is empty');
  });

  it('when current_owner changes to anna, rotating task moves to anna column', async () => {
    const el = await makeCard(['anna', 'bob']);
    seedHouseholdRotating(el, makeRotatingTask('bob'));
    await el.updateComplete;

    // Simulate owner advancing to anna
    seedHouseholdRotating(el, makeRotatingTask('anna'));
    await el.updateComplete;

    type ColEl = HTMLElement & { member: { slug: string }; tasks: RenderableTask[] };
    const cols = Array.from(el.shadowRoot!.querySelectorAll('lucarne-member-column')) as ColEl[];
    const bobCol = cols.find((c) => c.member.slug === 'bob');
    const annaCol = cols.find((c) => c.member.slug === 'anna');
    assert.equal(annaCol!.tasks.length, 1, 'rotating task moved to anna column');
    assert.equal(annaCol!.tasks[0].uid, 'r-1');
    assert.equal(bobCol!.tasks.length, 0, 'bob column is now empty');
  });

  it('toggling a rotating task issues todo.update_item against todo.lucarne_household', async () => {
    const el = await makeCard(['bob']);
    seedHouseholdRotating(el, makeRotatingTask('bob'));
    await el.updateComplete;

    const col = el.shadowRoot!.querySelector('lucarne-member-column');
    const row = col?.shadowRoot?.querySelector('lucarne-task-row') as (HTMLElement & { task: RenderableTask }) | null;
    assert.ok(row, 'rotating task row found in bob column');

    row!.dispatchEvent(
      new CustomEvent('task-toggle', { detail: { task: row!.task }, bubbles: true, composed: true }),
    );
    await el.updateComplete;

    const hass = el.hass as unknown as { calls: { callService: { domain: string; service: string; payload: Record<string, string>; target: { entity_id: string } }[] } };
    const call = hass.calls.callService.find((c) => c.domain === 'todo' && c.service === 'update_item');
    assert.ok(call, 'todo.update_item called');
    assert.equal(call!.target.entity_id, 'todo.lucarne_household', 'routed to household entity');
  });

  // Regression for #68 (part 1): a card left open overnight kept showing the
  // previous day's "due today" window because nothing re-rendered at midnight.
  it('refreshes the due-today window when the local day rolls over', async () => {
    const el = await makeCard(['anna']);
    // connectedCallback armed a real midnight timer; cancel it with the real
    // clearTimeout *before* faking timers, otherwise the fake clearTimeout can't
    // cancel a real handle and the timer leaks (keeping the process alive).
    const internals = el as unknown as {
      _midnightTimer?: ReturnType<typeof setTimeout>;
      _scheduleMidnightRefresh(): void;
    };
    clearTimeout(internals._midnightTimer);
    internals._midnightTimer = undefined;
    try {
      // Freeze the clock at 23:30 and arm the midnight timer under the fake clock.
      mock.timers.enable({ apis: ['Date', 'setTimeout'] });
      mock.timers.setTime(new Date(2026, 5, 8, 23, 30, 0, 0).getTime());

      // A chore due tomorrow (2026-06-09) — outside today's window at 23:30.
      const tomorrowChore: RenderableTask = {
        ...makeChore('needs_action'),
        uid: 'c-rollover',
        summary: 'Tomorrow chore',
        due: '2026-06-09',
        metadata: { ...makeChore().metadata, item_uid: 'c-rollover' },
      };
      seedAnnaTask(el, tomorrowChore);
      internals._scheduleMidnightRefresh();
      await el.updateComplete;

      assert.equal(annaTaskRow(el), null, 'next-day chore hidden before midnight');

      // Cross midnight: the timer fires, requestUpdate re-renders with a fresh now.
      mock.timers.tick(31 * 60 * 1000);
      await el.updateComplete;

      const row = annaTaskRow(el);
      assert.ok(row, 'next-day chore appears after the day rolls over');
      assert.equal(row!.task.uid, 'c-rollover');
    } finally {
      mock.timers.reset();
    }
  });

  // --- Routine visibility honors the RRULE: a routine is only active on days
  // its recurrence fires (mirrors family-ready-pill + the streak engine).
  // Previously every routine rendered every day regardless of recurrence, so a
  // completed biweekly household routine lingered crossed-out on off-days. ---

  function makeRoutine(
    recurrence: string,
    status: RenderableTask['status'] = 'needs_action',
  ): RenderableTask {
    return {
      uid: 'rt-1',
      summary: 'Take out Ridwell',
      status,
      due: null,
      description: '',
      metadata: {
        item_uid: 'rt-1',
        member_slug: 'anna',
        assignee_slug: '',
        type: 'routine',
        recurrence,
        icon: '',
        source: 'manual',
        time_of_day: 'anytime',
      },
    };
  }

  /** Freeze the clock at `when`, cancelling the real lifecycle timers first so the
   *  fake clearTimeout can't leak a real handle (see the rollover test). */
  function freezeClock(el: LucarneChoresCard, when: Date) {
    const internals = el as unknown as {
      _midnightTimer?: ReturnType<typeof setTimeout>;
      _scrollTimer?: ReturnType<typeof setTimeout>;
    };
    clearTimeout(internals._midnightTimer);
    internals._midnightTimer = undefined;
    clearTimeout(internals._scrollTimer);
    internals._scrollTimer = undefined;
    mock.timers.enable({ apis: ['Date', 'setTimeout'] });
    mock.timers.setTime(when.getTime());
  }

  it('hides a routine on a day its RRULE does not fire', async () => {
    const el = await makeCard(['anna']);
    try {
      // Thursday 2026-06-11 — a weekly-Wednesday routine is not due.
      freezeClock(el, new Date(2026, 5, 11, 9, 0, 0, 0));
      seedAnnaTask(el, makeRoutine('FREQ=WEEKLY;BYDAY=WE', 'completed'));
      await el.updateComplete;
      assert.equal(annaTaskRow(el), null, 'off-day routine hidden regardless of status');
    } finally {
      mock.timers.reset();
    }
  });

  it('shows a routine on a day its RRULE fires', async () => {
    const el = await makeCard(['anna']);
    try {
      // Wednesday 2026-06-10 — a weekly-Wednesday routine is due.
      freezeClock(el, new Date(2026, 5, 10, 9, 0, 0, 0));
      seedAnnaTask(el, makeRoutine('FREQ=WEEKLY;BYDAY=WE', 'needs_action'));
      await el.updateComplete;
      const row = annaTaskRow(el);
      assert.ok(row, 'due-day routine rendered');
      assert.equal(row!.task.uid, 'rt-1');
    } finally {
      mock.timers.reset();
    }
  });

  it('always shows a routine with no recurrence (unscheduled)', async () => {
    const el = await makeCard(['anna']);
    try {
      // Thursday 2026-06-11 — an empty-recurrence routine has no schedule and
      // keeps the legacy "every day" behavior so it is never hidden.
      freezeClock(el, new Date(2026, 5, 11, 9, 0, 0, 0));
      seedAnnaTask(el, makeRoutine('', 'needs_action'));
      await el.updateComplete;
      assert.ok(annaTaskRow(el), 'unscheduled routine stays visible');
    } finally {
      mock.timers.reset();
    }
  });

  it('always shows a routine whose RRULE is valid server-side but unparseable here', async () => {
    const el = await makeCard(['anna']);
    try {
      // BYDAY=5MO is accepted by recurrence.py (is_valid_rrule) but parses to
      // mode 'unknown' in the card (the JS parser caps MONTHLY-NTH at
      // {1,2,3,4,-1}). The card can't place it on the calendar, so it must stay
      // visible rather than vanish permanently. Thursday 2026-06-11.
      freezeClock(el, new Date(2026, 5, 11, 9, 0, 0, 0));
      seedAnnaTask(el, makeRoutine('FREQ=MONTHLY;BYDAY=5MO', 'needs_action'));
      await el.updateComplete;
      assert.ok(annaTaskRow(el), 'unparseable-but-valid routine stays visible');
    } finally {
      mock.timers.reset();
    }
  });

  // --- Optimistic add (the family-state subscription is too slow to feel live
  // on some clients — e.g. iPad Safari — so a successful add injects the new
  // task immediately, then reconciles once the real task arrives). ---

  function dispatchTaskAdded(el: LucarneChoresCard, tasks: RenderableTask[]) {
    (el as unknown as { _handleTaskAdded(e: Event): void })._handleTaskAdded(
      new CustomEvent('task-added', { detail: { tasks } }),
    );
  }

  it('optimistically renders a freshly-added task before any family-state push', async () => {
    const el = await makeCard(['anna']);
    assert.equal(annaTaskRow(el), null, 'anna column starts empty');

    const provisional: RenderableTask = {
      ...makeChore('needs_action'),
      uid: 'new-1',
      summary: 'Feed the cat',
      metadata: { ...makeChore().metadata, item_uid: 'new-1' },
    };
    dispatchTaskAdded(el, [provisional]);
    await el.updateComplete;

    const row = annaTaskRow(el);
    assert.ok(row, 'optimistic task rendered immediately');
    assert.equal(row!.task.uid, 'new-1');
  });

  it('drops the optimistic add (no duplicate) once the real task with the same uid arrives', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as {
      _optimisticAdds: Map<string, RenderableTask>;
      _onFamilyState: (s: FamilyState) => void;
    };

    const provisional: RenderableTask = {
      ...makeChore('needs_action'),
      uid: 'new-1',
      metadata: { ...makeChore().metadata, item_uid: 'new-1' },
    };
    dispatchTaskAdded(el, [provisional]);
    await el.updateComplete;
    assert.equal(internals._optimisticAdds.size, 1, 'optimistic add recorded');

    // Family state now carries the real task with the same uid.
    internals._onFamilyState({
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
      ],
      tasksByMember: new Map([['anna', [provisional]]]),
      streakByMember: new Map([['anna', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    });
    await el.updateComplete;

    assert.equal(internals._optimisticAdds.size, 0, 'optimistic add reconciled away');
    const col = el.shadowRoot!.querySelector('lucarne-member-column');
    const rows = col?.shadowRoot?.querySelectorAll('lucarne-task-row') ?? [];
    assert.equal(rows.length, 1, 'exactly one row — no duplicate');
  });

  it('ignores a task-added event carrying no tasks', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as { _optimisticAdds: Map<string, RenderableTask> };
    dispatchTaskAdded(el, []);
    await el.updateComplete;
    assert.equal(internals._optimisticAdds.size, 0, 'no optimistic add recorded');
    assert.equal(annaTaskRow(el), null, 'no phantom row rendered');
  });

  it('optimistically renders a rotating add in the current_owner column', async () => {
    const el = await makeCard(['anna', 'bob']);
    const provisional: RenderableTask = {
      ...makeRotatingTask('bob'),
      uid: 'new-rot',
      metadata: { ...makeRotatingTask('bob').metadata, item_uid: 'new-rot' },
    };
    dispatchTaskAdded(el, [provisional]);
    await el.updateComplete;

    type ColEl = HTMLElement & { member: { slug: string }; tasks: RenderableTask[] };
    const cols = Array.from(el.shadowRoot!.querySelectorAll('lucarne-member-column')) as ColEl[];
    const bobCol = cols.find((c) => c.member.slug === 'bob');
    const annaCol = cols.find((c) => c.member.slug === 'anna');
    assert.equal(bobCol!.tasks.length, 1, 'rotating add in bob (current_owner) column');
    assert.equal(bobCol!.tasks[0].uid, 'new-rot');
    assert.equal(annaCol!.tasks.length, 0, 'not in the non-owner column');
  });

  it('drops an unreconciled optimistic add after the backstop timeout', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as {
      _midnightTimer?: ReturnType<typeof setTimeout>;
      _scrollTimer?: ReturnType<typeof setTimeout>;
      _optimisticAdds: Map<string, RenderableTask>;
    };
    // Cancel the real connectedCallback timers before faking the clock (see the
    // midnight-rollover test for why this must use the real clearTimeout).
    clearTimeout(internals._midnightTimer);
    internals._midnightTimer = undefined;
    clearTimeout(internals._scrollTimer);
    internals._scrollTimer = undefined;
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      const provisional: RenderableTask = {
        ...makeChore('needs_action'),
        uid: 'ghost-1',
        metadata: { ...makeChore().metadata, item_uid: 'ghost-1' },
      };
      dispatchTaskAdded(el, [provisional]);
      await el.updateComplete;
      assert.equal(internals._optimisticAdds.size, 1, 'optimistic add present');

      // No reconciling push ever arrives; the backstop clears it after the TTL.
      mock.timers.tick(10_000);
      await el.updateComplete;
      assert.equal(internals._optimisticAdds.size, 0, 'ghost add cleared by backstop');
    } finally {
      mock.timers.reset();
    }
  });

  // --- Optimistic delete (tombstones). A successful delete hides the row
  // immediately; the row otherwise lingers until the slow state push arrives,
  // and a re-tap deletes an already-gone uid (backend raises). ---

  function dispatchTaskDeleted(el: LucarneChoresCard, uid: string) {
    (el as unknown as { _handleTaskDeleted(e: Event): void })._handleTaskDeleted(
      new CustomEvent('task-deleted', { detail: { uid } }),
    );
  }

  it('optimistically hides a deleted task before any family-state push', async () => {
    const el = await makeCard(['anna']);
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;
    assert.ok(annaTaskRow(el), 'task row rendered before delete');

    dispatchTaskDeleted(el, 'c-1');
    await el.updateComplete;

    assert.equal(annaTaskRow(el), null, 'row hidden immediately after delete');
    const internals = el as unknown as { _deletedUids: Set<string> };
    assert.ok(internals._deletedUids.has('c-1'), 'tombstone recorded');
  });

  it('keeps the row hidden while the server still returns the task (delete pending)', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as {
      _deletedUids: Set<string>;
      _onFamilyState: (s: FamilyState) => void;
    };
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;
    dispatchTaskDeleted(el, 'c-1');
    await el.updateComplete;

    // A push arrives that still carries the task (the delete hasn't propagated).
    internals._onFamilyState({
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
      ],
      tasksByMember: new Map([['anna', [makeChore('needs_action')]]]),
      streakByMember: new Map([['anna', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    });
    await el.updateComplete;

    assert.ok(internals._deletedUids.has('c-1'), 'tombstone kept while task still present');
    assert.equal(annaTaskRow(el), null, 'row stays hidden');
  });

  it('prunes the tombstone once the server stops returning the task (delete confirmed)', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as {
      _deletedUids: Set<string>;
      _onFamilyState: (s: FamilyState) => void;
    };
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;
    dispatchTaskDeleted(el, 'c-1');
    await el.updateComplete;
    assert.ok(internals._deletedUids.has('c-1'), 'tombstone present');

    // The delete propagated: the task is gone from the pushed state.
    internals._onFamilyState({
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
      ],
      tasksByMember: new Map([['anna', []]]),
      streakByMember: new Map([['anna', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    });
    await el.updateComplete;

    assert.equal(internals._deletedUids.size, 0, 'tombstone pruned after confirmation');
    assert.equal(annaTaskRow(el), null, 'row remains gone');
  });

  it('ignores a task-deleted event with no uid', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as { _deletedUids: Set<string> };
    dispatchTaskDeleted(el, '');
    await el.updateComplete;
    assert.equal(internals._deletedUids.size, 0, 'no tombstone recorded');
  });

  // --- Optimistic edit. A successful save in the edit popover renders the
  // post-edit task immediately; otherwise the row shows stale summary/icon/etc
  // until the slow state push arrives. ---

  function dispatchTaskUpdated(el: LucarneChoresCard, task: RenderableTask) {
    (el as unknown as { _handleTaskUpdated(e: Event): void })._handleTaskUpdated(
      new CustomEvent('task-updated', { detail: { task } }),
    );
  }

  it('optimistically renders an edited task before any family-state push', async () => {
    const el = await makeCard(['anna']);
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;
    assert.equal(annaTaskRow(el)!.task.summary, 'Clean up', 'original summary');

    const edited: RenderableTask = {
      ...makeChore('needs_action'),
      summary: 'Clean up the playroom',
      metadata: { ...makeChore().metadata, icon: '🧸' },
    };
    dispatchTaskUpdated(el, edited);
    await el.updateComplete;

    const row = annaTaskRow(el);
    assert.equal(row!.task.summary, 'Clean up the playroom', 'edited summary shown immediately');
    assert.equal(row!.task.metadata.icon, '🧸', 'edited icon shown immediately');
    const internals = el as unknown as { _optimisticEdits: Map<string, RenderableTask> };
    assert.ok(internals._optimisticEdits.has('c-1'), 'edit override recorded');
  });

  it('drops the edit override once the pushed task reflects the saved values', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as {
      _optimisticEdits: Map<string, RenderableTask>;
      _onFamilyState: (s: FamilyState) => void;
    };
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;

    const edited: RenderableTask = {
      ...makeChore('needs_action'),
      summary: 'Clean up the playroom',
      metadata: { ...makeChore().metadata, icon: '🧸' },
    };
    dispatchTaskUpdated(el, edited);
    await el.updateComplete;
    assert.equal(internals._optimisticEdits.size, 1, 'override present');

    // Push carries the saved values → override retired.
    internals._onFamilyState({
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
      ],
      tasksByMember: new Map([['anna', [edited]]]),
      streakByMember: new Map([['anna', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    });
    await el.updateComplete;

    assert.equal(internals._optimisticEdits.size, 0, 'override cleared once server matches');
    assert.equal(annaTaskRow(el)!.task.summary, 'Clean up the playroom', 'edited value persists from real data');
  });

  it('keeps the edit override while the pushed task still has stale values', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as {
      _optimisticEdits: Map<string, RenderableTask>;
      _onFamilyState: (s: FamilyState) => void;
    };
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;

    const edited: RenderableTask = {
      ...makeChore('needs_action'),
      summary: 'Clean up the playroom',
      metadata: { ...makeChore().metadata, icon: '🧸' },
    };
    dispatchTaskUpdated(el, edited);
    await el.updateComplete;

    // Stale push (edit not propagated yet) → override kept, edited value still shown.
    internals._onFamilyState({
      members: [
        { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
      ],
      tasksByMember: new Map([['anna', [makeChore('needs_action')]]]),
      streakByMember: new Map([['anna', 0]]),
      taskMetadataByUid: new Map(),
      resetTime: '03:00',
      streakCheckTime: '02:00',
      integrationError: null,
    });
    await el.updateComplete;

    assert.ok(internals._optimisticEdits.has('c-1'), 'override kept while server is stale');
    assert.equal(annaTaskRow(el)!.task.summary, 'Clean up the playroom', 'edited value still shown');
  });

  it('drops an unreconciled optimistic edit after the backstop timeout', async () => {
    const el = await makeCard(['anna']);
    const internals = el as unknown as {
      _midnightTimer?: ReturnType<typeof setTimeout>;
      _scrollTimer?: ReturnType<typeof setTimeout>;
      _optimisticEdits: Map<string, RenderableTask>;
    };
    seedAnnaTask(el, makeChore('needs_action'));
    await el.updateComplete;
    clearTimeout(internals._midnightTimer);
    internals._midnightTimer = undefined;
    clearTimeout(internals._scrollTimer);
    internals._scrollTimer = undefined;
    try {
      mock.timers.enable({ apis: ['setTimeout'] });
      dispatchTaskUpdated(el, {
        ...makeChore('needs_action'),
        summary: 'Never reconciles',
      });
      await el.updateComplete;
      assert.equal(internals._optimisticEdits.size, 1, 'edit override present');

      mock.timers.tick(30_000);
      await el.updateComplete;
      assert.equal(internals._optimisticEdits.size, 0, 'edit override cleared by backstop');
    } finally {
      mock.timers.reset();
    }
  });
});
