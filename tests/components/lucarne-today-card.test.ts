import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneTodayCard, LucarneTodayCardConfig } from '../../src/cards/lucarne-today-card.js';
import { normalizeSectionOrder } from '../../src/cards/lucarne-today-card.js';
import type { HomeAssistant, RenderableTask } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

await import('../../src/cards/lucarne-today-card.js');

/**
 * Wait for `selector` to appear inside `root`, polling on a short interval.
 * Replaces fixed-duration setTimeout sleeps in tests that depend on the
 * family-subscription's chain of async fetches (`lucarne_family/get_family`
 * → per-entity `todo.get_items` → Lit re-render). Awaits the element's own
 * `updateComplete` before returning so child shadow trees are populated.
 */
async function waitForShadow<E extends HTMLElement & { updateComplete?: Promise<unknown> }>(
  root: ShadowRoot,
  selector: string,
  maxMs = 2000,
): Promise<E> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const found = root.querySelector(selector) as E | null;
    if (found) {
      if (found.updateComplete) await found.updateComplete;
      return found;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`waitForShadow: timed out waiting for "${selector}" after ${maxMs}ms`);
}

const BASE_CONFIG: LucarneTodayCardConfig = {
  type: 'custom:lucarne-today-card',
  calendars: [{ entity: 'calendar.family', color: '#a8d8b9' }],
};

const GET_FAMILY_RESPONSE = {
  members: [
    {
      slug: 'anna',
      name: 'Anna',
      color: '#f5c89c',
      avatar: '🦊',
      todo_entity_id: 'todo.anna',
      streak_counter_id: 'counter.anna_streak',
    },
  ],
  task_metadata: [
    {
      item_uid: 'household-task-1',
      member_slug: 'household',
      assignee_slug: '',
      type: 'chore',
      recurrence: '',
      icon: '🧹',
      source: 'manual',
    },
    {
      item_uid: 'anna-routine-1',
      member_slug: 'anna',
      assignee_slug: '',
      type: 'routine',
      recurrence: 'FREQ=DAILY',
      icon: '🪥',
      source: 'template',
    },
  ],
  reset_time: '04:00',
  streak_check_time: '21:00',
  household_entity_id: 'todo.lucarne_household',
};

function makeFakeHassWithFamily(
  householdItems: Array<{ uid: string; summary: string; status: 'needs_action' | 'completed' }> = [],
  perEntityItems: Record<string, Array<{ uid: string; summary: string; status: 'needs_action' | 'completed' }>> = {},
) {
  const base = makeFakeHass();
  const conn = {
    ...base.connection,
    async sendMessagePromise(payload: Record<string, unknown>) {
      if (payload['type'] === 'lucarne_family/get_family') return GET_FAMILY_RESPONSE;
      if (payload['type'] === 'call_service') {
        const target = (payload['target'] as { entity_id?: string } | undefined)?.entity_id;
        const service = payload['service'];
        if (service === 'get_items' && target === 'todo.lucarne_household') {
          return { response: { 'todo.lucarne_household': { items: householdItems } } };
        }
        if (service === 'get_items' && target && perEntityItems[target]) {
          return { response: { [target]: { items: perEntityItems[target] } } };
        }
        return { response: {} };
      }
      return undefined;
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
      if (payload['type'] === 'call_service') return { response: {} };
      return undefined;
    },
  };
  return { ...base, connection: conn };
}

async function makeCard(
  configOverrides: Partial<LucarneTodayCardConfig> = {},
  hass = makeFakeHass(),
): Promise<LucarneTodayCard> {
  const el = document.createElement('lucarne-today-card') as LucarneTodayCard;
  const config = { ...BASE_CONFIG, ...configOverrides };
  el.setConfig(config);
  el.hass = hass as unknown as HomeAssistant;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 50));
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.querySelectorAll('lucarne-today-card').forEach((el) => el.remove());
});

describe('lucarne-today-card — flag combinations', () => {
  it('neither flag — renders without family pill or integration tasks section', async () => {
    const el = await makeCard({});
    const pill = el.shadowRoot!.querySelector('lucarne-family-ready-pill');
    assert.equal(pill, null, 'no family-ready pill when show_family_ready_pill is false');
    // tasks-summary should not be present when tasks: is not set
    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary');
    assert.equal(summary, null, 'no tasks-summary when no tasks config');
  });

  it('household_tasks_from_integration: true — renders integration tasks section', async () => {
    const el = await makeCard(
      { household_tasks_from_integration: true },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary');
    assert.ok(summary, 'tasks-summary rendered in integration mode');
  });

  it('show_family_ready_pill: true — renders family-ready pill in header', async () => {
    const el = await makeCard(
      { show_family_ready_pill: true },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const pill = el.shadowRoot!.querySelector('lucarne-family-ready-pill');
    assert.ok(pill, 'family-ready pill rendered when show_family_ready_pill is true');
  });

  it('both flags: true — renders both pill and integration tasks', async () => {
    const el = await makeCard(
      { household_tasks_from_integration: true, show_family_ready_pill: true },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const pill = el.shadowRoot!.querySelector('lucarne-family-ready-pill');
    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary');
    assert.ok(pill, 'family-ready pill rendered');
    assert.ok(summary, 'tasks-summary rendered in integration mode');
  });

  it('backward compat — tasks: config still renders raw todo tasks when no integration flag', async () => {
    const el = await makeCard({ tasks: 'todo.ingrid_tasks' });
    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary');
    assert.ok(summary, 'tasks-summary rendered for raw todo entity');
  });

  it('household_tasks_from_integration: true ignores tasks: setting (no double subscription)', async () => {
    // Both set; integration mode should win; no duplicate tasks-summary elements expected
    const el = await makeCard(
      { tasks: 'todo.ingrid_tasks', household_tasks_from_integration: true },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const summaries = el.shadowRoot!.querySelectorAll('lucarne-tasks-summary');
    // Only one tasks-summary (integration mode), not two
    assert.equal(summaries.length, 1, 'only one tasks-summary when integration mode overrides tasks:');
  });

  it('household_tasks_from_integration: true with integration missing — renders card but not integration sections', async () => {
    const el = await makeCard(
      { household_tasks_from_integration: true, show_family_ready_pill: true },
      makeFakeHassIntegrationMissing() as unknown as HomeAssistant,
    );
    // Card should render, not throw
    const card = el.shadowRoot!.querySelector('ha-card');
    assert.ok(card, 'ha-card rendered even when integration is missing');
    // Integration-specific sections suppressed (no misleading "no routines today" / "all done")
    const pill = el.shadowRoot!.querySelector('lucarne-family-ready-pill');
    assert.equal(pill, null, 'family-ready pill not shown when integration unavailable');
    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary');
    assert.equal(summary, null, 'tasks-summary not shown when integration unavailable');
  });

  it('setConfig throws when calendars is missing or empty', () => {
    const el = document.createElement('lucarne-today-card') as LucarneTodayCard;
    assert.throws(
      () => el.setConfig({ type: 'custom:lucarne-today-card', calendars: [] }),
      /calendars/,
    );
  });
});

describe('lucarne-today-card — section_order', () => {
  it('defaults to calendar → weather → tasks', async () => {
    const el = await makeCard(
      { weather: 'weather.forecast_home', household_tasks_from_integration: true },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const sections = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('[data-section]'),
    ).map((s) => s.dataset.section);
    assert.deepEqual(sections, ['calendar', 'weather', 'tasks']);
  });

  it('respects a custom section_order', async () => {
    const el = await makeCard(
      {
        weather: 'weather.forecast_home',
        household_tasks_from_integration: true,
        section_order: ['tasks', 'calendar', 'weather'],
      },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const sections = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('[data-section]'),
    ).map((s) => s.dataset.section);
    assert.deepEqual(sections, ['tasks', 'calendar', 'weather']);
  });

  it('appends missing sections from a partial order', async () => {
    const el = await makeCard(
      {
        weather: 'weather.forecast_home',
        household_tasks_from_integration: true,
        section_order: ['tasks'] as LucarneTodayCardConfig['section_order'],
      },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const sections = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('[data-section]'),
    ).map((s) => s.dataset.section);
    assert.deepEqual(sections, ['tasks', 'calendar', 'weather']);
  });

  it('ignores unknown ids in section_order', async () => {
    const el = await makeCard(
      {
        weather: 'weather.forecast_home',
        household_tasks_from_integration: true,
        section_order: ['bogus', 'weather'] as unknown as LucarneTodayCardConfig['section_order'],
      },
      makeFakeHassWithFamily() as unknown as HomeAssistant,
    );
    const sections = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('[data-section]'),
    ).map((s) => s.dataset.section);
    assert.deepEqual(sections, ['weather', 'calendar', 'tasks']);
  });
});

describe('normalizeSectionOrder', () => {
  it('returns default order when input is undefined', () => {
    assert.deepEqual(normalizeSectionOrder(undefined), ['calendar', 'weather', 'tasks']);
  });
  it('returns default order when input is empty', () => {
    assert.deepEqual(normalizeSectionOrder([]), ['calendar', 'weather', 'tasks']);
  });
  it('preserves valid order untouched', () => {
    assert.deepEqual(
      normalizeSectionOrder(['weather', 'tasks', 'calendar']),
      ['weather', 'tasks', 'calendar'],
    );
  });
  it('appends missing sections in default order', () => {
    assert.deepEqual(normalizeSectionOrder(['tasks']), ['tasks', 'calendar', 'weather']);
  });
  it('drops duplicates and unknowns', () => {
    assert.deepEqual(
      normalizeSectionOrder(['tasks', 'tasks', 'bogus', 'weather']),
      ['tasks', 'weather', 'calendar'],
    );
  });
});

describe('lucarne-today-card — task interaction', () => {
  it('clicking a task in integration mode calls todo.update_item against the owner entity', async () => {
    const hass = makeFakeHassWithFamily([
      { uid: 'household-task-1', summary: 'Take out trash', status: 'needs_action' },
    ]);
    const el = await makeCard(
      { household_tasks_from_integration: true },
      hass as unknown as HomeAssistant,
    );
    // The family subscription kicks off async refreshes; wait for them.
    // Family subscription kicks off two async fetches (get_family + per-entity todo.get_items)
    // and only re-renders the card once both resolve.
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;
    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary') as (HTMLElement & { updateComplete: Promise<unknown> }) | null;
    assert.ok(summary, 'lucarne-tasks-summary mounted');
    await summary!.updateComplete;
    const taskRow = summary!.shadowRoot!.querySelector('lucarne-task-row') as (HTMLElement & { updateComplete: Promise<unknown> }) | null;
    assert.ok(taskRow, 'lucarne-task-row mounted');
    await taskRow!.updateComplete;
    const row = taskRow!.shadowRoot?.querySelector('.row') as HTMLElement | null;
    assert.ok(row, 'task row rendered');

    row!.click();
    await new Promise((r) => setTimeout(r, 10));

    const updateCalls = hass.calls.callService.filter(
      (c) => c.domain === 'todo' && c.service === 'update_item',
    );
    assert.equal(updateCalls.length, 1, 'one todo.update_item call dispatched');
    assert.equal(updateCalls[0].payload?.item, 'household-task-1');
    assert.equal(updateCalls[0].payload?.status, 'completed');
    assert.equal(updateCalls[0].target?.entity_id, 'todo.lucarne_household');
  });

  it('raw-mode click + show_family_ready_pill routes to the configured raw entity (not household)', async () => {
    // Regression: previously _resolveTaskEntityId gated on _familyState presence;
    // show_family_ready_pill also populates _familyState, so raw-mode clicks were
    // mis-routed to todo.lucarne_household. Must use the user-configured tasks: entity.
    const baseHass = makeFakeHassWithFamily();
    const hass = {
      ...baseHass,
      connection: {
        ...baseHass.connection,
        async sendMessagePromise(payload: Record<string, unknown>) {
          if (payload['type'] === 'lucarne_family/get_family') return GET_FAMILY_RESPONSE;
          if (payload['type'] === 'call_service') {
            const target = (payload['target'] as { entity_id?: string } | undefined)?.entity_id;
            const service = payload['service'];
            if (service === 'get_items' && target === 'todo.my_list') {
              return {
                response: {
                  'todo.my_list': {
                    items: [{ uid: 'raw-1', summary: 'Pick up milk', status: 'needs_action' }],
                  },
                },
              };
            }
            return { response: {} };
          }
          return undefined;
        },
      },
    };
    const el = await makeCard(
      { tasks: 'todo.my_list', show_family_ready_pill: true },
      hass as unknown as HomeAssistant,
    );
    const summary = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      el.shadowRoot!,
      'lucarne-tasks-summary',
    );
    const taskRow = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      summary.shadowRoot!,
      'lucarne-task-row',
    );
    const row = taskRow.shadowRoot!.querySelector('.row') as HTMLElement;
    row.click();
    await new Promise((r) => setTimeout(r, 10));

    const updateCalls = hass.calls.callService.filter(
      (c) => c.domain === 'todo' && c.service === 'update_item',
    );
    assert.equal(updateCalls.length, 1);
    assert.equal(updateCalls[0].target?.entity_id, 'todo.my_list', 'routed to raw entity, NOT household');
  });

  it('long-press on a task fires hass-more-info with the owning entity id', async () => {
    const hass = makeFakeHassWithFamily([
      { uid: 'household-task-1', summary: 'Take out trash', status: 'needs_action' },
    ]);
    const el = await makeCard(
      { household_tasks_from_integration: true },
      hass as unknown as HomeAssistant,
    );
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('hass-more-info', (e) => events.push(e as CustomEvent));

    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary') as (HTMLElement & { updateComplete: Promise<unknown> }) | null;
    assert.ok(summary, 'lucarne-tasks-summary mounted');
    await summary!.updateComplete;
    const taskRow = summary!.shadowRoot!.querySelector('lucarne-task-row') as (HTMLElement & { updateComplete: Promise<unknown> }) | null;
    assert.ok(taskRow, 'lucarne-task-row mounted');
    await taskRow!.updateComplete;
    const row = taskRow!.shadowRoot?.querySelector('.row') as HTMLElement | null;
    assert.ok(row, 'task row rendered');

    row!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    await new Promise((r) => setTimeout(r, 550));

    assert.equal(events.length, 1);
    assert.equal(events[0].detail.entityId, 'todo.lucarne_household');

    row!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('optimistically flips a toggled task before the server confirms, then reconciles', async () => {
    const hass = makeFakeHassWithFamily([
      { uid: 'household-task-1', summary: 'Take out trash', status: 'needs_action' },
    ]);
    const el = await makeCard(
      { household_tasks_from_integration: true },
      hass as unknown as HomeAssistant,
    );
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const internals = el as unknown as {
      _optimistic: Map<string, RenderableTask['status']>;
      _handleTaskToggle(e: Event): Promise<void>;
      _familyState: { tasksByMember: Map<string, RenderableTask[]> };
      _reconcileOptimistic(): void;
    };
    const task = (internals._familyState.tasksByMember.get('household') ?? [])[0];
    assert.ok(task, 'seeded household task present');
    assert.equal(task.status, 'needs_action');

    await internals._handleTaskToggle(new CustomEvent('task-toggle', { detail: { task } }));
    await el.updateComplete;

    assert.equal(internals._optimistic.get('household-task-1'), 'completed', 'optimistic flip recorded');
    const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary') as
      | (HTMLElement & { renderableTasks: RenderableTask[] })
      | null;
    const renderedStatus = summary!.renderableTasks.find((t) => t.uid === 'household-task-1')?.status;
    assert.equal(renderedStatus, 'completed', 'rendered row reflects the optimistic status');

    // Server catches up: push a family state where the task is now completed.
    internals._familyState.tasksByMember.set('household', [{ ...task, status: 'completed' }]);
    internals._reconcileOptimistic();
    assert.equal(internals._optimistic.size, 0, 'override cleared once the server matches');
  });

  it('reverts the optimistic flip if the toggle service call fails', async () => {
    const hass = makeFakeHassWithFamily([
      { uid: 'household-task-1', summary: 'Take out trash', status: 'needs_action' },
    ]);
    hass.callService = async () => {
      throw new Error('service failed');
    };
    const el = await makeCard(
      { household_tasks_from_integration: true },
      hass as unknown as HomeAssistant,
    );
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const internals = el as unknown as {
      _optimistic: Map<string, RenderableTask['status']>;
      _handleTaskToggle(e: Event): Promise<void>;
      _familyState: { tasksByMember: Map<string, RenderableTask[]> };
    };
    const task = (internals._familyState.tasksByMember.get('household') ?? [])[0];

    await assert.rejects(
      internals._handleTaskToggle(new CustomEvent('task-toggle', { detail: { task } })),
      /service failed/,
    );
    assert.equal(internals._optimistic.size, 0, 'override reverted after failure');
  });
});

describe('lucarne-today-card — raw-mode metadata enrichment', () => {
  it('renders icon from integration metadata for a raw todo item', async () => {
    // tasks: todo.anna is a per-member entity tracked by the integration;
    // task_metadata in the family response should colour the matching uid.
    const hass = makeFakeHassWithFamily([], {
      'todo.anna': [{ uid: 'anna-routine-1', summary: 'Brush teeth', status: 'needs_action' }],
    });
    const el = await makeCard(
      { tasks: 'todo.anna' },
      hass as unknown as HomeAssistant,
    );
    const summary = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      el.shadowRoot!,
      'lucarne-tasks-summary',
    );
    const taskRow = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      summary.shadowRoot!,
      'lucarne-task-row',
    );
    const iconSpan = taskRow.shadowRoot!.querySelector('.icon');
    assert.ok(iconSpan, 'icon span rendered from integration metadata');
    assert.equal(iconSpan!.textContent, '🪥');
  });

  it('renders owner avatar for a raw entity that matches a known member', async () => {
    const hass = makeFakeHassWithFamily([], {
      'todo.anna': [{ uid: 'anna-routine-1', summary: 'Brush teeth', status: 'needs_action' }],
    });
    const el = await makeCard(
      { tasks: 'todo.anna' },
      hass as unknown as HomeAssistant,
    );
    const summary = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      el.shadowRoot!,
      'lucarne-tasks-summary',
    );
    const avatar = await waitForShadow<HTMLElement>(summary.shadowRoot!, '.owner-avatar');
    assert.equal(avatar.getAttribute('title'), 'Anna');
    assert.ok((avatar.textContent ?? '').includes('🦊'), 'avatar emoji rendered');
  });

  it('falls back to entity→member mapping when metadata is missing for an item', async () => {
    // Item uid that the integration has NOT tagged — should still get
    // member_slug='anna' because the entity (todo.anna) matches Anna's member.
    const hass = makeFakeHassWithFamily([], {
      'todo.anna': [{ uid: 'untagged-uid', summary: 'Ad-hoc task', status: 'needs_action' }],
    });
    const el = await makeCard(
      { tasks: 'todo.anna' },
      hass as unknown as HomeAssistant,
    );
    const summary = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      el.shadowRoot!,
      'lucarne-tasks-summary',
    );
    const avatar = await waitForShadow<HTMLElement>(summary.shadowRoot!, '.owner-avatar');
    assert.equal(avatar.getAttribute('title'), 'Anna');
  });

  it('passes compact attribute to task-row in tasks-summary', async () => {
    const hass = makeFakeHassWithFamily([], {
      'todo.anna': [{ uid: 'anna-routine-1', summary: 'Brush teeth', status: 'needs_action' }],
    });
    const el = await makeCard(
      { tasks: 'todo.anna' },
      hass as unknown as HomeAssistant,
    );
    const summary = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      el.shadowRoot!,
      'lucarne-tasks-summary',
    );
    const taskRow = await waitForShadow<HTMLElement>(summary.shadowRoot!, 'lucarne-task-row');
    assert.ok(taskRow.hasAttribute('compact'), 'compact attribute reflected on task-row');
  });
});

describe('lucarne-today-card — max_tasks clamp', () => {
  it('clamps a non-positive max_tasks from YAML up to 1', async () => {
    const hass = makeFakeHassWithFamily([], {
      'todo.anna': [
        { uid: 'r1', summary: 'A', status: 'needs_action' },
        { uid: 'r2', summary: 'B', status: 'needs_action' },
      ],
    });
    const el = await makeCard(
      { tasks: 'todo.anna', max_tasks: 0 },
      hass as unknown as HomeAssistant,
    );
    const summary = await waitForShadow<HTMLElement & { limit: number }>(
      el.shadowRoot!,
      'lucarne-tasks-summary',
    );
    assert.equal(summary.limit, 1, 'limit clamped to 1, not 0');
  });
});

describe('lucarne-today-card — rotating tasks excluded', () => {
  it('omits rotating household tasks from the Today tasks section', async () => {
    // Regression: rotating tasks live in the household list (member_slug='household',
    // type='rotating') and belong to the chores card. They must NOT leak into Today.
    const familyResponse = {
      members: [],
      task_metadata: [
        {
          item_uid: 'household-chore-1',
          member_slug: 'household',
          assignee_slug: '',
          type: 'chore',
          recurrence: '',
          icon: '🧹',
          source: 'manual',
        },
        {
          item_uid: 'household-rotating-1',
          member_slug: 'household',
          assignee_slug: '',
          type: 'rotating',
          recurrence: '',
          icon: '🥛',
          source: 'manual',
          rotation_owners: '["anna","ben"]',
          current_owner: 'anna',
        },
      ],
      reset_time: '04:00',
      streak_check_time: '21:00',
      household_entity_id: 'todo.lucarne_household',
    };
    const householdItems = [
      { uid: 'household-chore-1', summary: 'Take out trash', status: 'needs_action' as const },
      { uid: 'household-rotating-1', summary: 'Get milk', status: 'needs_action' as const },
    ];
    const base = makeFakeHass();
    const hass = {
      ...base,
      connection: {
        ...base.connection,
        async sendMessagePromise(payload: Record<string, unknown>) {
          if (payload['type'] === 'lucarne_family/get_family') return familyResponse;
          if (payload['type'] === 'call_service') {
            const target = (payload['target'] as { entity_id?: string } | undefined)?.entity_id;
            const service = payload['service'];
            if (service === 'get_items' && target === 'todo.lucarne_household') {
              return { response: { 'todo.lucarne_household': { items: householdItems } } };
            }
            return { response: {} };
          }
          return undefined;
        },
      },
    };
    const el = await makeCard(
      { household_tasks_from_integration: true },
      hass as unknown as HomeAssistant,
    );
    const summary = await waitForShadow<HTMLElement & { updateComplete: Promise<unknown> }>(
      el.shadowRoot!,
      'lucarne-tasks-summary',
    );
    // Household items arrive via a second async subscription after the summary
    // mounts; wait for the (single, non-rotating) task row to render.
    await waitForShadow(summary.shadowRoot!, 'lucarne-task-row');
    const summaries = Array.from(
      summary.shadowRoot!.querySelectorAll<HTMLElement & { task?: RenderableTask }>(
        'lucarne-task-row',
      ),
    ).map((row) => row.task?.summary);
    assert.deepEqual(
      summaries,
      ['Take out trash'],
      'only the non-rotating household task renders; the rotating "Get milk" is excluded',
    );
  });
});

describe('lucarne-today-card — fill height', () => {
  it('pins the card to the shared outer fill-height constant', async () => {
    const el = await makeCard({});
    const body = el.shadowRoot!.querySelector('.card-body');
    assert.ok(body, '.card-body rendered');
    assert.ok(el.shadowRoot!.querySelector('ha-card'), 'ha-card rendered');

    // jsdom does not resolve CSS custom properties / calc(), so assert against
    // the component's static styles instead of computed values. The shared
    // outer height lives on ha-card; the body flexes to fill it.
    const styleText = (
      (el.constructor as { styles?: Array<{ cssText?: string }> }).styles ?? []
    )
      .map((s) => s.cssText ?? '')
      .join('\n');
    // ha-card sets a fixed `height: var(--lucarne-card-fill-height)`; the
    // leading [^-] avoids matching a min-/max-height variant.
    assert.match(
      styleText,
      /[^-]height:\s*var\(--lucarne-card-fill-height\)/,
      'card uses the shared fill-height variable on ha-card',
    );
  });
});

// --- Routine visibility honors the RRULE (mirrors the chores card fix in
// commit 844647978fad and the family-ready-pill + streak engine). Previously
// the Today card showed every household routine every day regardless of
// recurrence, so a completed biweekly routine lingered crossed-out on off-days.
// A routine with no card-evaluable schedule ('none' = empty, 'unknown' = valid
// server-side but outside the JS parser's editable set) stays visible daily. ---
describe('lucarne-today-card — routine RRULE visibility', () => {
  function makeHouseholdRoutineHass(
    recurrence: string,
    status: 'needs_action' | 'completed' = 'needs_action',
  ) {
    const familyResponse = {
      members: [],
      task_metadata: [
        {
          item_uid: 'rt-1',
          member_slug: 'household',
          assignee_slug: '',
          type: 'routine',
          recurrence,
          icon: '🔁',
          source: 'manual',
        },
      ],
      reset_time: '04:00',
      streak_check_time: '21:00',
      household_entity_id: 'todo.lucarne_household',
    };
    const householdItems = [{ uid: 'rt-1', summary: 'Take out Ridwell', status }];
    const base = makeFakeHass();
    return {
      ...base,
      connection: {
        ...base.connection,
        async sendMessagePromise(payload: Record<string, unknown>) {
          if (payload['type'] === 'lucarne_family/get_family') return familyResponse;
          if (payload['type'] === 'call_service') {
            const target = (payload['target'] as { entity_id?: string } | undefined)?.entity_id;
            const service = payload['service'];
            if (service === 'get_items' && target === 'todo.lucarne_household') {
              return { response: { 'todo.lucarne_household': { items: householdItems } } };
            }
            return { response: {} };
          }
          return undefined;
        },
      },
    };
  }

  /**
   * Load the card with a single household routine, wait for it to land in
   * `_familyState` (date-independent so off-day cases don't hang waiting for a
   * row that the filter would hide), then freeze the clock to `when`, re-render,
   * and return the uids the Today tasks section actually renders. Reading
   * `renderableTasks` off the (always-mounted) summary captures the post-filter
   * list even when it's empty.
   */
  async function renderedRoutineUids(
    recurrence: string,
    when: Date,
    status: 'needs_action' | 'completed' = 'needs_action',
  ): Promise<string[]> {
    const hass = makeHouseholdRoutineHass(recurrence, status);
    const el = await makeCard(
      { household_tasks_from_integration: true },
      hass as unknown as HomeAssistant,
    );
    const internals = el as unknown as {
      _familyState?: { tasksByMember: Map<string, RenderableTask[]> };
      requestUpdate(): void;
    };
    const start = Date.now();
    while (Date.now() - start < 2000) {
      if ((internals._familyState?.tasksByMember.get('household') ?? []).some((t) => t.uid === 'rt-1')) {
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    // Fail loudly if the integration data never arrived — otherwise the off-day
    // case would pass vacuously (empty renderableTasks trivially excludes rt-1),
    // masking a real load failure instead of exercising the RRULE gate.
    assert.ok(
      (internals._familyState?.tasksByMember.get('household') ?? []).some((t) => t.uid === 'rt-1'),
      'household routine loaded into _familyState before freezing the clock',
    );
    mock.timers.enable({ apis: ['Date'] });
    try {
      mock.timers.setTime(when.getTime());
      internals.requestUpdate();
      await el.updateComplete;
      const summary = el.shadowRoot!.querySelector('lucarne-tasks-summary') as
        | (HTMLElement & { renderableTasks: RenderableTask[]; updateComplete: Promise<unknown> })
        | null;
      assert.ok(summary, 'tasks-summary mounted');
      await summary!.updateComplete;
      return summary!.renderableTasks.map((t) => t.uid);
    } finally {
      mock.timers.reset();
    }
  }

  it('hides a household routine on a day its RRULE does not fire', async () => {
    // Thursday 2026-06-11 — a weekly-Wednesday routine is not due.
    const uids = await renderedRoutineUids(
      'FREQ=WEEKLY;BYDAY=WE',
      new Date(2026, 5, 11, 9, 0, 0, 0),
      'completed',
    );
    assert.equal(uids.includes('rt-1'), false, 'off-day routine excluded regardless of status');
  });

  it('shows a household routine on a day its RRULE fires', async () => {
    // Wednesday 2026-06-10 — a weekly-Wednesday routine is due.
    const uids = await renderedRoutineUids('FREQ=WEEKLY;BYDAY=WE', new Date(2026, 5, 10, 9, 0, 0, 0));
    assert.ok(uids.includes('rt-1'), 'due-day routine rendered');
  });

  it('always shows a routine with no recurrence (unscheduled)', async () => {
    // Thursday 2026-06-11 — empty recurrence has no schedule; keep the legacy
    // always-visible behavior rather than hiding an actionable task.
    const uids = await renderedRoutineUids('', new Date(2026, 5, 11, 9, 0, 0, 0));
    assert.ok(uids.includes('rt-1'), 'unscheduled routine stays visible');
  });

  it('always shows a routine whose RRULE is valid server-side but unparseable here', async () => {
    // BYDAY=5MO parses to mode 'unknown' in the card (the JS parser caps
    // MONTHLY-NTH at {1,2,3,4,-1}); the card can't place it on the calendar, so
    // it must stay visible rather than vanish permanently. Thursday 2026-06-11.
    const uids = await renderedRoutineUids('FREQ=MONTHLY;BYDAY=5MO', new Date(2026, 5, 11, 9, 0, 0, 0));
    assert.ok(uids.includes('rt-1'), 'unparseable-but-valid routine stays visible');
  });
});

describe('lucarne-today-card — config validation', () => {
  function setConfigOn(config: unknown): void {
    const el = document.createElement('lucarne-today-card') as LucarneTodayCard;
    (el as unknown as { setConfig(c: unknown): void }).setConfig(config);
  }

  it('rejects a missing or empty calendars list', () => {
    assert.throws(() => setConfigOn({}), /"calendars" must be a non-empty array/);
    assert.throws(() => setConfigOn({ calendars: [] }), /"calendars" must be a non-empty array/);
  });

  it('rejects a null calendar entry with a readable message, not a TypeError', () => {
    // See the matching case in lucarne-calendar-card.test.ts — a bare `-` under
    // `calendars:` must stay a user-facing config error, not a contained TypeError.
    assert.throws(
      () => setConfigOn({ calendars: [null] }),
      (err: Error) => {
        assert.equal(err.name, 'LucarneConfigError');
        assert.match(err.message, /each calendar entry requires "entity" and "color"/);
        return true;
      },
    );
  });
});
