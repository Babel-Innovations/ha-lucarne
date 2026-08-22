import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

/**
 * Guards the *shipped artifacts*, not `src/`.
 *
 * HACS ships repo files for an integration and never runs a build, so what is
 * committed under `frontend/` is exactly the bytes every user's browser parses.
 * If the build emits syntax newer than our supported floor, the bundle fails at
 * PARSE time: nothing executes, no custom element registers, and Home Assistant
 * silently substitutes its generic red `hui-error-card`. No in-bundle try/catch
 * or `debug: true` reporter can catch that — the code never runs.
 *
 * That is exactly what issue #101 looked like, and it had two distinct causes,
 * so this file guards two distinct things:
 *
 * 1. A Vite 5 -> 8 bump changed the default build target to
 *    `baseline-widely-available` (safari16.4 / chrome111), which emits class
 *    static initialization blocks (`static { ... }`, ES2022). They fail to parse
 *    on iPadOS 15 WebKit and on Tizen 6.5 (Chromium 85) — both real devices this
 *    project is deployed to. `build.target` in vite.config.ts pins the floor;
 *    the ES2020 parse below proves the pin held.
 *
 * 2. Those same devices are outside the Home Assistant frontend's "modern"
 *    browserslist query, so Home Assistant serves them its legacy frontend,
 *    which loads extra frontend JS as a classic `<script src>` rather than
 *    `import(url)`. A classic script containing `import`/`export` is a syntax
 *    error, so the legacy bundle has to be a real script — that is what the
 *    `sourceType: 'script'` parse below proves, and why `formats` in
 *    vite.config.ts emits an `iife` output alongside the ES module.
 */

/** Must match the ES level implied by `build.target` in vite.config.ts. */
const SUPPORTED_ECMA_VERSION = 2020;

type ShippedBundle = {
  /** Path relative to the repo root, used verbatim in failure messages. */
  readonly file: string;
  /**
   * How a browser evaluates it, and therefore how acorn must parse it.
   * 'module' -> `import(url)` on the modern frontend.
   * 'script' -> `<script src>` on the legacy frontend, where top-level
   *             `import`/`export` is a syntax error.
   */
  readonly sourceType: 'module' | 'script';
  /** Which Home Assistant frontend channel delivers it, for failure messages. */
  readonly channel: string;
};

const BUNDLES: readonly ShippedBundle[] = [
  {
    file: 'custom_components/lucarne_family/frontend/ha-lucarne.js',
    sourceType: 'module',
    channel: 'extra_module_url (modern frontend)',
  },
  {
    file: 'custom_components/lucarne_family/frontend/ha-lucarne-legacy.js',
    sourceType: 'script',
    channel: 'extra_js_es5 (legacy frontend — iPadOS 15, Tizen 6.5)',
  },
];

const repoPath = (file: string) => fileURLToPath(new URL(`../../${file}`, import.meta.url));

const cachedSource = new Map<string, string>();

/**
 * Read a bundle lazily and turn a missing file into a readable assertion.
 * Reading at describe-evaluation time would throw an uncaught ENOENT that aborts
 * the whole run before any test reports. CI runs this file *before*
 * `npm run build`, so it reads the committed artifact: if a change ever deletes,
 * relocates, gitignores or simply fails to commit one, the guard has to say so
 * plainly rather than take the suite down with it.
 */
function bundleSource(file: string): string {
  const hit = cachedSource.get(file);
  if (hit !== undefined) return hit;
  let source = '';
  try {
    source = readFileSync(repoPath(file), 'utf8');
  } catch (err) {
    assert.fail(
      `Cannot read the committed bundle at ${file}: ${(err as Error).message}\n` +
        'HACS ships this file straight from the repo, so it must exist and be committed.\n' +
        'Run `npm run build`.',
    );
  }
  cachedSource.set(file, source);
  return source;
}

describe('shipped bundle syntax floor', () => {
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

  it('rejects an ES module parsed as a classic script (the legacy guard actually guards)', () => {
    // Same reasoning as above, for the second failure mode: prove that a
    // `sourceType: 'script'` parse is what makes `import`/`export` fatal, so the
    // legacy assertion below cannot quietly become a second module parse.
    const esModule = 'export const a = 1;';

    assert.doesNotThrow(() =>
      acorn.parse(esModule, { ecmaVersion: SUPPORTED_ECMA_VERSION, sourceType: 'module' }),
    );
    assert.throws(
      () => acorn.parse(esModule, { ecmaVersion: SUPPORTED_ECMA_VERSION, sourceType: 'script' }),
      /'import' and 'export' may appear only with 'sourceType: module'/,
    );
  });

  for (const { file, sourceType, channel } of BUNDLES) {
    describe(file, () => {
      it('exists and is non-empty', () => {
        assert.ok(bundleSource(file).length > 0, `${file} is empty — run \`npm run build\``);
      });

      it(`parses as ES${SUPPORTED_ECMA_VERSION} ${sourceType} so old WebKit / Chromium can load it`, () => {
        // Read outside the try: a missing file must report as a missing file, not get
        // re-wrapped by the catch below into a misleading "is not valid ES2020".
        const source = bundleSource(file);
        try {
          acorn.parse(source, { ecmaVersion: SUPPORTED_ECMA_VERSION, sourceType });
        } catch (err) {
          const { message } = err as Error;
          assert.fail(
            `${file} is not valid ES${SUPPORTED_ECMA_VERSION} in ${sourceType} form: ${message}\n` +
              `Home Assistant delivers this file via ${channel}.\n` +
              'The whole bundle will fail to parse on iPadOS 15 / Tizen 6.5, and every card is\n' +
              "replaced by Home Assistant's generic Configuration error card (see issue #101).\n" +
              (sourceType === 'script'
                ? 'A top-level `import`/`export` here means `formats` in vite.config.ts stopped\n' +
                  'emitting an `iife` output for this file — a classic <script src> cannot be an\n' +
                  'ES module, and the legacy frontend has no other way to load it.\n'
                : 'The usual cause is a class static initialization block (`static { ... }`, ES2022),\n' +
                  'which appears as soon as `build.target` stops being honoured.\n') +
              'Check vite.config.ts, then re-run `npm run build`.',
          );
        }
      });
    });
  }
});
