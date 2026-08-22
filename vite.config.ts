import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      // Two copies of the same entry, because Home Assistant has two frontend
      // channels and loads exactly one of them per browser (see issue #101):
      //
      //   "es"   -> ha-lucarne.js         imported by the MODERN frontend via
      //                                   `import(url)` from extra_module_url.
      //   "iife" -> ha-lucarne-legacy.js  injected by the LEGACY frontend via
      //                                   `_ls(url)` -> a classic <script src>,
      //                                   from extra_js_es5.
      //
      // A classic script cannot contain `import`/`export`, so the ESM bundle is
      // unusable on the legacy channel — which is why the iPadOS 15 wall tablet
      // and the Tizen 6.5 TV loaded no Lucarne JS at all until this second
      // output existed. `formats` order is not significant; both are emitted by
      // one `npm run build`.
      formats: ["es", "iife"],
      // Only referenced by the iife output, but Vite requires it whenever iife
      // is in `formats`. Nothing reads window.LucarneFamily — the bundle works
      // through customElements.define and window.customCards side effects.
      name: "LucarneFamily",
      fileName: (format) =>
        format === "iife" ? "ha-lucarne-legacy.js" : "ha-lucarne.js",
    },
    rollupOptions: {
      external: [],
    },
    // Browser floor, pinned deliberately — do NOT drop this (see issue #101).
    //
    // Vite's default target is "baseline-widely-available"
    // (chrome111 / edge111 / firefox114 / safari16.4 / ios16.4), which emits class
    // static initialization blocks (`static { ... }`). Those are ES2022 syntax:
    // Safari/iOS below 16.4 and Chromium below 94 cannot PARSE them, so the entire
    // module dies before a single line runs — no card registers, and Home Assistant
    // shows its generic red "Configuration error" panel with nothing to click into.
    // This project is deployed to an iPadOS 15 wall tablet and a Tizen 6.5 TV
    // (Chromium 85), so the floor has to stay below that.
    //
    // es2020 is a deliberate floor, not a tool limit: Safari 15 and Chromium 85 both
    // implement ES2020 in full, so lowering further only grows the bundle without
    // reaching any device we ship to. Vite 8 (Rolldown) does build lower targets if
    // an older display ever turns up — es2019 builds fine, ~5 kB larger.
    // tests/build/bundle-syntax.test.ts enforces the result.
    target: ["es2020", "safari15", "ios15", "chrome85"],
    // The integration bundles and auto-registers both files; HACS ships them as
    // part of the integration package (HACS does not run a build). async_setup
    // serves only the two .js files, so sourcemaps are disabled (the .map
    // wouldn't be served and would be dead weight in the shipped integration).
    outDir: "custom_components/lucarne_family/frontend",
    sourcemap: false,
  },
});
