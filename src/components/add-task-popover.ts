import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import type { HomeAssistant, MemberSummary, TaskType, TimeOfDay } from '../shared/types.js';
import { addTask } from '../shared/integration-services.js';
import { buildRRule, friendlySummary, WEEKDAY_CODES } from '../shared/recurrence.js';
import type { RecurrenceMode, WeekdayCode } from '../shared/recurrence.js';

const QUICK_EMOJIS = ['🪥', '🛏️', '🎒', '💗', '📵', '🧸', '👕', '🧹', '🧺', '🍽️', '🐕', '🌱'];

@customElement('lucarne-add-task-popover')
export class LucarneAddTaskPopover extends LitElement {
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
        max-height: 85vh;
        overflow-y: auto;
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
      input[type='datetime-local'],
      select,
      input[type='number'] {
        appearance: none;
        -webkit-appearance: none;
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
      input:focus, select:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      .emoji-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
      .emoji-btn {
        font-size: 1.25rem;
        padding: 4px;
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        background: none;
        min-width: 36px;
        min-height: 36px;
      }
      .emoji-btn.selected {
        border-color: var(--primary-color, #03a9f4);
        background: rgba(3, 169, 244, 0.1);
      }
      .recurrence-summary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
        font-style: italic;
      }
      .recurrence-extra {
        margin-top: var(--lucarne-spacing-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .days-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .day-btn {
        padding: 4px 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        cursor: pointer;
        background: none;
        font-size: 0.75rem;
        min-height: 32px;
      }
      .day-btn.selected {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
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
      .btn-submit {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .also-add-section {
        margin-top: var(--lucarne-spacing-sm);
      }
      .also-add-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;
      }
      .also-add-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        cursor: pointer;
        min-height: 32px;
      }
      .also-add-item input[type='checkbox'] {
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
      .also-add-item input[type='checkbox']:checked::after {
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
      .also-add-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owners-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }
      .owner-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .owner-item:last-child {
        border-bottom: none;
      }
      .owner-item input[type='checkbox'] {
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
      .owner-item input[type='checkbox']:checked::after {
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
      .owner-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owner-order {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        min-width: 16px;
        text-align: right;
        flex-shrink: 0;
      }
      .owner-name {
        flex: 1;
      }
      .reorder-btns {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
      }
      .reorder-btn {
        background: none;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.65rem;
        padding: 1px 5px;
        min-height: 18px;
        line-height: 1;
        color: var(--lucarne-on-surface-muted);
      }
      .reorder-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .owners-hint {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        margin-top: 4px;
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) member!: MemberSummary;
  @property({ attribute: false }) members: MemberSummary[] = [];

  @state() private _selectedMemberSlug = '';
  @state() private _summary = '';
  @state() private _type: TaskType = 'chore';
  @state() private _icon = '';
  @state() private _recurrenceMode: RecurrenceMode = 'none';
  @state() private _recurrenceDays: WeekdayCode[] = [];
  @state() private _recurrenceInterval = 1;
  @state() private _recurrenceMonthDay = 1;
  @state() private _recurrenceNth = 1;
  @state() private _recurrenceNthDay: WeekdayCode = 'MO';
  @state() private _recurrenceMonth = 1;
  @state() private _due = '';
  @state() private _timeOfDay: TimeOfDay = 'anytime';
  @state() private _error = '';
  @state() private _saving = false;
  @state() private _alsoAddSlugs: Set<string> = new Set();
  @state() private _rotatingOwners: string[] = [];

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (changed.has('member') && this.member) {
      this._selectedMemberSlug = this.member.slug;
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('popover-close', { bubbles: true, composed: true }));
  }

  private _buildRRule(): string {
    if (this._recurrenceMode === 'none') return '';
    if (this._recurrenceMode === 'daily') {
      return buildRRule({ mode: 'daily', ...(this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}) });
    }
    if (this._recurrenceMode === 'weekly') {
      if (this._recurrenceDays.length === 0) return '';
      return buildRRule({
        mode: 'weekly',
        days: this._recurrenceDays,
        ...(this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}),
      });
    }
    if (this._recurrenceMode === 'monthly-date') {
      return buildRRule({
        mode: 'monthly-date',
        dayOfMonth: this._recurrenceMonthDay,
        ...(this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}),
      });
    }
    if (this._recurrenceMode === 'monthly-nth') {
      return buildRRule({
        mode: 'monthly-nth',
        nth: this._recurrenceNth,
        day: this._recurrenceNthDay,
        ...(this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}),
      });
    }
    if (this._recurrenceMode === 'yearly') {
      return buildRRule({
        mode: 'yearly',
        month: this._recurrenceMonth,
        dayOfMonth: this._recurrenceMonthDay,
        ...(this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}),
      });
    }
    return '';
  }

  private async _submit() {
    if (this._saving) return;
    if (!this._summary.trim()) {
      this._error = 'Summary is required';
      return;
    }
    if (this._summary.trim().length > 200) {
      this._error = 'Summary must be 200 characters or less';
      return;
    }
    if (
      this._type === 'routine' &&
      this._recurrenceMode === 'weekly' &&
      this._recurrenceDays.length === 0
    ) {
      this._error = 'Select at least one day for weekly recurrence';
      return;
    }
    if (this._type === 'rotating' && this._rotatingOwners.length < 2) {
      this._error = 'Select at least 2 owners for a rotating task';
      return;
    }

    this._saving = true;
    this._error = '';

    try {
      if (this._type === 'rotating') {
        await addTask(this.hass, {
          member: 'household',
          summary: this._summary.trim(),
          type: 'rotating',
          ...(this._icon ? { icon: this._icon } : {}),
          time_of_day: this._timeOfDay,
          source: 'manual',
          rotation_owners: this._rotatingOwners,
        });
      } else {
        // Recurrence applies only to routines; due date applies only to chores
        // (matching what the UI exposes). Strip the field for the wrong type so a
        // lingering state from a previous type toggle never ships an invisible value.
        const rrule = this._type === 'routine' ? this._buildRRule() : '';
        const due = this._type === 'chore' ? this._due : '';

        // Build de-duplicated target list (primary member always first).
        const targets =
          this._type === 'routine'
            ? [this._selectedMemberSlug, ...Array.from(this._alsoAddSlugs).filter((s) => s !== this._selectedMemberSlug)]
            : [this._selectedMemberSlug];

        for (const slug of targets) {
          await addTask(this.hass, {
            member: slug,
            summary: this._summary.trim(),
            type: this._type,
            ...(rrule ? { recurrence: rrule } : {}),
            ...(this._icon ? { icon: this._icon } : {}),
            ...(due ? { due } : {}),
            time_of_day: this._timeOfDay,
            source: 'manual',
          });
        }
      }
      this._close();
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to add task';
      this._saving = false;
    }
  }

  private _toggleAlsoAdd(slug: string) {
    const next = new Set(this._alsoAddSlugs);
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    this._alsoAddSlugs = next;
  }

  private _toggleRotatingOwner(slug: string) {
    if (this._rotatingOwners.includes(slug)) {
      this._rotatingOwners = this._rotatingOwners.filter((s) => s !== slug);
    } else {
      this._rotatingOwners = [...this._rotatingOwners, slug];
    }
  }

  private _moveOwner(slug: string, direction: 'up' | 'down') {
    const idx = this._rotatingOwners.indexOf(slug);
    if (idx < 0) return;
    const next = [...this._rotatingOwners];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    this._rotatingOwners = next;
  }

  private _toggleDay(day: WeekdayCode) {
    if (this._recurrenceDays.includes(day)) {
      this._recurrenceDays = this._recurrenceDays.filter((d) => d !== day);
    } else {
      this._recurrenceDays = [...this._recurrenceDays, day];
    }
  }

  render() {
    const rrule = this._buildRRule();
    const summary = rrule ? friendlySummary(rrule) : 'One-off (no repeat)';

    const dayLabels: Record<WeekdayCode, string> = {
      MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
    };

    return html`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Add task">
        <div class="popover-header">
          <h2 class="popover-title">Add Task</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label for="at-member">Member</label>
          <select
            id="at-member"
            .value=${this._selectedMemberSlug}
            @change=${(e: Event) => (this._selectedMemberSlug = (e.target as HTMLSelectElement).value)}
          >
            ${this.members.map((m) => html`<option value=${m.slug}>${m.name}</option>`)}
          </select>
        </div>

        <div class="field">
          <label for="at-summary">Summary *</label>
          <input
            id="at-summary"
            type="text"
            placeholder="Task name"
            maxlength="200"
            .value=${this._summary}
            @input=${(e: InputEvent) => (this._summary = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._submit()}
          />
        </div>

        <div class="field">
          <label for="at-type">Type</label>
          <select
            id="at-type"
            .value=${this._type}
            @change=${(e: Event) => {
              const newType = (e.target as HTMLSelectElement).value as TaskType;
              this._type = newType;
              if (newType !== 'routine') {
                this._alsoAddSlugs = new Set();
              }
              if (newType !== 'rotating') {
                this._rotatingOwners = [];
              }
            }}
          >
            <option value="routine">Routine</option>
            <option value="chore">Chore</option>
            <option value="rotating">Rotating</option>
          </select>
        </div>

        <div class="field">
          <label for="at-time-of-day">Time of day</label>
          <select
            id="at-time-of-day"
            .value=${this._timeOfDay}
            @change=${(e: Event) => (this._timeOfDay = (e.target as HTMLSelectElement).value as TimeOfDay)}
          >
            <option value="anytime">Anytime</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div class="field">
          <label>Icon</label>
          <div class="emoji-picker">
            ${QUICK_EMOJIS.map((e) => html`
              <button
                class="emoji-btn ${this._icon === e ? 'selected' : ''}"
                @click=${() => (this._icon = this._icon === e ? '' : e)}
                title="${e}"
              >${e}</button>
            `)}
          </div>
          <input
            type="text"
            placeholder="Custom emoji"
            maxlength="8"
            .value=${this._icon}
            @input=${(e: InputEvent) => (this._icon = (e.target as HTMLInputElement).value)}
            style="margin-top:4px"
          />
        </div>

        ${this._type === 'routine' ? html`
        <div class="field">
          <label for="at-recurrence">Recurrence</label>
          <select
            id="at-recurrence"
            .value=${this._recurrenceMode}
            @change=${(e: Event) => (this._recurrenceMode = (e.target as HTMLSelectElement).value as RecurrenceMode)}
          >
            <option value="none">None (one-off)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly-date">Monthly by date</option>
            <option value="monthly-nth">Monthly by Nth weekday</option>
            <option value="yearly">Yearly</option>
          </select>

          ${this._recurrenceMode !== 'none'
            ? html`
                <div class="recurrence-extra">
                  ${this._recurrenceMode !== 'monthly-nth' && this._recurrenceMode !== 'yearly'
                    ? html`
                        <div>
                          <label>Interval</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            .value=${String(this._recurrenceInterval)}
                            @change=${(e: Event) => {
                              const v = parseInt((e.target as HTMLInputElement).value, 10);
                              this._recurrenceInterval = isNaN(v) || v < 1 ? 1 : v;
                            }}
                          />
                        </div>
                      `
                    : ''}

                  ${this._recurrenceMode === 'weekly'
                    ? html`
                        <div>
                          <label>Days</label>
                          <div class="days-row">
                            ${WEEKDAY_CODES.map((d) => html`
                              <button
                                class="day-btn ${this._recurrenceDays.includes(d) ? 'selected' : ''}"
                                @click=${() => this._toggleDay(d)}
                              >${dayLabels[d]}</button>
                            `)}
                          </div>
                        </div>
                      `
                    : ''}

                  ${this._recurrenceMode === 'monthly-date'
                    ? html`
                        <div>
                          <label for="at-monthday">Day of month</label>
                          <input
                            id="at-monthday"
                            type="number"
                            min="1"
                            max="31"
                            .value=${String(this._recurrenceMonthDay)}
                            @change=${(e: Event) => {
                              const v = parseInt((e.target as HTMLInputElement).value, 10);
                              this._recurrenceMonthDay = isNaN(v) || v < 1 ? 1 : Math.min(v, 31);
                            }}
                          />
                        </div>
                      `
                    : ''}

                  ${this._recurrenceMode === 'monthly-nth'
                    ? html`
                        <div style="display:flex;gap:8px">
                          <div style="flex:1">
                            <label for="at-nth">Nth</label>
                            <select
                              id="at-nth"
                              .value=${String(this._recurrenceNth)}
                              @change=${(e: Event) => (this._recurrenceNth = parseInt((e.target as HTMLSelectElement).value, 10))}
                            >
                              <option value="1">1st</option>
                              <option value="2">2nd</option>
                              <option value="3">3rd</option>
                              <option value="4">4th</option>
                              <option value="-1">Last</option>
                            </select>
                          </div>
                          <div style="flex:1">
                            <label for="at-nthday">Day</label>
                            <select
                              id="at-nthday"
                              .value=${this._recurrenceNthDay}
                              @change=${(e: Event) => (this._recurrenceNthDay = (e.target as HTMLSelectElement).value as WeekdayCode)}
                            >
                              ${WEEKDAY_CODES.map((d) => html`<option value=${d}>${dayLabels[d]}</option>`)}
                            </select>
                          </div>
                          <div style="flex:1">
                            <label for="at-nth-interval">Every N months</label>
                            <input
                              id="at-nth-interval"
                              type="number"
                              min="1"
                              max="99"
                              .value=${String(this._recurrenceInterval)}
                              @change=${(e: Event) => {
                                const v = parseInt((e.target as HTMLInputElement).value, 10);
                                this._recurrenceInterval = isNaN(v) || v < 1 ? 1 : v;
                              }}
                            />
                          </div>
                        </div>
                      `
                    : ''}

                  ${this._recurrenceMode === 'yearly'
                    ? html`
                        <div style="display:flex;gap:8px">
                          <div style="flex:1">
                            <label for="at-year-month">Month</label>
                            <input
                              id="at-year-month"
                              type="number"
                              min="1"
                              max="12"
                              .value=${String(this._recurrenceMonth)}
                              @change=${(e: Event) => {
                                const v = parseInt((e.target as HTMLInputElement).value, 10);
                                this._recurrenceMonth = isNaN(v) || v < 1 ? 1 : Math.min(v, 12);
                              }}
                            />
                          </div>
                          <div style="flex:1">
                            <label for="at-year-day">Day</label>
                            <input
                              id="at-year-day"
                              type="number"
                              min="1"
                              max="31"
                              .value=${String(this._recurrenceMonthDay)}
                              @change=${(e: Event) => {
                                const v = parseInt((e.target as HTMLInputElement).value, 10);
                                this._recurrenceMonthDay = isNaN(v) || v < 1 ? 1 : Math.min(v, 31);
                              }}
                            />
                          </div>
                          <div style="flex:1">
                            <label for="at-year-interval">Every N years</label>
                            <input
                              id="at-year-interval"
                              type="number"
                              min="1"
                              max="99"
                              .value=${String(this._recurrenceInterval)}
                              @change=${(e: Event) => {
                                const v = parseInt((e.target as HTMLInputElement).value, 10);
                                this._recurrenceInterval = isNaN(v) || v < 1 ? 1 : v;
                              }}
                            />
                          </div>
                        </div>
                      `
                    : ''}
                </div>
                <div class="recurrence-summary">${summary}</div>
              `
            : ''}
        </div>

        ${(() => {
          const alsoAddTargets = this.members.filter(
            (m) => m.slug !== this._selectedMemberSlug && m.slug !== 'household',
          );
          if (alsoAddTargets.length === 0) return '';
          return html`
            <div class="field also-add-section">
              <label>Also add to:</label>
              <div class="also-add-list">
                ${alsoAddTargets.map((m) => html`
                  <label class="also-add-item">
                    <input
                      type="checkbox"
                      .checked=${this._alsoAddSlugs.has(m.slug)}
                      @change=${() => this._toggleAlsoAdd(m.slug)}
                    />
                    ${m.name}
                  </label>
                `)}
              </div>
            </div>
          `;
        })()}
        ` : ''}

        ${this._type === 'rotating' ? html`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter((m) => m.slug !== 'household').map((m) => {
              const checked = this._rotatingOwners.includes(m.slug);
              const orderIdx = this._rotatingOwners.indexOf(m.slug);
              return html`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${checked}
                    @change=${() => this._toggleRotatingOwner(m.slug)}
                    aria-label="${m.name}"
                  />
                  ${checked ? html`<span class="owner-order">${orderIdx + 1}.</span>` : html`<span class="owner-order"></span>`}
                  <span class="owner-name">${m.name}</span>
                  ${checked ? html`
                    <div class="reorder-btns">
                      <button
                        class="reorder-btn"
                        ?disabled=${orderIdx === 0}
                        @click=${() => this._moveOwner(m.slug, 'up')}
                        aria-label="Move ${m.name} earlier"
                      >▲</button>
                      <button
                        class="reorder-btn"
                        ?disabled=${orderIdx === this._rotatingOwners.length - 1}
                        @click=${() => this._moveOwner(m.slug, 'down')}
                        aria-label="Move ${m.name} later"
                      >▼</button>
                    </div>
                  ` : ''}
                </div>
              `;
            })}
          </div>
          ${this._rotatingOwners.length < 2
            ? html`<div class="owners-hint">Select at least 2 owners to enable rotation</div>`
            : ''}
        </div>
        ` : ''}

        ${this._type === 'chore'
          ? html`
              <div class="field">
                <label for="at-due">Due (optional)</label>
                <input
                  id="at-due"
                  type="datetime-local"
                  .value=${this._due}
                  @change=${(e: Event) => (this._due = (e.target as HTMLInputElement).value)}
                />
              </div>
            `
          : ''}

        ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button
            class="btn btn-submit"
            ?disabled=${this._saving || (this._type === 'rotating' && this._rotatingOwners.length < 2)}
            @click=${this._submit}
          >
            ${this._saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-add-task-popover': LucarneAddTaskPopover;
  }
}
