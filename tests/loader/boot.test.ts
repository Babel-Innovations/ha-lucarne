import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_TAGS,
  HEAL_RETRY_MS,
  ISSUE_URL,
  boot,
  bundleUrlFrom,
  defineFallbackCards,
  describeError,
  healErrorCards,
  whenRegistryIsFinal,
} from '../../src/loader/boot.js';

/**
 * The loader is the only thing in the project that can observe a bundle which
 * fails to parse, so its two outcomes have to be exercised directly — on a
 * healthy engine neither ever runs, and an untested rescue path is not a rescue
 * path. See src/loader/boot.ts for the #101 background.
 */

/**
 * A registry that is not the global one. Test files get their own process, but
 * within a file the global registry is single-use per tag: `define` throws the
 * second time, so real-registry assertions could only ever be made once. A fake
 * also makes "the bundle already claimed this tag" directly expressible.
 */
function fakeRegistry(predefined: readonly string[] = []): CustomElementRegistry {
  const defined = new Map<string, unknown>(predefined.map((tag) => [tag, class {}]));
  return {
    get: (tag: string) => defined.get(tag),
    define: (tag: string, ctor: unknown) => {
      if (defined.has(tag)) throw new Error(`'${tag}' has already been defined`);
      defined.set(tag, ctor);
    },
  } as unknown as CustomElementRegistry;
}

function makeErrorCard(message: string): Element {
  const el = document.createElement('hui-error-card');
  (el as unknown as { _config: { error: string } })._config = { error: message };
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('bundleUrlFrom', () => {
  it('carries the ?v= cache-buster across from the loader URL', () => {
    assert.equal(
      bundleUrlFrom('/lucarne_family_frontend/ha-lucarne-loader.js?v=1.4.3.deadbeef'),
      './ha-lucarne.js?v=1.4.3.deadbeef',
    );
  });

  it('omits the query when the loader was requested without one', () => {
    assert.equal(bundleUrlFrom('/lucarne_family_frontend/ha-lucarne-loader.js'), './ha-lucarne.js');
  });
});

describe('describeError', () => {
  it('prefers the stack, which names the offending line on a parse failure', () => {
    const err = new SyntaxError('Invalid regular expression');
    err.stack = 'SyntaxError: Invalid regular expression\n    at ha-lucarne.js:1945';
    assert.equal(describeError(err), err.stack);
  });

  it('falls back to name + message when there is no stack', () => {
    const err = new SyntaxError('boom');
    err.stack = undefined;
    assert.equal(describeError(err), 'SyntaxError: boom');
  });

  it('stringifies a non-Error rejection', () => {
    assert.equal(describeError('plain string'), 'plain string');
  });
});

describe('defineFallbackCards', () => {
  it('claims all three card tags when none are registered', () => {
    const registry = fakeRegistry();
    assert.deepEqual(defineFallbackCards('boom', registry), [...CARD_TAGS]);
  });

  it('leaves a tag the bundle already registered alone', () => {
    // The bundle registers today -> calendar -> chores across the module graph,
    // so a partial abort leaves some real classes in place. Clobbering one would
    // downgrade a working card to an error box.
    const registry = fakeRegistry(['lucarne-today-card']);
    assert.deepEqual(defineFallbackCards('boom', registry), [
      'lucarne-calendar-card',
      'lucarne-chores-card',
    ]);
  });

  it('reports nothing claimed when define throws a race', () => {
    const registry = {
      get: () => undefined,
      define: () => {
        throw new Error('lost the race');
      },
    } as unknown as CustomElementRegistry;
    assert.deepEqual(defineFallbackCards('boom', registry), []);
  });

  it('renders the error text, the tag and the issue link', async () => {
    // Uses the real registry with a probe tag so the element is actually
    // upgraded and its shadow root built.
    const tag = 'lucarne-fallback-probe';
    const message = "SyntaxError: Invalid regular expression: invalid property name";
    assert.deepEqual(defineFallbackCards(message, customElements, [tag]), [tag]);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    const text = el.shadowRoot?.textContent ?? '';
    assert.ok(text.includes(message), 'renders the exception verbatim');
    assert.ok(text.includes(tag), 'names which card failed');
    assert.ok(text.includes(ISSUE_URL), 'tells the user where to report it');
  });

  it('does not interpret the error text as markup', async () => {
    // The string comes from an engine exception and may contain source
    // fragments; it is inserted with textContent, never innerHTML.
    const tag = 'lucarne-fallback-probe-xss';
    defineFallbackCards('<img src=x onerror=1>', customElements, [tag]);
    const el = document.createElement(tag);
    document.body.appendChild(el);
    assert.equal(el.shadowRoot?.querySelector('img'), null);
    assert.ok((el.shadowRoot?.textContent ?? '').includes('<img src=x onerror=1>'));
  });

  it('accepts setConfig without throwing and reports a card size', () => {
    const tag = 'lucarne-fallback-probe-config';
    defineFallbackCards('boom', customElements, [tag]);
    const el = document.createElement(tag) as HTMLElement & {
      setConfig: (c: unknown) => void;
      getCardSize: () => number;
    };
    // A throw here would put Home Assistant's generic error card straight back.
    assert.doesNotThrow(() => el.setConfig({ type: `custom:${tag}` }));
    assert.equal(typeof el.getCardSize(), 'number');
  });
});

describe('healErrorCards', () => {
  it('rebuilds an error card naming a tag that is now registered', () => {
    const registry = fakeRegistry([...CARD_TAGS]);
    const card = makeErrorCard("Custom element doesn't exist: lucarne-chores-card.");
    document.body.appendChild(card);

    let fired = 0;
    card.addEventListener('ll-rebuild', () => {
      fired += 1;
    });

    assert.equal(healErrorCards(document, registry), 1);
    assert.equal(fired, 1);
  });

  it('leaves a tag that is still unregistered alone', () => {
    // Rebuilding now would only recreate the same error card.
    const registry = fakeRegistry();
    document.body.appendChild(makeErrorCard("Custom element doesn't exist: lucarne-chores-card."));
    assert.equal(healErrorCards(document, registry), 0);
  });

  it('leaves a Lucarne CONFIG error card alone', () => {
    // The case tag-matching alone gets backwards. LucarneConfigError messages are
    // prefixed with the card tag and HA re-throws them so the user can read the
    // problem — that card is showing exactly what it should. Rebuilding it
    // re-throws and recreates the identical card, and `healed` would then count a
    // config typo as a #101 rescue, corrupting the one signal this module exists
    // to produce.
    const registry = fakeRegistry([...CARD_TAGS]);
    const card = makeErrorCard('lucarne-today-card: "calendars" must be a non-empty array');
    document.body.appendChild(card);

    let fired = 0;
    card.addEventListener('ll-rebuild', () => {
      fired += 1;
    });

    assert.equal(healErrorCards(document, registry), 0);
    assert.equal(fired, 0, 'a genuine config error must not be rebuilt');
  });

  it("ignores another integration's error card", () => {
    const registry = fakeRegistry([...CARD_TAGS]);
    document.body.appendChild(makeErrorCard("Custom element doesn't exist: some-other-card."));
    assert.equal(healErrorCards(document, registry), 0);
  });

  it('finds error cards nested inside shadow roots', () => {
    // Home Assistant renders them several shadow roots deep.
    const registry = fakeRegistry([...CARD_TAGS]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const inner = document.createElement('div');
    host.attachShadow({ mode: 'open' }).appendChild(inner);
    inner
      .attachShadow({ mode: 'open' })
      .appendChild(makeErrorCard("Custom element doesn't exist: lucarne-today-card."));

    assert.equal(healErrorCards(document, registry), 1);
  });

  it('reads the message off .config when _config is absent', () => {
    const registry = fakeRegistry([...CARD_TAGS]);
    const el = document.createElement('hui-error-card');
    (el as unknown as { config: { message: string } }).config = {
      message: "Custom element doesn't exist: lucarne-calendar-card.",
    };
    document.body.appendChild(el);
    assert.equal(healErrorCards(document, registry), 1);
  });

  it('returns 0 when the dashboard has no error cards', () => {
    assert.equal(healErrorCards(document, fakeRegistry([...CARD_TAGS])), 0);
  });
});

describe('boot', () => {
  /** A window stand-in whose timer is drained by hand, so the retry is testable. */
  /**
   * These cases are about healing, publishing and marks — not registry timing —
   * so the window is posed as one where HA's app entrypoint has already run:
   * `home-assistant` defined means the swap is behind us and whenRegistryIsFinal
   * resolves 'already-swapped' without a poll. The wait itself has its own
   * describe block below.
   */
  function fakeWindow(registry: CustomElementRegistry) {
    const timers: Array<() => void> = [];
    // Pose as post-swap by answering for HA's root tag, whatever the caller's
    // registry holds — otherwise every one of these cases would sit in the
    // registry wait forever instead of testing what it is named for.
    const posed = {
      get: (tag: string) => (tag === 'home-assistant' ? class {} : registry.get(tag)),
      define: (tag: string, ctor: unknown) => registry.define(tag, ctor),
    } as unknown as CustomElementRegistry;
    const win = {
      customElements: posed,
      document,
      setTimeout: (fn: () => void) => {
        timers.push(fn);
        return 0;
      },
    } as unknown as Window;
    return { win, runTimers: () => timers.splice(0).forEach((fn) => fn()) };
  }

  it('publishes a loaded state and heals on success', async () => {
    const registry = fakeRegistry([...CARD_TAGS]);
    const { win, runTimers } = fakeWindow(registry);
    document.body.appendChild(makeErrorCard("Custom element doesn't exist: lucarne-today-card."));

    const state = await boot({ importBundle: async () => undefined, win, now: () => 100 });

    assert.equal(state.stage, 'loaded');
    assert.equal(state.error, undefined);
    assert.equal(state.healed, 1);
    assert.equal((win as unknown as { __lucarneBoot: unknown }).__lucarneBoot, state);

    // The deferred passes cover a view still building at the 2 s reveal, and a
    // cold Frame TV boot where the error card appears well after that.
    runTimers();
    assert.equal(state.healed, 1 + HEAL_RETRY_MS.length);
  });

  it('publishes the failure and claims the card tags on a rejected import', async () => {
    const registry = fakeRegistry();
    const { win } = fakeWindow(registry);
    const err = new SyntaxError('Invalid regular expression');
    err.stack = 'SyntaxError: Invalid regular expression\n    at ha-lucarne.js:1945';

    const state = await boot({
      importBundle: () => Promise.reject(err),
      win,
      now: () => 100,
    });

    assert.equal(state.stage, 'failed');
    assert.equal(state.error, err.stack);
    assert.deepEqual(state.fallbacks, [...CARD_TAGS]);
  });

  it('rebuilds the error cards standing in for the tags it just claimed', async () => {
    // The point of the whole module. defineFallbackCards has claimed the tags, so
    // the error cards naming them can now be rebuilt into an element that renders
    // the exception. Leaving this to HA's whenDefined -> ll-rebuild alone would
    // stake it on the self-heal the success path exists because we distrust.
    const registry = fakeRegistry();
    const { win } = fakeWindow(registry);
    document.body.appendChild(makeErrorCard("Custom element doesn't exist: lucarne-chores-card."));

    let fired = 0;
    document.body.firstElementChild!.addEventListener('ll-rebuild', () => {
      fired += 1;
    });

    const state = await boot({ importBundle: () => Promise.reject(new Error('boom')), win });

    assert.deepEqual(state.fallbacks, [...CARD_TAGS]);
    assert.equal(fired, 1, 'the error card was asked to rebuild');
    assert.equal(state.healed, 1);
  });

  it('never rejects, because nothing upstream would catch it', async () => {
    const { win } = fakeWindow(fakeRegistry(['home-assistant']));
    await assert.doesNotReject(() =>
      boot({ importBundle: () => Promise.reject(new Error('boom')), win }),
    );
  });

  it('never rejects even when the window itself is hostile', async () => {
    // Guards the docstring's promise for the shapes that could actually break it:
    // a registry that throws on access, and no usable setTimeout. A rejection here
    // would be an unhandled rejection at module scope — the exact silence this
    // file exists to end — so it must survive a torn-down or restricted realm.
    const hostile = {
      get customElements(): CustomElementRegistry {
        throw new Error('detached realm');
      },
      get document(): Document {
        throw new Error('detached realm');
      },
      setTimeout: () => {
        throw new Error('no timers here');
      },
    } as unknown as Window;

    await assert.doesNotReject(async () => {
      const failed = await boot({ importBundle: () => Promise.reject(new Error('boom')), win: hostile });
      // The error still reaches the state even though nothing else could run.
      assert.equal(failed.stage, 'failed');
      assert.match(failed.error ?? '', /boom/);
    });

    await assert.doesNotReject(() =>
      boot({ importBundle: async () => undefined, win: hostile }),
    );
  });

  it('never rejects when publishing __lucarneBoot itself throws', async () => {
    // The remaining hole: the state is read from and written to
    // window.__lucarneBoot, and both can throw on a frozen window or against a
    // property with an accessor. markBoot already guards this exact shape; boot
    // must match it, because loader.ts discards the promise and a rejection here
    // is unhandled at module scope.
    const win = {
      get __lucarneBoot(): never {
        throw new Error('sealed');
      },
      set __lucarneBoot(_v: unknown) {
        throw new Error('sealed');
      },
      customElements: fakeRegistry(['home-assistant', ...CARD_TAGS]),
      document,
      setTimeout: () => 0,
    } as unknown as Window;

    await assert.doesNotReject(async () => {
      const state = await boot({ importBundle: async () => undefined, win });
      // Unpublishable, but still returned so the caller is not left with nothing.
      assert.equal(state.stage, 'loaded');
    });
  });

  it('publishes a non-final stage before the import settles', async () => {
    // The state object is published immediately and mutated in place, so a
    // console or the smoke page can see progress while the import is still in
    // flight. `waiting-for-registry` is a legitimate resting place — on a legacy
    // device the loader deliberately sits there until HA stops swapping the
    // registry, and a report stuck on it is diagnostic rather than a bug.
    const { win } = fakeWindow(fakeRegistry(['home-assistant', ...CARD_TAGS]));
    // The gate is created eagerly rather than inside importBundle: boot now
    // awaits the registry wait first, so importBundle is not called until a
    // later microtask and a release captured from inside it would still be the
    // no-op stub when this test fires it.
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const pending = boot({ importBundle: () => gate, win });

    const published = (win as unknown as { __lucarneBoot: { stage: string } }).__lucarneBoot;
    // Specifically 'importing': a hung registry wait and a hung import must be
    // distinguishable from a report, since they need different fixes.
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(published.stage, 'importing');
    release();
    await pending;
    assert.equal(published.stage, 'loaded');
  });
});

describe('boot preserves breadcrumbs', () => {
  it('keeps marks the bundle pushed before the loader ran', async () => {
    // The loader is the only importer in a correct install, but the bundle can
    // still be pulled in directly — by a test, or by a dashboard listing it as a
    // stale Lovelace resource — and would then mark before the loader ran.
    // Replacing the object instead of adopting its marks would throw away the
    // record of how far it got, which is the one thing the marks exist for.
    const registry = fakeRegistry(['home-assistant', ...CARD_TAGS]);
    const win = {
      customElements: registry,
      document,
      setTimeout: () => 0,
      __lucarneBoot: { marks: ['evaluating:lucarne-today-card'] },
    } as unknown as Window;

    const pending = boot({ importBundle: async () => undefined, win });
    const published = (win as unknown as { __lucarneBoot: { marks: string[] } }).__lucarneBoot;
    assert.deepEqual(published.marks, ['evaluating:lucarne-today-card']);
    await pending;
  });

  it('starts with an empty mark list when nothing ran first', async () => {
    const win = {
      customElements: fakeRegistry(['home-assistant', ...CARD_TAGS]),
      document,
      setTimeout: () => 0,
    } as unknown as Window;
    const state = await boot({ importBundle: async () => undefined, win });
    assert.deepEqual(state.marks, []);
  });
});

/**
 * The #101 fix itself.
 *
 * Home Assistant's legacy (es5) app bundle runs
 * `Object.defineProperty(window, "customElements", {value: new CustomElementRegistry, ...})`,
 * discarding every element defined before it. Our bundle was imported from an
 * earlier script block, so all 31 registrations were being thrown away —
 * `define()` returning cleanly and every tag still absent. These cover the three
 * orderings that actually occur on a device.
 */
describe('whenRegistryIsFinal', () => {
  /**
   * A window whose customElements can be swapped the way HA swaps it.
   *
   * Timers record their delay, because `whenRegistryIsFinal` arms two kinds: the
   * ~50 ms poll chain and one up-front timeout deadline. A fake that fires
   * everything indiscriminately would trip the deadline on the first tick and make
   * every wait look like a timeout.
   */
  function fakeWin(opts: { latestJS?: boolean; haDefined?: boolean } = {}) {
    const timers: Array<{ fn: () => void; delay: number }> = [];
    const win = {
      latestJS: opts.latestJS,
      customElements: fakeRegistry(opts.haDefined ? ['home-assistant'] : []),
      setTimeout: (fn: () => void, delay = 0) => {
        timers.push({ fn, delay });
        return 0;
      },
    } as unknown as Window;
    const drain = (max: number) => {
      const due = timers.filter((t) => t.delay <= max);
      due.forEach((t) => {
        timers.splice(timers.indexOf(t), 1);
        t.fn();
      });
    };
    return {
      win,
      /** Drain one poll tick, leaving the long timeout deadline armed. */
      tick: () => drain(1000),
      /** Fire everything, including the deadline. */
      fireAll: () => drain(Number.MAX_SAFE_INTEGER),
      swap: (haDefined = true) => {
        (win as unknown as { customElements: CustomElementRegistry }).customElements = fakeRegistry(
          haDefined ? ['home-assistant'] : [],
        );
      },
    };
  }

  it('has no shortcut for the modern build', async () => {
    // The polyfill that swaps the registry ships in frontend_latest/app.js too
    // (verified against a live instance), so modern is immune only by an ordering
    // accident. A `latestJS` fast path would import into a registry HA can still
    // replace — #101 on the majority platform. With the root element absent it
    // must WAIT, not resolve.
    const { win, tick, swap } = fakeWin({ latestJS: true });
    let settled: string | undefined;
    const pending = whenRegistryIsFinal(win, { now: () => 0 }).then((r) => (settled = r));
    tick();
    await Promise.resolve();
    assert.equal(settled, undefined, 'latestJS must not short-circuit the wait');
    swap();
    tick();
    assert.equal(await pending, 'swapped');
  });

  it('registers immediately when the swap already happened', async () => {
    // The loader can evaluate after app.js — HA's root element being defined
    // proves app.js ran past the swap.
    const { win } = fakeWin({ haDefined: true });
    assert.equal(await whenRegistryIsFinal(win), 'already-swapped');
  });

  it('waits for the registry to be replaced, then resolves', async () => {
    const { win, tick, swap } = fakeWin();
    let settled: string | undefined;
    const pending = whenRegistryIsFinal(win, { now: () => 0 }).then((r) => (settled = r));

    tick();
    await Promise.resolve();
    assert.equal(settled, undefined, 'must not resolve while the old registry is live');

    swap();
    tick();
    assert.equal(await pending, 'swapped');
  });

  it('gives up after the timeout rather than never registering', async () => {
    // A lost race still beats no cards at all, and the reason is published so a
    // timeout is visibly different from a clean win.
    const { win, fireAll } = fakeWin();
    let clock = 0;
    const pending = whenRegistryIsFinal(win, { now: () => clock, timeoutMs: 1000 });
    clock = 1001;
    fireAll();
    assert.equal(await pending, 'timeout');
  });

  it('resolves rather than hanging when property access itself throws', async () => {
    // The `try` in whenRegistryIsFinal exists for a window whose property ACCESS
    // throws — a detached or cross-origin realm. Make that accessor the thing that
    // trips it: an earlier version of this test threw from a `latestJS` getter,
    // which the function stopped reading when the modern shortcut was removed, so
    // it was passing only because `setTimeout` happened to be undefined.
    let touched = false;
    const hostile = {
      get customElements(): never {
        touched = true;
        throw new Error('detached realm');
      },
      setTimeout: () => 0,
    } as unknown as Window;

    assert.equal(await whenRegistryIsFinal(hostile), 'error');
    assert.equal(touched, true, 'the throwing accessor must be what triggers it');
  });
});

describe('boot waits for the registry before importing', () => {
  it('does not import until the registry is final', async () => {
    // Module evaluation is what registers, so import timing IS registration
    // timing. Importing early is precisely the #101 bug.
    // Delay-aware, so the up-front timeout deadline is not fired by a poll tick.
    const timers: Array<{ fn: () => void; delay: number }> = [];
    const poll = () => {
      timers
        .filter((t) => t.delay <= 1000)
        .forEach((t) => {
          timers.splice(timers.indexOf(t), 1);
          t.fn();
        });
    };
    const win = {
      customElements: fakeRegistry(),
      document,
      setTimeout: (fn: () => void, delay = 0) => {
        timers.push({ fn, delay });
        return 0;
      },
    } as unknown as Window;

    let imported = false;
    const pending = boot({
      importBundle: async () => {
        imported = true;
      },
      win,
      now: () => 0,
    });

    poll();
    await Promise.resolve();
    assert.equal(imported, false, 'imported before the registry settled');

    (win as unknown as { customElements: CustomElementRegistry }).customElements = fakeRegistry([
      'home-assistant',
      ...CARD_TAGS,
    ]);
    poll();

    const state = await pending;
    assert.equal(imported, true);
    assert.equal(state.stage, 'loaded');
    assert.equal(state.registryWait, 'swapped');
  });

  it('imports straight away when the swap is already behind us', async () => {
    const win = {
      customElements: fakeRegistry(['home-assistant', ...CARD_TAGS]),
      document,
      setTimeout: () => 0,
    } as unknown as Window;

    const state = await boot({ importBundle: async () => undefined, win, now: () => 0 });
    assert.equal(state.stage, 'loaded');
    assert.equal(state.registryWait, 'already-swapped');
  });
});

describe('boot records which tags actually survived', () => {
  it('reports the registered tags alongside a loaded stage', async () => {
    // `stage: 'loaded'` only means the module evaluated. #101 was precisely
    // "evaluated cleanly, registered nothing", so the report has to carry both.
    const win = {
      customElements: fakeRegistry(['home-assistant', ...CARD_TAGS]),
      document,
      setTimeout: () => 0,
    } as unknown as Window;

    const state = await boot({ importBundle: async () => undefined, win, now: () => 0 });
    assert.equal(state.stage, 'loaded');
    assert.deepEqual(state.registered, [...CARD_TAGS]);
  });

  it('reports an empty list when evaluation succeeded but nothing registered', async () => {
    // The exact Frame TV signature: loaded, no error, zero tags. Without this
    // field a report of that state is indistinguishable from a healthy one.
    const win = {
      customElements: fakeRegistry(['home-assistant']),
      document,
      setTimeout: () => 0,
    } as unknown as Window;

    const state = await boot({ importBundle: async () => undefined, win, now: () => 0 });
    assert.equal(state.stage, 'loaded');
    assert.equal(state.error, undefined);
    assert.deepEqual(state.registered, [], 'a silent registration loss must be visible');
  });

  it('re-checks on every heal pass, so a later loss is visible', async () => {
    const timers: Array<() => void> = [];
    const registry = fakeRegistry(['home-assistant', ...CARD_TAGS]);
    const win = {
      customElements: registry,
      document,
      setTimeout: (fn: () => void) => {
        timers.push(fn);
        return 0;
      },
    } as unknown as Window;

    const state = await boot({ importBundle: async () => undefined, win, now: () => 0 });
    assert.deepEqual(state.registered, [...CARD_TAGS]);

    // Stand in for HA swapping the registry after we registered — the failure
    // this whole module exists to make observable.
    (win as unknown as { customElements: CustomElementRegistry }).customElements = fakeRegistry();
    timers.splice(0).forEach((fn) => fn());
    assert.deepEqual(state.registered, [], 'the loss must show up on a later pass');
  });
});

describe('describeError is total', () => {
  it('survives an error whose stack getter throws', () => {
    // boot() assigns describeError's result BEFORE registering the fallback
    // cards, so a throw here would both reject boot() — the unhandled rejection
    // this module exists to prevent — and skip the only mechanism that puts the
    // failure on screen.
    const hostile = Object.create(Error.prototype) as Error;
    Object.defineProperty(hostile, 'stack', {
      get() {
        throw new Error('stack getter exploded');
      },
    });
    Object.defineProperty(hostile, 'name', {
      get() {
        throw new Error('name getter exploded');
      },
    });
    assert.doesNotThrow(() => describeError(hostile));
    assert.match(describeError(hostile), /could not be described/);
  });

  it('survives a non-Error whose toString throws', () => {
    const hostile = {
      toString() {
        throw new Error('stringify failed');
      },
    };
    assert.doesNotThrow(() => describeError(hostile));
  });

  it('still reports the failure when the error cannot be described', async () => {
    const registry = fakeRegistry(['home-assistant']);
    const win = {
      customElements: registry,
      document,
      setTimeout: () => 0,
    } as unknown as Window;
    const hostile = {
      toString() {
        throw new Error('stringify failed');
      },
    };

    const state = await boot({ importBundle: () => Promise.reject(hostile), win });
    assert.equal(state.stage, 'failed');
    // The fallback cards are the point: they are what shows the user anything.
    assert.deepEqual(state.fallbacks, [...CARD_TAGS]);
  });
});
