import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDefineGuard } from '../../src/shared/define-guard.js';

/**
 * The guard exists so a second copy of the bundle on the same page degrades to
 * "the first copy wins" instead of throwing out of `customElements.define` and
 * aborting the rest of that bundle's evaluation — which looks exactly like issue
 * #101 from the outside (no card registers, Home Assistant shows its generic
 * Configuration error panel) and is just as invisible, because the throw lands
 * before any card can arm the error reporter.
 */

class Alpha extends HTMLElement {}
class Beta extends HTMLElement {}

/** Minimal stand-in for CustomElementRegistry that throws on redefinition, as browsers do. */
function fakeRegistry() {
  const defined = new Map<string, CustomElementConstructor>();
  const registry = {
    get: (name: string) => defined.get(name),
    define(name: string, ctor: CustomElementConstructor) {
      if (defined.has(name)) {
        throw new Error(`NotSupportedError: '${name}' has already been defined`);
      }
      defined.set(name, ctor);
    },
  };
  return registry as unknown as CustomElementRegistry;
}

describe('installDefineGuard', () => {
  let registry: CustomElementRegistry;

  beforeEach(() => {
    registry = fakeRegistry();
  });

  it('lets a first definition through untouched', () => {
    installDefineGuard(registry);
    registry.define('lucarne-today-card', Alpha);
    assert.equal(registry.get('lucarne-today-card'), Alpha);
  });

  it('swallows a duplicate lucarne-* definition and keeps the first constructor', () => {
    installDefineGuard(registry);
    registry.define('lucarne-today-card', Alpha);

    assert.doesNotThrow(() => registry.define('lucarne-today-card', Beta));
    assert.equal(
      registry.get('lucarne-today-card'),
      Alpha,
      'the already-loaded copy must stay in charge; re-pointing the tag mid-flight is worse than a no-op',
    );
  });

  it('still throws for a duplicate non-lucarne tag', () => {
    // Scoped on purpose: silently swallowing redefinitions of Home Assistant's
    // own elements would hide real bugs in code we do not own.
    installDefineGuard(registry);
    registry.define('ha-card', Alpha);
    assert.throws(() => registry.define('ha-card', Beta), /already been defined/);
  });

  it('is idempotent — a second install does not re-wrap define', () => {
    installDefineGuard(registry);
    const wrapped = registry.define;
    installDefineGuard(registry);
    assert.equal(registry.define, wrapped);

    // And the single wrapper still behaves.
    registry.define('lucarne-chores-card', Alpha);
    assert.doesNotThrow(() => registry.define('lucarne-chores-card', Beta));
  });

  it('marks the registry non-enumerably so the flag cannot leak into iteration', () => {
    installDefineGuard(registry);
    assert.deepEqual(Object.keys(registry as unknown as object).filter((k) => k.startsWith('__lucarne')), []);
  });

  it('is a no-op without a registry (bare Node, no DOM)', () => {
    assert.doesNotThrow(() => installDefineGuard(undefined));
  });
});
