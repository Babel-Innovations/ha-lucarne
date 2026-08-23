/**
 * Breadcrumbs for how far bundle evaluation got (issue #101).
 *
 * The bundle registers 31 elements and pushes to `window.customCards` three
 * separate times, spread right across the module graph — today card at roughly
 * a quarter of the way in, chores card at three quarters, the last editor at the
 * very end. An abort partway therefore leaves a *partially* initialised page,
 * and `window.customCards` being non-empty says nothing about whether our code
 * finished. Reading it as "the bundle ran" is what sent the first pass of this
 * investigation down a dead end.
 *
 * These marks make the same question answerable: the last one present is the
 * last point evaluation reached.
 *
 * Writes into the same `window.__lucarneBoot` object the loader publishes
 * (`src/loader/boot.ts`), creating it if the bundle was loaded without the
 * loader. Deliberately failure-proof — this runs at module scope, where there
 * is no error boundary and, at the earliest marks, no error reporter either.
 */
export interface BootMarkHost {
  marks?: string[];
}

export function markBoot(name: string): void {
  try {
    if (typeof window === 'undefined') return;
    const host = window as unknown as { __lucarneBoot?: BootMarkHost };
    const boot = (host.__lucarneBoot ??= {});
    (boot.marks ??= []).push(name);
  } catch {
    // A frozen or cross-origin window is not worth taking the bundle down for.
  }
}
