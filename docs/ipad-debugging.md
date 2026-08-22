# Debugging Lucarne card crashes on the wall iPad

When a Lucarne card "crashes" on the wall iPad it collapses to a small red box
with a `(!)` icon and no text, and the only apparent fix is to force-quit and
reopen the Home Assistant Companion app. This doc explains what that actually is
and how to capture the real cause without guessing.

## What the red box actually means

The red box is **Home Assistant's own `hui-error-card`**, not a Lucarne UI. HA
wraps every custom card; when a card **throws an uncaught JavaScript exception**
(in `setConfig`, `render`, the `hass` setter, or another Lit lifecycle hook), HA
replaces it with that red box. So the symptom is a JS exception, **not** a
WebView memory crash or an out-of-memory kill.

Two tells distinguish it from a Lucarne error state:

- **Lucarne's own** error/empty states always render text inside an `ha-card`
  (e.g. "Lucarne Family integration not set up", "Loading…"). See
  `src/cards/lucarne-chores-card.ts`.
- **HA's `hui-error-card`** is a bare red box with only the `(!)` icon until you
  tap it.

"Reopen fixes it" fits an exception exactly: reopening rebuilds the cards fresh,
and HA leaves an errored card dead until the whole dashboard is rebuilt.

Once you have confirmed the bundle actually loaded (next section), the fix is
always: **find the throw, guard the input that triggered it.** Everything after
that is about capturing the throw.

## First, rule out a parse-time bundle failure

Everything below assumes the bundle *loaded* and one card threw. There is a
second, very different failure that looks similar and that none of the capture
paths below can see, because none of our code ever runs.

**Signature — all four together:**

- **Every** Lucarne card on the dashboard is a red box, not just one.
- Non-Lucarne cards on the same view (markdown, entities) render fine.
- `debug: true` produces **no** notification, ever, on any card.
- A deliberately minimal *but valid* config fails too — `members: []` for the
  chores card, `calendars: [{entity: calendar.<anything>, color: '#888'}]` for the
  today and calendar cards. Those two **require** a non-empty `calendars`, so
  stripping it throws `LucarneConfigError` and yields the same red box for an
  entirely different reason. If you tap the box and see a `lucarne-*:`-prefixed
  message, that is config validation working, not a load failure.

That is the bundle failing to **load**, in one of three ways:

- **Never requested.** The browser was never told to fetch it, so there is no
  error anywhere — just an absence. See **Was the bundle even requested?** below.
- **Parse / link error.** It was fetched, but nothing runs at all, so no
  `customElements.define()` executes and HA can't find any of the elements.
- **Throw during module evaluation.** Execution stops at the throwing statement,
  so cards registered *before* it survive and everything after it is missing —
  which is why the "every card is red" symptom points at the first two cases.

None of the three can be caught from inside the bundle: `src/index.ts` imports
every card, and ESM hoists those imports above `installGlobalErrorReporter()`, so
no handler is installed yet — and in the first case our code never runs at all.

Establish which one it is before acting. In Safari Web Inspector: **no network
request** for `ha-lucarne*.js` means "never requested"; a `SyntaxError` on it
(with no Lucarne logs before it) means the build target regressed; any other
exception there means a module-evaluation bug. The repo checks cover the parse case
for both bundles and, for the legacy one, evaluation as well; only *never requested*
has to be diagnosed on the device:

```bash
node --import tsx --test 'tests/build/*.test.ts'
```

(No `TZ` or `dom-globals.mjs` here, unlike every other test in this repo — these
only read the committed files: `bundle-syntax.test.ts` parses both, and
`bundle-registers.test.ts` evaluates the legacy one in its own happy-dom window
and checks every card actually reached the registry. `build.yml`,
`create-release.sh` and `create-prerelease.sh` invoke them exactly this way.)

Issue #101 was both of the first two, in sequence. The parse failure came first: a
Vite 5 → 8 bump silently raised the default build target and the bundle started
shipping ES2022 class static blocks that iPadOS 15 and Tizen 6.5 cannot parse
(see **Browser support floor** below). Pinning the target fixed the file but
changed nothing on the devices, because they had never been fetching it.

## Was the bundle even requested?

Home Assistant has **two frontends** and serves each browser exactly one:

```js
// home-assistant/frontend — src/html/_js_base.html.template
var isModern = <modernRegex>.test(navigator.userAgent) && "findLast" in Array.prototype;

// src/html/index.html.template
if (isModern) { … import("<extra_module_url entry>"); … window.latestJS = true; }
if (!window.latestJS) { … _ls("<extra_js_es5 entry>"); … }
```

`modernRegex` is generated from the frontend's `.browserslistrc` **modern** query
— *unreleased versions, last 2 years, not dead*. Every device in the table below
is well outside that window, so all of them get the **legacy** frontend. That
frontend is fully functional (which is why markdown and entities cards render
normally next to the dead Lucarne card) — it simply never evaluates an
`extra_module_url` entry, only `extra_js_es5` ones, and it injects those as
classic `<script src>` rather than `import()`.

So a card can be perfectly built and still never load. `async_setup` registers
**both** bundles, one per channel; the failure mode to watch for is a change that
registers only one, or a deploy/build that emits only one file.

Checks, cheapest first:

- **Both files exist and are non-empty** in
  `custom_components/lucarne_family/frontend/` on the HA box.
  `deploy-integration.sh` refuses to rsync without both.
- **Both URLs return JavaScript** — open `/lucarne_family_frontend/ha-lucarne.js`
  *and* `/lucarne_family_frontend/ha-lucarne-legacy.js`; a 404 on either means the
  static path registration or the build is broken.
- **The device actually asks for one of them.** On a TV or a locked-down tablet
  with no dev tools, watch the request server-side while the dashboard loads: the
  legacy device should request `/frontend_es5/…` and `ha-lucarne-legacy.js`, never
  `ha-lucarne.js`. A device that requests `/frontend_es5/…` and *no* Lucarne
  bundle at all is the #101 signature.

## Browser support floor

The shipped bundle must parse on every display this project is deployed to. The
floor is pinned in `vite.config.ts`:

```ts
target: ["es2020", "safari15", "ios15", "chrome85"]
```

| Device | Engine | Why it sets the floor |
|---|---|---|
| iPad Air 2 (iPadOS 15.8) | WebKit 15.6 | Oldest wall/Companion-app tablet in use |
| Samsung Frame TV (2022) | Tizen 6.5 / Chromium 85 | Dashboard on the TV |

Three rules:

- **Never remove or raise `build.target`.** Vite's default
  (`baseline-widely-available`) is `safari16.4` / `ios16.4` / `chrome111` — well
  above this floor. The pin is what actually fixes the output; with it in place a
  Vite major bump is safe. `tests/build/bundle-syntax.test.ts` is defence in depth:
  it emits nothing itself, it just fails if the pin is ever removed, raised, or
  stops being honoured. Losing the pin breaks the devices; losing the test only
  removes the alarm.
- **The guard parses whichever bundle is on disk, so CI deliberately runs it
  twice.** Once *before* `npm run build` — those are the committed bytes, the exact
  artifact HACS ships — and once *after*, inside `npm run test:coverage`, which
  proves the pin still holds in freshly emitted output. Neither run alone covers
  both directions: the first misses a target raised without rebuilding, the second
  misses a stale or hand-edited commit. `scripts/create-release.sh` re-runs it after
  its own build too, because the release path commits and pushes those bytes. Don't
  drop either CI step or move `test:coverage` above the build.
- **es2020 is a chosen floor, not a tool limit.** Safari 15 and Chromium 85 both
  implement ES2020 in full, so going lower only grows the bundle without reaching
  anything we ship to. If an older display does turn up, Vite 8 (Rolldown) builds
  lower targets happily — `es2019` produces a working bundle about 5 kB larger.
  Lower the floor deliberately; don't assume it can't move.

`tests/build/bundle-syntax.test.ts` parses both bundles on disk with acorn at ES2020
and fails if anything newer slips in — see the two-runs rule above for which bytes
those are in each context.

Two things it deliberately does **not** prove. It does not prove the committed
bundle is *current*: a PR that edits `src/` without rebuilding still ships a stale
artifact that parses perfectly, so rebuilding on card-source changes stays a human
step (see CLAUDE.md). And it validates **syntax** only: a runtime API newer than
the floor
(`structuredClone`, `Object.hasOwn`, `Array.prototype.at`, …) still needs a
`typeof` guard, as `ResizeObserver` and `matchMedia` already have.

## Why it can be iPad-only

The cards run in the Companion app's `WKWebView` (WebKit/Safari engine). Common
reasons a throw appears only there:

- **WebKit date parsing.** Safari is far stricter than Chrome about
  `new Date(string)`. Non-ISO strings yield `Invalid Date` in Safari where Chrome
  succeeds, and downstream `.toISOString()` / arithmetic then throws or yields
  `NaN`. Date-only strings must be parsed as `new Date(value + 'T00:00:00')` —
  grep the codebase before adding any `new Date(...)`.
- **Touch-only code paths.** Pan gestures (`calendar-day-pan.ts`), long-press, and
  the create/edit popovers only run on touch. A desktop user never exercises them,
  so a throw there looks iPad-specific. This matches "it crashes after I do
  something."
- **Transient entity shape after reconnect.** The iPad sleeps/wakes; right after a
  websocket reconnect an entity can be briefly missing, so an unguarded
  `hass.states[id].attributes...` throws.

## Capture path 1 — tap the red card (zero cost, do this first)

On the iPad, tap each red error box. HA's `hui-error-card` expands to show the
error message and the offending card config. Screenshot it. The message often
names the throwing operation directly (e.g.
`TypeError: null is not an object (evaluating 'x.foo')`). No Mac required.

## Capture path 2 — `debug: true` → Home Assistant notification (best for a headless tablet)

The cards ship a built-in reporter (`src/shared/error-reporter.ts`). Add
`debug: true` to a card's config:

```yaml
type: custom:lucarne-today-card
debug: true
calendars: [...]
```

With `debug: true`, any uncaught Lucarne exception — including throws inside child
components, caught by the global `window.onerror` / `unhandledrejection`
handlers — is forwarded to a Home Assistant **persistent_notification**. Read it
remotely, no Mac tethered:

- In the HA UI: the notifications **bell** shows "Lucarne card error (…)" with the
  stack.

(The reporter raises a `persistent_notification` only; it does not write to the HA
backend log, so `ha_get_logs` won't surface these — use the bell.)

Notes:
- `console.error` always runs regardless of `debug`, so a tethered Web Inspector
  (path 3) still sees everything.
- Repeats of the same error are throttled to one notification per minute, with a
  stable `notification_id`, so a render loop won't storm the bell.
- Remove `debug: true` once the bug is found — it is opt-in precisely so end users
  aren't notified in normal operation.

## Capture path 3 — Safari Web Inspector (full stack + live repro)

For a full stack trace and the ability to set breakpoints:

1. **Reliable route — Safari proper.** Open the *same dashboard URL* in Safari on
   the iPad (log into the HA frontend directly, outside the Companion app).
   On a Mac on the same network/USB: Safari → **Develop → \<iPad name\> → \<the HA
   tab\>**. Enable on the iPad first: Settings → Safari → Advanced → **Web
   Inspector** on. Reproduce; read the console + the throwing frame.
   - If it reproduces in Safari, it is a pure card bug (data/gesture), debug there.
   - If it reproduces **only** in the Companion app, suspect a companion-specific
     API (`external_bus`, theme/`hass` timing). That itself narrows the search.
2. **Companion app `WKWebView`.** Release builds may not set `isInspectable`, so
   the Develop menu may not list the app's webview. Use the Safari route above as
   the fallback. A Mac mini already lives near this setup (`bridge/`), so USB
   tethering is feasible.

## Triage checklist

1. **Is it our card?** Tap the red box. If the expanded config is a
   `custom:lucarne-*` card, yes. If it's an HA core card, this doc doesn't apply.
2. **Which card?** Count the red boxes per tab and match to the cards configured
   there (today / calendar / chores).
3. **What did you do right before?** Tab switch, calendar pan, open a popover,
   complete a task, upload an avatar, or "nothing, it just appeared after a while"
   (points at a timer/reconnect path, not a gesture).
4. **Get the stack** via path 1 or 2.
5. **Find the throw** at the frame named in the stack. Pre-staged suspects:
   - date parsing — `src/shared/calendar-layout.ts`, `rolling-window.ts`,
     `date-helpers.ts`, `recurrence.ts`, and the `new Date(...)` sites in the cards
   - gesture/popover handlers — `calendar-day-pan.ts`, the `*-popover.ts` components
   - `hass.states[...]` shape assumptions after a reconnect
6. **Guard the input** at the throw site, and confirm the card-level boundary
   (`src/shared/card-base.ts`) would have degraded gracefully.

## Resilience already in place

`src/shared/card-base.ts` owns two boundaries. Subclasses implement
`renderContent()` and `applyConfig()`; the base wraps both.

- **Render.** A synchronous throw in a card's own render degrades to a small
  "this card hit an error and will recover on the next update" notice and reports
  itself, instead of bricking until the app is reopened. Throws inside child
  components still surface through the global handlers in `error-reporter.ts`.
- **Config.** A throw out of `applyConfig()` is contained the same way, showing
  "this card could not read its configuration: …". The one exception is
  `LucarneConfigError`, which the cards throw for genuinely invalid YAML — that is
  re-thrown on purpose so Home Assistant shows the user the message they need
  ("lucarne-chores-card: members must be an array"). Don't "harden" that away.

`setConfig` runs long before `hass` is assigned, so `error-reporter.ts` keeps a
small bounded backlog: a report raised with no `hass` yet is queued and delivered
as soon as a card supplies one. That is what makes `debug: true` work for a
failure during config, not just during render.

This makes the wall display self-heal, but it does **not** replace fixing the
underlying throw — always chase the captured stack to its source. And none of it
applies if the bundle never parsed; see the first section.
