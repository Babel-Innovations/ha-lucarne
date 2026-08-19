import { describe, it, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { html } from 'lit';
import { LucarneCardBase, LucarneConfigError } from '../../src/shared/card-base.js';
import {
  configureErrorReporter,
  __resetErrorReporterForTests,
} from '../../src/shared/error-reporter.js';
import type { HomeAssistant } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

class ThrowingCard extends LucarneCardBase {
  protected applyConfig(): void {}
  protected renderContent(): unknown {
    // Marker in the message so the reporter's Lucarne-origin filter is irrelevant
    // here (reportLucarneError is called directly by the boundary).
    throw new Error('kaboom in ha-lucarne renderContent');
  }
}
customElements.define('test-throwing-card', ThrowingCard);

class OkCard extends LucarneCardBase {
  protected applyConfig(): void {}
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
  protected applyConfig(): void {}
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

/** Rejects its config the way the real cards do: a deliberate, readable failure. */
class InvalidConfigCard extends LucarneCardBase<{ debug?: boolean }> {
  protected applyConfig(): void {
    throw new LucarneConfigError('test-card: members must be an array');
  }
  protected renderContent(): unknown {
    return html`<div class="ok">hello</div>`;
  }
}
customElements.define('test-invalid-config-card', InvalidConfigCard);

/** Fails unexpectedly while reading config — a bug in the card, not the YAML. */
class BuggyConfigCard extends LucarneCardBase<{ debug?: boolean }> {
  hass: HomeAssistant | undefined;
  protected applyConfig(): void {
    throw new TypeError('cannot read properties of undefined in ha-lucarne');
  }
  protected renderContent(): unknown {
    return html`<div class="ok">hello</div>`;
  }
}
customElements.define('test-buggy-config-card', BuggyConfigCard);

describe('LucarneCardBase config boundary', () => {
  it('lets a deliberate validation error reach Home Assistant', () => {
    const el = document.createElement('test-invalid-config-card') as InvalidConfigCard;
    // HA's contract: setConfig throws and HA shows the message. Swallowing this
    // would hide a genuine YAML mistake from the user.
    assert.throws(() => el.setConfig({}), /members must be an array/);
  });

  it('contains an unexpected config failure instead of throwing at HA', async () => {
    const el = document.createElement('test-buggy-config-card') as BuggyConfigCard;
    assert.doesNotThrow(() => el.setConfig({}));

    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    assert.match(el.shadowRoot?.innerHTML ?? '', /could not read its configuration/);
    assert.match(el.shadowRoot?.innerHTML ?? '', /cannot read properties of undefined/);
  });

  it('reports a setConfig failure that happened before hass existed', async () => {
    const el = document.createElement('test-buggy-config-card') as BuggyConfigCard;
    // debug is only reachable from the config itself at this point — there is no
    // hass on the element yet, exactly as on a freshly loaded dashboard.
    el.setConfig({ debug: true });

    const hass = makeFakeHass();
    el.hass = hass as unknown as HomeAssistant;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const notes = hass.calls.callService.filter(
      (c: { domain: string; service: string }) =>
        c.domain === 'persistent_notification' && c.service === 'create',
    );
    assert.equal(notes.length, 1);
    assert.match(notes[0].payload.title, /test-buggy-config-card\.setConfig/);
  });

  it('clears a previous failure when a later setConfig succeeds', async () => {
    class RecoveringCard extends LucarneCardBase<{ ok?: boolean }> {
      protected applyConfig(config: { ok?: boolean }): void {
        if (!config.ok) throw new TypeError('boom in ha-lucarne');
      }
      protected renderContent(): unknown {
        return html`<div class="ok">hello</div>`;
      }
    }
    customElements.define('test-recovering-card', RecoveringCard);

    const el = document.createElement('test-recovering-card') as RecoveringCard;
    el.setConfig({});
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    assert.match(el.shadowRoot?.innerHTML ?? '', /could not read its configuration/);

    el.setConfig({ ok: true });
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    assert.ok(el.shadowRoot?.querySelector('.ok'));
  });
});
