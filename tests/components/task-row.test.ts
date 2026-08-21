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

  it('keeps the rotation hint in the accessible name', async () => {
    // The row's name used to be computed from contents, which included the
    // visible "next:" span. An explicit aria-label was added for the note, so
    // anything else worth announcing has to be listed there too.
    const el = makeEl(makeRotatingTask(['anna', 'bob'], 'anna'));
    el.members = MEMBERS;
    await el.updateComplete;

    const label = (shadow(el, '.row') as HTMLElement).getAttribute('aria-label') ?? '';
    assert.match(label, /^Vacuum/);
    assert.match(label, /next: Bob/);
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

describe('lucarne-task-row note line', () => {
  function makeNoteEl(task: RenderableTask, showNotes = true): LucarneTaskRow {
    const el = document.createElement('lucarne-task-row') as LucarneTaskRow;
    el.task = task;
    el.showNotes = showNotes;
    document.body.appendChild(el);
    return el;
  }

  it('renders no note line unless show-notes is set', async () => {
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }), false);
    await el.updateComplete;
    assert.equal(shadow(el, '.note'), null, 'note hidden while opted out');
  });

  it('renders the description as a note line when opted in', async () => {
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const note = shadow(el, '.note');
    assert.ok(note, '.note rendered');
    assert.equal(note!.textContent?.trim(), 'Fold into the top drawer');
  });

  it('renders no note line for an empty description', async () => {
    const el = makeNoteEl(makeTask({ description: '' }));
    await el.updateComplete;
    assert.equal(shadow(el, '.note'), null);
  });

  it('renders no note line when the description is only an Apple sentinel', async () => {
    // An imported reminder with no notes of its own still carries the bridge's
    // correlation sentinel — it must not sprout an empty note line.
    const el = makeNoteEl(makeTask({ description: '[apple:ABC-123]' }));
    await el.updateComplete;
    assert.equal(shadow(el, '.note'), null);
  });

  it('strips the Apple sentinel from a note it does render', async () => {
    const el = makeNoteEl(makeTask({ description: '[apple:ABC-123] Socks in the bin' }));
    await el.updateComplete;
    assert.equal(shadow(el, '.note')!.textContent?.trim(), 'Socks in the bin');
  });

  it('starts collapsed to a single ellipsised line', async () => {
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer, not the basket' }));
    await el.updateComplete;

    const note = shadow(el, '.note') as HTMLElement;
    assert.ok(!note.classList.contains('expanded'));
    const styles = window.getComputedStyle(note);
    assert.equal(styles.whiteSpace, 'nowrap', 'collapsed note stays on one line');
    assert.equal(styles.textOverflow, 'ellipsis');
  });

  it('expands and collapses on tap without toggling the task', async () => {
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const toggles: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggles.push(e as CustomEvent));

    const note = shadow(el, '.note') as HTMLElement;
    note.click();
    await el.updateComplete;

    assert.ok(shadow(el, '.note')!.classList.contains('expanded'));
    assert.equal(toggles.length, 0, 'tapping the note must not complete the task');

    (shadow(el, '.note') as HTMLElement).click();
    await el.updateComplete;
    assert.ok(!shadow(el, '.note')!.classList.contains('expanded'));
    assert.equal(toggles.length, 0);
  });

  it('is not a focusable control inside the row checkbox', async () => {
    // ARIA treats checkbox children as presentational, so a focusable
    // role="button" in there announces nothing actionable. Assistive tech is
    // given the note through the row's description instead.
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const note = shadow(el, '.note') as HTMLElement;
    assert.equal(note.getAttribute('tabindex'), null, 'note must not be focusable');
    assert.equal(note.getAttribute('role'), null, 'note must not claim a role');

    const row = shadow(el, '.row') as HTMLElement;
    assert.equal(row.getAttribute('aria-describedby'), note.id, 'note is the row description');
    assert.ok(note.id, 'note needs an id to be referenced');
  });

  it('names the row from the summary alone, not the note text', async () => {
    // The note is inside .row now; without an explicit label the checkbox's
    // accessible name would swallow the whole note.
    const el = makeNoteEl(
      makeTask({ summary: 'Put away laundry', due: '2026-05-30', description: 'Top drawer' }),
    );
    await el.updateComplete;

    const label = (shadow(el, '.row') as HTMLElement).getAttribute('aria-label') ?? '';
    assert.match(label, /^Put away laundry/);
    assert.ok(!label.includes('Top drawer'), 'note text must not be part of the name');
  });

  it('has no describedby when there is no note', async () => {
    const el = makeNoteEl(makeTask({ description: '' }));
    await el.updateComplete;
    assert.equal((shadow(el, '.row') as HTMLElement).getAttribute('aria-describedby'), null);
  });

  it('swallows the click when a press is dragged from the note onto the row', async () => {
    // The note stops its own pointerdown, but releasing over the row still
    // fires a click on .row — their common ancestor since the note moved in.
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const toggles: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggles.push(e as CustomEvent));

    (shadow(el, '.note') as HTMLElement).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }),
    );
    (shadow(el, '.row') as HTMLElement).click();
    assert.equal(toggles.length, 0, 'drag off the note must not complete the task');

    // The next genuine row tap still works.
    (shadow(el, '.row') as HTMLElement).click();
    assert.equal(toggles.length, 1);
  });

  it('captures the pointer so a press that drifts off the note still reports back', async () => {
    // Without capture, releasing over a different row delivers the pointerup and
    // click somewhere else entirely, stranding the swallow flag set — which then
    // eats this row's next keyboard activation.
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const note = shadow(el, '.note') as HTMLElement;
    const captured: number[] = [];
    note.setPointerCapture = (id: number) => captured.push(id);

    note.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }));
    assert.deepEqual(captured, [7], 'note captured the pointer');
  });

  // Cancel bubbles from the note to .row's own handler, so both of these are
  // served by the single clear in _onPointerCancel.
  it('does not strand the swallow flag when the note press is cancelled', async () => {
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const toggles: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggles.push(e as CustomEvent));

    const note = shadow(el, '.note') as HTMLElement;
    note.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    note.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }));
    (shadow(el, '.row') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    assert.equal(toggles.length, 1, 'Enter still toggles after a cancelled note press');
  });

  it('does not strand the swallow flag when the press is cancelled', async () => {
    // A note press cancelled by a scroll of the task list fires pointercancel
    // rather than a click, so without clearing there the flag would linger and
    // eat the row's next keyboard activation.
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const toggles: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggles.push(e as CustomEvent));

    (shadow(el, '.note') as HTMLElement).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }),
    );
    (shadow(el, '.row') as HTMLElement).dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }),
    );
    (shadow(el, '.row') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    assert.equal(toggles.length, 1, 'Enter still toggles after a cancelled note press');
  });

  it('marks the emoji icon decorative so it is not part of the row name', async () => {
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;
    assert.equal(shadow(el, '.icon')!.getAttribute('aria-hidden'), 'true');
  });

  it('holding the note does not start a long press', async () => {
    // The note lives INSIDE .row (so its indent tracks the row's leading
    // content), so it must stop pointerdown from reaching the long-press timer.
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const longPresses: CustomEvent[] = [];
    el.addEventListener('task-long-press', (e) => longPresses.push(e as CustomEvent));

    const note = shadow(el, '.note') as HTMLElement;
    note.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    await new Promise((r) => setTimeout(r, 550));
    note.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    assert.equal(longPresses.length, 0, 'note must not trigger the row long press');
  });

  it('collapses when the row is reused for a different task', async () => {
    // The tasks summary renders rows with a plain .map(), so Lit reuses row
    // elements by index — a reorder must not leave someone else's note open.
    const el = makeNoteEl(makeTask({ uid: 'a', description: 'Note for A' }));
    await el.updateComplete;
    (shadow(el, '.note') as HTMLElement).click();
    await el.updateComplete;
    assert.ok(shadow(el, '.note')!.classList.contains('expanded'));

    el.task = makeTask({ uid: 'b', summary: 'Other', description: 'Note for B' });
    await el.updateComplete;

    assert.equal(shadow(el, '.note')!.textContent?.trim(), 'Note for B');
    assert.ok(!shadow(el, '.note')!.classList.contains('expanded'));
  });

  it('keeps the note open when the same task re-renders', async () => {
    // An optimistic status flip hands the row a NEW object for the SAME uid;
    // that must not collapse a note the user just opened.
    const el = makeNoteEl(makeTask({ uid: 'a', description: 'Note for A' }));
    await el.updateComplete;
    (shadow(el, '.note') as HTMLElement).click();
    await el.updateComplete;

    el.task = makeTask({ uid: 'a', status: 'completed', description: 'Note for A' });
    await el.updateComplete;

    assert.ok(shadow(el, '.note')!.classList.contains('expanded'));
  });

  it('sits inside .middle so it starts where the summary starts', async () => {
    // Structural, not arithmetic: the note used to sit outside .row with a
    // hard-coded left margin reproducing the leading width (padding + check +
    // gap). The moment an owner avatar joined the row that constant was wrong.
    // Inside .middle it shares the label's box at any density and whatever
    // leads the row.
    const el = makeNoteEl(makeTask({ description: 'Fold into the top drawer' }));
    await el.updateComplete;

    const note = shadow(el, '.note') as HTMLElement;
    assert.equal(note.parentElement?.className, 'middle', 'note shares the label wrapper');
    assert.equal(
      window.getComputedStyle(note).marginLeft,
      '0px',
      'no hand-computed indent — alignment comes from the layout',
    );
  });

  it('mutes the note on a completed task', async () => {
    const el = makeNoteEl(makeTask({ status: 'completed', description: 'Fold into the top drawer' }));
    await el.updateComplete;
    assert.ok(shadow(el, '.note')!.classList.contains('done'));
  });
});

describe('lucarne-task-row note links', () => {
  const NOTE = '$440 policy ending 61874 https://my.lgamerica.com/account/policies/list';

  function makeNoteEl(description: string): LucarneTaskRow {
    const el = document.createElement('lucarne-task-row') as LucarneTaskRow;
    el.task = makeTask({ description });
    el.showNotes = true;
    document.body.appendChild(el);
    return el;
  }

  it('renders a URL in the note as a link that opens outside the dashboard', async () => {
    const el = makeNoteEl(NOTE);
    await el.updateComplete;

    const link = shadow(el, '.note a') as HTMLAnchorElement;
    assert.ok(link, 'URL rendered as an anchor');
    assert.equal(link.getAttribute('href'), 'https://my.lgamerica.com/account/policies/list');
    assert.equal(link.getAttribute('target'), '_blank');
    assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  });

  it('keeps the note text byte-identical so the row description is unchanged', async () => {
    const el = makeNoteEl(NOTE);
    await el.updateComplete;
    assert.equal(shadow(el, '.note')!.textContent?.trim(), NOTE);
  });

  it('renders a non-http scheme as plain text', async () => {
    const el = makeNoteEl('javascript:alert(1)');
    await el.updateComplete;
    assert.equal(shadow(el, '.note a'), null, 'only http(s) may become a live link');
  });

  it('does not expand the note or complete the task when a link is tapped', async () => {
    const el = makeNoteEl(NOTE);
    await el.updateComplete;

    const toggles: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggles.push(e as CustomEvent));

    const link = shadow(el, '.note a') as HTMLAnchorElement;
    // preventDefault so the test DOM does not try to navigate.
    link.addEventListener('click', (e) => e.preventDefault());
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await el.updateComplete;

    assert.equal(toggles.length, 0, 'a link tap must not complete the task');
    assert.ok(!shadow(el, '.note')!.classList.contains('expanded'), 'a link tap must not expand');
  });

  it('does not capture the pointer for a press that starts on a link', async () => {
    // Pointer capture on the note retargets the click away from the anchor, so
    // the link would never open.
    const el = makeNoteEl(NOTE);
    await el.updateComplete;

    const note = shadow(el, '.note') as HTMLElement;
    const captured: number[] = [];
    note.setPointerCapture = (id: number) => captured.push(id);

    const link = shadow(el, '.note a') as HTMLAnchorElement;
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 3 }));

    assert.deepEqual(captured, [], 'the anchor keeps its own press');
  });

  it('opens the link instead of completing the task on Enter', async () => {
    // The anchor is a real tab stop inside the row; without a guard the row's
    // own keydown handler cancels the anchor's activation and toggles instead.
    const el = makeNoteEl(NOTE);
    await el.updateComplete;

    const toggles: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggles.push(e as CustomEvent));

    const link = shadow(el, '.note a') as HTMLAnchorElement;
    const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true });
    link.dispatchEvent(key);

    assert.equal(toggles.length, 0, 'Enter on a link must not complete the task');
    assert.ok(!key.defaultPrevented, 'the anchor keeps its default activation');
  });

  it('still toggles on Enter from the row itself', async () => {
    const el = makeNoteEl(NOTE);
    await el.updateComplete;

    const toggles: CustomEvent[] = [];
    el.addEventListener('task-toggle', (e) => toggles.push(e as CustomEvent));

    (shadow(el, '.row') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    assert.equal(toggles.length, 1, 'a note link must not disarm the row');
  });

  it('still starts no long press when the press begins on a link', async () => {
    const el = makeNoteEl(NOTE);
    await el.updateComplete;

    const longPresses: CustomEvent[] = [];
    el.addEventListener('task-long-press', (e) => longPresses.push(e as CustomEvent));

    const link = shadow(el, '.note a') as HTMLAnchorElement;
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 }));
    await new Promise((r) => setTimeout(r, 550));

    assert.equal(longPresses.length, 0, 'a link press must not reach the row long press');
  });
});

describe('lucarne-task-row note expand animation', () => {
  const LONG_NOTE = 'Fold into the top drawer, not the basket, and leave the socks paired';

  interface FakeAnimation {
    onfinish: (() => void) | null;
    oncancel: (() => void) | null;
    cancelled: number;
    cancel(): void;
  }

  /** A note whose geometry differs between its one-line and wrapped shapes, so
   *  _startNoteAnimation has two endpoints to animate between in the test DOM. */
  function makeMeasurableNote(el: LucarneTaskRow): { note: HTMLElement; frames: unknown[][]; anims: FakeAnimation[] } {
    const note = shadow(el, '.note') as HTMLElement;
    Object.defineProperty(note, 'offsetHeight', {
      configurable: true,
      get: () => (note.style.whiteSpace === 'nowrap' ? 16 : 48),
    });
    const frames: unknown[][] = [];
    const anims: FakeAnimation[] = [];
    (note as unknown as { animate: unknown }).animate = (keyframes: unknown[]) => {
      frames.push(keyframes);
      const anim: FakeAnimation = {
        onfinish: null,
        oncancel: null,
        cancelled: 0,
        cancel() {
          this.cancelled++;
        },
      };
      anims.push(anim);
      return anim;
    };
    return { note, frames, anims };
  }

  function makeNoteEl(): LucarneTaskRow {
    const el = document.createElement('lucarne-task-row') as LucarneTaskRow;
    el.task = makeTask({ description: LONG_NOTE });
    el.showNotes = true;
    document.body.appendChild(el);
    return el;
  }

  it('animates the note height between its one-line and wrapped shapes', async () => {
    const el = makeNoteEl();
    await el.updateComplete;
    const { note, frames, anims } = makeMeasurableNote(el);

    note.click();
    await el.updateComplete;

    assert.deepEqual(frames, [[{ height: '16px' }, { height: '48px' }]], 'expands one line → full');
    assert.ok(note.classList.contains('animating'), 'wrapped + clipped for the run');
    assert.equal(note.style.height, '', 'measuring leaves no inline height behind');

    anims[0].onfinish?.();
    await el.updateComplete;
    assert.ok(!note.classList.contains('animating'), 'class cleared once the animation lands');
    assert.ok(note.classList.contains('expanded'));
    assert.equal(anims[0].cancelled, 1, 'the forwards fill is released after the class is off');
  });

  it('animates back down from the wrapped height on collapse', async () => {
    const el = makeNoteEl();
    await el.updateComplete;
    const { note, frames, anims } = makeMeasurableNote(el);

    note.click();
    await el.updateComplete;
    anims[0].onfinish?.();
    await el.updateComplete;

    note.click();
    await el.updateComplete;

    assert.deepEqual(frames[1], [{ height: '48px' }, { height: '16px' }], 'collapses full → one line');
    assert.ok(note.classList.contains('animating'), 'still wrapped while it shrinks');
    assert.ok(!note.classList.contains('expanded'));
  });

  it('skips the animation when the viewer asks for reduced motion', async () => {
    const win = globalThis.window as unknown as Record<string, unknown>;
    const original = win.matchMedia;
    win.matchMedia = (query: string) => ({ matches: query.includes('reduced-motion'), media: query });
    try {
      const el = makeNoteEl();
      await el.updateComplete;
      const { note, frames } = makeMeasurableNote(el);

      note.click();
      await el.updateComplete;

      assert.deepEqual(frames, [], 'no animation started');
      assert.ok(!note.classList.contains('animating'), 'and nothing left clipped');
      assert.ok(note.classList.contains('expanded'), 'the note still expands');
    } finally {
      win.matchMedia = original;
    }
  });

  it('does not animate a note collapsed by row recycling', async () => {
    // willUpdate collapses when the row is handed a different task; that is not
    // a user gesture and must not animate someone else's note shut.
    const el = makeNoteEl();
    await el.updateComplete;
    const { note, frames, anims } = makeMeasurableNote(el);

    note.click();
    await el.updateComplete;
    anims[0].onfinish?.();
    await el.updateComplete;

    el.task = makeTask({ uid: 'other', description: 'Note for someone else' });
    await el.updateComplete;

    assert.equal(frames.length, 1, 'only the user toggle animated');
    assert.ok(!(shadow(el, '.note') as HTMLElement).classList.contains('animating'));
  });

  it('animates the new direction when re-toggled mid-flight', async () => {
    // A running animation with fill: forwards outranks inline style, so the
    // in-flight one must be cancelled BEFORE the two shapes are measured — or
    // both reads return the height being animated, the method concludes there
    // is nothing to do, and .animating comes off while the old animation still
    // forces a height (the note spills unclipped).
    const el = makeNoteEl();
    await el.updateComplete;
    const { note, frames, anims } = makeMeasurableNote(el);

    note.click();
    await el.updateComplete;
    // Model the forwards fill: while anims[0] runs, measurement is pinned.
    let pinned = true;
    const measured = Object.getOwnPropertyDescriptor(note, 'offsetHeight')!.get as () => number;
    Object.defineProperty(note, 'offsetHeight', {
      configurable: true,
      get: () => (pinned ? 32 : measured.call(note)),
    });
    anims[0].cancel = function () {
      this.cancelled++;
      pinned = false;
    };

    note.click();
    await el.updateComplete;

    assert.equal(anims[0].cancelled, 1, 'the in-flight animation is cancelled first');
    assert.deepEqual(frames[1], [{ height: '48px' }, { height: '16px' }], 'the collapse still animates');
    assert.ok(note.classList.contains('animating'));
  });

  it('cancels a running animation when the row is recycled mid-flight', async () => {
    const el = makeNoteEl();
    await el.updateComplete;
    const { note, anims } = makeMeasurableNote(el);

    note.click();
    await el.updateComplete;
    assert.ok(note.classList.contains('animating'), 'animation in flight');

    el.task = makeTask({ uid: 'other', description: 'Note for someone else' });
    await el.updateComplete;

    assert.equal(anims[0].cancelled, 1, 'the outgoing note stops animating');
    assert.ok(!(shadow(el, '.note') as HTMLElement).classList.contains('animating'));
  });
});
