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
});
