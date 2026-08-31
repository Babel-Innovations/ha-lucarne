import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneMemberColumn } from '../../src/components/member-column.js';
import type { MemberSummary, RenderableTask, TimeOfDay } from '../../src/shared/types.js';

await import('../../src/components/member-column.js');

const MEMBER: MemberSummary = {
  slug: 'anna',
  name: 'Anna',
  color: '#f5c89c',
  avatar: null,
  todo_entity_id: 'todo.anna',
  streak_counter_id: 'counter.anna_streak',
};

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

function makeEl(
  tasks: RenderableTask[] = [],
  opts: { showRoutines?: boolean; showTasks?: boolean; showStreak?: boolean; hideName?: boolean } = {},
): LucarneMemberColumn {
  const el = document.createElement('lucarne-member-column') as LucarneMemberColumn;
  el.member = MEMBER;
  el.tasks = tasks;
  el.streak = 3;
  el.showRoutines = opts.showRoutines !== undefined ? opts.showRoutines : true;
  el.showTasks = opts.showTasks !== undefined ? opts.showTasks : true;
  el.showStreak = opts.showStreak !== undefined ? opts.showStreak : true;
  el.hideName = opts.hideName ?? false;
  document.body.appendChild(el);
  return el;
}

function shadow(el: LucarneMemberColumn, sel: string) {
  return el.shadowRoot?.querySelector(sel) ?? null;
}

function shadowAll(el: LucarneMemberColumn, sel: string) {
  return Array.from(el.shadowRoot?.querySelectorAll(sel) ?? []);
}

afterEach(() => {
  document.querySelectorAll('lucarne-member-column').forEach((el) => el.remove());
});

describe('lucarne-member-column', () => {
  it('renders member name', async () => {
    const el = makeEl();
    await el.updateComplete;

    const nameEl = shadow(el, '.member-name');
    assert.ok(nameEl, '.member-name rendered');
    assert.equal(nameEl!.textContent, 'Anna');
  });

  it('renders routine tasks under the Anytime header by default', async () => {
    const routine = makeTask({ uid: 'r1', summary: 'Brush teeth', metadata: { ...makeTask().metadata, type: 'routine' } });
    const el = makeEl([routine]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.ok(headerTexts.includes('Anytime'), 'Anytime bucket header present');

    const rows = shadowAll(el, 'lucarne-task-row');
    assert.equal(rows.length, 1);
  });

  it('renders a weather glyph in dated time-of-day headers but not Anytime', async () => {
    const morning = makeTask({
      uid: 'm1',
      summary: 'Get dressed',
      metadata: { ...makeTask().metadata, type: 'routine', time_of_day: 'morning' },
    });
    const anytime = makeTask({
      uid: 'a1',
      summary: 'Tidy room',
      metadata: { ...makeTask().metadata, type: 'routine', time_of_day: 'anytime' },
    });
    const el = makeEl([morning, anytime]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const morningHeader = headers.find((h) => h.textContent?.trim() === 'Morning');
    const anytimeHeader = headers.find((h) => h.textContent?.trim() === 'Anytime');

    assert.ok(morningHeader, 'Morning header present');
    assert.ok(morningHeader!.querySelector('.section-icon svg'), 'Morning header has an icon');
    assert.ok(anytimeHeader, 'Anytime header present');
    assert.equal(anytimeHeader!.querySelector('.section-icon'), null, 'Anytime header has no icon');
  });

  it('buckets an untagged chore into Anytime (no separate Tasks section)', async () => {
    const chore = makeTask({
      uid: 'c1',
      summary: 'Take out trash',
      metadata: { ...makeTask().metadata, type: 'chore' },
    });
    const el = makeEl([chore]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.ok(headerTexts.includes('Anytime'), 'untagged chore lands in Anytime');
    assert.ok(!headerTexts.includes('Tasks'), 'no separate Tasks section');
    assert.equal(shadowAll(el, 'lucarne-task-row').length, 1);
  });

  it('places a chore in its time-of-day bucket alongside routines', async () => {
    const routine = makeTask({
      uid: 'r1',
      summary: 'Brush teeth',
      metadata: { ...makeTask().metadata, type: 'routine', time_of_day: 'morning' },
    });
    const chore = makeTask({
      uid: 'c1',
      summary: 'Make bed',
      metadata: { ...makeTask().metadata, type: 'chore', time_of_day: 'morning' },
    });
    const el = makeEl([routine, chore]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.deepEqual(headerTexts, ['Morning'], 'both items under a single Morning section');
    assert.ok(!headerTexts.includes('Tasks'), 'no separate Tasks section');
    assert.equal(shadowAll(el, 'lucarne-task-row').length, 2, 'routine + chore both render');
  });

  it('hides all routine bucket sections when showRoutines=false', async () => {
    const routine = makeTask({
      uid: 'r1',
      metadata: { ...makeTask().metadata, type: 'routine', time_of_day: 'morning' },
    });
    const el = makeEl([routine], { showRoutines: false });
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    for (const bucket of ['Anytime', 'Morning', 'Afternoon', 'Night']) {
      assert.ok(!headerTexts.includes(bucket), `${bucket} section hidden`);
    }

    const rows = shadowAll(el, 'lucarne-task-row');
    assert.equal(rows.length, 0, 'no task rows rendered');
  });

  it('hides chores when showTasks=false', async () => {
    const chore = makeTask({ uid: 'c1', metadata: { ...makeTask().metadata, type: 'chore' } });
    const el = makeEl([chore], { showTasks: false });
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.ok(!headerTexts.includes('Anytime'), 'chore bucket hidden');
    assert.equal(shadowAll(el, 'lucarne-task-row').length, 0, 'no chore rows rendered');
  });

  it('hides streak when showStreak=false', async () => {
    const el = makeEl([], { showStreak: false });
    await el.updateComplete;

    const streakArea = shadow(el, '.streak-area');
    assert.equal(streakArea, null, 'streak-area absent when showStreak=false');
  });

  it('shows streak when showStreak=true', async () => {
    const el = makeEl([], { showStreak: true });
    await el.updateComplete;

    const streakArea = shadow(el, '.streak-area');
    assert.ok(streakArea, 'streak-area present when showStreak=true');
  });

  it('fires add-task-clicked when + Add task button is clicked', async () => {
    const el = makeEl();
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('add-task-clicked', (e) => events.push(e as CustomEvent));

    const btn = shadow(el, '.add-task-btn') as HTMLButtonElement;
    assert.ok(btn, '+ Add task button present');
    btn.click();

    assert.equal(events.length, 1);
    assert.equal(events[0].detail.memberSlug, 'anna');
  });

  it('merges untagged routines and chores into a single Anytime bucket', async () => {
    const routine = makeTask({ uid: 'r1', summary: 'Brush teeth', metadata: { ...makeTask().metadata, type: 'routine' } });
    const chore = makeTask({ uid: 'c1', summary: 'Take out trash', metadata: { ...makeTask().metadata, type: 'chore' } });
    const el = makeEl([routine, chore]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.deepEqual(headerTexts, ['Anytime'], 'one Anytime bucket, no Tasks section');

    const rows = shadowAll(el, 'lucarne-task-row');
    assert.equal(rows.length, 2, 'two task rows rendered');
  });

  it('hides the member name when hide-name is set', async () => {
    const el = makeEl([], { hideName: true });
    await el.updateComplete;
    assert.equal(shadow(el, '.member-name'), null, 'name hidden');
    assert.ok(shadow(el, 'lucarne-member-avatar'), 'avatar still shown');
    assert.ok(shadow(el, '.add-task-btn'), 'add-task button still shown');
  });

  it('groups routines into time-of-day buckets in Morning→Afternoon→Night→Anytime order', async () => {
    const meta = (tod: 'morning' | 'afternoon' | 'night' | 'anytime') => ({
      ...makeTask().metadata,
      type: 'routine' as const,
      time_of_day: tod,
    });
    // Intentionally out of order so we exercise the sort path.
    const tasks: RenderableTask[] = [
      makeTask({ uid: 'a', summary: 'Anytime task', metadata: meta('anytime') }),
      makeTask({ uid: 'n', summary: 'Night task', metadata: meta('night') }),
      makeTask({ uid: 'm', summary: 'Morning task', metadata: meta('morning') }),
      makeTask({ uid: 'af', summary: 'Afternoon task', metadata: meta('afternoon') }),
    ];
    const el = makeEl(tasks);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers
      .map((h) => h.textContent?.trim())
      // Tasks section won't appear (no chores) — but if it does, filter it out
      // so we only verify the bucket order.
      .filter((t) => t !== 'Tasks');
    assert.deepEqual(headerTexts, ['Morning', 'Afternoon', 'Night', 'Anytime']);
  });

  it('omits bucket headers for empty buckets', async () => {
    const morning = makeTask({
      uid: 'm1',
      summary: 'Brush teeth',
      metadata: { ...makeTask().metadata, type: 'routine', time_of_day: 'morning' },
    });
    const el = makeEl([morning]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.ok(headerTexts.includes('Morning'), 'Morning bucket present');
    assert.ok(!headerTexts.includes('Anytime'), 'Anytime bucket omitted when empty');
    assert.ok(!headerTexts.includes('Afternoon'), 'Afternoon bucket omitted when empty');
    assert.ok(!headerTexts.includes('Night'), 'Night bucket omitted when empty');
  });

  it('falls back to Anytime when a routine has no time_of_day metadata', async () => {
    // Pre-migration data path: time_of_day is undefined.
    const routine = makeTask({
      uid: 'r1',
      summary: 'Legacy routine',
      metadata: { ...makeTask().metadata, type: 'routine', time_of_day: undefined },
    });
    const el = makeEl([routine]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.ok(headerTexts.includes('Anytime'), 'undefined time_of_day buckets into Anytime');
  });

  it('falls back to Anytime when time_of_day is an unrecognized string', async () => {
    // Defensive coercion: if a row sneaks past the voluptuous validator
    // (e.g. an old import, a typo, a future enum extension), the routine
    // must still render — not silently disappear from the card.
    const routine = makeTask({
      uid: 'r1',
      summary: 'Imported routine',
      // Cast through unknown because the static type is the TimeOfDay
      // union, but the runtime payload from the WebSocket is structurally
      // typed and could carry an out-of-band value (typo, future enum
      // extension, legacy import). The cast preserves the unknown-string
      // intent at runtime.
      metadata: {
        ...makeTask().metadata,
        type: 'routine',
        time_of_day: 'evening' as unknown as TimeOfDay,
      },
    });
    const el = makeEl([routine]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.ok(
      headerTexts.includes('Anytime'),
      'unknown time_of_day string buckets into Anytime',
    );
    const rows = shadowAll(el, 'lucarne-task-row');
    assert.equal(rows.length, 1, 'task is still rendered');
  });

  it('does not show section header when section has no tasks', async () => {
    // Only routines, no chores
    const routine = makeTask({ uid: 'r1', metadata: { ...makeTask().metadata, type: 'routine' } });
    const el = makeEl([routine]);
    await el.updateComplete;

    const headers = shadowAll(el, '.section-header');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    assert.ok(!headerTexts.includes('Tasks'), 'Tasks section header absent when no chores');
  });

  // --- auto-scroll to time-of-day section (issue #68) -----------------------

  function bucketTask(bucket: TimeOfDay, uid: string): RenderableTask {
    return makeTask({ uid, metadata: { ...makeTask().metadata, type: 'routine', time_of_day: bucket } });
  }

  // happy-dom has no layout engine, so offsetTop is always 0 and we can't assert a
  // pixel scrollTop. Instead we spy on assignments to `.lists` scrollTop: a write
  // happens iff _tryApplyScroll found a section to scroll to.
  function spyScrollWrites(el: LucarneMemberColumn): () => number {
    const lists = shadow(el, '.lists') as HTMLElement;
    let writes = 0;
    Object.defineProperty(lists, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: () => { writes += 1; },
    });
    return () => writes;
  }

  // _onScrollBucketChanged defers the actual scrollTop write (done in _tryApplyScroll) to requestAnimationFrame so it
  // measures against laid-out task rows (see member-column.ts). Tests must let that
  // frame fire before asserting on the spy.
  function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  it('tags each section with its time-of-day data-bucket', async () => {
    const el = makeEl([bucketTask('morning', 'm1'), bucketTask('afternoon', 'a1'), bucketTask('anytime', 'x1')]);
    await el.updateComplete;

    const buckets = shadowAll(el, '.section').map((s) => s.getAttribute('data-bucket'));
    assert.deepEqual(buckets, ['morning', 'afternoon', 'anytime']);
  });

  it('scrolls when scrollToBucket changes but not on a task-only re-render', async () => {
    const el = makeEl([bucketTask('morning', 'm1'), bucketTask('afternoon', 'a1')]);
    await el.updateComplete; // initial scrollToBucket is '' → no scroll
    const writes = spyScrollWrites(el);

    el.scrollToBucket = 'afternoon';
    await el.updateComplete;
    await nextFrame();
    assert.equal(writes(), 1, 'a bucket change scrolls once');

    // A task push with the SAME bucket must not yank a manually-scrolled column.
    el.tasks = [bucketTask('morning', 'm1'), bucketTask('afternoon', 'a1'), bucketTask('morning', 'm2')];
    await el.updateComplete;
    await nextFrame();
    assert.equal(writes(), 1, 'task-only re-render does not re-scroll');
  });

  it('falls through to the next non-empty section when the target bucket is empty', async () => {
    // Target 'afternoon' but only morning + anytime exist → scroll to anytime.
    const el = makeEl([bucketTask('morning', 'm1'), bucketTask('anytime', 'x1')]);
    await el.updateComplete;
    const writes = spyScrollWrites(el);

    el.scrollToBucket = 'afternoon';
    await el.updateComplete;
    await nextFrame();
    assert.equal(writes(), 1, 'falls through afternoon→night→anytime and scrolls');
  });

  it('does not scroll when the target bucket and all later buckets are empty', async () => {
    // Target 'night' but only morning exists → nothing at/after night → no write.
    const el = makeEl([bucketTask('morning', 'm1')]);
    await el.updateComplete;
    const writes = spyScrollWrites(el);

    el.scrollToBucket = 'night';
    await el.updateComplete;
    await nextFrame();
    assert.equal(writes(), 0, 'no section at or after the target → no scroll');
  });

  it('empty scrollToBucket never scrolls', async () => {
    const el = makeEl([bucketTask('morning', 'm1'), bucketTask('afternoon', 'a1')]);
    await el.updateComplete;
    const writes = spyScrollWrites(el);

    el.scrollToBucket = '';
    el.tasks = [bucketTask('morning', 'm1')];
    await el.updateComplete;
    await nextFrame();
    assert.equal(writes(), 0, 'auto-scroll disabled → no scroll write');
  });

  it('re-applies the scroll when a hidden/zero-height column later lays out', async () => {
    // happy-dom never fires ResizeObserver and reports clientHeight 0, so stub
    // the observer to capture its callback and drive a hidden→visible layout by
    // hand. This is the case the rAF-only fix missed: a card first rendered on a
    // not-yet-visible dashboard view measures a zero-height container.
    const RealRO = globalThis.ResizeObserver;
    // Holder object: assigning to a property (vs a bare `let`) keeps TS from
    // narrowing the captured callback to its initial null at the call sites.
    const ro: { cb: (() => void) | null; disconnects: number } = { cb: null, disconnects: 0 };
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) { ro.cb = cb; }
      observe() {}
      unobserve() {}
      disconnect() { ro.disconnects += 1; }
    } as unknown as typeof ResizeObserver;

    try {
      const el = makeEl([bucketTask('morning', 'm1'), bucketTask('night', 'n1')]);
      await el.updateComplete;
      const lists = shadow(el, '.lists') as HTMLElement;
      let height = 0; // hidden view
      Object.defineProperty(lists, 'clientHeight', { configurable: true, get: () => height });
      const writes = spyScrollWrites(el);

      el.scrollToBucket = 'night';
      await el.updateComplete;
      await nextFrame();
      // The rAF fired, but the container is still hidden — the scroll isn't
      // considered delivered, so the observer must keep re-applying it.
      const afterHidden = writes();
      assert.ok(afterHidden >= 1, 'an attempt is made even while hidden');

      assert.equal(ro.disconnects, 0, 'observer stays attached while still pending');

      // Column becomes visible; the resize observer fires.
      height = 400;
      ro.cb?.();
      assert.ok(writes() > afterHidden, 're-applied once the column has layout');
      // Delivered → the observer detaches (nothing left to re-apply).
      assert.equal(ro.disconnects, 1, 'observer disconnected once the scroll is delivered');

      // Now delivered — further resizes must not yank a manually-scrolled column.
      const afterShown = writes();
      ro.cb?.();
      assert.equal(writes(), afterShown, 'no further re-scroll after layout settles');
    } finally {
      globalThis.ResizeObserver = RealRO;
    }
  });

  it('cancels a queued frame when scrollToBucket is cleared before it fires', async () => {
    const el = makeEl([bucketTask('morning', 'm1'), bucketTask('afternoon', 'a1')]);
    await el.updateComplete;
    const writes = spyScrollWrites(el);

    // Arm a frame for 'afternoon', then disable auto-scroll before it fires.
    // updateComplete resolves on a microtask while the rAF is still pending, so
    // the clear path must cancel it — otherwise the stale frame would scroll
    // after auto-scroll was turned off.
    el.scrollToBucket = 'afternoon';
    await el.updateComplete;
    el.scrollToBucket = '';
    await el.updateComplete;
    await nextFrame();
    assert.equal(writes(), 0, 'clearing the bucket cancels the pending scroll frame');
  });
});

describe('lucarne-member-column completed ordering', () => {
  function row(el: LucarneMemberColumn, sectionBucket: string) {
    const section = el.shadowRoot!.querySelector(`.section[data-bucket="${sectionBucket}"]`)!;
    return Array.from(section.querySelectorAll('lucarne-task-row')).map(
      (r) => (r as HTMLElement & { task: RenderableTask }).task.uid,
    );
  }

  it('sinks a completed routine below the active tasks in its bucket', async () => {
    // Regression: routines sort ahead of chores, so ticking one used to pin the
    // crossed-out row to the TOP of its section instead of moving it out of the way.
    const meta = makeTask().metadata;
    const el = makeEl([
      makeTask({ uid: 'r-done', summary: 'Water tree', status: 'completed', metadata: { ...meta, type: 'routine' } }),
      makeTask({ uid: 'r-open', summary: 'Zzz routine', metadata: { ...meta, type: 'routine' } }),
      makeTask({ uid: 'c-open', summary: 'A chore', metadata: { ...meta, type: 'chore' } }),
    ]);
    await el.updateComplete;

    assert.deepEqual(row(el, 'anytime'), ['r-open', 'c-open', 'r-done']);
  });

  it('keeps type ordering inside both the active and the completed group', async () => {
    // The two halves must disagree with a single whole-list type sort, or this
    // asserts nothing: without the split the routines would collapse together
    // ahead of the chores, giving r-open, r-done, c-open, c-done.
    const meta = makeTask().metadata;
    const el = makeEl([
      makeTask({ uid: 'c-done', summary: 'B chore', status: 'completed', metadata: { ...meta, type: 'chore' } }),
      makeTask({ uid: 'r-done', summary: 'Z routine', status: 'completed', metadata: { ...meta, type: 'routine' } }),
      makeTask({ uid: 'r-open', summary: 'Open routine', metadata: { ...meta, type: 'routine' } }),
      makeTask({ uid: 'c-open', summary: 'A chore', metadata: { ...meta, type: 'chore' } }),
    ]);
    await el.updateComplete;

    assert.deepEqual(row(el, 'anytime'), ['r-open', 'c-open', 'r-done', 'c-done']);
  });

  it('sinks within the bucket, not to the bottom of the column', async () => {
    // A finished Morning task must not jump past the Night section — the
    // time-of-day grouping is the primary axis.
    const meta = makeTask().metadata;
    const el = makeEl([
      makeTask({ uid: 'm-done', summary: 'Morning done', status: 'completed', metadata: { ...meta, type: 'routine', time_of_day: 'morning' } }),
      makeTask({ uid: 'm-open', summary: 'Morning open', metadata: { ...meta, type: 'routine', time_of_day: 'morning' } }),
      makeTask({ uid: 'n-open', summary: 'Night open', metadata: { ...meta, type: 'routine', time_of_day: 'night' } }),
    ]);
    await el.updateComplete;

    assert.deepEqual(row(el, 'morning'), ['m-open', 'm-done']);
    assert.deepEqual(row(el, 'night'), ['n-open']);
  });
});
