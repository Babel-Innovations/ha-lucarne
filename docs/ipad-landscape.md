# iPad 9 Landscape — Sizing Details

## Pixel math

The iPad 9 (9th generation, 2021) has a 2160×1620 screen at 264 PPI (2× Retina).

In landscape kiosk mode (HA Companion + kiosk-mode HACS integration):

| Layer | Height | Width |
|-------|--------|-------|
| Physical screen | 1620 px | 2160 px |
| CSS pixels (÷ 2 device pixel ratio) | 810 px | 1080 px |
| HA chrome (header, sidebar) | 0 (kiosk-mode hides it) | 0 |
| **Available to cards** | **810 px** | **1080 px** |

The Lovelace dashboard therefore renders in an **1080 × 810 px** CSS viewport.

## Dashboard layout

The `/wall-ipad` dashboard uses three tabs (Family, Chores, optional Today-only view). Each tab
uses Lovelace's `panel: false` (default) with a grid layout:

- **Family tab**: `lucarne-today-card` left (span 4) + `lucarne-calendar-card` right (span 8) in a
  12-column grid. At 1080 px total, today card ≈ 360 px wide, calendar ≈ 720 px.
  The calendar pane now auto-fits **4 columns** at 720 px (was 7 fixed). The `computeVisibleDays`
  formula with defaults (`min_col_width=140`, `max_col_width=220`) yields visibleCount=4 at 720 px
  available width (680 px after the 40 px time gutter, 680÷220=3.1→4 min-fitting, 680÷140=4.86→4 max-fitting).
- **Chores tab**: `lucarne-chores-card` full-width. Three kids render in a `auto-fit minmax(200px,
  1fr)` grid → 3 columns at 1080 px (each ≈ 360 px), 4 columns if a fourth kid is added.

## Typography scaling

All font sizes use `clamp()`:

| Token | Formula | At 700 px | At 1080 px | At 1440 px |
|-------|---------|-----------|-----------|-----------|
| `--lucarne-fs-sm` | `clamp(0.75rem, 0.5vw + 0.5rem, 0.875rem)` | 12 px | 13.4 px | 14 px |
| `--lucarne-fs-md` | `clamp(0.875rem, 0.75vw + 0.6rem, 1rem)` | 14 px | 15.85 px | 16 px |
| `--lucarne-fs-lg` | `clamp(1rem, 1vw + 0.75rem, 1.25rem)` | 16 px | 18.8 px | 20 px |
| `--lucarne-fs-xl` | `clamp(1.25rem, 1.5vw + 0.875rem, 1.75rem)` | 20 px | 25.95 px | 28 px |

At 1080 px the heading size (`fs-lg`) is ≈ 18.8 px — comfortable at arm's length.

## Larger display behavior

Lucarne scales gracefully to larger iPads:

- **iPad Pro 11" (1194 × 834 CSS px landscape)**: today card widens to ~398 px, calendar to ~796 px.
  Font clamp values plateau at 1440 px, so headings stop growing above that.
- **iPad Pro 12.9" (1366 × 1024 CSS px landscape)**: chores grid switches to 3 wide columns
  (each ≈ 455 px) — more chore text visible per row.

The cards have no hard-coded `max-width` constraints, so they fill the container naturally.

## Equal card heights

The Today and Calendar cards share a single height constant, `--lucarne-card-fill-height`
(`calc(100dvh - 114px)`, with a `100vh` fallback), defined once in `design-tokens.ts`. Each
card applies it as a fixed `height` on its own `ha-card` and lays the card out as a flex column,
so the two cards line up side by side regardless of their differing header/chrome heights. The
inner scroll region flexes to fill: the calendar's `.grid-area` and the Today card's `.card-body`
each take the remaining space below their header and scroll internally rather than stretching
(or clipping) the card. The `114px` offset is the dashboard chrome above the card plus the gap
below it — tune it there if the viewport chrome changes.

## Touch targets

All interactive elements (chore checkboxes, calendar nav buttons, visibility pills, create-event
tap zones) use `min-height: 44px; min-width: 44px` per Apple HIG recommendations. This is enforced
in the component CSS, not via JavaScript.

## Touch swipe

The calendar card supports horizontal swipe-to-pan using the Pointer Events API
(`pointerdown / pointermove / pointerup / pointercancel`). This unifies mouse, Apple Pencil, and
finger touch without needing `touchstart` / `touchmove`.

**Vertical-scroll precedence**: The first 10 px of movement decide the gesture axis. If vertical
movement dominates, pointer capture is released immediately and Safari's native vertical scroll
takes over for the time-grid column. If horizontal movement dominates, the pan gesture locks in.
The pan wrapper sets `touch-action: pan-y` so the browser never pre-empts vertical scrolling.

**Snap-to-day**: On pointer release, `snapToDay(dx, dayWidthPx, velocity)` rounds `dx / dayWidthPx`
to the nearest integer. A "flick" (velocity ≥ 500 px/s) rounds in the direction of motion
regardless of distance, so a fast short swipe advances one day cleanly.

**Rubber-band at bound**: When `canPanBack` or `canPanForward` is false (±90-day limit reached),
further displacement in the blocked direction is passed through `rubberBand(dx, 0)`, yielding
a 1/3-rate slowdown from the very first pixel.

**Snap-back animation**: The inner `.day-cols-track` elements animate back to `translateX(0)` using
`--lucarne-pan-easing: cubic-bezier(0.32, 0.72, 0, 1)` (iOS-like spring) and
`--lucarne-pan-duration: 240ms`. Under `prefers-reduced-motion: reduce`, the snap-back is instant
(checked at runtime via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`).

## Kiosk-mode interactions

### Kiosk-mode HACS integration

The `/wall-ipad` dashboard uses [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) to suppress
HA chrome for the `tablet` user. The `kiosk_mode:` block in the dashboard YAML:

```yaml
kiosk_mode:
  user_settings:
    - users:
        - tablet
      kiosk: true        # hides header and sidebar entirely
```

Kiosk mode is applied per-user, so the admin user still sees the full HA UI on the same URL.

### Known iPad-specific gotchas

**HA Companion keyboard bug**: When a text input inside a card gains focus (e.g. the create-event
popover's title field), the iOS soft keyboard may push the viewport up and clip the top of the card.
Workaround: use `position: fixed` for popovers instead of `position: absolute`.

**Kiosk Personal Automations dead-end**: If you try to create a Personal Automation in Shortcuts.app
that triggers on the wall-iPad, iOS may navigate away from kiosk mode. This is an iOS Shortcuts
limitation. Avoid Personal Automations that require HA Companion interaction on the wall iPad.

**Tap-and-hold HA more-info dialog**: In kiosk mode, long-pressing on a card area that contains an
`ha-card` element can still trigger the HA more-info dialog for entities. The lucarne cards do not
wrap entity tiles, so this is unlikely — but if you add standard entity cards alongside them on the
same view, be aware of this behavior.

**Card bundle cache**: The integration serves the bundle at a content-hashed
`/lucarne_family_frontend/ha-lucarne.js?v=<version>.<digest>` URL (`_bundle_digest` in
`custom_components/lucarne_family/__init__.py`), so changed bundle bytes produce a new URL and a
normal reload picks them up — no hard refresh needed. That URL is registered in `async_setup`, so HA
must be **restarted** for a new bundle to be served; reloading the config entry only runs
`async_setup_entry` and will not recompute the digest. On iPad, force-quit the Companion app if the
app shell itself looks stale — the shell is service-worker cached. Clearing Safari website data is a
last resort, since it signs the device out of Home Assistant.

(This replaces an older note about hard-refreshing after switching the Lovelace resource URL from
`/local/lucarne/...` to `/hacsfiles/...`; the integration now serves and registers the bundle
itself, so there is no manual Lovelace resource to switch.)
