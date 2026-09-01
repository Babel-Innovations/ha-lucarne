import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * `custom-card-helpers@2.0.0` is the newest published release and it still
 * pulls the deprecated `@formatjs/intl-utils`, so `npm install` warned on every
 * checkout (#130). We only ever used `fireEvent` and the `HomeAssistant` type;
 * both now live in `src/shared/`. Re-adding the import would quietly reinstate
 * the warning and the unmaintained runtime dependency, so guard both halves —
 * the manifest and the import sites.
 */
const RETIRED = 'custom-card-helpers';

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Every npm manifest field that can pull a package back into the tree. */
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

describe('dependency hygiene', () => {
  it('does not declare custom-card-helpers in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as Record<
      string,
      Record<string, string> | undefined
    >;
    // Asserting on the list, not field by field, so a failure names where the
    // dependency came back.
    const declaredIn = DEPENDENCY_FIELDS.filter((field) => pkg[field]?.[RETIRED] !== undefined);
    assert.deepEqual(declaredIn, []);
  });

  it('has no source file importing custom-card-helpers', () => {
    // Quote-agnostic, and matching a dynamic `import(...)` too. Requiring the
    // quotes is what keeps the prose mentions in `fire-event.ts` / `types.ts`,
    // which are backticked, from reading as offenders.
    const imported = new RegExp(`['"]${RETIRED}['"]`);
    const offenders = tsFiles(join(ROOT, 'src'))
      .filter((file) => imported.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(ROOT.length));
    assert.deepEqual(offenders, []);
  });
});
