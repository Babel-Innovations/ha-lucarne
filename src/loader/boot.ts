/**
 * Bootstrap logic for the loader shim (`src/loader.ts`).
 *
 * WHY THIS EXISTS — issue #101
 * ---------------------------
 * This module is the ONLY importer of the card bundle. `async_setup` registers
 * just `LOADER_URL` with the frontend; `FRONTEND_URL` is served but deliberately
 * not an `extra_module_url`. That is not an optimisation, it is the fix.
 *
 * ROOT CAUSE. Home Assistant's app entrypoint imports
 * `@webcomponents/scoped-custom-element-registry`, whose last statement is:
 *
 *     Object.defineProperty(window, "customElements",
 *       {value: new CustomElementRegistry, configurable: true, writable: true})
 *
 * It installs a brand-new registry and **discards everything defined before it**.
 * A directly-registered bundle evaluated first, registered all 31 elements into
 * the native registry, and lost every one of them: `define()` returned cleanly,
 * nothing threw, and each card became HA's `Custom element doesn't exist:
 * lucarne-…` panel.
 *
 * Note this is NOT es5-only — the polyfill is in `frontend_latest/app.js` too
 * (verified on a live instance). What differs is *ordering*, which is why the bug
 * looked device-specific: `index.html` carries `<link rel="modulepreload">` for
 * the latest core/app, so on a modern device they evaluate — and swap — before
 * our bundle, and our registrations land in the surviving registry. The es5 path
 * has no such preload and is loaded by `_ls(...)` from a script block *after*
 * ours, so there we registered first and were wiped. A race, hence intermittent.
 *
 * So `boot` waits for the swap on EVERY path (`whenRegistryIsFinal`) and only
 * then imports: module evaluation is what registers, which makes import timing
 * the only lever. Do not add a fast path for the modern build — its apparent
 * immunity is an ordering accident, not a guarantee.
 *
 * Being the sole importer buys the second half too. HA imports extra modules with
 * a bare, un-awaited, un-caught `import(...)`, so a bundle that fails to parse or
 * throws while evaluating is discarded in silence — and none of our own safety
 * nets can see it either: `LucarneCardBase`'s boundaries need an *instance*, and
 * `installGlobalErrorReporter()` needs a card module to have already evaluated.
 * A `.catch` here is the only thing that can observe it.
 *
 * Two things then happen:
 *
 *   failure → `defineFallbackCards` registers the three card tags with a
 *             dependency-free element that RENDERS THE ERROR TEXT. Home
 *             Assistant's `_customCreate` is already waiting on
 *             `customElements.whenDefined(tag)` and fires `ll-rebuild` when it
 *             resolves, so its generic red panel is replaced by ours and the
 *             reporter can screenshot the actual exception.
 *
 *   both    → `healErrorCards` re-fires `ll-rebuild` at any `hui-error-card`
 *             still standing in for one of our cards, covering a registration
 *             that landed after HA had already given up on the tag.
 *
 * Nothing here may import Lit, shared tokens, or anything else from `src/` —
 * this code has to keep working precisely when the main bundle does not.
 */

/** The three tags Home Assistant resolves from a dashboard config. */
export const CARD_TAGS = [
  'lucarne-today-card',
  'lucarne-calendar-card',
  'lucarne-chores-card',
] as const;

export const ISSUE_URL = 'https://github.com/Babel-Innovations/ha-lucarne/issues/101';

/**
 * Deferred heal passes, in ms after the bundle resolves.
 *
 * The first (immediate) pass usually runs against a nearly-empty document: the
 * loader is imported while index.html is still parsing, long before Home
 * Assistant has authenticated, fetched the dashboard config and built a view. So
 * the passes that can actually find anything are these. 3 s covers a desktop or
 * a warm cache; 10 s covers a Frame TV booting the legacy frontend from cold,
 * where the error card can appear well after the 2 s reveal in
 * create-element-base.ts.
 *
 * Bounded and tiny on purpose — it is a backstop for HA's own
 * `whenDefined` -> `ll-rebuild` self-heal, not a polling loop. Each pass is one
 * shadow-DOM walk and a no-op when there is nothing to fix.
 */
export const HEAL_RETRY_MS = [3000, 10000] as const;

/** Bounds the shadow-DOM walk. HA nests deeply but nowhere near this deep. */
const MAX_SHADOW_DEPTH = 25;

/** Readable by the smoke page and by `window.__lucarneBoot` in any console. */
export interface LucarneBootState {
  /**
   * `waiting-for-registry` and `importing` are deliberately distinct: a report
   * stuck on the first means HA never finished swapping the registry, on the
   * second that the module itself never settled. Those need different fixes, and
   * collapsing them is what made the original diagnosis take two sessions.
   */
  stage: 'loading' | 'waiting-for-registry' | 'importing' | 'loaded' | 'failed';
  /** Why we stopped waiting for the registry — see whenRegistryIsFinal. */
  registryWait?: RegistryWaitReason;
  /** How long that wait took. Large values mean the es5 app bundle was slow. */
  registryWaitedMs?: number;
  startedAt: number;
  finishedAt?: number;
  /** Populated on failure: the stack if there is one, else the message. */
  error?: string;
  /** Tags `defineFallbackCards` claimed. Empty when the bundle got there first. */
  fallbacks?: string[];
  /** Count of Home Assistant error cards asked to rebuild. */
  healed?: number;
  /**
   * Which card tags are actually in the registry, re-checked on every heal pass.
   *
   * `stage: 'loaded'` only means the module evaluated — it is NOT evidence that the
   * registrations survived, and the difference is the whole of #101: the bundle ran
   * to completion, threw nothing, and every tag was absent because Home Assistant's
   * legacy build had replaced the registry underneath it. Anyone reading a report
   * must be able to see `loaded` and `registered: []` together, and `[…] -> []`
   * across passes is the signature of a registry swap we failed to wait out.
   *
   * On the FAILURE path this lists the fallback elements `defineFallbackCards`
   * claimed, not real cards — read it against `fallbacks` before concluding the
   * bundle worked.
   */
  registered?: string[];
  /** Breadcrumbs pushed by the bundle itself — see src/shared/boot-marks.ts. */
  marks?: string[];
}

/**
 * Rebuild the bundle URL from the loader's own URL so the `?v=<version>.<digest>`
 * cache-buster carries across.
 *
 * Both artifacts are served with a 31-day `Cache-Control`, and the digest covers
 * both files, so dropping the query here would pin the device to whatever bundle it
 * first fetched — indefinitely, and invisibly. Resolving relative to `import.meta.url`
 * also keeps the pair working if the served prefix ever moves.
 */
export function bundleUrlFrom(loaderUrl: string, bundleFile = './ha-lucarne.js'): string {
  const query = loaderUrl.split('?')[1];
  return query ? `${bundleFile}?${query}` : bundleFile;
}

/**
 * Prefer the stack — on a parse failure it names the offending line.
 *
 * Total by construction. Both `err.stack` and `String(err)` run user-controlled
 * accessors, so a module rejecting with an object whose getter or `toString`
 * throws would make this throw — and `boot()` assigns its result before the
 * fallback cards are registered, so that would both produce the unhandled
 * rejection this loader exists to prevent AND skip the one mechanism that puts
 * the error on screen. A useless string beats losing the report.
 */
export function describeError(err: unknown): string {
  try {
    if (err instanceof Error) return err.stack || `${err.name}: ${err.message}`;
    return String(err);
  } catch {
    return 'Lucarne bundle failed to load (the error could not be described)';
  }
}

function buildFallbackShadow(root: ShadowRoot, tag: string, message: string): void {
  const card = root.ownerDocument.createElement('div');
  card.setAttribute('style',
    'box-sizing:border-box;padding:16px;border-radius:12px;' +
    'background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121);' +
    'border:2px solid var(--error-color,#db4437);font-size:14px;line-height:1.4;');

  const title = root.ownerDocument.createElement('div');
  title.setAttribute('style', 'font-weight:700;margin-bottom:8px;color:var(--error-color,#db4437)');
  title.textContent = `Lucarne could not load (${tag})`;

  const detail = root.ownerDocument.createElement('pre');
  detail.setAttribute('style',
    'margin:0 0 8px;white-space:pre-wrap;word-break:break-word;font-size:12px;' +
    'max-height:220px;overflow:auto;');
  // textContent, never innerHTML: this string comes from an engine exception.
  detail.textContent = message;

  const hint = root.ownerDocument.createElement('div');
  hint.setAttribute('style', 'font-size:12px;opacity:0.8');
  hint.textContent = `Please report this text at ${ISSUE_URL}`;

  card.appendChild(title);
  card.appendChild(detail);
  card.appendChild(hint);
  root.appendChild(card);
}

/**
 * Claim the card tags with an element that shows why the bundle did not load.
 *
 * Only ever called after a failed import, and only for tags still free: if the
 * bundle registered a tag before dying (it registers today → calendar → chores,
 * spread across the module graph) that real class must be left alone.
 */
export function defineFallbackCards(
  message: string,
  registry: CustomElementRegistry,
  tags: readonly string[] = CARD_TAGS,
): string[] {
  const claimed: string[] = [];
  for (const tag of tags) {
    if (registry.get(tag)) continue;
    // A fresh class per tag: a constructor may only be registered once.
    const FallbackCard = class extends HTMLElement {
      // Home Assistant calls this before attaching. Accepting anything without
      // throwing is the whole point — a throw here would put its generic error
      // card straight back.
      setConfig(): void {
        /* no config to apply */
      }

      getCardSize(): number {
        return 3;
      }

      connectedCallback(): void {
        if (this.shadowRoot) return;
        buildFallbackShadow(this.attachShadow({ mode: 'open' }), tag, message);
      }
    };
    try {
      registry.define(tag, FallbackCard);
      claimed.push(tag);
    } catch {
      // Lost a race against the real bundle, or the name is already taken.
    }
  }
  return claimed;
}

function collectErrorCards(root: Document | ShadowRoot, acc: Element[], depth: number): Element[] {
  if (depth > MAX_SHADOW_DEPTH) return acc;
  let all: NodeListOf<Element>;
  try {
    all = root.querySelectorAll('*');
  } catch {
    return acc;
  }
  for (const el of Array.from(all)) {
    if (el.tagName.toLowerCase() === 'hui-error-card') acc.push(el);
    if (el.shadowRoot) collectErrorCards(el.shadowRoot, acc, depth + 1);
  }
  return acc;
}

function errorCardMessage(el: Element): string {
  const withConfig = el as unknown as {
    _config?: { error?: string; message?: string };
    config?: { error?: string; message?: string };
  };
  const cfg = withConfig._config ?? withConfig.config;
  return cfg?.error ?? cfg?.message ?? el.textContent ?? '';
}

/**
 * Is this Home Assistant's "the tag is not registered" error, as opposed to an
 * error our own card produced?
 *
 * Matching on the tag name alone is not enough, and gets the answer backwards in
 * the one case that matters. `LucarneConfigError` messages are *prefixed with the
 * card tag* — `lucarne-today-card: "calendars" must be a non-empty array` — and
 * HA re-throws them so the user can read them. Those cards are displaying exactly
 * what they should. Rebuilding one re-throws and recreates the identical card, and
 * `state.healed` would then count a genuine config typo as a #101 rescue — which
 * corrupts the single diagnostic signal this whole module exists to produce.
 *
 * Deliberately matched as two fragments rather than the literal string
 * `"Custom element doesn't exist:"`: the apostrophe is a real hazard to compare
 * against (source encoding, and any future move to a typographic ’), and the
 * message is untranslated and hardcoded in `create-element-base.ts`, so these two
 * words are stable.
 */
function isMissingElementError(message: string): boolean {
  return message.indexOf('Custom element') !== -1 && message.indexOf('exist') !== -1;
}

/**
 * Ask Home Assistant to rebuild any error card standing in for one of our cards.
 *
 * `_customCreate` hides its error element and reveals it after 2 s; the
 * `customElements.whenDefined(tag).then(() => fireEvent(element, 'll-rebuild'))`
 * self-heal is supposed to make a late registration harmless, and the #101 notes
 * suspect it does not. `hui-card` listens for `ll-rebuild` with `{ once: true }`
 * in every mode, so firing it again is idempotent — a card HA already rebuilt
 * has no listener left to hear us.
 *
 * Gated on the tag being registered *now*: rebuilding while it is still missing
 * would just recreate the same error card.
 *
 * And gated on the error being HA's *missing element* message specifically — see
 * `isMissingElementError`.
 */
export function healErrorCards(
  root: Document | ShadowRoot,
  registry: CustomElementRegistry,
  tags: readonly string[] = CARD_TAGS,
): number {
  let healed = 0;
  for (const el of collectErrorCards(root, [], 0)) {
    const message = errorCardMessage(el);
    if (!isMissingElementError(message)) continue;
    const mine = tags.some((tag) => message.includes(tag) && registry.get(tag));
    if (!mine) continue;
    el.dispatchEvent(new CustomEvent('ll-rebuild', { bubbles: true, composed: true }));
    healed += 1;
  }
  return healed;
}

/** Home Assistant's root element. Defined by the same bundle that swaps the registry. */
const HA_ROOT_TAG = 'home-assistant';

/** Give up waiting and register anyway. Better a lost race than no cards at all. */
export const REGISTRY_WAIT_TIMEOUT_MS = 20000;
const REGISTRY_POLL_MS = 50;

/** Why we stopped waiting — published on the boot state, and the first thing to read. */
export type RegistryWaitReason = 'already-swapped' | 'swapped' | 'timeout' | 'error';

/**
 * Resolve once it is safe to register custom elements. THE FIX FOR #101.
 *
 * Home Assistant's legacy (es5) bundle does this, unconditionally, on every
 * device where `isModern` is false — an iPadOS 15 tablet or a Tizen TV:
 *
 *     Object.defineProperty(window, "customElements",
 *       { value: new CustomElementRegistry, configurable: true, writable: true })
 *
 * It installs a brand-new registry. Anything defined before that line is silently
 * discarded: `define()` returns normally, nothing throws, and every tag is simply
 * gone — which is exactly why the cards showed Home Assistant's own "Custom
 * element doesn't exist" card while the bundle reported a clean, complete
 * evaluation.
 *
 * It is a race between that swap and our own evaluation, which is why the failure
 * was intermittent: when our module evaluated *after* HA's app entrypoint,
 * everything worked. See the file header for why the modern build only *looks*
 * immune.
 *
 * Three exit conditions, because the loader can run before, during or after the
 * swap and all three orderings really happen:
 *
 *   already-swapped  HA's root element is defined, so its app entrypoint has run
 *                    past the swap. Applies both when that was already true on
 *                    entry and when it becomes true while polling.
 *   swapped          The registry object on `window` is no longer the one we
 *                    captured — the swap happened under us.
 *   timeout          Something changed upstream. Registering into a possibly
 *                    doomed registry still beats never registering at all, and
 *                    `state.registered` makes the outcome visible either way.
 *
 * Deliberately no shortcut for the modern build: the polyfill that swaps the
 * registry ships in `frontend_latest/app.js` as well, so modern is only immune by
 * an ordering accident (see the file header). Waiting costs a poll interval there,
 * because HA's root element is normally defined by the time we look.
 *
 * Polls `window.customElements` fresh on every tick rather than closing over it —
 * the whole point is that the property is replaced underneath us.
 */
export function whenRegistryIsFinal(
  win: Window,
  options: { now?: () => number; timeoutMs?: number; pollMs?: number } = {},
): Promise<RegistryWaitReason> {
  const now = options.now ?? (() => Date.now());
  const timeoutMs = options.timeoutMs ?? REGISTRY_WAIT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? REGISTRY_POLL_MS;

  return new Promise<RegistryWaitReason>((resolve) => {
    try {
      const initial = win.customElements;
      if (initial?.get(HA_ROOT_TAG)) {
        resolve('already-swapped');
        return;
      }
      const startedAt = now();
      // Independent of the poll chain below. Each tick schedules the next, so a
      // single setTimeout that silently fails to schedule would strand the whole
      // loader — and since the bundle is no longer imported by index.html, that
      // would mean the cards never load at all. Throws are caught; silent
      // non-scheduling is not, so arm one up-front deadline as well.
      win.setTimeout(() => resolve('timeout'), timeoutMs);
      const tick = (): void => {
        try {
          const current = win.customElements;
          if (current !== initial || current?.get(HA_ROOT_TAG)) {
            resolve(current !== initial ? 'swapped' : 'already-swapped');
            return;
          }
          if (now() - startedAt >= timeoutMs) {
            resolve('timeout');
            return;
          }
          win.setTimeout(tick, pollMs);
        } catch {
          resolve('error');
        }
      };
      win.setTimeout(tick, pollMs);
    } catch {
      resolve('error');
    }
  });
}

export interface BootOptions {
  /** Injected so tests can drive both outcomes without a real network. */
  importBundle: () => Promise<unknown>;
  win: Window;
  now?: () => number;
}

/**
 * One heal pass, accumulated onto the state and unable to throw.
 *
 * Every call site is either module scope or a timer callback, neither of which
 * has an error boundary — a throw from the thing whose job is to report throws
 * would be the exact silence this file exists to end.
 */
/** Which of our card tags are in the registry right now. Never throws. */
function registeredTags(win: Window): string[] {
  try {
    return CARD_TAGS.filter((tag) => win.customElements.get(tag));
  } catch {
    return [];
  }
}

function healOnce(state: LucarneBootState, win: Window): void {
  try {
    state.healed = (state.healed ?? 0) + healErrorCards(win.document, win.customElements);
  } catch {
    // A hostile or torn-down window is not worth propagating.
  }
  // Re-checked every pass, not just once: a registry swap we failed to wait out
  // shows up here as a non-empty list collapsing to an empty one, which is exactly
  // what #101 looked like and what `stage: 'loaded'` alone cannot express.
  state.registered = registeredTags(win);
}

/** Immediate pass plus the deferred ones. Runs on BOTH outcomes — see `boot`. */
function scheduleHeals(state: LucarneBootState, win: Window): void {
  healOnce(state, win);
  try {
    for (const delay of HEAL_RETRY_MS) {
      win.setTimeout(() => healOnce(state, win), delay);
    }
  } catch {
    // No usable setTimeout; the immediate pass above already ran.
  }
}

/**
 * Import the bundle with a handler attached and publish the outcome.
 *
 * Never rejects: `src/loader.ts` discards the promise (`void boot(...)`) at module
 * scope, so any rejection here is an unhandled rejection in a page with no error
 * boundary of ours — exactly the silence this module exists to end.
 *
 * Publishing the state is inside the try for the same reason: reading and writing
 * `window.__lucarneBoot` can itself throw on a frozen window, or against a
 * property defined with a throwing accessor or `writable: false`. `markBoot` in
 * `src/shared/boot-marks.ts` already guards that shape; this must match it.
 */
export async function boot(options: BootOptions): Promise<LucarneBootState> {
  const { importBundle, win } = options;
  const now = options.now ?? (() => Date.now());
  // Built before the try so a throwing window still yields a state to return.
  const state: LucarneBootState = { stage: 'loading', startedAt: 0, marks: [] };

  try {
    state.startedAt = now();
    const host = win as unknown as { __lucarneBoot?: LucarneBootState };
    // Carry over any marks already pushed. The loader is the only importer in a
    // correct install, but the bundle can still be pulled in directly — by a test,
    // or by a dashboard that lists it as a stale Lovelace resource — so never
    // assume this object is ours to overwrite.
    state.marks = host.__lucarneBoot?.marks ?? [];
    host.__lucarneBoot = state;
  } catch {
    // Nothing can be published. The import below still runs, so a failure is at
    // least reported to the console rather than being swallowed entirely.
  }

  // Wait for Home Assistant to stop replacing the custom element registry before
  // importing — module evaluation is what registers, so this is the only lever
  // that puts our defines on the surviving registry. See whenRegistryIsFinal.
  try {
    state.stage = 'waiting-for-registry';
    state.registryWait = await whenRegistryIsFinal(win, { now: options.now });
  } catch {
    state.registryWait = 'error';
  }
  try {
    // Separate try: a caller-supplied clock that throws must not clobber a
    // legitimate reason with 'error' and send a reader down the wrong path.
    state.registryWaitedMs = now() - state.startedAt;
  } catch {
    // Timing is a nicety; the reason is the diagnostic.
  }

  try {
    state.stage = 'importing';
    await importBundle();
    state.stage = 'loaded';
  } catch (err) {
    state.stage = 'failed';
    state.error = describeError(err);
    try {
      state.fallbacks = defineFallbackCards(state.error, win.customElements);
    } catch {
      // Registry unavailable. Nothing left to try, but `error` is still published.
    }
  }
  try {
    state.finishedAt = now();
  } catch {
    // A caller-supplied clock that throws must not sink the whole report.
  }

  // Heal on BOTH outcomes, deliberately.
  //
  // On success it covers a late registration HA did not recover from. On failure
  // it is what actually delivers the fix: `defineFallbackCards` has just claimed
  // the three tags, so the error cards standing in for them can be rebuilt into
  // our own element and the exception finally becomes readable on the dashboard.
  // Leaving the failure path to HA's `whenDefined` -> `ll-rebuild` alone would
  // stake the entire point of this module on the self-heal that the success path
  // exists precisely because we do not trust.
  scheduleHeals(state, win);
  return state;
}
