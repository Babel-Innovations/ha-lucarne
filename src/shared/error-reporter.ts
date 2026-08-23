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
/**
 * Reports raised before Home Assistant is reachable would otherwise be dropped:
 * `hass` is assigned to a card well after HA has constructed and configured it,
 * so a throw inside `setConfig` has nowhere to go yet. Hold a bounded backlog and
 * deliver it once both `hass` and `debug: true` are known. Bounded because an
 * error loop must not grow this without limit, and because only the first few
 * reports of a startup failure are interesting.
 *
 * The handlers are armed before any card module evaluates: `src/index.ts`'s first
 * import is `./shared/install-reporter.js` (it used to be a call in the module
 * body, which ESM hoisting pushed to dead last — issue #101). Don't move it back.
 *
 * They still do not see a bundle that fails to LOAD, and not only in the parse
 * case. The loader shim is the bundle's sole importer and awaits that dynamic
 * `import()` inside a `try`, so a parse error *and* an evaluation throw both
 * reject that promise and fire neither `error` nor `unhandledrejection` — both are
 * reported by `src/loader/boot.ts` instead. What reaches here is everything after
 * evaluation: render throws, async failures, child-component lifecycle. See also
 * the note in card-base.ts.
 */
const MAX_PENDING_REPORTS = 5;
/**
 * Cap on distinct error signatures remembered for throttling, and so also on
 * distinct notifications raised per renotify window. An error whose message varies
 * per occurrence (an entity id, a timestamp, an index) mints a new signature every
 * time, and `notification_id` is derived from that signature — so on an always-on
 * kiosk both this map and the Home Assistant notification list would otherwise
 * grow without bound.
 */
const MAX_TRACKED_SIGNATURES = 50;

let latestHass: HomeAssistant | null = null;
let debugEnabled = false;
let globalHandlerInstalled = false;
const lastReportedAt = new Map<string, number>();
/** Reports captured before `hass`/`debug` were known. Oldest is dropped at the cap. */
let pendingReports: { error: unknown; context: string }[] = [];
// Kept so __resetErrorReporterForTests can unregister them; otherwise a
// install → reset → install cycle would leave duplicate listeners attached.
let onWindowError: ((ev: ErrorEvent) => void) | null = null;
let onUnhandledRejection: ((ev: PromiseRejectionEvent) => void) | null = null;

/**
 * Stash the latest `hass` and the debug flag so the global window handlers (which
 * have no element context) can still reach Home Assistant. Call this from each
 * card whenever its config or hass changes, and as early as `setConfig`. Once any
 * card opts into `debug`, it stays on for the page session.
 *
 * Also drains anything reported before Home Assistant became reachable.
 */
export function configureErrorReporter(
  hass: HomeAssistant | undefined,
  debug: boolean | undefined,
): void {
  if (hass) latestHass = hass;
  if (debug) debugEnabled = true;
  flushPendingReports();
}

/**
 * Deliver the backlog now that `hass` and `debug` are both known. Never throws:
 * this runs from `configureErrorReporter`, which the render boundary calls before
 * every render — a throw here would break the very boundary meant to contain it.
 */
function flushPendingReports(): void {
  if (!debugEnabled || !latestHass || pendingReports.length === 0) return;
  // Swap first: notify() is throttled per signature, and re-entry must not see
  // the same entries twice.
  const queued = pendingReports;
  pendingReports = [];
  for (const { error, context } of queued) notify(error, context);
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
  // performance object can't make the reporter itself throw. Fall back to
  // Date.now() (not a constant) — a constant clock would make `ts - last` always
  // 0, so the throttle would suppress every repeat after the first one forever.
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Report a Lucarne error. Always logs to the console; additionally raises a
 * Home Assistant `persistent_notification` when a card has enabled `debug: true`.
 * A fixed `notification_id` per signature means repeats overwrite rather than
 * pile up.
 *
 * If Home Assistant isn't reachable yet (an early `setConfig` failure), the report
 * is buffered and delivered by the next `configureErrorReporter` call that
 * supplies `hass`. Never throws.
 */
export function reportLucarneError(error: unknown, context: string): void {
  try {
    console.error(`[lucarne] card error in ${context}:`, error);

    if (!debugEnabled || !latestHass) {
      // Can't notify yet — queue it so an early failure still reaches the bell
      // once a card hands us `hass`. Drop the oldest rather than the newest: a
      // repeating failure keeps re-reporting, so recent entries are the live ones.
      //
      // Deliberately queues while `debug` is still off too, not just while `hass`
      // is missing: the first `setConfig` on the first card is what tells us
      // `debug: true`, so anything failing at or before that point would otherwise
      // be dropped. Opt-in is preserved — a queued entry is only ever *delivered*
      // if some card later declares `debug: true`; without that it is silently
      // discarded at the cap.
      pendingReports.push({ error, context });
      if (pendingReports.length > MAX_PENDING_REPORTS) pendingReports.shift();
      return;
    }

    notify(error, context);
  } catch {
    /* the reporter must never throw */
  }
}

/**
 * Raise the Home Assistant notification for one error. Callers must have already
 * confirmed `debugEnabled && latestHass`. Never throws.
 */
function notify(error: unknown, context: string): void {
  try {
    if (!latestHass) return;
    const signature = errorSignature(error);

    const ts = monotonicNow();
    const last = lastReportedAt.get(signature);
    if (last !== undefined && ts - last < RENOTIFY_MS) return;
    if (lastReportedAt.size >= MAX_TRACKED_SIGNATURES) {
      pruneReportHistory(ts);
      if (lastReportedAt.size >= MAX_TRACKED_SIGNATURES) {
        // Every tracked signature is still inside its renotify window: this is an
        // error storm, not steady state. Evicting one to make room would
        // un-throttle it, trading bounded memory for an unbounded stream of
        // persistent_notification.create calls over the websocket — worse than the
        // leak it was meant to fix. Stay quiet until a slot expires; console.error
        // above already recorded this one for a tethered Web Inspector.
        return;
      }
    }
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
 * Drop signatures that can no longer suppress anything — older than the renotify
 * window, so they would not have throttled a repeat anyway. Deliberately does
 * *not* evict live entries: that would silently disable the throttle for whichever
 * signature lost its slot. The caller treats "nothing left to prune" as a storm.
 */
function pruneReportHistory(now: number): void {
  for (const [sig, ts] of lastReportedAt) {
    if (now - ts >= RENOTIFY_MS) lastReportedAt.delete(sig);
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

  onWindowError = (ev: ErrorEvent) => {
    if (!isLucarneError(ev.error, ev.filename)) return;
    reportLucarneError(ev.error ?? new Error(ev.message), 'window.onerror');
  };
  onUnhandledRejection = (ev: PromiseRejectionEvent) => {
    if (!isLucarneError(ev.reason)) return;
    reportLucarneError(ev.reason, 'unhandledrejection');
  };
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
}

/** Test-only: reset module state between cases. */
export function __resetErrorReporterForTests(): void {
  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    if (onWindowError) window.removeEventListener('error', onWindowError);
    if (onUnhandledRejection) window.removeEventListener('unhandledrejection', onUnhandledRejection);
  }
  onWindowError = null;
  onUnhandledRejection = null;
  latestHass = null;
  debugEnabled = false;
  globalHandlerInstalled = false;
  lastReportedAt.clear();
  pendingReports = [];
}
