import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

/**
 * Sibling to bundle-syntax.test.ts, and deliberately a step further.
 *
 * That file proves `ha-lucarne-legacy.js` *parses* as a classic script. This one
 * proves it also *works* as one: evaluated the way Home Assistant's legacy
 * frontend evaluates it — `_ls(url)` -> `<script src>`, no module scope, no
 * import machinery — every card and editor ends up in the custom element
 * registry and every card ends up in `window.customCards`.
 *
 * Worth its own test because the legacy artifact is the half of the bundle that
 * no developer machine ever loads: every browser we develop in gets the ES
 * module. A regression here is invisible until it reaches an iPadOS 15 tablet or
 * a Tizen TV, where it presents as HA's generic Configuration error card with no
 * way to see why (issue #101).
 */

const BUNDLE = fileURLToPath(
  new URL('../../custom_components/lucarne_family/frontend/ha-lucarne-legacy.js', import.meta.url),
);

/** Registered by the `@customElement` decorators; the cards are what a user adds. */
const CARDS = ['lucarne-today-card', 'lucarne-calendar-card', 'lucarne-chores-card'];
const EDITORS = CARDS.map((tag) => `${tag}-editor`);

/**
 * The tags the bundle advertised to Lovelace's card picker, sorted.
 *
 * `Array.from` rebuilds the list in this realm: happy-dom's window is a separate
 * realm, so its Array has a different prototype and `deepEqual` would reject an
 * otherwise identical list.
 */
function advertisedCards(window: Window): string[] {
  return Array.from(
    (window as unknown as { customCards?: { type: string }[] }).customCards ?? [],
    (card) => card.type,
  ).sort();
}

describe('legacy bundle loads as a classic script', () => {
  // One Window for the whole suite: evaluating a ~330 kB bundle per test would
  // dominate the runtime, and every assertion below reads the same end state.
  let window: Window;

  before(() => {
    window = new Window({ url: 'https://localhost/' });
    // `eval` on the Window, not a <script> element: it runs the source in the
    // window's own realm as a classic script — the same non-module evaluation the
    // legacy frontend performs — without depending on happy-dom's opt-in inline
    // script execution.
    window.eval(readFileSync(BUNDLE, 'utf8'));
  });

  after(async () => {
    await window.happyDOM.close();
  });

  for (const tag of [...CARDS, ...EDITORS]) {
    it(`registers <${tag}>`, () => {
      assert.ok(
        window.customElements.get(tag),
        `${tag} is not in the registry after evaluating the legacy bundle — ` +
          'on the legacy frontend Home Assistant would show its generic Configuration error card',
      );
    });
  }

  it('advertises the three cards in window.customCards', () => {
    // What populates Lovelace's "Add card" picker. Missing entries do not break
    // an existing dashboard, so nothing else in the suite would notice.
    assert.deepEqual(advertisedCards(window), [...CARDS].sort());
  });

  // Keep this last: it leaves the shared window double-loaded (a second set of
  // `error`/`unhandledrejection` listeners, and every module body re-evaluated), so
  // an `it()` declared after it would be asserting against a state no browser sees.
  // node:test runs subtests in declaration order, which is what makes that hold.
  it('survives being loaded twice', () => {
    // The end-to-end proof for src/shared/define-guard.ts, which the unit test in
    // tests/shared/ cannot give: it exercises the guard against a hand-rolled
    // registry, not the shipped bytes, so it stays green if the guard is dropped
    // from the bundle or stops being emitted before the first
    // `customElements.define`. A second load reaches that first define within a
    // few hundred bytes, so this fails loudly the moment the import in
    // src/index.ts moves below the card imports or a bundler reorders module
    // bodies. Without the guard the throw aborts the rest of the second copy —
    // silently, and looking exactly like the failure this whole change is about.
    assert.doesNotThrow(() => window.eval(readFileSync(BUNDLE, 'utf8')));

    for (const tag of CARDS) {
      assert.ok(window.customElements.get(tag), `${tag} lost from the registry after a second load`);
    }
    // Asserted after the double load, so it also covers registerCustomCard's
    // dedupe: a plain push would leave six entries in the Lovelace card picker.
    assert.deepEqual(advertisedCards(window), [...CARDS].sort());
  });
});
