/**
 * Entry point for `ha-lucarne-loader.js` — the ONLY frontend module the
 * integration registers, and the only importer of the card bundle. See
 * `src/loader/boot.ts` for why it exists (issue #101).
 *
 * Everything testable lives in `boot.ts`; this file is only the wiring that
 * cannot be unit-tested, because `import.meta.url` and a real dynamic import
 * are properties of the running module. Keep it this thin.
 *
 * This is a separate Vite entry (`vite.loader.config.ts`), NOT a second entry in
 * the main config: multiple lib entries can emit a shared chunk, and both the
 * integration's static-path registration and the HACS packaging assume one file
 * per artifact. The card bundle stays a single self-contained ESM file.
 */
import { boot, bundleUrlFrom } from './loader/boot.js';

const bundleUrl = bundleUrlFrom(import.meta.url);

// @vite-ignore: the specifier carries the ?v=<version>.<digest> cache-buster and
// is only known at runtime, so the bundler must leave the import alone.
void boot({
  importBundle: () => import(/* @vite-ignore */ bundleUrl),
  win: window,
});
