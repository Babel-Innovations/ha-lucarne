/**
 * Makes a duplicate `customElements.define()` of a `lucarne-*` tag a no-op.
 *
 * Home Assistant loads Lucarne through one of two mutually exclusive frontend
 * channels — `extra_module_url` (modern browsers) or `extra_js_es5` (legacy) —
 * so under normal conditions exactly one of `ha-lucarne.js` /
 * `ha-lucarne-legacy.js` is evaluated and nothing is defined twice.
 *
 * Both can still end up on the page: a stale hand-added Lovelace resource
 * pointing at an older copy of the bundle is the common case. Without this
 * guard the second copy throws `NotSupportedError` on its first
 * `customElements.define`, which aborts the rest of that bundle mid-evaluation
 * — the same "no card registers, Home Assistant shows its generic Configuration
 * error panel" failure as issue #101, and just as invisible, since the throw
 * happens before any card can arm the error reporter.
 *
 * Scoped to the `lucarne-` prefix on purpose: swallowing redefinitions of Home
 * Assistant's own elements would hide real bugs in code we do not own.
 *
 * Imported for its side effect, and it must stay the FIRST import in
 * `src/index.ts`: ES module evaluation follows import order, so anything after
 * it is already protected, and anything before it would not be.
 */

const LUCARNE_TAG_PREFIX = 'lucarne-';

/**
 * Marker on the registry itself rather than a module-scoped boolean: the two
 * bundles are separate builds and do not share module state, so only something
 * on a shared global can stop the second one from wrapping the wrapper.
 */
const INSTALLED = '__lucarneDefineGuard';

type GuardedRegistry = CustomElementRegistry & { [INSTALLED]?: true };

export function installDefineGuard(
  registry: CustomElementRegistry | undefined = globalThis.customElements,
): void {
  // `customElements` is absent in a bare Node context (some unit tests import
  // modules without a DOM). Nothing to guard, and nothing to fail over.
  if (!registry) return;

  const guarded = registry as GuardedRegistry;
  if (guarded[INSTALLED]) return;

  const nativeDefine = registry.define.bind(registry);
  registry.define = function define(
    name: string,
    constructor: CustomElementConstructor,
    options?: ElementDefinitionOptions,
  ): void {
    if (name.startsWith(LUCARNE_TAG_PREFIX) && registry.get(name) !== undefined) return;
    nativeDefine(name, constructor, options);
  };
  Object.defineProperty(guarded, INSTALLED, { value: true, enumerable: false });
}

installDefineGuard();
