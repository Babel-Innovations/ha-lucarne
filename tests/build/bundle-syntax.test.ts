import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

/**
 * Guards the *shipped artifact*, not `src/`.
 *
 * HACS ships repo files for an integration and never runs a build, so
 * `frontend/ha-lucarne.js` as committed is exactly the bytes every user's browser
 * parses. If the build emits syntax newer than our supported floor, the module
 * fails at PARSE time: nothing executes, no custom element registers, and Home
 * Assistant silently substitutes its generic red `hui-error-card`. No in-bundle
 * try/catch or `debug: true` reporter can catch that — the code never runs.
 *
 * That is exactly what issue #101 was: a Vite 5 -> 8 bump changed the default
 * build target to `baseline-widely-available` (safari16.4 / chrome111), which
 * emits class static initialization blocks (`static { ... }`, ES2022). They fail
 * to parse on iPadOS 15 WebKit and on Tizen 6.5 (Chromium 85) — both real
 * devices this project is deployed to.
 *
 * `build.target` in vite.config.ts pins the floor; this test proves the pin held.
 */

/** Must match the ES level implied by `build.target` in vite.config.ts. */
const SUPPORTED_ECMA_VERSION = 2020;

const BUNDLE_PATH = fileURLToPath(
  new URL('../../custom_components/lucarne_family/frontend/ha-lucarne.js', import.meta.url),
);

let cachedSource: string | undefined;

/**
 * Read the bundle lazily and turn a missing file into a readable assertion.
 * Reading at describe-evaluation time would throw an uncaught ENOENT that aborts
 * the whole run before any test reports. CI runs this file *before*
 * `npm run build`, so it reads the committed artifact: if a change ever deletes,
 * relocates, gitignores or simply fails to commit it, the guard has to say so
 * plainly rather than take the suite down with it.
 */
function bundleSource(): string {
  if (cachedSource === undefined) {
    try {
      cachedSource = readFileSync(BUNDLE_PATH, 'utf8');
    } catch (err) {
      assert.fail(
        `Cannot read the committed bundle at ${BUNDLE_PATH}: ${(err as Error).message}\n` +
          'HACS ships this file straight from the repo, so it must exist and be committed.\n' +
          'Run `npm run build`.',
      );
    }
  }
  return cachedSource;
}

describe('shipped bundle syntax floor', () => {
  it('exists and is non-empty', () => {
    assert.ok(
      bundleSource().length > 0,
      `bundle at ${BUNDLE_PATH} is empty — run \`npm run build\``,
    );
  });

  it(`rejects a class static block at ES${SUPPORTED_ECMA_VERSION} (the guard actually guards)`, () => {
    // Everything here rests on acorn refusing the exact construct that broke #101.
    // Without this, the suite would stay green if acorn's version gating regressed
    // or if SUPPORTED_ECMA_VERSION were nudged to 2022 in a careless edit.
    const staticBlock = 'class A { static { this.x = 1; } }';

    // Positive control first: pin the snippet as genuinely valid ES2022. Without it
    // a typo would make the assertion below pass while proving nothing.
    assert.doesNotThrow(() => acorn.parse(staticBlock, { ecmaVersion: 2022, sourceType: 'module' }));

    // Matched, so an unrelated throw (bad options object, changed API) can't stand
    // in for the syntax rejection we actually care about.
    assert.throws(
      () =>
        acorn.parse(staticBlock, {
          ecmaVersion: SUPPORTED_ECMA_VERSION,
          sourceType: 'module',
        }),
      /Unexpected token/,
    );
  });

  it(`parses as ES${SUPPORTED_ECMA_VERSION} so old WebKit / Chromium can load it`, () => {
    // Read outside the try: a missing file must report as a missing file, not get
    // re-wrapped by the catch below into a misleading "is not valid ES2020".
    const source = bundleSource();
    try {
      acorn.parse(source, { ecmaVersion: SUPPORTED_ECMA_VERSION, sourceType: 'module' });
    } catch (err) {
      const { message } = err as Error;
      assert.fail(
        `custom_components/lucarne_family/frontend/ha-lucarne.js is not valid ES${SUPPORTED_ECMA_VERSION}: ${message}\n` +
          'The whole module will fail to parse on iPadOS 15 / Tizen 6.5, and every card is\n' +
          "replaced by Home Assistant's generic Configuration error card (see issue #101).\n" +
          'The usual cause is a class static initialization block (`static { ... }`, ES2022),\n' +
          'which appears as soon as `build.target` stops being honoured.\n' +
          'Check that `build.target` is still set in vite.config.ts, then re-run `npm run build`.',
      );
    }
  });
});
