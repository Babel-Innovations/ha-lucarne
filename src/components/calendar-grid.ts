import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import type { CalendarConfig, CalendarEvent } from '../shared/types.js';
import type { CalendarLayoutResult } from '../shared/calendar-layout.js';
import { isoDateKey, eventKey } from '../shared/calendar-layout.js';
import { hoursInBand } from '../shared/date-helpers.js';
import './calendar-event-block.js';
import './out-of-band-stub.js';
import './skeleton-day-column.js';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

@customElement('lucarne-calendar-grid')
export class LucarneCalendarGrid extends LitElement {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: block;
        position: relative;
      }
      /*
       * Two stacked blocks, not one 3-row grid: .grid-head (day names +
       * all-day) is position:sticky so both rows stay pinned while the time
       * band scrolls under it (issue #82). Both blocks declare the same
       * grid-template-columns, which is what keeps the gutter and the day
       * columns aligned across the split.
       *
       * Why one block rather than two sticky rows: sticky siblings all resolve
       * top against the same scrollport, so a sticky all-day row would need
       * top = height-of-the-day-name-row to sit below the headers instead of
       * under them — a hard-coded offset that breaks as soon as the header's
       * font, padding, or the narrow-column layout changes its height. One
       * sticky block pins both rows at top: 0 with no measurement.
       *
       * The wrapper must stay overflow-visible and span the full content
       * height: it is the sticky element's containing block, so it defines how
       * far the head may travel.
       */
      .grid-wrapper {
        display: block;
      }
      /* minmax(0, 1fr) prevents the .day-cols-track (which is wider than 1fr
         when render buffer columns are present) from expanding the column. */
      .grid-head,
      .grid-body {
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr);
      }
      .grid-head {
        position: sticky;
        top: 0;
        z-index: 6;
        grid-template-rows: auto auto;
        /* Opaque: the time band scrolls underneath it. .day-header and the two
           gutter spacers paint their own surface, but .allday-cell does not. */
        background: var(--lucarne-surface);
      }
      /*
       * Wraps ONLY the all-day .day-cols-track in a column-2-scoped
       * overflow:hidden box (issue #3). On iPad Safari the gutter spacer
       * wasn't reliably stacking above the all-day track's transform-induced
       * stacking context, so all-day events bled across the hour column during
       * pan. Clipping at the column boundary fixes it unconditionally and
       * browser-agnostic.
       *
       * Why the all-day row only:
       *  - The day-name row's events are the headers themselves, which never
       *    overflow their column.
       *  - The time-band row contains <lucarne-out-of-band-stub> whose
       *    backdrop/popover are position: fixed. Because .day-cols-track has a
       *    transform, it is the containing block for those fixed children;
       *    clipping it would also clip the stub's full-viewport overlay.
       *  - The time band's regular events already don't bleed past the gutter
       *    (the .time-col sticky spacer plus the .day-col isolation: isolate
       *    keep them stacked correctly).
       */
      .day-cols-clip {
        grid-column: 2;
        overflow: hidden;
        min-width: 0;
      }
      /*
       * Three .day-cols-track elements — day names, all-day, time band — so that
       * each row is sized by its own day-column content. All three receive the
       * same translateX during pan. Using a single spanning element would
       * decouple the inner sub-grid row sizing from the outer rows and cause the
       * time-column gutter labels to misalign with the day content (no CSS
       * subgrid on Safari < 16).
       *
       * Track is rendered at fixed px widths (--lucarne-day-render-count columns
       * × --lucarne-day-width-px each) so visible columns keep their target width
       * even with buffer days added on either side. The baseline transform shifts
       * the track left by bufferDays * dayWidthPx so visible day 0 lands at the
       * container's left edge. The pan handler overrides transform via inline
       * style during gestures; on snap completion it clears the inline style so
       * this CSS baseline reapplies (the new days then occupy the same screen
       * position as the OLD days at the snap target — visually invisible swap).
       *
       * The day-name and time-band tracks sit directly in grid-column 2; the
       * all-day track is wrapped in a .day-cols-clip first (see the
       * .day-cols-clip rule above for why only that one needs the wrapper).
       */
      .day-cols-track {
        grid-column: 2;
        display: grid;
        grid-template-columns: repeat(var(--lucarne-day-render-count, 7), var(--lucarne-day-width-px, 140px));
        width: calc(var(--lucarne-day-render-count, 7) * var(--lucarne-day-width-px, 140px));
        transform: translateX(var(--lucarne-day-baseline-px, 0px));
        will-change: transform;
      }
      /*
       * Reset grid-column on the inner track when it's inside a clip wrapper —
       * the wrapper already owns grid-column 2; the track is now a normal block
       * child of the wrapper, not a grid item.
       */
      .day-cols-clip > .day-cols-track {
        grid-column: auto;
      }
      /* Header row: day names */
      .header-spacer {
        grid-column: 1;
        grid-row: 1;
        /* sticky (not relative) so the gutter cells hold column 1 alongside
           .time-col if scrollLeft ever leaves 0 — overflow-x: hidden still
           scrolls programmatically, e.g. when focus moves to an off-screen
           buffer day. z-index keeps this painted over the day-name track, which
           is wider than its column while buffer days are rendered. */
        position: sticky;
        left: 0;
        z-index: 4;
        background: var(--lucarne-surface);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        border-right: 1px solid rgba(0, 0, 0, 0.07);
      }
      .day-header {
        text-align: center;
        padding: var(--lucarne-spacing-xs) 2px;
        font-size: var(--lucarne-fs-sm);
        font-weight: 700;
        color: var(--lucarne-on-surface-muted);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        user-select: none;
        background: var(--lucarne-surface);
        /* Container query target: lets the @container rule below hide the
           weekday when the column itself becomes too narrow. inline-size
           queries the header's inline width, which equals --lucarne-day-width-px. */
        container-type: inline-size;
      }
      .day-header .day-pill {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        line-height: 1.1;
        max-width: 100%;
      }
      .day-header .day-weekday {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
      }
      .day-header .day-num {
        font-size: var(--lucarne-fs-md);
        font-weight: 700;
      }
      .day-header.today .day-pill {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      /* Narrow column: drop the weekday name so the day number still fits
         comfortably inside the pill. 70px ≈ enough for "30" with padding;
         below that "Sun 30" wraps or overflows. */
      @container (max-width: 70px) {
        .day-header .day-weekday {
          display: none;
        }
      }
      /* All-day row */
      .allday-spacer {
        grid-column: 1;
        grid-row: 2;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        font-size: 0.65rem;
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        min-height: 24px;
        /* Sticky for the same reason as .header-spacer above. */
        position: sticky;
        left: 0;
        z-index: 2;
        background: var(--lucarne-surface);
      }
      .allday-cell {
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        padding: 2px 1px;
        min-height: 24px;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .allday-skeleton {
        height: 18px;
        border-radius: 3px;
        margin: 2px 4px;
        background: var(--lucarne-skeleton-base);
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }
      .shimmer-sweep {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--lucarne-skeleton-highlight) 50%,
          transparent 100%
        );
        animation: allday-shimmer 3s ease-in-out infinite;
      }
      @keyframes allday-shimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .shimmer-sweep {
          display: none;
        }
      }
      .allday-event {
        font-size: 0.7rem;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 3px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: rgba(0, 0, 0, 0.8);
      }
      .clip-chevron {
        font-style: normal;
        margin: 0 1px;
        opacity: 0.7;
      }
      /* Time grid */
      .time-col {
        grid-column: 1;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        position: sticky;
        left: 0;
        z-index: 2;
        background: var(--lucarne-surface);
      }
      .hour-label {
        position: absolute;
        right: 6px;
        font-size: 0.68rem;
        color: var(--lucarne-on-surface-muted);
        transform: translateY(-50%);
        white-space: nowrap;
        user-select: none;
      }
      /* The band's first label sits at top:0, so centring it on the line pushes
         half of it above the time column — where the sticky head now paints over
         it. Hang it below the line instead so it stays fully readable. */
      .hour-label.first {
        transform: none;
      }
      .day-col {
        position: relative;
        isolation: isolate;
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        overflow: visible;
        touch-action: manipulation;
      }
      .hour-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(0, 0, 0, 0.06);
        pointer-events: none;
      }
      .now-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: #e53935;
        z-index: 5;
        pointer-events: none;
      }
      .now-line::before {
        content: '';
        position: absolute;
        left: -4px;
        top: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #e53935;
      }
      .day-col-wrapper {
        display: flex;
        flex-direction: column;
      }
      .stub-area-top {
        padding: 2px 2px 0;
        flex-shrink: 0;
      }
      .stub-area-bottom {
        padding: 0 2px 2px;
        flex-shrink: 0;
      }
    `,
  ];

  @property({ type: Object }) layout: CalendarLayoutResult | null = null;
  @property({ type: String }) bandStart = '07:00';
  @property({ type: String }) bandEnd = '21:00';
  @property({ type: Array }) calendars: CalendarConfig[] = [];
  @property({ type: Number }) hourHeightPx = 60;
  @property({ type: Boolean }) showCreateButton = false;
  /** Current day width in px — informational; used by Phase 3 skeleton and pan math. */
  @property({ type: Number }) dayWidthPx = 0;
  /** Off-screen render buffer (days drawn on each side of the visible window). */
  @property({ type: Number }) bufferDays = 0;
  /** Set of ISO date keys (YYYY-MM-DD) for days that have cached events. Days not in this set render as skeletons. */
  @property({ attribute: false }) cachedDayKeys: Set<string> = new Set();

  private get _colorMap(): Map<string, string> {
    const m = new Map<string, string>();
    for (const cal of this.calendars) m.set(cal.entity, cal.color);
    return m;
  }

  private _eventColor(event: CalendarEvent): string {
    const colorMap = this._colorMap;
    if (event.uid?.includes('::')) {
      const entityId = event.uid.split('::')[0];
      return colorMap.get(entityId) ?? '#a8d8b9';
    }
    return '#a8d8b9';
  }

  private _onBandClick(e: MouseEvent, day: Date) {
    if (!this.showCreateButton) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const [bandStartH] = this.bandStart.split(':').map(Number);
    const [bandEndH] = this.bandEnd.split(':').map(Number);
    const bandH = bandEndH - bandStartH;
    const yRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const rawHour = bandStartH + yRatio * bandH;
    // Round to nearest 0.5h; clamp so default 1h event fits within band
    const startHour = Math.min(bandEndH - 1, Math.round(rawHour * 2) / 2);
    this.dispatchEvent(
      new CustomEvent('lucarne-create-event-tap', {
        detail: { day, startHour },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _buildEventColorMap(events: CalendarEvent[]): Map<string, string> {
    const m = new Map<string, string>();
    for (const e of events) {
      m.set(e.uid ?? '', this._eventColor(e));
    }
    return m;
  }

  private _renderDayColumn(day: Date, now: Date) {
    if (!this.layout) return html``;
    const dayKey = isoDateKey(day);
    const dayLayout = this.layout.perDay.get(dayKey);
    if (!dayLayout) return html``;

    const hours = hoursInBand(this.bandStart, this.bandEnd);
    const bandH = hours.length - 1; // number of hour intervals
    const totalHeight = bandH * this.hourHeightPx;

    const isToday = isSameDay(day, now);
    const [bandStartH] = this.bandStart.split(':').map(Number);
    const [bandEndH] = this.bandEnd.split(':').map(Number);
    const bandDurationMs = (bandEndH - bandStartH) * 3600000;

    let nowLinePercent: number | null = null;
    if (isToday) {
      const dayStart = new Date(day);
      dayStart.setHours(bandStartH, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(bandEndH, 0, 0, 0);
      if (now >= dayStart && now <= dayEnd) {
        nowLinePercent = ((now.getTime() - dayStart.getTime()) / bandDurationMs) * 100;
      }
    }

    const eventColorMap = this._buildEventColorMap([...dayLayout.inBand.map((b) => b.event), ...dayLayout.earlier, ...dayLayout.later]);

    return html`
      <div class="day-col-wrapper">
        ${dayLayout.earlier.length > 0
          ? html`
              <div class="stub-area-top">
                <lucarne-out-of-band-stub
                  .events=${dayLayout.earlier}
                  label="earlier"
                  .eventColors=${eventColorMap}
                ></lucarne-out-of-band-stub>
              </div>
            `
          : ''}

        <div
          class="day-col"
          style="height:${totalHeight}px${this.showCreateButton ? '; cursor: crosshair' : ''}"
          @click=${(e: MouseEvent) => this._onBandClick(e, day)}
        >
          ${hours.slice(0, -1).map(
            (_, i) => html`
              <div
                class="hour-line"
                style="top: ${((i + 1) / (hours.length - 1)) * 100}%"
              ></div>
            `,
          )}

          ${nowLinePercent !== null
            ? html`<div class="now-line" style="top:${nowLinePercent}%"></div>`
            : ''}

          ${dayLayout.inBand.map((block) => {
            const width = 100 / block.laneCount;
            const left = (block.lane / block.laneCount) * 100;
            const color = this._eventColor(block.event);
            return html`
              <lucarne-calendar-event-block
                style="
                  position: absolute;
                  top: ${block.topPercent}%;
                  left: calc(${left}% + 1px);
                  width: calc(${width}% - 2px);
                  height: ${block.heightPercent}%;
                  z-index: ${block.lane + 1};
                  background: ${color}cc;
                  border-left-color: ${color};
                "
                .event=${block.event}
                .color=${color}
                .lane=${block.lane}
                .laneCount=${block.laneCount}
                .topPercent=${block.topPercent}
                .heightPercent=${block.heightPercent}
              ></lucarne-calendar-event-block>
            `;
          })}
        </div>

        ${dayLayout.later.length > 0
          ? html`
              <div class="stub-area-bottom">
                <lucarne-out-of-band-stub
                  .events=${dayLayout.later}
                  label="tonight"
                  .eventColors=${eventColorMap}
                ></lucarne-out-of-band-stub>
              </div>
            `
          : ''}
      </div>
    `;
  }

  render() {
    if (!this.layout) return html`<div>Loading…</div>`;

    const now = new Date();
    const hours = hoursInBand(this.bandStart, this.bandEnd);
    const bandH = hours.length - 1;
    const totalHeight = bandH * this.hourHeightPx;

    const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

    // Before the card's ResizeObserver/rAF computes a real width, dayWidthPx
    // is 0. Writing `--lucarne-day-width-px: 0px` would override the CSS
    // fallback (`var(..., 140px)`) and collapse every column to 0px on the
    // first paint. Omit both custom properties in that case so the CSS
    // defaults apply (140px columns, 0px baseline) until the real width
    // lands; once dayWidthPx > 0, the inline values take over.
    const gridVars: Record<string, string> = {
      '--lucarne-day-render-count': String(this.layout.days.length),
    };
    if (this.dayWidthPx > 0) {
      gridVars['--lucarne-day-width-px'] = `${this.dayWidthPx}px`;
      gridVars['--lucarne-day-baseline-px'] = `${-this.bufferDays * this.dayWidthPx}px`;
    }

    return html`
      <div class="grid-wrapper" style=${styleMap(gridVars)}>
        <!-- Sticky head: day names + all-day rows stay pinned while the time band scrolls -->
        <div class="grid-head">
          <!-- Time-column gutter cells (col 1): stay fixed during pan -->
          <div class="header-spacer"></div>

          <!-- Day header track -->
          <div class="day-cols-track" style="grid-row:1">
            ${this.layout.days.map(
              (day, idx) => html`
                <div
                  class="day-header ${isSameDay(day, now) ? 'today' : ''}"
                  style="grid-column: ${idx + 1}"
                >
                  <div class="day-pill">
                    <span class="day-weekday">${weekdayFmt.format(day)}</span>
                    <span class="day-num">${day.getDate()}</span>
                  </div>
                </div>
              `,
            )}
          </div>

          <div class="allday-spacer">all-day</div>

          <!-- All-day event track (wrapped in .day-cols-clip — see CSS) -->
          <div class="day-cols-clip" style="grid-row:2">
            <div class="day-cols-track">
              ${this.layout.days.map((day, idx) => {
                const dayKey = isoDateKey(day);
                const isCached = this.cachedDayKeys.has(dayKey);
                const dayLayout = this.layout!.perDay.get(dayKey);
                return html`
                  <div class="allday-cell" style="grid-column: ${idx + 1}">
                    ${!isCached
                      ? html`<div class="allday-skeleton"><div class="shimmer-sweep"></div></div>`
                      : (dayLayout?.allDay ?? []).map(
                        (event) => {
                          const clip = dayLayout?.allDayClipped?.get(eventKey(event));
                          return html`
                            <div
                              class="allday-event"
                              style="background: ${this._eventColor(event)}cc"
                              @click=${(e: MouseEvent) => {
                                e.stopPropagation();
                                this.dispatchEvent(
                                  new CustomEvent('lucarne-event-tap', {
                                    detail: { event, color: this._eventColor(event) },
                                    bubbles: true,
                                    composed: true,
                                  }),
                                );
                              }}
                            >
                              ${clip?.left ? html`<span class="clip-chevron">‹</span>` : ''}${event.summary}${clip?.right ? html`<span class="clip-chevron">›</span>` : ''}
                            </div>
                          `;
                        },
                      )}
                  </div>
                `;
              })}
            </div>
          </div>
        </div>

        <div class="grid-body">
          <div class="time-col" style="height:${totalHeight}px">
            ${hours.map(
              (h, i) => html`
                <div
                  class="hour-label ${i === 0 ? 'first' : ''}"
                  style="top: ${(i / (hours.length - 1)) * 100}%"
                >
                  ${h === 0 || h === 24 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              `,
            )}
          </div>

          <!-- Time-band columns track -->
          <div class="day-cols-track">
            ${this.layout.days.map((day, idx) => {
              const dayKey = isoDateKey(day);
              const isCached = this.cachedDayKeys.has(dayKey);
              return html`
                <div style="grid-column:${idx + 1}; position:relative; overflow:visible; display:flex; flex-direction:column;">
                  ${isCached
                    ? this._renderDayColumn(day, now)
                    : html`<lucarne-skeleton-day-column
                        .bandStart=${this.bandStart}
                        .bandEnd=${this.bandEnd}
                        .hourHeightPx=${this.hourHeightPx}
                      ></lucarne-skeleton-day-column>`}
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-calendar-grid': LucarneCalendarGrid;
  }
}
