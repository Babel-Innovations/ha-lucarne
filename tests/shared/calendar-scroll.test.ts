import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeNowScrollTop } from '../../src/shared/calendar-scroll.js';

// Reference geometry shared by most cases: a 07:00–21:00 band (14 hours),
// rendered at 60px/hour → 840px time grid, sitting 100px below the scroll
// content top (header + all-day rows). Padding is one hour (60px).
const BASE = {
  bandStartH: 7,
  bandEndH: 21,
  timeGridTopPx: 100,
  timeGridHeightPx: 840,
  paddingPx: 60,
  maxScrollTop: 700,
};

describe('computeNowScrollTop', () => {
  it('positions "now" one padding-unit from the top of the viewport (mid-band)', () => {
    // 15:00 → 8h into a 14h band → ratio 8/14 → offset = 100 + (8/14)*840 = 580
    // target = 580 - 60 = 520, within [0, 700]
    const now = new Date(2026, 5, 5, 15, 0, 0);
    assert.equal(computeNowScrollTop({ ...BASE, now }), 520);
  });

  it('accounts for minutes (and not just whole hours)', () => {
    // 15:30 → 8.5h into band → offset = 100 + (8.5/14)*840 = 610, target = 550
    const now = new Date(2026, 5, 5, 15, 30, 0);
    assert.equal(computeNowScrollTop({ ...BASE, now }), 550);
  });

  it('snaps to the top (0) when "now" is well before the band start', () => {
    const now = new Date(2026, 5, 5, 6, 0, 0); // 06:00, before 07:00
    assert.equal(computeNowScrollTop({ ...BASE, now }), 0);
  });

  it('snaps to the top (0) when "now" is only slightly before the band start', () => {
    // 06:45 — the centred formula would give a small positive offset
    // (timeGridTopPx - paddingPx with a slightly-negative ratio), which would
    // partially hide the header/all-day rows. Outside the band we snap to 0.
    const now = new Date(2026, 5, 5, 6, 45, 0);
    assert.equal(computeNowScrollTop({ ...BASE, now }), 0);
  });

  it('snaps to the top (0) at exactly the band start', () => {
    const now = new Date(2026, 5, 5, 7, 0, 0); // 07:00 == bandStartH
    assert.equal(computeNowScrollTop({ ...BASE, now }), 0);
  });

  it('clamps to 0 when the in-band padded target would be negative', () => {
    // 07:30 is inside the band, but with timeGridTopPx=0 and a 60px pad the
    // centred target is negative (0 + (0.5/14)*840 - 60 = -30) → clamps to 0.
    const now = new Date(2026, 5, 5, 7, 30, 0);
    assert.equal(
      computeNowScrollTop({ ...BASE, now, timeGridTopPx: 0, paddingPx: 60 }),
      0,
    );
  });

  it('snaps to maxScrollTop when "now" is well after the end of the day', () => {
    const now = new Date(2026, 5, 5, 22, 0, 0); // 22:00, after 21:00
    assert.equal(computeNowScrollTop({ ...BASE, now }), BASE.maxScrollTop);
  });

  it('snaps to maxScrollTop when "now" is only slightly after the band end', () => {
    // 21:15 — ratio is only just above 1; without the explicit edge-snap a tall
    // content area (large maxScrollTop) would leave the bottom partly unscrolled.
    const now = new Date(2026, 5, 5, 21, 15, 0);
    assert.equal(computeNowScrollTop({ ...BASE, now, maxScrollTop: 5000 }), 5000);
  });

  it('snaps to maxScrollTop at exactly the band end', () => {
    const now = new Date(2026, 5, 5, 21, 0, 0); // 21:00 == bandEndH
    assert.equal(computeNowScrollTop({ ...BASE, now }), BASE.maxScrollTop);
  });

  it('never returns a negative scrollTop when content is shorter than the viewport', () => {
    // maxScrollTop = scrollHeight - clientHeight can be negative; the end-of-day
    // snap must guard against returning it verbatim.
    const now = new Date(2026, 5, 5, 22, 0, 0); // after band end → would return maxScrollTop
    assert.equal(computeNowScrollTop({ ...BASE, now, maxScrollTop: -50 }), 0);
  });

  it('scrolls short of the plain target so the sticky head does not cover "now"', () => {
    // Same 15:00 case as the first test (target 520), but a 54px sticky head
    // now overlays the top of the scrollport. Stopping 54px earlier leaves the
    // now-line a full padding unit below the head's bottom edge instead of
    // under it.
    const now = new Date(2026, 5, 5, 15, 0, 0);
    assert.equal(computeNowScrollTop({ ...BASE, now, stickyHeadPx: 54 }), 520 - 54);
  });

  it('treats a missing stickyHeadPx as 0', () => {
    const now = new Date(2026, 5, 5, 15, 0, 0);
    assert.equal(
      computeNowScrollTop({ ...BASE, now }),
      computeNowScrollTop({ ...BASE, now, stickyHeadPx: 0 }),
    );
  });

  it('still clamps to 0 when a tall sticky head drags the target negative', () => {
    // 07:30 → 100 + (0.5/14)*840 - 60 = 70, comfortably positive on its own, so
    // only the 120px head can push this below zero. (Keep BASE's timeGridTopPx:
    // zeroing it makes the target negative before stickyHeadPx is even applied,
    // and the test would pass without exercising the head at all.)
    const now = new Date(2026, 5, 5, 7, 30, 0);
    assert.equal(computeNowScrollTop({ ...BASE, now }), 70, 'guard: positive without a head');
    assert.equal(computeNowScrollTop({ ...BASE, now, stickyHeadPx: 120 }), 0);
  });

  it('never returns more than maxScrollTop even mid-band on a short container', () => {
    const now = new Date(2026, 5, 5, 20, 0, 0); // 20:00 → near bottom
    const result = computeNowScrollTop({ ...BASE, now, maxScrollTop: 100 });
    assert.ok(result <= 100, `expected <= 100, got ${result}`);
    assert.ok(result >= 0);
  });
});
