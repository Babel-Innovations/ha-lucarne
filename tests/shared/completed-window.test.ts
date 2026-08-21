import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  admit,
  clearAway,
  getWindow,
  markCompleted,
  resetWindows,
  sinkCompleted,
  unmarkCompleted,
} from '../../src/shared/completed-window.js';

const DAY = new Date('2026-05-21T10:00:00-07:00');
const NEXT_DAY = new Date('2026-05-22T10:00:00-07:00');

afterEach(() => {
  resetWindows();
});

describe('completed-window', () => {
  it('returns the same window across lookups, so it survives a card remount', () => {
    // The whole point of module scope: Lovelace destroys card DOM on a view
    // switch, and the crossed rows have to outlive that.
    const first = getWindow('todo.a', 5, false, DAY);
    admit(first, 'uid-1');
    const second = getWindow('todo.a', 5, false, DAY);
    assert.equal(second, first);
    assert.deepEqual(second.order, ['uid-1']);
  });

  it('re-seeds when the local day rolls over', () => {
    const today = getWindow('todo.a', 5, false, DAY);
    admit(today, 'uid-1');
    markCompleted(today, 'uid-1', 0);

    const tomorrow = getWindow('todo.a', 5, false, NEXT_DAY);
    assert.notEqual(tomorrow, today);
    assert.deepEqual(tomorrow.order, [], "yesterday's crossed rows are gone");
    assert.equal(tomorrow.completed.size, 0);
  });

  it('keeps separate windows per limit, so two cards cannot wipe each other', () => {
    const w = getWindow('todo.a', 5, false, DAY);
    admit(w, 'uid-1');
    assert.deepEqual(getWindow('todo.a', 3, false, DAY).order, [], 'different limit, own window');
    // The original must survive — a second card re-rendering must not reset it.
    assert.deepEqual(getWindow('todo.a', 5, false, DAY).order, ['uid-1']);
  });

  it('keeps separate windows per refill mode', () => {
    // The admitted set is built under different rules per mode; sharing one
    // across a config change can render more rows than max_tasks.
    admit(getWindow('todo.a', 5, false, DAY), 'uid-1');
    assert.deepEqual(getWindow('todo.a', 5, true, DAY).order, []);
    assert.deepEqual(getWindow('todo.a', 5, false, DAY).order, ['uid-1']);
  });

  it('orders completions by a monotonic seq so the newest can be kept', () => {
    const w = getWindow('todo.a', 5, false, DAY);
    markCompleted(w, 'first', 9);
    markCompleted(w, 'second', 0);
    assert.ok(
      w.completed.get('second')!.seq > w.completed.get('first')!.seq,
      'later completion has the higher seq even though its slot index is lower',
    );
  });

  it('does not renumber a completion that is already recorded', () => {
    const w = getWindow('todo.a', 5, false, DAY);
    markCompleted(w, 'uid-1', 0);
    const seq = w.completed.get('uid-1')!.seq;
    markCompleted(w, 'uid-1', 3);
    assert.equal(w.completed.get('uid-1')!.seq, seq);
  });

  it('evicts windows from a previous day, including entities no longer rendered', () => {
    admit(getWindow('todo.gone', 5, false, DAY), 'uid-1');
    // A different entity rolling over prunes the stale one too, so a window for
    // a card that was removed cannot linger.
    getWindow('todo.other', 5, false, NEXT_DAY);
    assert.deepEqual(getWindow('todo.gone', 5, false, NEXT_DAY).order, []);
  });

  it('keeps entities independent', () => {
    admit(getWindow('todo.a', 5, false, DAY), 'uid-1');
    assert.deepEqual(getWindow('todo.b', 5, false, DAY).order, []);
    assert.deepEqual(getWindow('todo.a', 5, false, DAY).order, ['uid-1']);
  });

  it('admits each uid once, preserving admission order', () => {
    const w = getWindow('todo.a', 5, false, DAY);
    admit(w, 'b');
    admit(w, 'a');
    admit(w, 'b');
    assert.deepEqual(w.order, ['b', 'a']);
  });

  it('keeps the slot a row held when it was completed', () => {
    const w = getWindow('todo.a', 5, false, DAY);
    markCompleted(w, 'uid-1', 2);
    markCompleted(w, 'uid-1', 9); // a later render must not move it
    assert.equal(w.completed.get('uid-1')!.index, 2);
    assert.equal(w.completed.get('uid-1')!.sunk, false);
  });

  it('drops the entry when a completion is undone', () => {
    const w = getWindow('todo.a', 5, false, DAY);
    markCompleted(w, 'uid-1', 0);
    unmarkCompleted(w, 'uid-1');
    assert.equal(w.completed.has('uid-1'), false);
  });

  it('sinks every window variant for the named entity', () => {
    const burn = getWindow('todo.a', 5, false, DAY);
    const refill = getWindow('todo.a', 3, true, DAY);
    markCompleted(burn, 'uid-1', 0);
    markCompleted(refill, 'uid-2', 0);

    sinkCompleted('todo.a');

    assert.equal(burn.completed.get('uid-1')!.sunk, true);
    assert.equal(refill.completed.get('uid-2')!.sunk, true);
  });

  it('sinks only the named entity', () => {
    const a = getWindow('todo.a', 5, false, DAY);
    const b = getWindow('todo.b', 5, false, DAY);
    markCompleted(a, 'uid-1', 0);
    markCompleted(b, 'uid-2', 0);

    sinkCompleted('todo.a');

    assert.equal(a.completed.get('uid-1')!.sunk, true);
    assert.equal(b.completed.get('uid-2')!.sunk, false);
  });

  it('sinks every entity when none is named', () => {
    const a = getWindow('todo.a', 5, false, DAY);
    const b = getWindow('todo.b', 5, false, DAY);
    markCompleted(a, 'uid-1', 0);
    markCompleted(b, 'uid-2', 0);

    sinkCompleted();

    assert.equal(a.completed.get('uid-1')!.sunk, true);
    assert.equal(b.completed.get('uid-2')!.sunk, true);
  });

  it('tolerates sinking an entity that has no window yet', () => {
    assert.doesNotThrow(() => sinkCompleted('todo.missing'));
  });

  it('clearAway ends the away span for one entity only', () => {
    const a = getWindow('todo.a', 5, false, DAY);
    const b = getWindow('todo.b', 5, false, DAY);
    sinkCompleted();
    assert.equal(a.away, true);
    assert.equal(b.away, true);

    clearAway('todo.a');

    assert.equal(a.away, false, 'the entity the user acted on');
    assert.equal(b.away, true, 'others keep waiting');
  });

  it('clearAway covers every window variant for the entity', () => {
    const burn = getWindow('todo.a', 5, false, DAY);
    const refill = getWindow('todo.a', 3, true, DAY);
    sinkCompleted('todo.a');

    clearAway('todo.a');

    assert.equal(burn.away, false);
    assert.equal(refill.away, false);
  });

  it('clears everything on reset', () => {
    admit(getWindow('todo.a', 5, false, DAY), 'uid-1');
    resetWindows();
    assert.deepEqual(getWindow('todo.a', 5, false, DAY).order, []);
  });
});
