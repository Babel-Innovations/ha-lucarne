import { describe, it, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  configureErrorReporter,
  errorSignature,
  isLucarneError,
  reportLucarneError,
  installGlobalErrorReporter,
  __resetErrorReporterForTests,
} from '../../src/shared/error-reporter.js';
import type { HomeAssistant } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

// Silence the reporter's console.error so test output stays readable; restore after.
const realError = console.error;
beforeEach(() => {
  console.error = () => {};
});
afterEach(() => {
  console.error = realError;
  __resetErrorReporterForTests();
});

function notifications(hass: ReturnType<typeof makeFakeHass>) {
  return hass.calls.callService.filter(
    (c: { domain: string; service: string }) =>
      c.domain === 'persistent_notification' && c.service === 'create',
  );
}

describe('errorSignature', () => {
  it('includes name, message, and first stack frame for Errors', () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at thing (ha-lucarne.js:1:2)\n    at other';
    const sig = errorSignature(err);
    assert.match(sig, /^Error: boom @ /);
    assert.match(sig, /thing \(ha-lucarne\.js:1:2\)/);
  });

  it('stringifies non-Error values', () => {
    assert.equal(errorSignature('plain string'), 'plain string');
    assert.equal(errorSignature(42), '42');
  });
});

describe('isLucarneError', () => {
  it('matches by source URL', () => {
    assert.equal(isLucarneError(new Error('x'), '/lucarne_family_frontend/ha-lucarne.js'), true);
  });

  it('matches by marker in the stack', () => {
    const err = new Error('x');
    err.stack = 'Error: x\n    at f (http://host/ha-lucarne.js:9:9)';
    assert.equal(isLucarneError(err), true);
  });

  it('rejects unrelated errors', () => {
    const err = new Error('x');
    err.stack = 'Error: x\n    at f (http://host/core.js:9:9)';
    assert.equal(isLucarneError(err, 'http://host/other.js'), false);
  });
});

describe('reportLucarneError', () => {
  it('does not notify when debug is off', () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, false);
    reportLucarneError(new Error('boom'), 'ctx');
    assert.equal(notifications(hass).length, 0);
  });

  it('raises a persistent_notification when debug is on', () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    reportLucarneError(new Error('boom'), 'lucarne-today-card');
    const notes = notifications(hass);
    assert.equal(notes.length, 1);
    assert.match(notes[0].payload.notification_id, /^lucarne_error_/);
    assert.match(notes[0].payload.title, /lucarne-today-card/);
    assert.match(notes[0].payload.message, /boom/);
  });

  it('throttles repeats of the same error to one notification', () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    const err = new Error('same');
    reportLucarneError(err, 'ctx');
    reportLucarneError(err, 'ctx');
    reportLucarneError(err, 'ctx');
    assert.equal(notifications(hass).length, 1);
  });

  it('notifies separately for distinct errors', () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    reportLucarneError(new Error('one'), 'ctx');
    reportLucarneError(new Error('two'), 'ctx');
    assert.equal(notifications(hass).length, 2);
  });

  it('never throws, even when callService throws', () => {
    const hass = {
      ...makeFakeHass(),
      callService: () => {
        throw new Error('service down');
      },
    };
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    assert.doesNotThrow(() => reportLucarneError(new Error('boom'), 'ctx'));
  });

  it('does nothing harmful when no hass is configured', () => {
    assert.doesNotThrow(() => reportLucarneError(new Error('boom'), 'ctx'));
  });
});

describe('installGlobalErrorReporter', () => {
  // ErrorEvent isn't overridden to a happy-dom instance in the test setup, so
  // construct a happy-dom Event and attach the `error` field the handler reads.
  function dispatchLucarneError(message: string): void {
    const err = new Error(message);
    err.stack = `Error: ${message}\n    at f (http://host/ha-lucarne.js:1:1)`;
    const ev = new Event('error');
    (ev as Event & { error?: unknown }).error = err;
    window.dispatchEvent(ev);
  }

  it('reports a Lucarne-origin window error once', () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    installGlobalErrorReporter();
    dispatchLucarneError('global boom');
    assert.equal(notifications(hass).length, 1);
  });

  it('does not duplicate listeners across reset + reinstall', () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    installGlobalErrorReporter();
    // A reset that left the old listener attached would make the next install
    // double up, so the event below would notify twice for one error.
    __resetErrorReporterForTests();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    installGlobalErrorReporter();

    dispatchLucarneError('global boom');
    assert.equal(notifications(hass).length, 1);
  });
});

describe('reportLucarneError — reports raised before hass exists', () => {
  it('buffers a report made with no hass and delivers it once hass arrives', () => {
    // The real sequence on a wall tablet: HA calls setConfig (debug is visible,
    // hass is not), the card throws, and hass is only assigned afterwards.
    configureErrorReporter(undefined, true);
    reportLucarneError(new Error('early boom'), 'card.setConfig');

    const hass = makeFakeHass();
    assert.equal(notifications(hass).length, 0, 'nothing can have been sent yet');

    configureErrorReporter(hass as unknown as HomeAssistant, undefined);

    const notes = notifications(hass);
    assert.equal(notes.length, 1);
    assert.match(notes[0].payload.title, /card\.setConfig/);
    assert.match(notes[0].payload.message, /early boom/);
  });

  it('delivers a report buffered before debug was even known', () => {
    // The first card's first setConfig is what reveals `debug: true`, so a failure
    // at or before that point has neither hass nor the debug flag available.
    reportLucarneError(new Error('load boom'), 'card.setConfig');
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    assert.equal(notifications(hass).length, 1);
  });

  it('keeps the backlog bounded, dropping the oldest', () => {
    for (let i = 0; i < 8; i++) {
      // Distinct messages so the per-signature throttle can't be what limits this.
      reportLucarneError(new Error(`boom ${i}`), 'ctx');
    }
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);

    const notes = notifications(hass);
    assert.equal(notes.length, 5, 'MAX_PENDING_REPORTS');
    assert.match(notes[0].payload.message, /boom 3/, 'oldest three dropped');
    assert.match(notes[4].payload.message, /boom 7/, 'newest kept');
  });

  it('does not notify when debug was never enabled', () => {
    reportLucarneError(new Error('quiet boom'), 'ctx');
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, undefined);
    assert.equal(notifications(hass).length, 0);
  });

  it('stops buffering once hass is known — later reports go straight out', () => {
    // Asserting "the queue drained exactly once" via a repeat of the same error
    // would be vacuous: the per-signature RENOTIFY_MS throttle suppresses that on
    // its own. Use a fresh signature after the flush instead, which only arrives
    // if the post-flush path bypasses the (now empty) buffer.
    reportLucarneError(new Error('buffered boom'), 'ctx');
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    assert.equal(notifications(hass).length, 1);

    reportLucarneError(new Error('later boom'), 'ctx');
    const notes = notifications(hass);
    assert.equal(notes.length, 2, 'delivered without waiting for another configure call');
    assert.match(notes[1].payload.message, /later boom/);
  });
});

describe('reportLucarneError — throttle history stays bounded', () => {
  // errorSignature() includes the first stack frame, so two `new Error(msg)` built
  // on different lines are *different* signatures. Cases below re-report the same
  // Error instance when they mean "the same error again".
  function flood(count: number, offset = 0): void {
    for (let i = 0; i < count; i++) {
      reportLucarneError(new Error(`boom ${offset + i}`), 'ctx');
    }
  }

  it('caps distinct notifications per window instead of un-throttling', () => {
    // The wall tablet runs for weeks, and an error whose message carries an entity
    // id or an index mints a new signature every occurrence. Bounding the map by
    // evicting *live* entries would be worse than the leak: each eviction
    // un-throttles that signature, so a render-loop failure becomes an endless
    // stream of persistent_notification.create calls over the websocket.
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    flood(200);
    assert.equal(notifications(hass).length, 50, 'capped, not 200');
  });

  it('keeps an already-tracked signature throttled while the cap is saturated', () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    const first = new Error('the first boom');
    reportLucarneError(first, 'ctx');
    flood(200);
    const before = notifications(hass).length;

    reportLucarneError(first, 'ctx');
    assert.equal(notifications(hass).length, before, 'no repeat inside the window');
  });

  it('frees slots again once the renotify window passes', () => {
    // Proves the cap is a temporary storm brake, not a permanent mute.
    const realPerformance = globalThis.performance;
    let fakeNow = 1_000;
    (globalThis as { performance?: unknown }).performance = { now: () => fakeNow };
    try {
      const hass = makeFakeHass();
      configureErrorReporter(hass as unknown as HomeAssistant, true);
      flood(200);
      assert.equal(notifications(hass).length, 50, 'saturated');

      fakeNow += 61_000; // past RENOTIFY_MS, so every tracked entry is now stale
      reportLucarneError(new Error('after the window'), 'ctx');
      assert.equal(notifications(hass).length, 51, 'expired entries make room again');
    } finally {
      globalThis.performance = realPerformance as typeof performance;
    }
  });
});
