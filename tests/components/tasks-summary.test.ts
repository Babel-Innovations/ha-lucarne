import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneTasksSummary } from '../../src/components/tasks-summary.js';
import { sortByPriority } from '../../src/components/tasks-summary.js';
import type { MemberSummary, RenderableTask, TodoItem } from '../../src/shared/types.js';
import { clearAway, resetWindows, sinkCompleted } from '../../src/shared/completed-window.js';

await import('../../src/components/tasks-summary.js');

const HOUSEHOLD_MEMBER: MemberSummary = {
  slug: 'household',
  name: 'Household',
  color: '#cccccc',
  avatar: null,
  todo_entity_id: 'todo.lucarne_household',
  streak_counter_id: '',
};

const ANNA: MemberSummary = {
  slug: 'anna',
  name: 'Anna',
  color: '#f5c89c',
  avatar: '🦊',
  todo_entity_id: 'todo.anna',
  streak_counter_id: 'counter.anna_streak',
};

function makeRenderable(overrides: Partial<RenderableTask> = {}): RenderableTask {
  return {
    uid: 'uid-1',
    summary: 'Take out trash',
    status: 'needs_action',
    due: null,
    description: '',
    metadata: {
      item_uid: 'uid-1',
      member_slug: 'household',
      assignee_slug: '',
      type: 'chore',
      recurrence: '',
      icon: '🧹',
      source: 'manual',
    },
    ...overrides,
  };
}

function makeTodoItem(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    uid: 'uid-1',
    summary: 'Buy milk',
    status: 'needs_action',
    ...overrides,
  };
}

async function makeEl(props: Partial<LucarneTasksSummary> = {}): Promise<LucarneTasksSummary> {
  const el = document.createElement('lucarne-tasks-summary') as LucarneTasksSummary;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

/** Rendered row summaries, in visual order. */
function rowSummaries(el: LucarneTasksSummary): string[] {
  return [...el.shadowRoot!.querySelectorAll('lucarne-task-row')].map(
    (r) => r.shadowRoot!.querySelector('.label')!.textContent!.trim(),
  );
}

/** Per-row crossed-out flag, in visual order. */
function rowCrossed(el: LucarneTasksSummary): boolean[] {
  return [...el.shadowRoot!.querySelectorAll('lucarne-task-row')].map((r) =>
    r.shadowRoot!.querySelector('.label')!.classList.contains('done'),
  );
}

afterEach(() => {
  document.querySelectorAll('lucarne-tasks-summary').forEach((el) => el.remove());
  // The completed-row window is module-global (it has to outlive card DOM), so
  // it leaks between cases unless it is cleared here.
  resetWindows();
});

describe('lucarne-tasks-summary', () => {
  it('renders empty state when there are no active tasks (integration mode)', async () => {
    const el = await makeEl({ integrationMode: true, renderableTasks: [] });
    const empty = el.shadowRoot!.querySelector('.empty-state');
    assert.ok(empty, 'empty state shown when no tasks');
  });

  it('renders empty state when raw items list is empty', async () => {
    const el = await makeEl({ items: [] });
    const empty = el.shadowRoot!.querySelector('.empty-state');
    assert.ok(empty, 'empty state shown when raw items empty');
  });

  it('integration mode renders one task-row per active task with icon', async () => {
    const tasks = [
      makeRenderable({ uid: 'a', summary: 'A' }),
      makeRenderable({ uid: 'b', summary: 'B' }),
    ];
    const el = await makeEl({ integrationMode: true, renderableTasks: tasks });
    const rows = el.shadowRoot!.querySelectorAll('lucarne-task-row');
    assert.equal(rows.length, 2, 'two task rows rendered');
  });

  it('integration mode shows no owner avatar for household tasks', async () => {
    const tasks = [makeRenderable({ metadata: { ...makeRenderable().metadata, member_slug: 'household' } })];
    const el = await makeEl({
      integrationMode: true,
      renderableTasks: tasks,
      members: [ANNA, HOUSEHOLD_MEMBER],
    });
    const avatar = el.shadowRoot!
      .querySelector('lucarne-task-row')!
      .shadowRoot!.querySelector('.owner-avatar');
    assert.equal(avatar, null, 'no avatar for household-owned task');
  });

  it('integration mode renders owner avatar for member-owned tasks', async () => {
    const tasks = [
      makeRenderable({
        uid: 'anna-task',
        summary: 'Brush teeth',
        metadata: { ...makeRenderable().metadata, member_slug: 'anna' },
      }),
    ];
    const el = await makeEl({
      integrationMode: true,
      renderableTasks: tasks,
      members: [ANNA],
    });
    const avatar = el.shadowRoot!
      .querySelector('lucarne-task-row')!
      .shadowRoot!.querySelector('.owner-avatar') as HTMLElement | null;
    assert.ok(avatar, 'owner avatar rendered for member-owned task');
    assert.equal(avatar!.getAttribute('title'), 'Anna');
    // Emoji avatar string is rendered inside.
    assert.ok((avatar!.textContent ?? '').includes('🦊'), 'avatar emoji rendered');
  });

  it('integration mode skips completed tasks when counting and rendering', async () => {
    const tasks = [
      makeRenderable({ uid: 'a', status: 'needs_action' }),
      makeRenderable({ uid: 'b', status: 'completed' }),
    ];
    const el = await makeEl({ integrationMode: true, renderableTasks: tasks });
    const rows = el.shadowRoot!.querySelectorAll('lucarne-task-row');
    assert.equal(rows.length, 1, 'completed task hidden');
    const badge = el.shadowRoot!.querySelector('.count-badge');
    assert.equal(badge!.textContent, '1');
  });

  it('raw mode wraps todo items into task rows', async () => {
    const items = [makeTodoItem({ uid: 'r1', summary: 'Buy milk' })];
    const el = await makeEl({ items });
    const rows = el.shadowRoot!.querySelectorAll('lucarne-task-row');
    assert.equal(rows.length, 1, 'one task row for the raw item');
  });

  it('clicking a row in integration mode bubbles a task-toggle event with the task payload', async () => {
    const tasks = [makeRenderable({ uid: 'click-me' })];
    const el = await makeEl({ integrationMode: true, renderableTasks: tasks });

    const events: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => events.push(e as CustomEvent));

    const row = el.shadowRoot!.querySelector('lucarne-task-row')?.shadowRoot?.querySelector('.row') as HTMLElement | null;
    assert.ok(row, 'task row .row rendered');
    row!.click();

    assert.equal(events.length, 1, 'task-toggle bubbled');
    assert.equal(events[0].detail.task.uid, 'click-me');
  });

  it('caps visible rows at the configured limit', async () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeRenderable({ uid: `t${i}`, summary: `Task ${i}` }),
    );
    const el = await makeEl({ integrationMode: true, renderableTasks: tasks, limit: 3 });
    const rows = el.shadowRoot!.querySelectorAll('lucarne-task-row');
    assert.equal(rows.length, 3, 'only `limit` rows shown');
    // Badge still reports the honest total.
    assert.equal(el.shadowRoot!.querySelector('.count-badge')!.textContent, '8');
  });

  it('no-refill mode does not promote a backlog task when one is completed', async () => {
    const tasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0' }),
      makeRenderable({ uid: 't1', summary: 'Task 1' }),
      makeRenderable({ uid: 't2', summary: 'Task 2' }),
    ];
    const el = await makeEl({
      integrationMode: true,
      renderableTasks: tasks,
      limit: 2,
      refillOnComplete: false,
    });
    assert.equal(el.shadowRoot!.querySelectorAll('lucarne-task-row').length, 2, 'starts with 2');

    // Complete the first visible task; it must still exist in source as completed.
    el.renderableTasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0', status: 'completed' }),
      makeRenderable({ uid: 't1', summary: 'Task 1' }),
      makeRenderable({ uid: 't2', summary: 'Task 2' }),
    ];
    await el.updateComplete;

    // The completed task now stays on screen crossed out in the slot it burned,
    // so the row count is unchanged — but Task 2 is still NOT promoted, which is
    // what no-refill mode means.
    assert.deepEqual(rowSummaries(el), ['Task 0', 'Task 1']);
    assert.deepEqual(rowCrossed(el), [true, false]);
  });

  it('no-refill mode keeps the slot burned even if the completed task is dropped from source', async () => {
    // Some todo providers return only active items after a completion. The burn
    // must persist on the admitted-but-now-absent uid, not depend on a completed
    // record remaining in source.
    const el = await makeEl({
      integrationMode: true,
      renderableTasks: [
        makeRenderable({ uid: 't0', summary: 'Task 0' }),
        makeRenderable({ uid: 't1', summary: 'Task 1' }),
        makeRenderable({ uid: 't2', summary: 'Task 2' }),
      ],
      limit: 2,
      refillOnComplete: false,
    });
    assert.equal(el.shadowRoot!.querySelectorAll('lucarne-task-row').length, 2, 'starts with 2');

    // t0 vanishes entirely (not retained as completed).
    el.renderableTasks = [
      makeRenderable({ uid: 't1', summary: 'Task 1' }),
      makeRenderable({ uid: 't2', summary: 'Task 2' }),
    ];
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('lucarne-task-row');
    assert.equal(rows.length, 1, 'burned slot is not refilled — t2 stays hidden');
  });

  it('refill mode promotes the next backlog task when one is completed', async () => {
    const tasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0' }),
      makeRenderable({ uid: 't1', summary: 'Task 1' }),
      makeRenderable({ uid: 't2', summary: 'Task 2' }),
    ];
    const el = await makeEl({
      integrationMode: true,
      renderableTasks: tasks,
      limit: 2,
      refillOnComplete: true,
    });
    assert.equal(el.shadowRoot!.querySelectorAll('lucarne-task-row').length, 2, 'starts with 2');

    el.renderableTasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0', status: 'completed' }),
      makeRenderable({ uid: 't1', summary: 'Task 1' }),
      makeRenderable({ uid: 't2', summary: 'Task 2' }),
    ];
    await el.updateComplete;

    // The backlog task still slides up; the crossed-out row is an extra on top
    // of the `limit` active rows.
    assert.deepEqual(rowSummaries(el), ['Task 0', 'Task 1', 'Task 2']);
    assert.deepEqual(rowCrossed(el), [true, false, false]);
  });

  it('no-refill mode keeps the last completed task crossed out instead of the "for now" state', async () => {
    const el = await makeEl({
      integrationMode: true,
      renderableTasks: [
        makeRenderable({ uid: 't0', summary: 'Task 0' }),
        makeRenderable({ uid: 't1', summary: 'Task 1' }),
      ],
      limit: 1,
      refillOnComplete: false,
    });
    el.renderableTasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0', status: 'completed' }),
      makeRenderable({ uid: 't1', summary: 'Task 1' }),
    ];
    await el.updateComplete;

    assert.equal(el.shadowRoot!.querySelector('.empty-state'), null, 'no empty state');
    assert.deepEqual(rowSummaries(el), ['Task 0']);
    assert.deepEqual(rowCrossed(el), [true]);
  });

  it('still shows the "all done for now" state when the burned task is gone entirely', async () => {
    // The encouraging state is now reached only when there is nothing left to
    // render — e.g. a provider that drops completed items, so no crossed row
    // exists to fill the burned slot.
    const el = await makeEl({
      integrationMode: true,
      renderableTasks: [
        makeRenderable({ uid: 't0', summary: 'Task 0' }),
        makeRenderable({ uid: 't1', summary: 'Task 1' }),
      ],
      limit: 1,
      refillOnComplete: false,
    });
    el.renderableTasks = [makeRenderable({ uid: 't1', summary: 'Task 1' })];
    await el.updateComplete;

    const empty = el.shadowRoot!.querySelector('.empty-state');
    assert.ok(empty, 'encouraging empty state shown');
    assert.match(empty!.textContent ?? '', /for now/i);
  });
});

describe('lucarne-tasks-summary crossed-out completions', () => {
  const ENTITY = 'todo.test';

  const mkStatus = (uid: string, status: RenderableTask['status']) =>
    makeRenderable({ uid, summary: uid, status });

  async function completeFirstOfThree() {
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 3,
      renderableTasks: [
        makeRenderable({ uid: 't0', summary: 'Task 0' }),
        makeRenderable({ uid: 't1', summary: 'Task 1' }),
        makeRenderable({ uid: 't2', summary: 'Task 2' }),
      ],
    });
    el.renderableTasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0' }),
      makeRenderable({ uid: 't1', summary: 'Task 1', status: 'completed' }),
      makeRenderable({ uid: 't2', summary: 'Task 2' }),
    ];
    await el.updateComplete;
    return el;
  }

  it('keeps a completed task in place, crossed out', async () => {
    const el = await completeFirstOfThree();
    assert.deepEqual(rowSummaries(el), ['Task 0', 'Task 1', 'Task 2']);
    assert.deepEqual(rowCrossed(el), [false, true, false]);
  });

  it('sinks crossed rows to the bottom once the card has gone away', async () => {
    const el = await completeFirstOfThree();
    assert.deepEqual(rowCrossed(el), [false, true, false], 'in place while watching');

    sinkCompleted(ENTITY);
    el.requestUpdate();
    await el.updateComplete;

    assert.deepEqual(rowSummaries(el), ['Task 0', 'Task 2', 'Task 1']);
    assert.deepEqual(rowCrossed(el), [false, false, true]);
  });

  it('un-crosses a task whose completion is undone', async () => {
    const el = await completeFirstOfThree();
    el.renderableTasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0' }),
      makeRenderable({ uid: 't1', summary: 'Task 1' }),
      makeRenderable({ uid: 't2', summary: 'Task 2' }),
    ];
    await el.updateComplete;

    assert.deepEqual(rowSummaries(el), ['Task 0', 'Task 1', 'Task 2']);
    assert.deepEqual(rowCrossed(el), [false, false, false]);
  });

  it('still bubbles task-toggle from a crossed row so a mistap can be undone', async () => {
    const el = await completeFirstOfThree();
    const events: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => events.push(e as CustomEvent));

    const crossed = [...el.shadowRoot!.querySelectorAll('lucarne-task-row')][1];
    (crossed.shadowRoot!.querySelector('.row') as HTMLElement).click();

    assert.equal(events.length, 1);
    assert.equal(events[0].detail.task.uid, 't1');
  });

  it('celebrates above the crossed rows when nothing is left to do', async () => {
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 2,
      renderableTasks: [
        makeRenderable({ uid: 't0', summary: 'Task 0' }),
        makeRenderable({ uid: 't1', summary: 'Task 1' }),
      ],
    });
    el.renderableTasks = [
      makeRenderable({ uid: 't0', summary: 'Task 0', status: 'completed' }),
      makeRenderable({ uid: 't1', summary: 'Task 1', status: 'completed' }),
    ];
    await el.updateComplete;

    const banner = el.shadowRoot!.querySelector('.done-banner');
    assert.ok(banner, 'celebration banner shown alongside the crossed rows');
    assert.equal(el.shadowRoot!.querySelector('.count-badge')!.textContent, '0');
    assert.deepEqual(rowCrossed(el), [true, true]);
  });

  it('keeps the NEWEST completions when the crossed-row cap binds', async () => {
    // Regression: capping by remembered slot index dropped the highest-index
    // entries — i.e. the most recent taps — so the mistap the feature exists to
    // surface was the one that silently vanished.
    const all = (done: string[]) =>
      ['t0', 't1', 't2', 't3'].map((u) =>
        mkStatus(u, done.includes(u) ? 'completed' : 'needs_action'),
      );
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 2,
      refillOnComplete: true,
      renderableTasks: all([]),
    });

    for (const done of [['t0'], ['t0', 't1'], ['t0', 't1', 't2']]) {
      el.renderableTasks = all(done);
      await el.updateComplete;
    }

    const crossed = rowCrossed(el);
    const crossedOut = rowSummaries(el).filter((_, i) => crossed[i]);
    assert.equal(crossedOut.length, 2, 'crossed group capped at limit');
    assert.ok(crossedOut.includes('t2'), 'the most recent completion is kept');
    assert.ok(!crossedOut.includes('t0'), 'the oldest completion is evicted');
  });

  it('never exceeds the limit after refill mode is toggled off', async () => {
    // The admitted set is built under different rules per mode; reusing one
    // across the switch could render more rows than max_tasks.
    const ids = ['t0', 't1', 't2', 't3', 't4'];
    const all = (done: string[]) =>
      ids.map((u) => mkStatus(u, done.includes(u) ? 'completed' : 'needs_action'));
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 2,
      refillOnComplete: true,
      renderableTasks: all([]),
    });
    // Complete a couple in refill mode so the admitted set grows past `limit`
    // (each render admits the top two actives). That is what made a shared
    // window overflow once the no-refill branch, which admits differently,
    // started reading it.
    for (const done of [['t0'], ['t0', 't1']]) {
      el.renderableTasks = all(done);
      await el.updateComplete;
    }

    el.refillOnComplete = false;
    el.renderableTasks = all(['t0', 't1']);
    await el.updateComplete;

    assert.ok(
      rowSummaries(el).length <= 2,
      `got ${rowSummaries(el).length} rows: ${rowSummaries(el).join(',')}`,
    );
  });

  it('starts a completion observed while hidden already sunk', async () => {
    // The WKWebView kiosk delivers stalled WS frames in a burst as it wakes. An
    // entry created un-sunk would splice into its old slot just as the user
    // starts looking — and sinkCompleted cannot help, it only flips entries
    // that already exist.
    const all = (done: string[]) =>
      ['t0', 't1', 't2'].map((u) => mkStatus(u, done.includes(u) ? 'completed' : 'needs_action'));
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 3,
      renderableTasks: all([]),
    });
    assert.deepEqual(rowSummaries(el), ['t0', 't1', 't2']);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    try {
      el.renderableTasks = all(['t0']);
      await el.updateComplete;
    } finally {
      delete (document as unknown as Record<string, unknown>).visibilityState;
    }

    assert.deepEqual(rowSummaries(el), ['t1', 't2', 't0'], 'sunk without ever sitting in place');
    assert.deepEqual(rowCrossed(el), [false, false, true]);
  });

  it('sinks a completion made while the card was away, instead of pinning it on top', async () => {
    // Regression: a Lovelace view switch unmounts the card without ever hiding
    // the document, so `hidden` is false on remount and the completion looked
    // brand new. Worse, raw mode renders once with an empty list while the
    // subscription loads; clobbering lastOrder there resolved the index to 0,
    // splicing the crossed row ABOVE every active task.
    const all = (done: string[]) =>
      ['t0', 't1', 't2'].map((u) => mkStatus(u, done.includes(u) ? 'completed' : 'needs_action'));
    const first = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 3,
      renderableTasks: all([]),
    });
    assert.deepEqual(rowSummaries(first), ['t0', 't1', 't2']);

    // View switch: the card unmounts and sinks; the window outlives it.
    sinkCompleted(ENTITY);
    first.remove();

    // Remount. Raw mode's first render carries no items yet.
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 3,
      renderableTasks: [],
    });
    // t1 was completed elsewhere while we were away.
    el.renderableTasks = all(['t1']);
    await el.updateComplete;

    assert.deepEqual(rowSummaries(el), ['t0', 't2', 't1'], 'sunk to the bottom, not pinned on top');
    assert.deepEqual(rowCrossed(el), [false, false, true]);
  });

  it('keeps a completion sunk when the wake burst arrives after the screen is back', async () => {
    // Regression: the card's own visibilitychange handler calls requestUpdate(),
    // which renders WHILE visibilityState is still 'hidden'. Clearing the away
    // flag on that render retired it before the WKWebView delivered its stalled
    // frames on wake — so the completion spliced in at the top, in full view.
    const all = (done: string[]) =>
      ['t0', 't1', 't2'].map((u) => mkStatus(u, done.includes(u) ? 'completed' : 'needs_action'));
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 3,
      renderableTasks: all([]),
    });
    assert.deepEqual(rowSummaries(el), ['t0', 't1', 't2']);

    // Display sleeps. The card stays mounted; it sinks and repaints — and that
    // repaint must be awaited while still hidden, which is what makes this test
    // see the path at all.
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    try {
      sinkCompleted(ENTITY);
      el.renderableTasks = all([]);
      await el.updateComplete;
    } finally {
      delete (document as unknown as Record<string, unknown>).visibilityState;
    }

    // Wake: the burst delivers t0's completion now that the screen is back.
    el.renderableTasks = all(['t0']);
    await el.updateComplete;

    assert.deepEqual(rowSummaries(el), ['t1', 't2', 't0'], 'stays sunk, not spliced in on top');
    assert.deepEqual(rowCrossed(el), [false, false, true]);
  });

  it('keeps the slot for a completion the user made right after wake', async () => {
    // The counterpart to the wake-burst case: nothing forces a render on wake,
    // so the away span can still be open when the user taps. Their own tap ends
    // it (the card calls clearAway before the optimistic flip), and that row
    // must stay put rather than sliding out from under their finger.
    const all = (done: string[]) =>
      ['t0', 't1', 't2'].map((u) => mkStatus(u, done.includes(u) ? 'completed' : 'needs_action'));
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      limit: 3,
      renderableTasks: all([]),
    });
    sinkCompleted(ENTITY); // display slept; no render happened on wake

    clearAway(ENTITY); // the user taps — this is what the card does first
    el.renderableTasks = all(['t1']);
    await el.updateComplete;

    assert.deepEqual(rowSummaries(el), ['t0', 't1', 't2'], 'stays in place under the finger');
    assert.deepEqual(rowCrossed(el), [false, true, false]);
  });

  it('opts its rows into the note line', async () => {
    const el = await makeEl({
      integrationMode: true,
      todoEntityId: ENTITY,
      renderableTasks: [makeRenderable({ uid: 'n1', description: 'Fold into the top drawer' })],
    });
    const row = el.shadowRoot!.querySelector('lucarne-task-row')!;
    assert.ok(row.hasAttribute('show-notes'), 'show-notes forwarded to the row');
    assert.equal(
      row.shadowRoot!.querySelector('.note')!.textContent!.trim(),
      'Fold into the top drawer',
    );
  });
});

describe('sortByPriority', () => {
  const now = new Date('2026-05-21T10:00:00.000Z'); // 03:00 PDT, May 21 local

  function dued(uid: string, due: string | null): RenderableTask {
    return makeRenderable({ uid, summary: uid, due });
  }

  it('orders overdue > due today > within 3 days > no date > beyond 3 days', () => {
    const tasks = [
      dued('beyond', '2026-05-30'),
      dued('none', null),
      dued('within3', '2026-05-23'),
      dued('today', '2026-05-21'),
      dued('overdue', '2026-05-19'),
    ];
    const sorted = sortByPriority(tasks, now).map((t) => t.uid);
    assert.deepEqual(sorted, ['overdue', 'today', 'within3', 'none', 'beyond']);
  });

  it('orders within a dated bucket by due date ascending', () => {
    const tasks = [dued('later', '2026-05-23'), dued('sooner', '2026-05-22')];
    const sorted = sortByPriority(tasks, now).map((t) => t.uid);
    assert.deepEqual(sorted, ['sooner', 'later']);
  });
});
