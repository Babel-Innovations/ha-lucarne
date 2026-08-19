import { html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { LucarneCardBase, LucarneConfigError } from '../shared/card-base.js';
import { installPreviewColumnOverride, type PreviewOverrideHandle } from '../shared/grid-preview-override.js';
import { resolveCalendars, resolveCalendarLabel } from '../shared/calendar-helpers.js';
import { layoutEvents, isoDateKey } from '../shared/calendar-layout.js';
import { computeVisibleDays } from '../shared/visible-window.js';
import type { VisibleWindowConfig } from '../shared/visible-window.js';
import { RollingWindowController } from '../shared/rolling-window.js';
import { computeNowScrollTop } from '../shared/calendar-scroll.js';
import type { HomeAssistant, CalendarConfig, CalendarEvent } from '../shared/types.js';
import type { CalendarLayoutResult } from '../shared/calendar-layout.js';

import '../components/visibility-pills.js';
import '../components/calendar-grid.js';
import '../components/calendar-day-pan.js';
import '../components/calendar-event-popover.js';
import '../components/create-event-popover.js';

export interface LucarneCalendarCardConfig {
  type: 'custom:lucarne-calendar-card';
  title?: string;
  calendars: CalendarConfig[];
  visible_hours?: { start: string; end: string };
  /** @deprecated silently ignored — see features/visible-days/README.md */
  week_starts_on?: 'monday' | 'sunday';
  show_create_button?: boolean;
  min_days?: number;     // default 3
  max_days?: number;     // default 7
  min_col_width?: number; // px, default 140
  max_col_width?: number; // px, default 220
  /**
   * Off-screen days rendered on each side of the visible window so the user
   * never sees a blank gap during a swipe-pan. Defaults to the current
   * visibleCount (matches the event-data cache range).
   */
  render_buffer_days?: number;
  /** When true, forward card errors to a Home Assistant persistent_notification. */
  debug?: boolean;
}

/** How often (ms) to nudge the view so "now" stays in place as time advances. */
const FOLLOW_INTERVAL_MS = 60_000;
/**
 * If the container's scrollTop drifts further than this from our last
 * programmatic target, treat it as a manual scroll and stop auto-following.
 * Between follow ticks the content doesn't move on its own (the now-line moving
 * doesn't change scrollTop), so a tiny tolerance reliably distinguishes "user
 * scrolled" from sub-pixel rounding.
 */
const FOLLOW_DIVERGENCE_TOLERANCE_PX = 4;
/**
 * Cap on rAF retries for the one-time initial scroll while the grid's shadow
 * `.time-col` is still laying out (measures height 0 on the first frame). ~1s
 * at 60fps; if exhausted, the 60s follow tick re-centers as a backstop.
 */
const MAX_INITIAL_SCROLL_FRAMES = 60;

(window as Window & typeof globalThis & { customCards?: object[] }).customCards =
  (window as Window & typeof globalThis & { customCards?: object[] }).customCards || [];
(window as Window & typeof globalThis & { customCards?: object[] }).customCards!.push({
  type: 'lucarne-calendar-card',
  name: 'Lucarne Calendar',
  description: 'Week view calendar with per-person color, visibility pills, and create-event flow',
  preview: true,
});

@customElement('lucarne-calendar-card')
export class LucarneCalendarCard extends LucarneCardBase<LucarneCalendarCardConfig> {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: block;
        font-family: var(--primary-font-family, sans-serif);
      }
      ha-card {
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        /* Fixed outer height shared with the Today card; the grid-area flexes to
           fill the remainder and scrolls internally (not a min-height — that lets
           the tall time-grid push the card open instead of capping it). */
        height: var(--lucarne-card-fill-height);
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-xs);
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .week-nav {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-xs);
      }
      .nav-btn {
        background: none;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: var(--lucarne-radius-sm);
        padding: 4px 10px;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
      .nav-btn:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.04);
      }
      .nav-btn:disabled {
        opacity: 0.3;
        cursor: default;
      }
      .week-label {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-width: 80px;
        text-align: center;
      }
      .pills-row {
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      .grid-area {
        overflow: auto;
        /* Fill the space below the header + pills; ha-card sets the card height. */
        flex: 1 1 auto;
        min-height: 0;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;

  @query('.grid-area') private _gridAreaEl?: HTMLElement;

  @state() private _config?: LucarneCalendarCardConfig;
  @state() private _layout: CalendarLayoutResult | null = null;
  @state() private _visibleIds: Set<string> = new Set();
  @state() private _openEvent: CalendarEvent | null = null;
  @state() private _openEventColor = '';
  @state() private _openEventCalLabel = '';
  @state() private _openEventEntityId = '';
  @state() private _createDay: Date | null = null;
  @state() private _createStartHour = 9;
  @state() private _creatableCalendars: CalendarConfig[] = [];
  @state() private _dayWidthPx = 0;
  @state() private _deletedUids = new Set<string>();

  private _rolling!: RollingWindowController;
  private _previewOverride?: PreviewOverrideHandle | null;
  private _previewOverrideRaf?: number;
  private _pendingEvents: CalendarEvent[] = [];
  private _resizeObserver?: ResizeObserver;
  /**
   * The `.grid-area` element currently being observed. Tracked by identity rather
   * than a "measured" boolean because Lit destroys and rebuilds the grid whenever
   * the top-level template swaps (e.g. into the card-base error notice and back) —
   * a boolean would leave the observer bound to the discarded node.
   */
  private _observedGridEl?: HTMLElement;
  private _resizeFrame?: number;
  private _lastVisibleCount = 3;

  // --- Auto-scroll-to-now (issue #58) ---
  private _followTimer?: ReturnType<typeof setInterval>;
  private _didInitialScroll = false;
  private _initialScrollScheduled = false;
  private _initialScrollAttempts = 0;
  private _initialScrollRaf?: number;
  private _autoFollow = true;
  private _lastAutoScrollTop: number | null = null;

  /** Invoked by LucarneCardBase.setConfig(), which owns the error boundary. */
  protected applyConfig(config: LucarneCalendarCardConfig) {
    if (!config.calendars || !Array.isArray(config.calendars) || config.calendars.length === 0) {
      throw new LucarneConfigError('lucarne-calendar-card: "calendars" must be a non-empty array');
    }
    for (const cal of config.calendars) {
      // `cal` can be null: a bare `-` under `calendars:` is a common hand-edit slip,
      // and YAML makes that a null list item. Guard before dereferencing so this
      // stays a LucarneConfigError the user can read, rather than a TypeError the
      // base boundary would contain as an internal bug (leaving HA to accept the
      // broken config).
      if (!cal || typeof cal !== 'object' || !cal.entity || !cal.color) {
        throw new LucarneConfigError('lucarne-calendar-card: each calendar requires "entity" and "color"');
      }
    }
    // Normalize visible_hours to whole-hour boundaries
    let normalizedConfig = config;
    if (config.visible_hours) {
      const hhmmRe = /^\d{1,2}:\d{2}$/;
      if (!hhmmRe.test(config.visible_hours.start) || !hhmmRe.test(config.visible_hours.end)) {
        throw new LucarneConfigError('lucarne-calendar-card: "visible_hours" start and end must be in HH:MM format');
      }
      const startH = parseInt(config.visible_hours.start.split(':')[0], 10);
      const endH = parseInt(config.visible_hours.end.split(':')[0], 10);
      if (startH < 0 || endH > 24 || startH >= endH) {
        throw new LucarneConfigError('lucarne-calendar-card: "visible_hours" must satisfy 0 <= start < end <= 24');
      }
      normalizedConfig = {
        ...config,
        visible_hours: {
          start: `${String(startH).padStart(2, '0')}:00`,
          end: `${String(endH).padStart(2, '0')}:00`,
        },
      };
    }

    const prevConfig = this._config;
    this._config = normalizedConfig;
    this._visibleIds = new Set(config.calendars.map((c) => c.entity));
    if (this.hass) this._updateCreatableCalendars();

    if (!this._rolling) {
      // First setConfig call — instantiate the controller
      const effectiveCfg = this._effectiveConfig();
      this._lastVisibleCount = effectiveCfg.minDays;
      this._rolling = new RollingWindowController(this, {
        calendars: normalizedConfig.calendars,
        visibleCount: effectiveCfg.minDays,
        bufferDays: normalizedConfig.render_buffer_days,
        onFetchComplete: (events, failed) => this._onFetchComplete(events, failed),
        onChange: () => this._recompute(),
      });
    } else {
      // Subsequent setConfig calls — update calendars if changed
      this._rolling.updateCalendars(normalizedConfig.calendars);
      if (prevConfig?.render_buffer_days !== normalizedConfig.render_buffer_days) {
        this._rolling.setBufferDays(normalizedConfig.render_buffer_days);
      }
      // Re-run resize if window-related config changed
      if (
        prevConfig?.min_days !== config.min_days ||
        prevConfig?.max_days !== config.max_days ||
        prevConfig?.min_col_width !== config.min_col_width ||
        prevConfig?.max_col_width !== config.max_col_width
      ) {
        this._onResize();
      }
    }
  }

  static getStubConfig(hass: HomeAssistant): LucarneCalendarCardConfig {
    const calIds = Object.keys(hass.states)
      .filter((id) => id.startsWith('calendar.'))
      .slice(0, 3);
    const palettes = ['#a8d8b9', '#a8c5e8', '#c8b4e0'];
    const calendars: CalendarConfig[] = calIds.map((id, i) => ({
      entity: id,
      color: palettes[i] ?? '#a8d8b9',
    }));
    return {
      type: 'custom:lucarne-calendar-card',
      title: 'Calendar',
      calendars: calendars.length ? calendars : [{ entity: 'calendar.example', color: '#a8d8b9' }],
      visible_hours: { start: '07:00', end: '21:00' },
      show_create_button: true,
      min_days: 3,
      max_days: 7,
      min_col_width: 140,
      max_col_width: 220,
    };
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 9, rows: 'auto', min_columns: 6, max_columns: 12 };
  }

  static getConfigElement() {
    return document.createElement('lucarne-calendar-card-editor');
  }

  connectedCallback() {
    super.connectedCallback();
    // Lit auto-invokes RollingWindowController.hostConnected() via addController
    this._previewOverrideRaf = requestAnimationFrame(() => {
      this._previewOverrideRaf = undefined;
      if (!this.isConnected) return;
      this._previewOverride = installPreviewColumnOverride(this);
    });
    // Follow "now" as time advances while the user is viewing today.
    this._followTimer = setInterval(() => this._followNow(), FOLLOW_INTERVAL_MS);
    // Re-arm immediately rather than waiting for the next render: Lit keeps the
    // shadow tree across a detach, so `.grid-area` is already queryable here. A
    // no-op on the very first connect, where nothing has rendered yet.
    this._ensureGridMeasured();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Lit auto-invokes RollingWindowController.hostDisconnected() via addController
    if (this._previewOverrideRaf !== undefined) {
      cancelAnimationFrame(this._previewOverrideRaf);
      this._previewOverrideRaf = undefined;
    }
    if (this._followTimer !== undefined) {
      clearInterval(this._followTimer);
      this._followTimer = undefined;
    }
    // Re-scroll to now and resume following on the next attach.
    this._resetInitialScroll();
    this._autoFollow = true;
    this._lastAutoScrollTop = null;
    // Forget the target, don't just disconnect: firstUpdated() never runs again, so
    // a re-attach can only re-observe if _ensureGridMeasured() sees a clean slate.
    // Re-seeding also matters because the container may have been resized while
    // this card was detached (issue #105).
    this._teardownGridObserver();
    this._previewOverride?.uninstall();
    this._previewOverride = undefined;
  }

  firstUpdated() {
    this._ensureGridMeasured();
  }

  /**
   * Observe `.grid-area` and take the initial measurement. Idempotent, and called
   * from `updated()` as well as `firstUpdated()` because the grid is not always
   * present on the first render:
   *
   * - the card-base config boundary can swap the whole template to an error notice
   *   — before the first measurement or after it — and Lit fires `firstUpdated`
   *   only once per element. Without a later call the card would render the grid
   *   again after recovery but never measure it, leaving `_dayWidthPx` at 0 (which
   *   also blocks the initial scroll-to-now). Recovery builds a *new* `.grid-area`,
   *   which is why the guard compares element identity, not a "done" flag;
   * - `disconnectedCallback` tears the observer down, and a re-attach likewise
   *   gets no second `firstUpdated` (issue #105).
   *
   * Seeding via `_onResize()` happens independently of observing, so the grid
   * still lays out on a browser without ResizeObserver — it just won't re-measure
   * on resize. Matches the guard in components/member-column.ts.
   */
  private _ensureGridMeasured() {
    const area = this._gridAreaEl;
    if (!area) {
      if (this._observedGridEl !== undefined) {
        // The template swapped to the error notice, so the grid we were watching is
        // detached. Tear down instead of just returning: for a failure that never
        // recovers, an early return would keep a dead subtree observed and retained
        // for the life of the card. Whatever grid replaces it will be a fresh
        // element scrolled to the top, so re-arm the one-time scroll here too —
        // teardown clears `_observedGridEl`, so the recovery path can no longer
        // recognise it as a replacement on its own.
        this._teardownGridObserver();
        this._resetInitialScroll();
      }
      return;
    }
    if (area === this._observedGridEl) return;

    // Replacing a grid we had already measured (recovery after a contained config
    // failure) hands us a brand-new element scrolled to the top, exactly like a
    // re-attach — so the one-time scroll-to-now has to be armed again.
    const isReplacement = this._observedGridEl !== undefined;
    this._teardownGridObserver();
    this._observedGridEl = area;
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._onResize());
      this._resizeObserver.observe(area);
    }
    if (isReplacement) this._resetInitialScroll();
    this._onResize();
  }

  /** Stop observing and forget the target, so the next call re-arms from scratch. */
  private _teardownGridObserver() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._observedGridEl = undefined;
  }

  /** Re-arm the one-time scroll-to-now. Shared by disconnect and grid replacement. */
  private _resetInitialScroll() {
    if (this._initialScrollRaf !== undefined) {
      cancelAnimationFrame(this._initialScrollRaf);
      this._initialScrollRaf = undefined;
    }
    this._didInitialScroll = false;
    this._initialScrollScheduled = false;
    this._initialScrollAttempts = 0;
  }

  updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);
    // The grid may have appeared only on this render (post-config-failure recovery)
    // or been torn down by a detach; both need a re-arm that firstUpdated can't give.
    this._ensureGridMeasured();
    // Once the layout and real column width have landed, scroll to "now" once.
    // Instant (not smooth) on first paint so the view simply opens in place.
    if (!this._didInitialScroll && !this._initialScrollScheduled && this._layout && this._dayWidthPx > 0) {
      this._initialScrollScheduled = true;
      this._scheduleInitialScroll();
    }
    if (!changedProps.has('hass') || !this._config) return;
    this._rolling.setHass(this.hass);
    this._updateCreatableCalendars();
  }

  /**
   * Drive the one-time initial scroll on a rAF, retrying until the grid's shadow
   * geometry is measurable. `_performAutoScroll` can bail on the first frame(s)
   * (e.g. the grid's `.time-col` hasn't been laid out yet, measuring height 0);
   * marking the scroll "done" only on success — and retrying otherwise — avoids
   * leaving the view stuck at the top.
   */
  private _scheduleInitialScroll() {
    this._initialScrollRaf = requestAnimationFrame(() => {
      this._initialScrollRaf = undefined;
      if (!this.isConnected || this._didInitialScroll) {
        this._initialScrollScheduled = false;
        return;
      }
      if (this._performAutoScroll('auto')) {
        this._didInitialScroll = true;
        this._initialScrollScheduled = false;
        return;
      }
      if (++this._initialScrollAttempts < MAX_INITIAL_SCROLL_FRAMES) {
        this._scheduleInitialScroll();
      } else {
        // Geometry never became measurable; let the follow tick recover.
        this._initialScrollScheduled = false;
      }
    });
  }

  /**
   * Scroll `.grid-area` so the current time sits near the top with one hour of
   * padding above it. Measures the live time-grid geometry from the grid's
   * shadow root and delegates the clamping math to {@link computeNowScrollTop}.
   * Returns `true` once it actually scrolled, `false` if the geometry wasn't
   * measurable yet (so callers can retry).
   */
  private _performAutoScroll(behavior: ScrollBehavior): boolean {
    const area = this._gridAreaEl;
    if (!area || !this._config) return false;
    const gridEl = this.renderRoot.querySelector('lucarne-calendar-grid');
    const timeCol = gridEl?.shadowRoot?.querySelector('.time-col') as HTMLElement | null;
    if (!timeCol) return false;

    const areaRect = area.getBoundingClientRect();
    const colRect = timeCol.getBoundingClientRect();
    if (colRect.height <= 0) return false;

    const [bandStartH] = (this._config.visible_hours?.start ?? '07:00').split(':').map(Number);
    const [bandEndH] = (this._config.visible_hours?.end ?? '21:00').split(':').map(Number);
    const bandHours = bandEndH - bandStartH;
    if (bandHours <= 0) return false;

    const top = computeNowScrollTop({
      now: new Date(),
      bandStartH,
      bandEndH,
      // Offset of the time grid within the scroll content (independent of current scroll).
      timeGridTopPx: colRect.top - areaRect.top + area.scrollTop,
      timeGridHeightPx: colRect.height,
      paddingPx: colRect.height / bandHours, // one hour of breathing room
      maxScrollTop: area.scrollHeight - area.clientHeight,
    });

    area.scrollTo({ top, behavior });
    this._lastAutoScrollTop = top;
    return true;
  }

  /** Follow "now" on the periodic tick, unless the user has scrolled away. */
  private _followNow() {
    if (!this._autoFollow || !this._rolling?.isAtToday) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const area = this._gridAreaEl;
    if (!area) return;
    // Detect a manual scroll: the content doesn't move on its own between ticks,
    // so any meaningful drift from our last target means the user took over.
    if (
      this._lastAutoScrollTop !== null &&
      Math.abs(area.scrollTop - this._lastAutoScrollTop) > FOLLOW_DIVERGENCE_TOLERANCE_PX
    ) {
      this._autoFollow = false;
      return;
    }
    this._performAutoScroll('smooth');
  }

  /** "Today" button: re-anchor, resume following, and re-center on now. */
  private _onTodayClick() {
    this._rolling.goToToday();
    this._autoFollow = true;
    this.updateComplete.then(() =>
      requestAnimationFrame(() => this._performAutoScroll('smooth')),
    );
  }

  private _effectiveConfig(): VisibleWindowConfig {
    const cfg = this._config!;
    return {
      minDays:     cfg.min_days      && cfg.min_days      > 0 ? cfg.min_days      : 3,
      maxDays:     cfg.max_days      && cfg.max_days      > 0 ? cfg.max_days      : 7,
      minColWidth: cfg.min_col_width && cfg.min_col_width > 0 ? cfg.min_col_width : 140,
      maxColWidth: cfg.max_col_width && cfg.max_col_width > 0 ? cfg.max_col_width : 220,
      timeColWidth: 40,
    };
  }

  private _onResize() {
    if (this._resizeFrame !== undefined) return;
    this._resizeFrame = requestAnimationFrame(() => {
      this._resizeFrame = undefined;
      const w = this._gridAreaEl?.getBoundingClientRect().width ?? 0;
      const { visibleCount, dayWidthPx } = computeVisibleDays(w, this._effectiveConfig());
      if (visibleCount !== this._lastVisibleCount) {
        this._lastVisibleCount = visibleCount;
        this._rolling.setVisibleCount(visibleCount);
        this.style.setProperty('--lucarne-day-count', String(visibleCount));
      }
      this._dayWidthPx = dayWidthPx;
    });
  }

  private _recompute() {
    if (!this._config) return;
    const allEvents: CalendarEvent[] = [];
    for (const [entityId, events] of this._rolling.cachedEvents.entries()) {
      if (this._visibleIds.has(entityId)) {
        allEvents.push(...events);
      }
    }
    allEvents.push(
      ...this._pendingEvents.filter((e) => {
        const entityId = e.uid?.split('::')[0];
        return entityId ? this._visibleIds.has(entityId) : true;
      }),
    );
    const filtered = this._deletedUids.size > 0
      ? allEvents.filter((e) => !e.uid || !this._deletedUids.has(e.uid))
      : allEvents;
    const bandStart = this._config.visible_hours?.start ?? '07:00';
    const bandEnd = this._config.visible_hours?.end ?? '21:00';
    // Lay out events across the FULL render range (visible + buffer on each
    // side). The grid renders all of them; off-screen buffer columns slide
    // into view during pan, so the user never sees a blank gap.
    const days = this._rolling.renderDays;
    this._layout = layoutEvents(filtered, days, bandStart, bandEnd);
  }

  private _supportsCreate(entityId: string): boolean {
    const supported = this.hass?.states[entityId]?.attributes?.['supported_features'] as number | undefined;
    return supported !== undefined && (supported & 1) !== 0;
  }

  private _updateCreatableCalendars() {
    if (!this._config || !this.hass) return;
    const next = this._config.calendars.filter((c) => this._supportsCreate(c.entity));
    const same =
      next.length === this._creatableCalendars.length &&
      next.every((c, i) => c.entity === this._creatableCalendars[i]?.entity);
    if (!same) this._creatableCalendars = next;
  }

  private _onVisibilityChange(e: CustomEvent<Set<string>>) {
    this._visibleIds = e.detail;
    this._recompute();
  }

  private _onEventTap(e: CustomEvent<{ event: CalendarEvent; color: string }>) {
    const { event, color } = e.detail;
    this._openEvent = event;
    this._openEventColor = color;
    if (event.uid?.includes('::')) {
      const entityId = event.uid.split('::')[0];
      this._openEventEntityId = entityId;
      const cal = this._config?.calendars.find((c) => c.entity === entityId);
      this._openEventCalLabel = cal ? resolveCalendarLabel(cal, this.hass) : '';
    } else {
      this._openEventEntityId = '';
      this._openEventCalLabel = '';
    }
  }

  private _onEventDeleted(e: CustomEvent<{ entityId: string; uid: string }>) {
    this._deletedUids = new Set([...this._deletedUids, e.detail.uid]);
    this._openEvent = null;
    this._openEventEntityId = '';
    this._recompute();
  }

  /**
   * Called by RollingWindowController after every successful fetch. Clears
   * `_pendingEvents` (optimistic creates have either landed or been
   * superseded) and prunes `_deletedUids` so it only retains uids the server
   * still returns — i.e. our delete hasn't propagated yet. Wholesale-clearing
   * here would let a stale fetch resurrect a freshly-deleted event between
   * the user's tap and the server's next state.
   *
   * `failed` is the set of entity ids whose REST fetch
   * (`GET /api/calendars/<entity_id>`) threw. Tombstones whose entity prefix
   * is in `failed` are NEVER pruned, because we can't distinguish "really
   * gone" from "the fetch never returned data for this entity." Without this
   * guard, a transient per-entity failure would silently resurrect every
   * optimistic delete for that entity.
   */
  private _onFetchComplete(events: Map<string, CalendarEvent[]>, failed: Set<string>) {
    this._pendingEvents = [];
    if (this._deletedUids.size > 0) {
      const presentUids = new Set<string>();
      for (const list of events.values()) {
        for (const e of list) {
          if (e.uid) presentUids.add(e.uid);
        }
      }
      const pruned = new Set<string>();
      for (const uid of this._deletedUids) {
        const entityId = uid.includes('::') ? uid.split('::')[0] : '';
        // Keep when: (a) the entity's fetch failed (no signal), OR
        // (b) the server still returns the event (delete pending).
        if (failed.has(entityId) || presentUids.has(uid)) {
          pruned.add(uid);
        }
      }
      this._deletedUids = pruned;
    }
    this._recompute();
  }

  private _closePopover() {
    this._openEvent = null;
  }

  private _onCreateEventTap(e: CustomEvent<{ day: Date; startHour: number }>) {
    const { day, startHour } = e.detail;
    this._createDay = day;
    this._createStartHour = startHour;
  }

  private _closeCreatePopover() {
    this._createDay = null;
  }

  private _onEventCreated(e: CustomEvent<{ entityId: string; event: CalendarEvent }>) {
    const { event } = e.detail;
    this._pendingEvents = [...this._pendingEvents, event];
    this._recompute();
    this._closeCreatePopover();
  }

  private _rangeLabel(): string {
    const days = this._rolling.days;
    if (days.length === 0) return '';
    const start = days[0];
    const end = days[days.length - 1];
    const mdy = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', opts);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${mdy(start, { month: 'short', day: 'numeric' })} – ${mdy(end, { day: 'numeric' })}`;
    }
    if (sameYear) {
      return `${mdy(start, { month: 'short', day: 'numeric' })} – ${mdy(end, { month: 'short', day: 'numeric' })}`;
    }
    return `${mdy(start, { month: 'short', day: 'numeric', year: 'numeric' })} – ${mdy(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  protected renderContent() {
    if (!this._config) return html``;
    const bandStart = this._config.visible_hours?.start ?? '07:00';
    const bandEnd = this._config.visible_hours?.end ?? '21:00';
    const resolvedCalendars = resolveCalendars(this._config.calendars, this.hass);
    const resolvedCreatable = resolveCalendars(this._creatableCalendars, this.hass);

    return html`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${this._config.title ?? 'Calendar'}</h2>
          <div class="week-nav">
            <button
              class="nav-btn"
              @click=${() => this._rolling.pan(-this._lastVisibleCount)}
              ?disabled=${!this._rolling.canPanBack}
              aria-label="Previous ${this._lastVisibleCount} days"
            >←</button>
            ${!this._rolling.isAtToday
              ? html`<button class="nav-btn" @click=${() => this._onTodayClick()} aria-label="Today">Today</button>`
              : ''}
            <span class="week-label">${this._rangeLabel()}</span>
            <button
              class="nav-btn"
              @click=${() => this._rolling.pan(+this._lastVisibleCount)}
              ?disabled=${!this._rolling.canPanForward}
              aria-label="Next ${this._lastVisibleCount} days"
            >→</button>
          </div>
        </div>

        <div class="pills-row">
          <lucarne-visibility-pills
            .calendars=${resolvedCalendars}
            .visibleIds=${this._visibleIds}
            @visibility-change=${this._onVisibilityChange}
          ></lucarne-visibility-pills>
        </div>

        <div
          class="grid-area"
          @lucarne-event-tap=${this._onEventTap}
          @lucarne-create-event-tap=${this._onCreateEventTap}
        >
          <lucarne-calendar-day-pan
            .dayWidthPx=${this._dayWidthPx}
            .bufferDays=${this._rolling.bufferDays}
            .canPanBack=${this._rolling.canPanBack}
            .canPanForward=${this._rolling.canPanForward}
            @pan-snap=${(e: CustomEvent<{ deltaDays: number }>) => this._rolling.pan(-e.detail.deltaDays)}
          >
            <lucarne-calendar-grid
              .layout=${this._layout}
              .bandStart=${bandStart}
              .bandEnd=${bandEnd}
              .calendars=${resolvedCalendars}
              .dayWidthPx=${this._dayWidthPx}
              .bufferDays=${this._rolling.bufferDays}
              .cachedDayKeys=${new Set(this._rolling.cachedRange.map(isoDateKey))}
              .showCreateButton=${(this._config.show_create_button ?? true) && this._creatableCalendars.length > 0}
            ></lucarne-calendar-grid>
          </lucarne-calendar-day-pan>
        </div>

        ${this._openEvent
          ? html`
              <lucarne-calendar-event-popover
                .event=${this._openEvent}
                .color=${this._openEventColor}
                .calendarLabel=${this._openEventCalLabel}
                .hass=${this.hass}
                .entityId=${this._openEventEntityId}
                @popover-close=${this._closePopover}
                @lucarne-event-deleted=${this._onEventDeleted}
              ></lucarne-calendar-event-popover>
            `
          : ''}

        ${this._createDay !== null
          ? html`
              <lucarne-create-event-popover
                .hass=${this.hass}
                .day=${this._createDay}
                .startHour=${this._createStartHour}
                .calendars=${resolvedCreatable}
                @popover-close=${this._closeCreatePopover}
                @lucarne-event-created=${this._onEventCreated}
              ></lucarne-create-event-popover>
            `
          : ''}
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-calendar-card': LucarneCalendarCard;
  }
}
