import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { deleteCalendarEvent, entitySupportsDelete } from '../shared/ha-subscriptions.js';
import type { HomeAssistant, CalendarEvent } from '../shared/types.js';
import { serviceErrorMessage } from '../shared/service-errors.js';

function formatDateTime(value: string): string {
  const d = new Date(value);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

@customElement('lucarne-calendar-event-popover')
export class LucarneCalendarEventPopover extends LitElement {
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
        min-width: 280px;
        max-width: min(480px, 90vw);
        z-index: 1;
      }
      .popover-header {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        column-gap: var(--lucarne-spacing-md);
        align-items: center;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .color-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .event-title {
        font-size: var(--lucarne-fs-xl);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        line-height: 1.25;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.5rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
        line-height: 1;
      }
      .icon-btn:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      .icon-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .icon-btn.armed {
        background: rgba(198, 40, 40, 0.12);
      }
      .confirm-pill {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--lucarne-spacing-sm);
        background: rgba(198, 40, 40, 0.08);
        color: #b71c1c;
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 12px;
        font-size: var(--lucarne-fs-md);
        font-weight: 600;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .confirm-pill .cancel-link {
        background: none;
        border: none;
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        cursor: pointer;
        text-decoration: underline;
        padding: 4px 6px;
        margin-left: auto;
        min-height: 32px;
      }
      .confirm-pill .cancel-link:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .detail-row {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        align-items: center;
        margin-bottom: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface-muted);
        line-height: 1.4;
      }
      .detail-icon {
        flex-shrink: 0;
        font-style: normal;
        width: 22px;
        text-align: center;
        font-size: 1.1em;
      }
      .detail-text {
        color: var(--lucarne-on-surface);
      }
      .calendar-label {
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .error-msg {
        color: #b71c1c;
        font-size: var(--lucarne-fs-md);
        margin-top: var(--lucarne-spacing-sm);
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Object }) event: CalendarEvent | null = null;
  @property({ type: String }) color = '#a8d8b9';
  @property({ type: String }) calendarLabel = '';
  @property({ type: String }) entityId = '';

  @state() private _confirmingDelete = false;
  @state() private _deleting = false;
  @state() private _deleteError = '';

  private _close() {
    this.dispatchEvent(new CustomEvent('popover-close', { bubbles: true, composed: true }));
  }

  private _isRecurring(e: CalendarEvent): boolean {
    return Boolean(e.rrule) || Boolean(e.recurrence_id);
  }

  /**
   * Returns true when the uid is a synthetic placeholder (no real upstream
   * uid available). The HA `calendar/event/delete` WebSocket command needs
   * a real upstream uid, so the trash button is hidden for synthetic ids.
   */
  private _hasSyntheticUid(uid: string | undefined): boolean {
    if (!uid) return true;
    const raw = uid.includes('::') ? uid.split('::').slice(1).join('::') : uid;
    return raw.startsWith('syn:') || raw.startsWith('pending:') || raw.length === 0;
  }

  private _startDelete() {
    this._confirmingDelete = true;
    this._deleteError = '';
  }

  private _cancelDelete() {
    this._confirmingDelete = false;
  }

  private async _confirmDelete() {
    if (!this.event?.uid || !this.entityId) return;
    this._deleting = true;
    this._deleteError = '';
    // The card stores uid as "entityId::originalUid" for color lookup.
    // Strip the prefix before sending the `calendar/event/delete` WS command —
    // HA expects the original upstream uid.
    const rawUid = this.event.uid.includes('::')
      ? this.event.uid.split('::').slice(1).join('::')
      : this.event.uid;
    try {
      await deleteCalendarEvent(this.hass, this.entityId, rawUid);
    } catch (err) {
      this._deleteError = serviceErrorMessage(err, 'Failed to delete event');
      this._deleting = false;
      this._confirmingDelete = false;
      return;
    }
    this.dispatchEvent(new CustomEvent('lucarne-event-deleted', {
      detail: { entityId: this.entityId, uid: this.event.uid },
      bubbles: true,
      composed: true,
    }));
    this._deleting = false;
    this._confirmingDelete = false;
  }

  render() {
    if (!this.event) return html``;
    const e = this.event;
    const isAllDay = e.start.length === 10 && !e.start.includes('T');

    const timeDisplay = isAllDay
      ? 'All day'
      : `${formatDateTime(e.start)} – ${new Date(e.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

    // Hide Delete when uid is synthetic: the `calendar/event/delete` WS
    // command needs a real upstream uid; calling it with `syn:...` or
    // `pending:...` would fail.
    const synthetic = this._hasSyntheticUid(e.uid);
    const canDelete = Boolean(this.entityId)
      && Boolean(e.uid)
      && this.hass != null
      && entitySupportsDelete(this.hass, this.entityId)
      && !this._isRecurring(e)
      && !synthetic;

    const trashHandler = this._confirmingDelete ? this._confirmDelete : this._startDelete;
    const trashLabel = this._confirmingDelete ? 'Confirm delete' : 'Delete event';

    return html`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true">
        <div class="popover-header">
          <span class="color-dot" style="background:${this.color}"></span>
          <span class="event-title">${e.summary}</span>
          ${canDelete
            ? html`
                <button
                  class="icon-btn ${this._confirmingDelete ? 'armed' : ''}"
                  @click=${trashHandler}
                  ?disabled=${this._deleting}
                  aria-label=${trashLabel}
                  title=${trashLabel}
                >🗑️</button>
              `
            : html`<span></span>`}
          <button class="icon-btn" @click=${this._close} aria-label="Close">✕</button>
        </div>

        ${this._confirmingDelete
          ? html`
              <div class="confirm-pill" role="alert">
                <span>Tap 🗑️ again to delete this event.</span>
                <button
                  class="cancel-link"
                  @click=${this._cancelDelete}
                  ?disabled=${this._deleting}
                >Cancel</button>
              </div>
            `
          : ''}

        <div class="detail-row">
          <em class="detail-icon">⏰</em>
          <span class="detail-text">${timeDisplay}</span>
        </div>

        ${this.calendarLabel
          ? html`
              <div class="detail-row">
                <em class="detail-icon">📅</em>
                <span class="calendar-label detail-text">
                  <span
                    style="width:10px;height:10px;border-radius:50%;background:${this.color};display:inline-block;flex-shrink:0"
                  ></span>
                  ${this.calendarLabel}
                </span>
              </div>
            `
          : ''}

        ${e.location
          ? html`
              <div class="detail-row">
                <em class="detail-icon">📍</em>
                <span class="detail-text">${e.location}</span>
              </div>
            `
          : ''}

        ${e.description
          ? html`
              <div class="detail-row">
                <em class="detail-icon">📝</em>
                <span class="detail-text">${e.description}</span>
              </div>
            `
          : ''}

        ${this._deleteError ? html`<div class="error-msg">${this._deleteError}</div>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-calendar-event-popover': LucarneCalendarEventPopover;
  }
}
