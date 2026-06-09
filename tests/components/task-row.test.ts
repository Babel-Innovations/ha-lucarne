import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneTaskRow } from '../../src/components/task-row.js';
import type { MemberSummary, RenderableTask } from '../../src/shared/types.js';

await import('../../src/components/task-row.js');

const MEMBERS: MemberSummary[] = [
  { slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null, todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak' },
  { slug: 'bob', name: 'Bob', color: '#b8e0d2', avatar: null, todo_entity_id: 'todo.bob', streak_counter_id: 'counter.bob_streak' },
];

function makeTask(overrides: Partial<RenderableTask> = {}): RenderableTask {
  return {
    uid: 'uid-1',
    summary: 'Brush teeth',
    status: 'needs_action',
    due: null,
    description: '',
    metadata: {
      item_uid: 'uid-1',
      member_slug: 'anna',
      assignee_slug: '',
      type: 'routine',
      recurrence: 'FREQ=DAILY',
      icon: '🪥',
      source: 'template',
    },
    ...overrides,
  };
}

function makeRotatingTask(rotationOwners: string[], currentOwner: string): RenderableTask {
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
      rotation_owners: rotationOwners,
      current_owner: currentOwner,
    },
  };
}

function makeEl(task: RenderableTask, memberColor = '#f5c89c'): LucarneTaskRow {
  const el = document.createElement('lucarne-task-row') as LucarneTaskRow;
  el.task = task;
  el.memberColor = memberColor;
  document.body.appendChild(el);
  return el;
}

function shadow(el: LucarneTaskRow, sel: string) {
  return el.shadowRoot?.querySelector(sel) ?? null;
}

afterEach(() => {
  document.querySelectorAll('lucarne-task-row').forEach((el) => el.remove());
});

describe('lucarne-task-row', () => {
  it('renders task summary', async () => {
    const el = makeEl(makeTask({ summary: 'Make bed' }));
    await el.updateComplete;

    const label = shadow(el, '.label');
    assert.ok(label, '.label rendered');
    assert.equal(label!.textContent, 'Make bed');
  });

  it('renders icon when metadata.icon is set', async () => {
    const el = makeEl(makeTask({ metadata: { ...makeTask().metadata, icon: '🛏️' } }));
    await el.updateComplete;

    const iconSpan = shadow(el, '.icon');
    assert.ok(iconSpan, '.icon span rendered');
    assert.equal(iconSpan!.textContent, '🛏️');
  });

  it('does not render icon when metadata.icon is empty', async () => {
    const el = makeEl(makeTask({ metadata: { ...makeTask().metadata, icon: '' } }));
    await el.updateComplete;

    const iconSpan = shadow(el, '.icon');
    assert.equal(iconSpan, null, 'no icon span for empty icon');
  });

  it('renders due time when due is set', async () => {
    const el = makeEl(makeTask({ due: '2026-05-25T09:00:00' }));
    await el.updateComplete;

    const dueSpan = shadow(el, '.due');
    assert.ok(dueSpan, '.due span rendered');
    assert.ok((dueSpan!.textContent ?? '').trim().length > 0, 'due text non-empty');
  });

  it('formats date-only YYYY-MM-DD dues using locale "short month + day" (e.g. "May 30")', async () => {
    // Regression: was previously displayed raw (e.g. "2026-05-30"). Date-only strings
    // must be parsed as local midnight so they don't drift across UTC midnight.
    const el = makeEl(makeTask({ due: '2026-05-30' }));
    await el.updateComplete;

    const dueSpan = shadow(el, '.due');
    assert.ok(dueSpan, '.due span rendered');
    const text = (dueSpan!.textContent ?? '').trim();
    assert.equal(text, 'May 30', `expected "May 30", got "${text}"`);
  });

  it('shows strikethrough class when completed', async () => {
    const el = makeEl(makeTask({ status: 'completed' }));
    await el.updateComplete;

    const label = shadow(el, '.label.done');
    assert.ok(label, '.label.done present when completed');

    const check = shadow(el, '.check.done');
    assert.ok(check, '.check.done present when completed');
  });

  it('does not show done class when needs_action', async () => {
    const el = makeEl(makeTask({ status: 'needs_action' }));
    await el.updateComplete;

    const label = shadow(el, '.label.done');
    assert.equal(label, null, '.label.done absent when needs_action');
  });

  it('fires task-toggle on click', async () => {
    const task = makeTask();
    const el = makeEl(task);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => events.push(e as CustomEvent));

    const row = shadow(el, '.row') as HTMLElement;
    row.click();

    assert.equal(events.length, 1);
    assert.equal(events[0].detail.task.uid, task.uid);
  });

  it('fires task-long-press after 500ms hold', async () => {
    const task = makeTask();
    const el = makeEl(task);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('task-long-press', (e) => events.push(e as CustomEvent));

    const row = shadow(el, '.row') as HTMLElement;

    // Simulate pointerdown — long press timer starts
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));

    // Before 500ms — no event
    assert.equal(events.length, 0);

    // Wait >500ms
    await new Promise((r) => setTimeout(r, 550));

    assert.equal(events.length, 1, 'task-long-press fired after 500ms');
    assert.equal(events[0].detail.task.uid, task.uid);

    // Cleanup
    row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('does not fire task-toggle after a long press', async () => {
    const task = makeTask();
    const el = makeEl(task);
    await el.updateComplete;

    const toggleEvents: CustomEvent[] = [];
    const longPressEvents: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggleEvents.push(e as CustomEvent));
    el.addEventListener('task-long-press', (e) => longPressEvents.push(e as CustomEvent));

    const row = shadow(el, '.row') as HTMLElement;
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    await new Promise((r) => setTimeout(r, 550));
    row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    row.click();

    assert.equal(longPressEvents.length, 1, 'long-press fired');
    assert.equal(toggleEvents.length, 0, 'toggle NOT fired after long press');
  });

  it('has minimum 44px height touch target', async () => {
    const el = makeEl(makeTask());
    await el.updateComplete;

    const row = shadow(el, '.row') as HTMLElement;
    const styles = window.getComputedStyle(row);
    // min-height is set to 44px in the CSS
    assert.equal(styles.minHeight, '44px');
  });

  it('compact attribute reflects on the host so :host([compact]) CSS rules apply', async () => {
    const el = makeEl(makeTask());
    el.compact = true;
    await el.updateComplete;
    assert.equal(el.hasAttribute('compact'), true, 'compact attribute reflected on host');
  });

  it('compact preserves the 44px minimum tap target (a11y)', async () => {
    const el = makeEl(makeTask());
    el.compact = true;
    await el.updateComplete;

    const row = shadow(el, '.row') as HTMLElement;
    const styles = window.getComputedStyle(row);
    assert.equal(styles.minHeight, '44px', 'compact mode keeps the 44px hit area');
  });

  it('renders ↻ badge for rotating task', async () => {
    const task = makeRotatingTask(['anna', 'bob'], 'anna');
    const el = makeEl(task);
    el.members = MEMBERS;
    await el.updateComplete;

    const badge = shadow(el, '.rotation-badge');
    assert.ok(badge, '.rotation-badge rendered for rotating task');
    assert.ok(badge!.textContent!.includes('↻'), 'badge shows ↻ symbol');
  });

  it('does not render ↻ badge for routine task', async () => {
    const el = makeEl(makeTask());
    await el.updateComplete;

    const badge = shadow(el, '.rotation-badge');
    assert.equal(badge, null, 'no rotation badge for routine');
  });

  it('renders "next: <name>" hint for rotating task with >1 owners', async () => {
    // anna is current, bob is next
    const task = makeRotatingTask(['anna', 'bob'], 'anna');
    const el = makeEl(task);
    el.members = MEMBERS;
    await el.updateComplete;

    const hint = shadow(el, '.rotation-next');
    assert.ok(hint, '.rotation-next rendered');
    assert.ok(hint!.textContent!.includes('Bob'), `hint should mention Bob, got: "${hint!.textContent}"`);
  });

  it('hides "next" hint for single-owner rotating task', async () => {
    const task = makeRotatingTask(['anna'], 'anna');
    const el = makeEl(task);
    el.members = MEMBERS;
    await el.updateComplete;

    const hint = shadow(el, '.rotation-next');
    assert.equal(hint, null, 'no next hint when only one owner');
  });

  it('wraps long task text instead of truncating it (issue #69)', async () => {
    // Regression: the label used `white-space: nowrap` which (on an inline
    // <span> where overflow/text-overflow have no effect) overflowed the
    // column and forced a horizontal scrollbar instead of wrapping.
    const el = makeEl(
      makeTask({ summary: 'Take out the recycling and the compost before school' }),
    );
    await el.updateComplete;

    const label = shadow(el, '.label') as HTMLElement;
    const styles = window.getComputedStyle(label);
    assert.notEqual(styles.whiteSpace, 'nowrap', 'label must allow wrapping');
    // overflow-wrap must also break a single overlong word so it can't overflow.
    assert.ok(
      styles.overflowWrap === 'anywhere' ||
        styles.overflowWrap === 'break-word' ||
        styles.wordBreak === 'break-word',
      `label must break long words (overflow-wrap: ${styles.overflowWrap}, word-break: ${styles.wordBreak})`,
    );
  });
});
