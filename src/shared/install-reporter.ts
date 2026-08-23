/**
 * Side-effect module that arms the global error reporter.
 *
 * Exists purely for import ORDER. `src/index.ts` used to call
 * `installGlobalErrorReporter()` as a statement near the top of the file, which
 * reads as "first thing that happens" and is the opposite: ESM hoists every
 * `import` declaration above the module body, so the call ran *last* — after all
 * 31 custom elements had registered and every `css` template had been built.
 * For the whole of bundle evaluation there was no `window.onerror` handler at
 * all, which is a large part of why issue #101 produced no diagnostics on the
 * devices that reproduce it.
 *
 * As a side-effect import placed first in `src/index.ts`, this runs before any
 * card module is evaluated — so the handlers are armed for everything that
 * happens *after* evaluation: render throws, async failures, child-component
 * lifecycle.
 *
 * It does NOT report a bundle that fails to load, and not only in the parse case.
 * The loader shim is the sole importer and awaits the dynamic `import()` inside a
 * `try`, so a parse error and an evaluation throw alike reject that promise and
 * fire neither `error` nor `unhandledrejection` — both are `src/loader/boot.ts`'s
 * to report. The two are complementary; keep both.
 */
import { installGlobalErrorReporter } from './error-reporter.js';
import { markBoot } from './boot-marks.js';

installGlobalErrorReporter();
markBoot('reporter-installed');
