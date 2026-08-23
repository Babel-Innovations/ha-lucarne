import { defineConfig } from "vite";

/**
 * Second build, for the loader shim only (issue #101).
 *
 * Deliberately a separate single-entry config rather than a second `lib.entry`
 * on vite.config.ts: with more than one entry, Rollup/Rolldown is free to hoist
 * anything shared into a third chunk file. `async_setup` registers one static
 * path per artifact and HACS ships repo files without running a build, so an
 * unexpected chunk would simply 404 at runtime. One entry per config makes that
 * structurally impossible.
 *
 * The output must be the LAST thing in the pipeline that can fail: it is what
 * catches a bundle that fails to parse. It imports nothing outside src/loader/,
 * and `build.target` is pinned identically to vite.config.ts — a loader that
 * needs a newer engine than the bundle it is reporting on would be useless.
 */
export default defineConfig({
  build: {
    lib: {
      entry: "src/loader.ts",
      formats: ["es"],
      fileName: () => "ha-lucarne-loader.js",
    },
    rollupOptions: {
      external: [],
    },
    // Keep in step with build.target in vite.config.ts.
    target: ["es2020", "safari15", "ios15", "chrome85"],
    outDir: "custom_components/lucarne_family/frontend",
    // The card bundle is built first and lives in the same directory.
    emptyOutDir: false,
    sourcemap: false,
  },
});
