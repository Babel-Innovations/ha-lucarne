import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { serviceErrorMessage } from '../../src/shared/service-errors.js';

const FALLBACK = 'Failed to save';

describe('serviceErrorMessage', () => {
  it('reads the message off a real Error', () => {
    assert.equal(serviceErrorMessage(new Error('Cropper not initialized'), FALLBACK), 'Cropper not initialized');
  });

  it('reads the message off the plain object HA actually rejects with', () => {
    // The shape `home-assistant-js-websocket` passes to `info.reject`.
    assert.equal(
      serviceErrorMessage(
        { code: 'unknown_error', message: "Task 'Brush teeth' was already removed from 'todo.anna' outside Lucarne" },
        FALLBACK,
      ),
      "Task 'Brush teeth' was already removed from 'todo.anna' outside Lucarne",
    );
  });

  it('returns a thrown string as-is', () => {
    assert.equal(serviceErrorMessage('plain string failure', FALLBACK), 'plain string failure');
  });

  it('falls back when the message is empty or whitespace', () => {
    // A blank error box tells the user nothing; the generic string at least names the action.
    assert.equal(serviceErrorMessage({ code: 'unknown_error', message: '' }, FALLBACK), FALLBACK);
    assert.equal(serviceErrorMessage({ code: 'unknown_error', message: '   ' }, FALLBACK), FALLBACK);
    assert.equal(serviceErrorMessage(new Error(''), FALLBACK), FALLBACK);
    assert.equal(serviceErrorMessage('   ', FALLBACK), FALLBACK);
  });

  it('falls back for a value carrying no message at all', () => {
    for (const err of [null, undefined, 42, true, { code: 'unknown_error' }, {}, []]) {
      assert.equal(serviceErrorMessage(err, FALLBACK), FALLBACK, JSON.stringify(err) ?? String(err));
    }
  });

  it('falls back when message is present but not a string', () => {
    // Never let a non-string reach the DOM as "[object Object]" (#128).
    for (const message of [{ nested: 'x' }, 42, null, ['a']]) {
      assert.equal(serviceErrorMessage({ code: 'unknown_error', message }, FALLBACK), FALLBACK);
    }
  });

  it('does not treat an inherited message as the error message', () => {
    // Guards against picking up Object.prototype pollution rather than a real payload.
    const err = Object.create({ message: 'from the prototype' });
    assert.equal(serviceErrorMessage(err, FALLBACK), FALLBACK);
  });
});
