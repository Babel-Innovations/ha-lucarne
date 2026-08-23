import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

/**
 * Guards the *shipped artifacts*, not `src/`.
 *
 * HACS ships repo files for an integration and never runs a build, so
 * `frontend/ha-lucarne.js` and `frontend/ha-lucarne-loader.js` as committed are
 * exactly the bytes every user's browser parses. If the build emits syntax newer
 * than our supported floor, the module fails at PARSE time: nothing executes, no
 * custom element registers, and Home Assistant silently substitutes its generic
 * red `hui-error-card`. No in-bundle try/catch or `debug: true` reporter can
 * catch that — the code never runs.
 *
 * That is exactly what issue #101 was thought to be: a Vite 5 -> 8 bump changed
 * the default build target to `baseline-widely-available` (safari16.4 /
 * chrome111), which emits class static initialization blocks (`static { ... }`,
 * ES2022). Those fail to parse on the iPadOS 15 wall tablet (WebKit 15.6), which
 * is what sets this floor. It was NOT #101's cause — the Frame TV measured as
 * Chrome 108 and parses ES2022 fine; the `chrome85` half of the target is a
 * deliberately conservative floor, not a deployed engine. See
 * the file header in src/loader/boot.ts.
 *
 * `build.target` in vite.config.ts and vite.loader.config.ts pins the floor;
 * these tests prove the pin held.
 *
 * The loader is held to the same floor deliberately. It exists to report a
 * bundle that failed to load, so a loader that needs a newer engine than the
 * bundle it reports on would be worthless precisely when it is needed.
 */

/** Must match the ES level implied by `build.target` in both vite configs. */
const SUPPORTED_ECMA_VERSION = 2020;

const ARTIFACTS = [
  { name: 'ha-lucarne.js', file: 'ha-lucarne.js' },
  { name: 'ha-lucarne-loader.js', file: 'ha-lucarne-loader.js' },
] as const;

const cachedSource = new Map<string, string>();

/**
 * Read an artifact lazily and turn a missing file into a readable assertion.
 * Reading at describe-evaluation time would throw an uncaught ENOENT that aborts
 * the whole run before any test reports. CI runs this file *before*
 * `npm run build`, so it reads the committed artifact: if a change ever deletes,
 * relocates, gitignores or simply fails to commit it, the guard has to say so
 * plainly rather than take the suite down with it.
 */
function artifactSource(file: string): string {
  const cached = cachedSource.get(file);
  if (cached !== undefined) return cached;
  const path = fileURLToPath(
    new URL(`../../custom_components/lucarne_family/frontend/${file}`, import.meta.url),
  );
  let source: string;
  try {
    source = readFileSync(path, 'utf8');
  } catch (err) {
    return assert.fail(
      `Cannot read the committed artifact at ${path}: ${(err as Error).message}\n` +
        'HACS ships this file straight from the repo, so it must exist and be committed.\n' +
        'Run `npm run build`.',
    );
  }
  cachedSource.set(file, source);
  return source;
}

/**
 * Second floor, orthogonal to the ES-version one.
 *
 * `build.target` lowers *syntax level* and acorn's `ecmaVersion` proves it did.
 * Neither says anything about a regex literal's *contents*, and a regex literal
 * is an early error: an engine that does not recognise a construct inside it
 * rejects the enclosing script at PARSE time. Identical blast radius to a class
 * static block — the whole module dies, nothing registers, Home Assistant shows
 * its generic red panel — but invisible to the version check.
 *
 * Three constructs carry that risk on the devices this project ships to:
 *
 *   \p{...} / \P{...}   Unicode property escapes. The *syntax* is ES2018, so
 *                       acorn at ES2020 accepts it — but acorn validates the
 *                       property NAMES against the latest spec table, while a
 *                       real engine validates them against whatever ICU it was
 *                       built with. `\p{Extended_Pictographic}` is fine in a
 *                       2026 acorn and may not be in Safari 15.6 / Tizen 6.5.
 *   (?<=...) (?<!...)   Lookbehind. Safari only from 16.4.
 *   /v flag             Unicode sets. Safari 17, Chrome 112.
 *
 * The fix in every case is the same: build it with `new RegExp(...)` inside a
 * try/catch and fall back. That turns a fatal parse error into a catchable
 * runtime one — see `src/components/member-avatar.ts`, which is why this guard
 * exists (issue #101).
 */
interface RegexLiteral {
  pattern: string;
  flags: string;
}

/**
 * Every regex *literal* in the source, via an iterative walk over the AST.
 *
 * Iterative rather than recursive on purpose: the bundle nests deeply enough
 * that a naive recursive walk risks a stack overflow, which would surface as an
 * unrelated crash rather than a guard failure. A tokenizer pass would be shorter
 * but has to re-derive regex-vs-division context by itself; the parser already
 * did that work correctly, so read its output instead.
 *
 * Only literals are collected. `new RegExp('\\p{...}', 'u')` is precisely the
 * remediation this guard pushes people toward, so it must not be flagged.
 */
function regexLiterals(
  source: string,
  ecmaVersion: acorn.ecmaVersion = SUPPORTED_ECMA_VERSION,
): RegexLiteral[] {
  const ast = acorn.parse(source, { ecmaVersion, sourceType: 'module' });
  const found: RegexLiteral[] = [];
  const stack: unknown[] = [ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.type === 'string' && record.regex) {
      found.push(record.regex as unknown as RegexLiteral);
    }
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (value !== null && typeof value === 'object') stack.push(value);
    }
  }
  return found;
}

/**
 * `\\` is an escaped backslash, not the start of an escape sequence, so
 * `/\\p{x}/` is a literal backslash followed by `p{x}` and carries no risk.
 * Drop escaped backslashes first, then a remaining `\p{` is the real thing.
 */
function hasEscape(pattern: string, ...needles: string[]): boolean {
  const stripped = pattern.replace(/\\\\/g, '');
  return needles.some((needle) => stripped.includes(needle));
}

describe('guard self-checks', () => {
  it(`rejects a class static block at ES${SUPPORTED_ECMA_VERSION}`, () => {
    // Everything below rests on acorn refusing the exact construct that #101
    // was first blamed on. Without this, the suite would stay green if acorn's
    // version gating regressed or if SUPPORTED_ECMA_VERSION were nudged to 2022
    // in a careless edit.
    const staticBlock = 'class A { static { this.x = 1; } }';

    // Positive control first: pin the snippet as genuinely valid ES2022. Without
    // it a typo would make the assertion below pass while proving nothing.
    assert.doesNotThrow(() => acorn.parse(staticBlock, { ecmaVersion: 2022, sourceType: 'module' }));

    // Matched, so an unrelated throw (bad options object, changed API) can't
    // stand in for the syntax rejection we actually care about.
    assert.throws(
      () => acorn.parse(staticBlock, { ecmaVersion: SUPPORTED_ECMA_VERSION, sourceType: 'module' }),
      /Unexpected token/,
    );
  });

  it('finds the risky regex constructs when they are present', () => {
    // Parsed at ES2024, not at the floor: the `v` flag is ES2024 syntax, so the
    // control cannot even be *written* at ES2020. That is the point — these
    // constructs pass a version check and still kill an older engine.
    const probe = regexLiterals(
      String.raw`var a = /\p{Extended_Pictographic}/u, b = /(?<=x)y/, c = /[\q{ab}]/v;`,
      2024,
    );
    // Asserted as a set, not by index: the walk is stack-ordered, not source-ordered.
    assert.equal(probe.length, 3, 'expected three regex literals in the probe source');
    assert.equal(probe.filter((re) => hasEscape(re.pattern, '\\p{')).length, 1);
    assert.equal(probe.filter((re) => hasEscape(re.pattern, '(?<=')).length, 1);
    assert.equal(probe.filter((re) => re.flags.includes('v')).length, 1);

    // Negative control: an escaped backslash must NOT read as a property escape.
    const benign = regexLiterals(String.raw`var d = /\\p{not-an-escape}/;`);
    assert.equal(hasEscape(benign[0]!.pattern, '\\p{'), false);
  });

  it('does not flag a pattern built with new RegExp', () => {
    // The documented remediation. If the walk ever picked these up, the only way
    // to satisfy the guard would be to delete the safety net it is enforcing.
    const remediated = regexLiterals(String.raw`var e = new RegExp('\\p{Emoji}', 'u');`);
    assert.deepEqual(remediated, []);
  });
});

for (const artifact of ARTIFACTS) {
  describe(`shipped artifact: ${artifact.name}`, () => {
    it('exists and is non-empty', () => {
      assert.ok(
        artifactSource(artifact.file).length > 0,
        `${artifact.name} is empty — run \`npm run build\``,
      );
    });

    it(`parses as ES${SUPPORTED_ECMA_VERSION} so old WebKit / Chromium can load it`, () => {
      // Read outside the try: a missing file must report as a missing file, not
      // get re-wrapped by the catch below into a misleading "is not valid ES2020".
      const source = artifactSource(artifact.file);
      try {
        acorn.parse(source, { ecmaVersion: SUPPORTED_ECMA_VERSION, sourceType: 'module' });
      } catch (err) {
        const { message } = err as Error;
        assert.fail(
          `custom_components/lucarne_family/frontend/${artifact.file} is not valid ` +
            `ES${SUPPORTED_ECMA_VERSION}: ${message}\n` +
            'The whole module will fail to parse on the iPadOS 15 tablet, and every card is\n' +
            "replaced by Home Assistant's generic Configuration error card (see issue #101).\n" +
            'The usual cause is a class static initialization block (`static { ... }`, ES2022),\n' +
            'which appears as soon as `build.target` stops being honoured.\n' +
            'Check that `build.target` is still set in the vite config, then re-run `npm run build`.',
        );
      }
    });

    it('ships no regex literal using a Unicode property escape', () => {
      const offenders = regexLiterals(artifactSource(artifact.file)).filter((re) =>
        hasEscape(re.pattern, '\\p{', '\\P{'),
      );
      assert.deepEqual(
        offenders,
        [],
        `A regex literal in ${artifact.name} uses \\p{...}. Property NAMES are validated\n` +
          "against the engine's own Unicode tables, not against the ES version, so an older\n" +
          'WebKit/Chromium can reject the literal at parse time and kill the whole module\n' +
          '(issue #101). Build it with `new RegExp(pattern, flags)` in a try/catch with a\n' +
          'codepoint-range fallback instead — see src/components/member-avatar.ts.\n' +
          `Offenders: ${JSON.stringify(offenders)}`,
      );
    });

    it('ships no regex literal using lookbehind or the v flag', () => {
      const offenders = regexLiterals(artifactSource(artifact.file)).filter(
        (re) => hasEscape(re.pattern, '(?<=', '(?<!') || re.flags.includes('v'),
      );
      assert.deepEqual(
        offenders,
        [],
        `A regex literal in ${artifact.name} uses lookbehind (Safari 16.4+) or the v flag\n` +
          "(Safari 17+). Both are parse-time errors on this project's browser floor.\n" +
          `Offenders: ${JSON.stringify(offenders)}`,
      );
    });
  });
}

describe('ha-lucarne-loader.js is self-contained', () => {
  // It is the last line of defence for a bundle that will not load, so it must
  // not share any of the bundle's fate: no Lit, no shared modules, nothing that
  // could hit the same failure it exists to report.
  const source = () => artifactSource('ha-lucarne-loader.js');

  it('has exactly one dynamic import and no static ones', () => {
    const ast = acorn.parse(source(), {
      ecmaVersion: SUPPORTED_ECMA_VERSION,
      sourceType: 'module',
    });
    const statics = ast.body.filter((node) => node.type === 'ImportDeclaration');
    assert.deepEqual(statics, [], 'the loader must not statically import anything');
    assert.equal(
      source().split('import(').length - 1,
      1,
      'expected exactly one dynamic import — the bundle',
    );
  });

  it('resolves the bundle relative to its own URL', () => {
    // A hard-coded absolute path would break the moment the served prefix moves,
    // and would silently stop matching the URL Home Assistant imports.
    assert.ok(source().includes('import.meta.url'));
    assert.ok(source().includes('./ha-lucarne.js'));
  });
});
