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
