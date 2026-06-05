/**
 * Pure scroll-position math for the calendar card's auto-scroll-to-now feature
 * (issue #58). Kept DOM-free so it is unit-testable; the card measures the
 * live geometry and feeds it in.
 */
export interface NowScrollInput {
  /** Current time. */
  now: Date;
  /** Visible-band start hour (whole hour, e.g. 7 for 07:00). */
  bandStartH: number;
  /** Visible-band end hour (whole hour, e.g. 21 for 21:00). */
  bandEndH: number;
  /** Distance from the scroll content's top to the top of the time grid (px). */
  timeGridTopPx: number;
  /** Rendered height of the time band (px). */
  timeGridHeightPx: number;
  /** Space to leave above "now" so it isn't flush against the viewport top (px). */
  paddingPx: number;
  /** Maximum scrollable offset: scrollHeight - clientHeight (px). */
  maxScrollTop: number;
}

/**
 * Returns the `scrollTop` that places the current time near the top of the
 * viewport with `paddingPx` of breathing room above it.
 *
 * Handles the two edge cases from the issue explicitly, because outside the
 * visible band there is no now-line to centre on (and the centred formula can
 * otherwise return a small non-zero offset that partially hides the header/
 * all-day rows):
 *  - "now" at/before the band start → snap to the top (0), showing the start of
 *    the day.
 *  - "now" at/after the end of the visible day → snap to the bottom
 *    (maxScrollTop), keeping the latest events / "tonight" stub in view.
 *
 * Within the band, the centred target is clamped to `[0, maxScrollTop]`.
 */
export function computeNowScrollTop(input: NowScrollInput): number {
  const {
    now,
    bandStartH,
    bandEndH,
    timeGridTopPx,
    timeGridHeightPx,
    paddingPx,
    maxScrollTop,
  } = input;

  const bandHours = bandEndH - bandStartH;
  if (bandHours <= 0) return 0;

  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

  if (nowHours <= bandStartH) return 0;
  if (nowHours >= bandEndH) return Math.max(0, maxScrollTop);

  const ratio = (nowHours - bandStartH) / bandHours;
  const target = timeGridTopPx + ratio * timeGridHeightPx - paddingPx;

  return Math.max(0, Math.min(maxScrollTop, target));
}
