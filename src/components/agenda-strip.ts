import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { STRINGS } from '../shared/strings.js';
import type { CalendarEvent } from '../shared/types.js';

function parseEventBoundary(value: string): Date {
  // Date-only strings (YYYY-MM-DD) must be parsed in local time, not UTC.
  // A string like "2026-05-22" parsed as UTC becomes 2026-05-21T17:00 Pacific,
  // causing all-day events to vanish from the list after ~5pm local.
  return value.length === 10 ? new Date(value + 'T00:00:00') : new Date(value);
}

/** 1 = today only; 2 = today + tomorrow. */
export type AgendaWindowDays = 1 | 2;

/**
 * Keep the events relevant to the agenda window: ending strictly after the
 * START OF TODAY (events ending exactly at local midnight are excluded) AND
 * starting before the window closes. Anchoring to the
 * start of the local day means events that already ended earlier today stay in
 * the list all day — the card is titled "Today", so a 9am event should remain
 * visible (dimmed) at 11am rather than vanishing and leaving "Nothing on the
 * calendar today". windowDays=1 shows only today; windowDays=2 adds tomorrow.
 * Both boundaries are computed in LOCAL time so date-only all-day events line up
 * with the viewer's calendar day rather than UTC.
 */
export function filterAndSortEvents(
  events: CalendarEvent[],
  now: Date,
  windowDays: AgendaWindowDays,
): CalendarEvent[] {
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + windowDays);
  return events
    .filter(
      (e) => parseEventBoundary(e.end) > windowStart && parseEventBoundary(e.start) < windowEnd,
    )
    .sort((a, b) => parseEventBoundary(a.start).getTime() - parseEventBoundary(b.start).getTime());
}

function formatTimePill(start: Date, end: Date, now: Date): string {
  const diffMs = start.getTime() - now.getTime();
  const isHappeningNow = start <= now && now < end;

  if (isHappeningNow) return STRINGS.timePillNow;

  if (diffMs > 0 && diffMs < 60 * 60 * 1000) {
    const mins = Math.round(diffMs / 60000);
    return STRINGS.timePillInMinutes(mins);
  }
  if (diffMs > 0 && diffMs < 2 * 60 * 60 * 1000) {
    const hrs = Math.round(diffMs / 3600000);
    return STRINGS.timePillInHours(hrs);
  }

  const timeStr = start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });

  const sameDay = start.toDateString() === now.toDateString();
  if (sameDay) return timeStr;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (start.toDateString() === tomorrow.toDateString()) {
    return STRINGS.timePillTomorrow(timeStr);
  }

  const dayName = start.toLocaleDateString('en', { weekday: 'short' });
  return `${dayName} ${timeStr}`;
}

function isAllDay(event: CalendarEvent): boolean {
  return event.start.length === 10 && event.end.length === 10;
}

@customElement('lucarne-agenda-strip')
export class LucarneAgendaStrip extends LitElement {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
        container-type: inline-size;
        /* A long today-list scrolls within the section instead of stretching
           the card. The host card can tune the cap via --lucarne-agenda-max-height. */
        max-height: var(--lucarne-agenda-max-height, 360px);
        overflow-y: auto;
      }
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--lucarne-spacing-xl) 0;
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-md);
        text-align: center;
      }
      .event-row {
        display: flex;
        align-items: flex-start;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-sm) 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }
      .event-row:last-child {
        border-bottom: none;
      }
      /* Events that already ended earlier today stay listed but read as done. */
      .event-row.past {
        opacity: 0.45;
      }
      .event-row.past .event-summary {
        text-decoration: line-through;
      }
      .time-pill {
        flex-shrink: 0;
        min-width: 64px;
        padding: 3px 8px;
        border-radius: var(--lucarne-radius-md);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        text-align: center;
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .time-pill.now {
        background: rgba(76, 175, 80, 0.15);
        color: #2e7d32;
      }
      .pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #4caf50;
        animation: pulse 1.4s ease-in-out infinite;
        flex-shrink: 0;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.85); }
      }
      .color-bar {
        flex-shrink: 0;
        width: 4px;
        min-height: 36px;
        border-radius: var(--lucarne-radius-sm);
        align-self: stretch;
      }
      .event-content {
        flex: 1;
        min-width: 0;
      }
      .event-summary {
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        color: var(--lucarne-on-surface);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .event-secondary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @container (min-width: 600px) {
        :host {
          display: flex;
          flex-direction: column;
        }
      }
    `,
  ];

  @property({ type: Array }) events: CalendarEvent[] = [];
  @property({ type: Object }) calendarColors: Map<string, string> = new Map();
  @property({ type: Number }) windowDays: AgendaWindowDays = 1;

  render() {
    const now = new Date();
    const sorted = filterAndSortEvents(this.events, now, this.windowDays);

    if (sorted.length === 0) {
      return html`<div class="empty-state">${STRINGS.nothingOnCalendar}</div>`;
    }

    return html`
      ${sorted.map((event) => {
        const startDate = parseEventBoundary(event.start);
        const endDate = parseEventBoundary(event.end);
        const isNow = startDate <= now && now < endDate;
        // A timed event that already ended earlier today: keep it visible but
        // dimmed so it reads as done. All-day events span the whole day, so they
        // are never treated as past.
        const isPast = !isAllDay(event) && endDate <= now;
        const pill = isAllDay(event) ? 'all day' : formatTimePill(startDate, endDate, now);
        const color = this._colorForEvent(event);

        return html`
          <div class="event-row ${isPast ? 'past' : ''}">
            <div class="time-pill ${isNow ? 'now' : ''}">
              ${isNow ? html`<span class="pulse-dot"></span>` : ''} ${pill}
            </div>
            <div class="color-bar" style="background:${color}"></div>
            <div class="event-content">
              <div class="event-summary">${event.summary}</div>
              ${event.location ? html`<div class="event-secondary">${event.location}</div>` : ''}
            </div>
          </div>
        `;
      })}
    `;
  }

  private _colorForEvent(event: CalendarEvent): string {
    // calendarColors is keyed by entity_id; events don't carry entity_id directly.
    // The parent merges events with entity colors before passing them in via a
    // tagged CalendarEvent (uid carries entity_id prefix set by the parent).
    if (event.uid) {
      const entityId = event.uid.split('::')[0];
      const color = this.calendarColors.get(entityId);
      if (color) return color;
    }
    return 'var(--lucarne-color-family)';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-agenda-strip': LucarneAgendaStrip;
  }
}
