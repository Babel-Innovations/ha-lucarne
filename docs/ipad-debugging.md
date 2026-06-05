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

Because it is a thrown exception, the fix is always: **find the throw, guard the
input that triggered it.** Everything below is about capturing that throw.

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

`src/shared/card-base.ts` wraps each top-level card's `renderContent()` in a
try/catch: a synchronous throw in a card's own render now degrades to a small
"this card hit an error and will recover on the next update" notice and reports
itself, instead of bricking until the app is reopened. Throws inside child
components still surface through the global handlers in `error-reporter.ts`.
This makes the wall display self-heal, but it does **not** replace fixing the
underlying throw — always chase the captured stack to its source.
