import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { markBoot } from '../../src/shared/boot-marks.js';

interface Host {
  __lucarneBoot?: { marks?: string[]; stage?: string };
}

beforeEach(() => {
  // Reflect.deleteProperty, not `delete`. This file deliberately installs hostile
  // window shapes (see the throwing-accessor case below), and module code is always
  // strict — so `delete` on a non-configurable property THROWS rather than returning
  // false. From beforeEach that would fail every remaining test in the file with an
  // error pointing here instead of at the case that installed the property.
  // Reflect.deleteProperty returns false instead, leaving the reset best-effort.
  Reflect.deleteProperty(window, '__lucarneBoot');
});

describe('markBoot', () => {
  it('creates the boot object when the bundle is loaded without the loader', () => {
    markBoot('first');
    assert.deepEqual((window as unknown as Host).__lucarneBoot?.marks, ['first']);
  });

  it('appends in evaluation order', () => {
    markBoot('a');
    markBoot('b');
    assert.deepEqual((window as unknown as Host).__lucarneBoot?.marks, ['a', 'b']);
  });

  it('writes into the state the loader already published', () => {
    // The loader and the bundle are imported from the same script block in an
    // unspecified order, so either may create the object first. Neither may
    // discard the other's data.
    const existing = { stage: 'loading', marks: [] as string[] };
    (window as unknown as Host).__lucarneBoot = existing;
    markBoot('during-eval');
    assert.equal((window as unknown as Host).__lucarneBoot, existing);
    assert.deepEqual(existing.marks, ['during-eval']);
  });

  it('never throws, whatever the window looks like', () => {
    // Runs at module scope, where there is no error boundary and — for the
    // earliest marks — no error reporter either. A throw here would be the exact
    // silent bundle death it exists to diagnose.
    Object.defineProperty(window, '__lucarneBoot', {
      get() {
        throw new Error('hostile window');
      },
      configurable: true,
    });
    assert.doesNotThrow(() => markBoot('x'));
    Reflect.deleteProperty(window, '__lucarneBoot');
  });
});
