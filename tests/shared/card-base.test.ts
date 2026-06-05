import { describe, it, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { html } from 'lit';
import { LucarneCardBase } from '../../src/shared/card-base.js';
import {
  configureErrorReporter,
  __resetErrorReporterForTests,
} from '../../src/shared/error-reporter.js';
import type { HomeAssistant } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

class ThrowingCard extends LucarneCardBase {
  protected renderContent(): unknown {
    // Marker in the message so the reporter's Lucarne-origin filter is irrelevant
    // here (reportLucarneError is called directly by the boundary).
    throw new Error('kaboom in ha-lucarne renderContent');
  }
}
customElements.define('test-throwing-card', ThrowingCard);

class OkCard extends LucarneCardBase {
  protected renderContent(): unknown {
    return html`<div class="ok">hello</div>`;
  }
}
customElements.define('test-ok-card', OkCard);

// Carries its own hass + debug config so the base render() arms the reporter
// itself — mirrors how the real cards store state, with no manual
// configureErrorReporter() priming.
class SelfArmingThrowingCard extends LucarneCardBase {
  hass: HomeAssistant | undefined;
  _config: { debug?: boolean } | undefined;
  protected renderContent(): unknown {
    throw new Error('kaboom in ha-lucarne renderContent');
  }
}
customElements.define('test-self-arming-card', SelfArmingThrowingCard);

const realError = console.error;
beforeEach(() => {
  console.error = () => {};
});
afterEach(() => {
  console.error = realError;
  __resetErrorReporterForTests();
  document.body.innerHTML = '';
});

describe('LucarneCardBase render boundary', () => {
  it('renders the subclass content when renderContent succeeds', async () => {
    const el = document.createElement('test-ok-card') as OkCard;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    assert.ok(el.shadowRoot?.querySelector('.ok'));
  });

  it('degrades to a fallback notice instead of propagating a throw', async () => {
    const el = document.createElement('test-throwing-card') as ThrowingCard;
    document.body.appendChild(el);
    // The throw is caught by the base render(); updateComplete must still resolve.
    await assert.doesNotReject(
      (el as unknown as { updateComplete: Promise<unknown> }).updateComplete,
    );
    assert.match(el.shadowRoot?.innerHTML ?? '', /hit an error/);
  });

  it('forwards the boundary error to Home Assistant when debug is on', async () => {
    const hass = makeFakeHass();
    configureErrorReporter(hass as unknown as HomeAssistant, true);
    const el = document.createElement('test-throwing-card') as ThrowingCard;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const notes = hass.calls.callService.filter(
      (c: { domain: string; service: string }) =>
        c.domain === 'persistent_notification' && c.service === 'create',
    );
    assert.equal(notes.length, 1);
    assert.match(notes[0].payload.title, /test-throwing-card/);
  });

  it('reports a first-render throw without prior priming (base arms the reporter)', async () => {
    const hass = makeFakeHass();
    const el = document.createElement('test-self-arming-card') as SelfArmingThrowingCard;
    el.hass = hass as unknown as HomeAssistant;
    el._config = { debug: true };
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const notes = hass.calls.callService.filter(
      (c: { domain: string; service: string }) =>
        c.domain === 'persistent_notification' && c.service === 'create',
    );
    assert.equal(notes.length, 1);
  });
});
