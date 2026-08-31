import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import type { HomeAssistant, CalendarConfig } from '../shared/types.js';
import { serviceErrorMessage } from '../shared/service-errors.js';

function toLocalISO(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
  const m = (Math.abs(offset) % 60).toString().padStart(2, '0');
  return `${date}T${time}:00${sign}${h}:${m}`;
}

function padHour(h: number): string {
  return `${Math.floor(h).toString().padStart(2, '0')}:${h % 1 === 0.5 ? '30' : '00'}`;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@customElement('lucarne-create-event-popover')
export class LucarneCreateEventPopover extends LitElement {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        z-index: 1;
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .popover-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
      }
      .close-btn:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      .field {
        margin-bottom: var(--lucarne-spacing-md);
      }
      label {
        display: block;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin-bottom: 4px;
      }
      input[type='text'],
      input[type='date'],
      input[type='time'],
      select,
      textarea {
        appearance: none;
        -webkit-appearance: none;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 10px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        background: var(--lucarne-surface);
        min-height: 44px;
        font-family: inherit;
      }
      input[type='date']::-webkit-date-and-time-value,
      input[type='time']::-webkit-date-and-time-value {
        text-align: left;
      }
      input[type='date']::-webkit-calendar-picker-indicator,
      input[type='time']::-webkit-calendar-picker-indicator {
        opacity: 0.6;
      }
      input:focus,
      select:focus,
      textarea:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      textarea {
        min-height: 64px;
        resize: vertical;
      }
      .time-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lucarne-spacing-sm);
      }
      .allday-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        margin-bottom: var(--lucarne-spacing-md);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
      }
      .allday-row input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .allday-row input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .allday-row input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .error-msg {
        color: #c62828;
        font-size: var(--lucarne-fs-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        padding: 6px 10px;
        background: #ffebee;
        border-radius: var(--lucarne-radius-sm);
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
      .btn {
        padding: 8px 20px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        min-height: 44px;
        min-width: 80px;
      }
      .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
      }
      .btn-create {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-create:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Object }) day: Date | null = null;
  @property({ type: Number }) startHour = 9;
  @property({ type: Array }) calendars: CalendarConfig[] = [];

  @state() private _title = '';
  @state() private _calendarEntityId = '';
  @state() private _date = '';
  @state() private _startTime = '';
  @state() private _endTime = '';
  @state() private _allDay = false;
  @state() private _description = '';
  @state() private _location = '';
  @state() private _error = '';
  @state() private _saving = false;

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    // Only reset form when the tapped slot changes (day/startHour), not on calendars
    // to prevent form state being wiped on every parent hass update
    if (changed.has('day') || changed.has('startHour')) {
      this._initDefaults();
    }
  }

  private _initDefaults() {
    const d = this.day ?? new Date();
    this._date = dateKey(d);
    this._startTime = padHour(Math.max(0, Math.min(23, this.startHour)));
    const endH = Math.min(24, this.startHour + 1);
    this._endTime = padHour(endH < 24 ? endH : 23.5);
    this._calendarEntityId = this.calendars[0]?.entity ?? '';
    this._title = '';
    this._allDay = false;
    this._description = '';
    this._location = '';
    this._error = '';
    this._saving = false;
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('popover-close', { bubbles: true, composed: true }));
  }

  private async _create() {
    if (this._saving) return;
    if (!this._title.trim()) {
      this._error = 'Title is required';
      return;
    }
    if (!this._allDay && this._startTime >= this._endTime) {
      this._error = 'End time must be after start time';
      return;
    }
    this._saving = true;
    this._error = '';

    const serviceData: Record<string, string> = { summary: this._title.trim() };
    if (this._description.trim()) serviceData.description = this._description.trim();
    if (this._location.trim()) serviceData.location = this._location.trim();

    let eventStart: string;
    let eventEnd: string;
    if (this._allDay) {
      serviceData.start_date = this._date;
      const endDateObj = new Date(`${this._date}T00:00:00`);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const endDate = dateKey(endDateObj);
      serviceData.end_date = endDate;
      eventStart = this._date;
      eventEnd = endDate;
    } else {
      const startISO = toLocalISO(this._date, this._startTime);
      const endISO = toLocalISO(this._date, this._endTime);
      serviceData.start_date_time = startISO;
      serviceData.end_date_time = endISO;
      eventStart = startISO;
      eventEnd = endISO;
    }

    try {
      await this.hass.callService('calendar', 'create_event', serviceData, {
        entity_id: this._calendarEntityId,
      });
    } catch (err) {
      this._error = serviceErrorMessage(err, 'Failed to create event');
      this._saving = false;
      return;
    }

    this.dispatchEvent(
      new CustomEvent('lucarne-event-created', {
        detail: {
          entityId: this._calendarEntityId,
          event: {
            summary: this._title.trim(),
            start: eventStart,
            end: eventEnd,
            description: this._description.trim() || undefined,
            location: this._location.trim() || undefined,
            // Synthetic pending uid: unique per optimistic create so
            // multiple pendings don't collide on the `entity::` key.
            // Replaced by the real event on the next fetch.
            uid: `${this._calendarEntityId}::pending:${eventStart}|${eventEnd}|${this._title.trim()}`,
            pending: true,
          },
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.calendars.length) return html``;

    return html`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Create event">
        <div class="popover-header">
          <h2 class="popover-title">New Event</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label for="ce-title">Title *</label>
          <input
            id="ce-title"
            type="text"
            placeholder="Event title"
            .value=${this._title}
            @input=${(e: InputEvent) => (this._title = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._create()}
          />
        </div>

        <div class="field">
          <label for="ce-calendar">Calendar</label>
          <select
            id="ce-calendar"
            .value=${this._calendarEntityId}
            @change=${(e: Event) => (this._calendarEntityId = (e.target as HTMLSelectElement).value)}
          >
            ${this.calendars.map(
              (cal) => html`<option value=${cal.entity}>${cal.label}</option>`,
            )}
          </select>
        </div>

        <div class="field">
          <label for="ce-date">Date</label>
          <input
            id="ce-date"
            type="date"
            .value=${this._date}
            @change=${(e: Event) => (this._date = (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="allday-row">
          <input
            id="ce-allday"
            type="checkbox"
            .checked=${this._allDay}
            @change=${(e: Event) => (this._allDay = (e.target as HTMLInputElement).checked)}
          />
          <label for="ce-allday" style="margin:0; font-weight:400; color:var(--lucarne-on-surface)">All day</label>
        </div>

        ${!this._allDay
          ? html`
              <div class="time-row">
                <div class="field">
                  <label for="ce-start">Start</label>
                  <input
                    id="ce-start"
                    type="time"
                    .value=${this._startTime}
                    @change=${(e: Event) => (this._startTime = (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div class="field">
                  <label for="ce-end">End</label>
                  <input
                    id="ce-end"
                    type="time"
                    .value=${this._endTime}
                    @change=${(e: Event) => (this._endTime = (e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>
            `
          : ''}

        <div class="field">
          <label for="ce-location">Location</label>
          <input
            id="ce-location"
            type="text"
            placeholder="Optional"
            .value=${this._location}
            @input=${(e: InputEvent) => (this._location = (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="field">
          <label for="ce-description">Description</label>
          <textarea
            id="ce-description"
            placeholder="Optional"
            .value=${this._description}
            @input=${(e: InputEvent) => (this._description = (e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </div>

        ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button class="btn btn-create" ?disabled=${this._saving} @click=${this._create}>
            ${this._saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-create-event-popover': LucarneCreateEventPopover;
  }
}
