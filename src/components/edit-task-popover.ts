import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import type { HomeAssistant, MemberSummary, RenderableTask, TaskType, TimeOfDay } from '../shared/types.js';
import { coerceTimeOfDay } from '../shared/types.js';
import { updateTaskMetadata, deleteTask } from '../shared/integration-services.js';
import { parseRRule, buildRRule, friendlySummary, WEEKDAY_CODES } from '../shared/recurrence.js';
import type { RecurrenceMode, WeekdayCode } from '../shared/recurrence.js';
import { serviceErrorMessage } from '../shared/service-errors.js';

@customElement('lucarne-edit-task-popover')
export class LucarneEditTaskPopover extends LitElement {
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
      input[type='datetime-local'],
      input[type='number'],
      select {
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
      .readonly-field {
        padding: 8px 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: var(--lucarne-radius-sm);
        background: rgba(0, 0, 0, 0.03);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        display: flex;
        align-items: center;
        position: relative;
      }
      .readonly-tooltip {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        margin-top: 2px;
        font-style: italic;
      }
      .type-row {
        display: flex;
        gap: var(--lucarne-spacing-sm);
      }
      .type-btn {
        flex: 1;
        padding: 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        background: var(--lucarne-surface);
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        min-height: 44px;
      }
      .type-btn.active {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }
      .recurrence-summary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
        font-style: italic;
      }
      .custom-recurrence-note {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        padding: 6px 0;
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
      .delete-zone {
        margin-top: var(--lucarne-spacing-md);
        padding-top: var(--lucarne-spacing-md);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
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
      .btn-save {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-delete {
        background: none;
        border: 1px solid #f44336;
        color: #f44336;
        width: 100%;
      }
      .confirm-delete {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        align-items: center;
        font-size: var(--lucarne-fs-sm);
        color: #c62828;
      }
      .confirm-delete button {
        padding: 4px 12px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        min-height: 36px;
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
  @property({ attribute: false }) task!: RenderableTask;
  @property({ attribute: false }) members: MemberSummary[] = [];

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
  @state() private _assignee = '';
  @state() private _timeOfDay: TimeOfDay = 'anytime';
  @state() private _isCustomRecurrence = false;
  @state() private _rawRecurrence = '';
  @state() private _error = '';
  @state() private _saving = false;
  @state() private _confirmingDelete = false;
  @state() private _rotatingOwners: string[] = [];

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (changed.has('task') && this.task) {
      this._prefill();
    }
  }

  private _prefill() {
    const t = this.task;
    this._summary = t.summary;
    this._type = t.metadata.type;
    this._icon = t.metadata.icon;
    this._due = t.due ?? '';
    this._assignee = t.metadata.assignee_slug;
    // Coerce defensively: an out-of-band string (typo, legacy import, future
    // enum extension) would otherwise set the <select> to a value it can't
    // render, trapping the user. Mirrors the bucket coercion in member-column.
    this._timeOfDay = coerceTimeOfDay(t.metadata.time_of_day);
    // Reset all recurrence state to defaults before applying task values,
    // so stale values from a previous task don't bleed into the new one.
    this._recurrenceDays = [];
    this._recurrenceInterval = 1;
    this._recurrenceMonthDay = 1;
    this._recurrenceNth = 1;
    this._recurrenceNthDay = 'MO';
    this._recurrenceMonth = 1;
    this._rawRecurrence = '';
    this._isCustomRecurrence = false;

    this._rotatingOwners = t.metadata.rotation_owners ? [...t.metadata.rotation_owners] : [];

    const parsed = parseRRule(t.metadata.recurrence);
    if (parsed.mode === 'unknown') {
      this._isCustomRecurrence = true;
      this._rawRecurrence = (parsed as { raw: string }).raw;
      this._recurrenceMode = 'unknown';
    } else {
      this._isCustomRecurrence = false;
      this._recurrenceMode = parsed.mode;
      if (parsed.mode === 'daily') {
        this._recurrenceInterval = parsed.interval ?? 1;
      } else if (parsed.mode === 'weekly') {
        this._recurrenceDays = [...parsed.days];
        this._recurrenceInterval = parsed.interval ?? 1;
      } else if (parsed.mode === 'monthly-date') {
        this._recurrenceMonthDay = parsed.dayOfMonth;
        this._recurrenceInterval = parsed.interval ?? 1;
      } else if (parsed.mode === 'monthly-nth') {
        this._recurrenceNth = parsed.nth;
        this._recurrenceNthDay = parsed.day;
        this._recurrenceInterval = parsed.interval ?? 1;
      } else if (parsed.mode === 'yearly') {
        this._recurrenceMonth = parsed.month;
        this._recurrenceMonthDay = parsed.dayOfMonth;
        this._recurrenceInterval = parsed.interval ?? 1;
      }
    }
  }

  // Dismiss only on a primary press that both starts AND ends on the backdrop.
  // The popover is mounted while a long-press finger is still down (see
  // task-row.ts), so the backdrop appears under that finger; on iPad, lifting it
  // synthesizes a click on the freshly-mounted backdrop. We deliberately do NOT
  // listen for `click` — the opening gesture's pointer is captured by the task
  // row, so the backdrop never sees its pointerdown/pointerup pair, and the stray
  // synthesized click is ignored (issue #57). Tracking pointerup (not click) also
  // means the flag can never go stale into a wrong dismissal: a real pointerup is
  // always preceded by a real pointerdown that (re)evaluates the flag.
  private _backdropPressActive = false;

  private _onBackdropPointerDown(e: PointerEvent) {
    // Only a primary press arms dismissal — ignore right/middle click and
    // secondary touch points (a non-primary press also clears any prior state).
    this._backdropPressActive = e.isPrimary && e.button === 0;
    if (this._backdropPressActive) {
      // Capture so the terminal pointerup/pointercancel reliably lands on the
      // backdrop even if the finger drifts off before release.
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  }

  private _onBackdropPointerUp() {
    if (!this._backdropPressActive) return;
    this._backdropPressActive = false;
    this._close();
  }

  private _onBackdropPointerCancel() {
    // Gesture aborted (scroll takeover, etc.) — don't leave the flag armed.
    this._backdropPressActive = false;
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('popover-close', { bubbles: true, composed: true }));
  }

  private _buildRRule(): string {
    if (this._isCustomRecurrence) return this._rawRecurrence;
    if (this._recurrenceMode === 'none') return '';
    if (this._recurrenceMode === 'daily') {
      return buildRRule({ mode: 'daily', ...(this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}) });
    }
    if (this._recurrenceMode === 'weekly') {
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

  private async _save() {
    if (this._saving) return;
    if (!this._summary.trim()) {
      this._error = 'Summary is required';
      return;
    }
    if (this._summary.trim().length > 200) {
      this._error = 'Summary must be 200 characters or less';
      return;
    }
    if (this._recurrenceMode === 'weekly' && !this._isCustomRecurrence && this._recurrenceDays.length === 0) {
      this._error = 'Select at least one day for weekly recurrence';
      return;
    }
    // HA's todo.update_item silently ignores null/empty due_datetime, so clearing is impossible
    // via this API. Surface an explicit error rather than letting the popover close silently
    // while leaving the old due date in place.
    if (!this._due && this.task.due) {
      this._error = 'Due date cannot be cleared here — delete and recreate the task to remove it';
      return;
    }
    if (this._type === 'rotating' && this._rotatingOwners.length < 2) {
      this._error = 'Select at least 2 owners for a rotating task';
      return;
    }

    this._saving = true;
    this._error = '';

    try {
      const ownerEntityId =
        this.task.metadata.member_slug === 'household'
          ? 'todo.lucarne_household'
          : this.members.find((m) => m.slug === this.task.metadata.member_slug)?.todo_entity_id ?? '';

      // Determine what changed.
      const summaryChanged = this._summary.trim() !== this.task.summary;
      const dueChanged = !!this._due && this._due !== (this.task.due ?? '');
      const isRotating = this._type === 'rotating';
      const origOwners = this.task.metadata.rotation_owners ?? [];
      const rotatingOwnersChanged =
        isRotating &&
        JSON.stringify(this._rotatingOwners) !== JSON.stringify(origOwners);
      const isHousehold = this.task.metadata.member_slug === 'household';
      const metaChanged =
        this._type !== this.task.metadata.type ||
        this._icon !== this.task.metadata.icon ||
        (!isRotating && this._buildRRule() !== this.task.metadata.recurrence) ||
        this._timeOfDay !== (this.task.metadata.time_of_day ?? 'anytime') ||
        (isHousehold && !isRotating && this._assignee !== this.task.metadata.assignee_slug) ||
        rotatingOwnersChanged;
      // If the current owner was removed from rotation, reset to the new first owner.
      const currentOwnerRemoved =
        isRotating &&
        !!this.task.metadata.current_owner &&
        !this._rotatingOwners.includes(this.task.metadata.current_owner);

      if (summaryChanged || dueChanged) {
        if (!ownerEntityId) throw new Error('Could not resolve todo entity for this task');
        await this.hass.callService('todo', 'update_item', {
          item: this.task.uid,
          rename: this._summary.trim(),
          ...(dueChanged ? { due_datetime: this._due } : {}),
        }, { entity_id: ownerEntityId });
      }

      if (metaChanged) {
        await updateTaskMetadata(this.hass, this.task.uid, {
          ...(this._type !== this.task.metadata.type ? { type: this._type } : {}),
          ...(this._icon !== this.task.metadata.icon ? { icon: this._icon } : {}),
          ...(!isRotating && this._buildRRule() !== this.task.metadata.recurrence ? { recurrence: this._buildRRule() } : {}),
          ...(this._timeOfDay !== (this.task.metadata.time_of_day ?? 'anytime')
            ? { time_of_day: this._timeOfDay }
            : {}),
          ...(isHousehold && !isRotating && this._assignee !== this.task.metadata.assignee_slug ? { assignee: this._assignee } : {}),
          ...(rotatingOwnersChanged ? { rotation_owners: this._rotatingOwners } : {}),
          ...(currentOwnerRemoved ? { current_owner: this._rotatingOwners[0] } : {}),
        });
      }

      // Hand the card the post-edit task so it can render the change immediately.
      // The saves above succeeded server-side (fast request/response), but the
      // state push that carries the new values lags on an idle WKWebView kiosk —
      // without this the row shows stale summary/icon/recurrence until then.
      if (summaryChanged || dueChanged || metaChanged) {
        const updated: RenderableTask = {
          ...this.task,
          summary: this._summary.trim(),
          due: this._due || this.task.due,
          metadata: {
            ...this.task.metadata,
            type: this._type,
            icon: this._icon,
            recurrence: isRotating ? this.task.metadata.recurrence : this._buildRRule(),
            time_of_day: this._timeOfDay,
            ...(isHousehold && !isRotating ? { assignee_slug: this._assignee } : {}),
            ...(isRotating
              ? {
                  rotation_owners: this._rotatingOwners,
                  current_owner: currentOwnerRemoved ? this._rotatingOwners[0] : this.task.metadata.current_owner,
                }
              : {}),
          },
        };
        this.dispatchEvent(
          new CustomEvent('task-updated', { detail: { task: updated }, bubbles: true, composed: true }),
        );
      }

      this._close();
    } catch (err) {
      this._error = serviceErrorMessage(err, 'Failed to save');
      this._saving = false;
    }
  }

  private async _delete() {
    if (this._saving) return;
    this._saving = true;
    this._error = '';
    try {
      await deleteTask(this.hass, this.task.uid);
      // Tell the card to hide the row immediately. The delete succeeded
      // server-side (this is a direct request/response, fast even on iPad),
      // but the state push that actually removes the task can lag badly on
      // an idle WKWebView kiosk — without this the row lingers and the user
      // re-taps it, hitting an already-deleted uid (backend raises). The card
      // tombstones the uid and reconciles once the push/poll catches up.
      this.dispatchEvent(
        new CustomEvent('task-deleted', { detail: { uid: this.task.uid }, bubbles: true, composed: true }),
      );
      this._close();
    } catch (err) {
      this._error = serviceErrorMessage(err, 'Failed to delete');
      this._saving = false;
      this._confirmingDelete = false;
    }
  }

  private _toggleRotatingOwner(slug: string) {
    if (this._rotatingOwners.includes(slug)) {
      // Prevent removing the last owner
      if (this._rotatingOwners.length <= 1) return;
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
    if (!this.task) return html``;

    const isHousehold = this.task.metadata.member_slug === 'household';
    const memberName = isHousehold
      ? 'Household'
      : (this.members.find((m) => m.slug === this.task.metadata.member_slug)?.name ?? this.task.metadata.member_slug);

    const rrule = this._buildRRule();
    const summary = this._isCustomRecurrence
      ? 'Custom recurrence (not editable here)'
      : friendlySummary(rrule);

    const dayLabels: Record<WeekdayCode, string> = {
      MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
    };

    return html`
      <div
        class="backdrop"
        @pointerdown=${this._onBackdropPointerDown}
        @pointerup=${this._onBackdropPointerUp}
        @pointercancel=${this._onBackdropPointerCancel}
      ></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Edit task">
        <div class="popover-header">
          <h2 class="popover-title">Edit Task</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label>Member</label>
          <div class="readonly-field" title="Member cannot be changed in v1">${memberName}</div>
          <div class="readonly-tooltip">Member cannot be changed here</div>
        </div>

        ${isHousehold && this._type !== 'rotating'
          ? html`
              <div class="field">
                <label for="et-assignee">Assignee (optional)</label>
                <select
                  id="et-assignee"
                  .value=${this._assignee}
                  @change=${(e: Event) => (this._assignee = (e.target as HTMLSelectElement).value)}
                >
                  <option value="">— None —</option>
                  ${this.members.filter((m) => m.slug !== 'household').map(
                    (m) => html`<option value=${m.slug}>${m.name}</option>`,
                  )}
                </select>
              </div>
            `
          : ''}

        <div class="field">
          <label for="et-summary">Summary *</label>
          <input
            id="et-summary"
            type="text"
            maxlength="200"
            .value=${this._summary}
            @input=${(e: InputEvent) => (this._summary = (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="field">
          <label>Type</label>
          <div class="type-row">
            <button class="type-btn ${this._type === 'routine' ? 'active' : ''}" @click=${() => (this._type = 'routine')}>Routine</button>
            <button class="type-btn ${this._type === 'chore' ? 'active' : ''}" @click=${() => (this._type = 'chore')}>Chore</button>
            ${this.task?.metadata?.member_slug === 'household'
              ? html`<button class="type-btn ${this._type === 'rotating' ? 'active' : ''}" @click=${() => (this._type = 'rotating')}>Rotating</button>`
              : ''}
          </div>
        </div>

        <div class="field">
          <label for="et-time-of-day">Time of day</label>
          <select
            id="et-time-of-day"
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
          <label for="et-icon">Icon</label>
          <input
            id="et-icon"
            type="text"
            placeholder="Emoji or empty"
            maxlength="8"
            .value=${this._icon}
            @input=${(e: InputEvent) => (this._icon = (e.target as HTMLInputElement).value)}
          />
        </div>

        ${this._type === 'rotating' ? html`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter((m) => m.slug !== 'household').map((m) => {
              const checked = this._rotatingOwners.includes(m.slug);
              const orderIdx = this._rotatingOwners.indexOf(m.slug);
              const isLast = this._rotatingOwners.length <= 1 && checked;
              return html`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${checked}
                    ?disabled=${isLast}
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
            ? html`<div class="owners-hint">Select at least 2 owners — delete the task to remove all owners</div>`
            : ''}
        </div>
        ` : html`
        <div class="field">
          <label for="et-recurrence">Recurrence</label>
          ${this._isCustomRecurrence
            ? html`<div class="custom-recurrence-note">${summary}</div>`
            : html`
                <select
                  id="et-recurrence"
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
                                <label>Day of month</label>
                                <input
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
                                  <label>Nth</label>
                                  <select
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
                                  <label>Day</label>
                                  <select
                                    .value=${this._recurrenceNthDay}
                                    @change=${(e: Event) => (this._recurrenceNthDay = (e.target as HTMLSelectElement).value as WeekdayCode)}
                                  >
                                    ${WEEKDAY_CODES.map((d) => html`<option value=${d}>${dayLabels[d]}</option>`)}
                                  </select>
                                </div>
                                <div style="flex:1">
                                  <label>Every N months</label>
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
                              </div>
                            `
                          : ''}

                        ${this._recurrenceMode === 'yearly'
                          ? html`
                              <div style="display:flex;gap:8px">
                                <div style="flex:1">
                                  <label>Month</label>
                                  <input
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
                                  <label>Day</label>
                                  <input
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
                                  <label>Every N years</label>
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
                              </div>
                            `
                          : ''}
                      </div>
                      <div class="recurrence-summary">${summary}</div>
                    `
                  : ''}
              `}
        </div>
        `}

        ${this._type !== 'rotating' ? html`
        <div class="field">
          <label for="et-due">Due (optional)</label>
          <input
            id="et-due"
            type="datetime-local"
            .value=${this._due}
            @change=${(e: Event) => (this._due = (e.target as HTMLInputElement).value)}
          />
        </div>
        ` : ''}

        ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button
            class="btn btn-save"
            ?disabled=${this._saving || (this._type === 'rotating' && this._rotatingOwners.length < 2)}
            @click=${this._save}
          >
            ${this._saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div class="delete-zone">
          ${this._confirmingDelete
            ? html`
                <div class="confirm-delete">
                  <span>Delete this task?</span>
                  <button
                    style="background:#f44336;color:#fff"
                    ?disabled=${this._saving}
                    @click=${this._delete}
                  >Yes, delete</button>
                  <button
                    style="background:rgba(0,0,0,0.06)"
                    @click=${() => (this._confirmingDelete = false)}
                  >Cancel</button>
                </div>
              `
            : html`
                <button class="btn btn-delete" @click=${() => (this._confirmingDelete = true)}>
                  Delete Task
                </button>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-edit-task-popover': LucarneEditTaskPopover;
  }
}
