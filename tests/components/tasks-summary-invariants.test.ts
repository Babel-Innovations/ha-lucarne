import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneTasksSummary } from '../../src/components/tasks-summary.js';
import type { MemberSummary, RenderableTask } from '../../src/shared/types.js';
import { resetWindows, sinkCompleted } from '../../src/shared/completed-window.js';

await import('../../src/components/tasks-summary.js');

function mk(uid: string, status: RenderableTask['status']): RenderableTask {
  return {
    uid, summary: uid, status, due: null, description: '',
    metadata: { item_uid: uid, member_slug: 'household', assignee_slug: '', type: 'chore', recurrence: '', icon: '', source: 'manual' },
  };
}

afterEach(() => {
  document.querySelectorAll('lucarne-tasks-summary').forEach((el) => el.remove());
  resetWindows();
});

/**
 * The crossed-out-row splice logic is the hardest part of _resolveVisible to
 * reason about: burned-slot accounting, in-place insertion by remembered index,
 * sunk rows appended, and two independent caps. This walks a seeded pseudo-random
 * sequence of completions, undos, deletions and sinks, asserting the invariants
 * that actually matter to the card's layout hold at every single step.
 */
describe('lucarne-tasks-summary row invariants', () => {
  for (const refill of [false, true]) {
    it(`never exceeds the expected bound (refill=${refill})`, async () => {
      const LIMIT = 3;
      const N = 12;
      // Deterministic pseudo-random walk of completions/undos/deletions.
      let seed = 12345;
      const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

      const el = document.createElement('lucarne-tasks-summary') as LucarneTasksSummary;
      el.integrationMode = true;
      el.todoEntityId = 'todo.fuzz';
      el.limit = LIMIT;
      el.refillOnComplete = refill;
      const status = new Map<string, RenderableTask['status'] | 'gone'>();
      for (let i = 0; i < N; i++) status.set(`t${i}`, 'needs_action');
      el.renderableTasks = [...status].map(([u, s]) => mk(u, s as RenderableTask['status']));
      document.body.appendChild(el);
      await el.updateComplete;

      const bound = refill ? LIMIT * 2 : LIMIT;
      for (let step = 0; step < 400; step++) {
        const uid = `t${Math.floor(rnd() * N)}`;
        const r = rnd();
        if (r < 0.5) status.set(uid, 'completed');
        else if (r < 0.8) status.set(uid, 'needs_action');
        else status.set(uid, 'gone');
        if (rnd() < 0.05) sinkCompleted('todo.fuzz');

        el.renderableTasks = [...status]
          .filter(([, s]) => s !== 'gone')
          .map(([u, s]) => mk(u, s as RenderableTask['status']));
        await el.updateComplete;

        const rows = el.shadowRoot!.querySelectorAll('lucarne-task-row').length;
        assert.ok(rows <= bound, `step ${step}: ${rows} rows exceeds bound ${bound}`);

        const uids = [...el.shadowRoot!.querySelectorAll('lucarne-task-row')].map(
          (n) => (n as unknown as { task: RenderableTask }).task.uid,
        );
        assert.equal(new Set(uids).size, uids.length, `step ${step}: duplicate rows ${uids.join(',')}`);
      }
    });
  }
});

describe('lucarne-tasks-summary avatar alignment', () => {
  const ANNA: MemberSummary = {
    slug: 'anna',
    name: 'Anna',
    color: '#f5c89c',
    avatar: null,
    todo_entity_id: 'todo.anna',
    streak_counter_id: 'counter.anna_streak',
  };

  it('renders the owner avatar inside .row, so it centres on the check circle', async () => {
    // Structural, not arithmetic. The avatar used to be a sibling in
    // tasks-summary, which had to model task-row's geometry with a magic offset
    // — and got it wrong twice (once ~12px high, once only for wrapped labels).
    // Inside .row, its `align-items: center` aligns the two at ANY row height:
    // a note line below, a label wrapped to three lines, an expanded note.
    const el = document.createElement('lucarne-tasks-summary') as LucarneTasksSummary;
    el.integrationMode = true;
    el.todoEntityId = 'todo.align';
    el.members = [ANNA];
    const base = mk('a1', 'needs_action');
    el.renderableTasks = [{ ...base, metadata: { ...base.metadata, member_slug: 'anna' } }];
    document.body.appendChild(el);
    await el.updateComplete;

    const row = el.shadowRoot!.querySelector('lucarne-task-row')!;
    await (row as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    assert.equal(
      el.shadowRoot!.querySelector('.owner-avatar'),
      null,
      'avatar must not be a sibling of the row any more',
    );
    const avatar = row.shadowRoot!.querySelector('.owner-avatar');
    assert.ok(avatar, 'avatar rendered inside the row');
    assert.equal(avatar!.closest('.row')?.className, 'row', 'avatar sits inside .row');
    assert.equal(
      window.getComputedStyle(row.shadowRoot!.querySelector('.row') as HTMLElement).alignItems,
      'center',
      '.row must centre its children for the alignment to hold',
    );
    assert.equal(avatar!.getAttribute('aria-hidden'), 'true', 'kept out of the checkbox name');
  });

  it('renders no avatar for a household task', async () => {
    const el = document.createElement('lucarne-tasks-summary') as LucarneTasksSummary;
    el.integrationMode = true;
    el.todoEntityId = 'todo.align2';
    el.members = [ANNA];
    el.renderableTasks = [mk('h1', 'needs_action')]; // member_slug: 'household'
    document.body.appendChild(el);
    await el.updateComplete;

    const row = el.shadowRoot!.querySelector('lucarne-task-row')!;
    await (row as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    assert.equal(row.shadowRoot!.querySelector('.owner-avatar'), null);
  });
});
