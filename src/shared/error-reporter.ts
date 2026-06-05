import type { HomeAssistant } from './types.js';

/**
 * Lightweight crash reporter for the Lucarne cards.
 *
 * Why this exists: the cards run inside the Home Assistant Companion app's
 * WKWebView on a wall iPad with no developer tools attached. When a card throws,
 * Home Assistant replaces it with its red `hui-error-card` and the real stack
 * trace is only visible in a console nobody can reach. This module forwards
 * Lucarne errors into a Home Assistant `persistent_notification` so they can be
 * read remotely via the notifications bell — without tethering a Mac to the
 * iPad. (It does not write to the HA backend log, so `ha_get_logs` won't show
 * these; use the bell.)
 *
 * Reporting to HA is opt-in: it only fires when a card is configured with
 * `debug: true`, so end users are never notified in normal operation.
 * `console.error` always runs, so a tethered Web Inspector still sees everything.
 *
 * The reporter never throws — a reporter that throws would only compound the
 * failure it is trying to describe.
 */

/** Substring present in the bundle URL / stack frames of our own code. */
const BUNDLE_MARKER = 'ha-lucarne';
const NOTIFICATION_PREFIX = 'lucarne_error_';
/**
 * Don't renotify the same error more than once per this window. A render throw
 * can recur on every update cycle; without throttling that would be a
 * notification storm.
 */
const RENOTIFY_MS = 60_000;

let latestHass: HomeAssistant | null = null;
let debugEnabled = false;
let globalHandlerInstalled = false;
const lastReportedAt = new Map<string, number>();

/**
 * Stash the latest `hass` and the debug flag so the global window handlers (which
 * have no element context) can still reach Home Assistant. Call this from each
 * card whenever its config or hass changes. Once any card opts into `debug`, it
 * stays on for the page session.
 */
export function configureErrorReporter(
  hass: HomeAssistant | undefined,
  debug: boolean | undefined,
): void {
  if (hass) latestHass = hass;
  if (debug) debugEnabled = true;
}

/** Stable signature so repeats of the same throw collapse to one notification. */
export function errorSignature(error: unknown): string {
  if (error instanceof Error) {
    const firstFrame = (error.stack ?? '').split('\n')[1]?.trim() ?? '';
    return `${error.name}: ${error.message} @ ${firstFrame}`;
  }
  return String(error);
}

/**
 * True when an error looks like it originated in the Lucarne bundle. Used to
 * avoid forwarding unrelated Home Assistant / other-integration errors caught by
 * the global handlers. After minification, function names are mangled but the
 * source URL (`/lucarne_family_frontend/ha-lucarne.js`) survives in stack frames.
 */
export function isLucarneError(error: unknown, source?: string): boolean {
  if (source && source.includes(BUNDLE_MARKER)) return true;
  if (error instanceof Error && (error.stack ?? '').includes(BUNDLE_MARKER)) return true;
  return false;
}

function shortStack(error: unknown): string {
  if (error instanceof Error) {
    const stack = error.stack ?? `${error.name}: ${error.message}`;
    return stack.split('\n').slice(0, 6).join('\n');
  }
  return String(error);
}

/** djb2 → base36, for a compact stable notification_id per signature. */
function hashSignature(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function monotonicNow(): number {
  // performance.now() is monotonic and present in WKWebView; guard so a missing
  // performance object can't make the reporter itself throw.
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : 0;
}

/**
 * Report a Lucarne error. Always logs to the console; additionally raises a
 * Home Assistant `persistent_notification` when a card has enabled `debug: true`.
 * A fixed `notification_id` per signature means repeats overwrite rather than
 * pile up. Never throws.
 */
export function reportLucarneError(error: unknown, context: string): void {
  try {
    const signature = errorSignature(error);
    console.error(`[lucarne] card error in ${context}:`, error);

    if (!debugEnabled || !latestHass) return;

    const ts = monotonicNow();
    const last = lastReportedAt.get(signature);
    if (last !== undefined && ts - last < RENOTIFY_MS) return;
    lastReportedAt.set(signature, ts);

    // Fire-and-forget, but swallow a rejected service call: callService returns
    // a promise, and a rejection would escape this synchronous try/catch as an
    // unhandledrejection — violating the "reporter never throws" contract above.
    void latestHass
      .callService('persistent_notification', 'create', {
        notification_id: NOTIFICATION_PREFIX + hashSignature(signature),
        title: `Lucarne card error (${context})`,
        message: ['```', shortStack(error), '```'].join('\n'),
      })
      .catch(() => {});
  } catch {
    /* the reporter must never throw */
  }
}

/**
 * Install global `error` / `unhandledrejection` listeners once. These catch
 * throws that escape a card's own render boundary — notably exceptions raised
 * inside child components, which render in their own update cycle rather than
 * synchronously within the parent card's render(). Only Lucarne-originated
 * errors are forwarded.
 */
export function installGlobalErrorReporter(): void {
  if (globalHandlerInstalled) return;
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  globalHandlerInstalled = true;

  window.addEventListener('error', (ev: ErrorEvent) => {
    if (!isLucarneError(ev.error, ev.filename)) return;
    reportLucarneError(ev.error ?? new Error(ev.message), 'window.onerror');
  });

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    if (!isLucarneError(ev.reason)) return;
    reportLucarneError(ev.reason, 'unhandledrejection');
  });
}

/** Test-only: reset module state between cases. */
export function __resetErrorReporterForTests(): void {
  latestHass = null;
  debugEnabled = false;
  globalHandlerInstalled = false;
  lastReportedAt.clear();
}
