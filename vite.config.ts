import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "ha-lucarne.js",
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
    // This project is deployed to an iPadOS 15 wall tablet (WebKit 15.6, which
    // genuinely cannot parse them) and a Tizen 6.5 TV. The TV measured as Chrome
    // 108 and parses ES2022 fine, so `chrome85` is a deliberately conservative
    // floor rather than the deployed engine — the iPad is what sets this.
    //
    // es2020 is a deliberate floor, not a tool limit: Safari 15 and Chromium 85 both
    // implement ES2020 in full, so lowering further only grows the bundle without
    // reaching any device we ship to. Vite 8 (Rolldown) does build lower targets if
    // an older display ever turns up — es2019 builds fine, ~5 kB larger.
    // tests/build/bundle-syntax.test.ts enforces the result.
    target: ["es2020", "safari15", "ios15", "chrome85"],
    // The integration serves this file and HACS ships it as part of the integration
    // package (HACS does not run a build). It is imported by the loader shim, never
    // registered as a frontend module itself (#101). Sourcemaps are disabled: only
    // the two .js artifacts are served, so a .map would 404 and would be dead weight
    // in the shipped integration.
    outDir: "custom_components/lucarne_family/frontend",
    // outDir sits inside the project root, so Vite would default this to true and
    // wipe the directory on every build — taking the sibling artifact with it.
    // Both builds write here, so with the default each one deletes the other's
    // output: `npm run build` would survive by luck of ordering (the loader build
    // runs last and recreates its own file), but `npm run dev` runs the two
    // watchers concurrently and they would clobber each other on every rebuild,
    // leaving a committed artifact deleted — one `git commit -a` away from shipping
    // an integration whose async_setup registers a static path to a file that does
    // not exist. The directory holds nothing but these two generated artifacts, so
    // there is nothing to clean. Keep this false in both configs.
    emptyOutDir: false,
    sourcemap: false,
  },
});
