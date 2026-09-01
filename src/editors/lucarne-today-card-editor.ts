import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../shared/types.js';
import type { LucarneTodayCardConfig, TodaySectionId } from '../cards/lucarne-today-card.js';
import { normalizeSectionOrder } from '../cards/lucarne-today-card.js';
import { SYNTHETIC_HOUSEHOLD } from '../shared/family-subscription.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { editorBaseStyles } from '../shared/editor-styles.js';
import { ensureHaFormElements } from '../shared/ha-elements.js';
import { fireEvent } from '../shared/fire-event.js';
import '../components/reorder-list.js';
import type { ReorderItem } from '../components/reorder-list.js';

const SECTION_LABELS: Record<TodaySectionId, string> = {
  calendar: 'Calendar',
  weather: 'Weather',
  tasks: 'Tasks',
};

// The drag-to-reorder chrome now lives in <lucarne-reorder-list>; only the
// per-row label styling stays local to this editor.
const sectionOrderStyles = css`
  .section-label-cell {
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
  }
`;

@customElement('lucarne-today-card-editor')
export class LucarneTodayCardEditor extends LitElement {
  static styles = [lucarneStyles, editorBaseStyles, sectionOrderStyles];

  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: LucarneTodayCardConfig;
  @state() private _haReady = false;

  connectedCallback() {
    super.connectedCallback();
    ensureHaFormElements()
      .catch((err) => console.warn('[lucarne] HA editor elements load failed; rendering anyway', err))
      .then(() => {
        this._haReady = true;
      });
  }

  setConfig(config: LucarneTodayCardConfig) {
    this._config = config;
  }

  private _fire(config: LucarneTodayCardConfig) {
    fireEvent(this, 'config-changed', { config });
  }

  private _titleChanged(e: Event) {
    const input = e.target as HTMLInputElement;
    this._fire({ ...this._config!, title: input.value || undefined });
  }

  private _weatherChanged(e: CustomEvent) {
    this._fire({ ...this._config!, weather: e.detail?.value ?? undefined });
  }

  private _tasksChanged(e: CustomEvent) {
    this._fire({ ...this._config!, tasks: e.detail?.value ?? undefined });
  }

  private _integrationTasksChanged(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this._fire({ ...this._config!, household_tasks_from_integration: checked || undefined });
  }

  private _familyPillChanged(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this._fire({ ...this._config!, show_family_ready_pill: checked || undefined });
  }

  private _isIntegrationAvailable(): boolean {
    // Heuristic: household entity exists when integration is set up. This may briefly
    // return false during first setup before async_ensure_household_entity runs; that
    // is acceptable — the toggles become enabled on the next hass update.
    return !!(this.hass?.states?.[SYNTHETIC_HOUSEHOLD.todo_entity_id]);
  }

  private _agendaShowTomorrowChanged(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this._fire({ ...this._config!, agenda_show_tomorrow: checked || undefined });
  }

  private _maxTasksChanged(e: Event) {
    const input = e.target as HTMLInputElement;
    const v = parseInt(input.value, 10);
    this._fire({ ...this._config!, max_tasks: isNaN(v) ? undefined : Math.max(1, v) });
  }

  private _refillTasksChanged(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this._fire({ ...this._config!, refill_tasks_on_complete: checked || undefined });
  }

  private _calEntityChanged(index: number, e: CustomEvent) {
    const cals = [...(this._config?.calendars ?? [])];
    cals[index] = { ...cals[index], entity: e.detail?.value ?? '' };
    this._fire({ ...this._config!, calendars: cals });
  }

  private _calColorChanged(index: number, e: Event) {
    const cals = [...(this._config?.calendars ?? [])];
    cals[index] = { ...cals[index], color: (e.target as HTMLInputElement).value };
    this._fire({ ...this._config!, calendars: cals });
  }

  private _removeCalendar(index: number) {
    const cals = [...(this._config?.calendars ?? [])];
    if (cals.length <= 1) return; // keep at least one calendar
    cals.splice(index, 1);
    this._fire({ ...this._config!, calendars: cals });
  }

  private _addCalendar() {
    const firstCalendar = Object.keys(this.hass?.states ?? {}).find((id) => id.startsWith('calendar.'));
    const defaultEntity = firstCalendar ?? 'calendar.example';
    const cals = [
      ...(this._config?.calendars ?? []),
      { entity: defaultEntity, color: '#a8d8b9' },
    ];
    this._fire({ ...this._config!, calendars: cals });
  }

  private _presenceEntityChanged(index: number, e: CustomEvent) {
    const entries = [...(this._config?.presence ?? [])];
    entries[index] = { ...entries[index], entity: e.detail?.value ?? '' };
    this._fire({ ...this._config!, presence: entries });
  }

  private _presenceNameChanged(index: number, e: Event) {
    const entries = [...(this._config?.presence ?? [])];
    entries[index] = { ...entries[index], name: (e.target as HTMLInputElement).value };
    this._fire({ ...this._config!, presence: entries });
  }

  private _removePresence(index: number) {
    const entries = [...(this._config?.presence ?? [])];
    entries.splice(index, 1);
    this._fire({ ...this._config!, presence: entries });
  }

  private _addPresence() {
    const entries = [...(this._config?.presence ?? []), { entity: '', name: '' }];
    this._fire({ ...this._config!, presence: entries });
  }

  private _commitSectionOrder(order: TodaySectionId[]) {
    this._fire({ ...this._config!, section_order: order });
  }

  private _renderSectionOrder() {
    const order = normalizeSectionOrder(this._config?.section_order);
    const items: ReorderItem[] = order.map((id) => ({ key: id, label: SECTION_LABELS[id] }));
    return html`
      <div class="section-label">Section order</div>
      <lucarne-reorder-list
        label="Card sections (drag to reorder)"
        .items=${items}
        @reorder=${(e: CustomEvent) => this._commitSectionOrder(e.detail.order as TodaySectionId[])}
      >
        ${order.map(
          (id) => html`<span slot=${id} class="section-label-cell">${SECTION_LABELS[id]}</span>`,
        )}
      </lucarne-reorder-list>
    `;
  }

  render() {
    if (!this._config) return html``;
    if (!this._haReady) return html`<div class="loading">Loading editor…</div>`;

    const calendars = this._config.calendars ?? [];
    const presence = this._config.presence ?? [];

    return html`
      <label class="field">
        <span class="field-label">Card title</span>
        <input
          class="text-input"
          type="text"
          .value=${this._config.title ?? ''}
          @change=${this._titleChanged}
        />
      </label>
      <label class="field field-inline">
        <span class="field-label">Also show tomorrow in agenda</span>
        <input
          type="checkbox"
          .checked=${this._config.agenda_show_tomorrow ?? false}
          @change=${this._agendaShowTomorrowChanged}
        />
      </label>

      ${this._renderSectionOrder()}

      <ha-entity-picker
        label="Weather entity"
        .hass=${this.hass}
        .value=${this._config.weather ?? ''}
        .includeDomains=${['weather']}
        allow-custom-entity
        @value-changed=${this._weatherChanged}
      ></ha-entity-picker>

      <ha-entity-picker
        label="Todo entity"
        .hass=${this.hass}
        .value=${this._config.tasks ?? ''}
        .includeDomains=${['todo']}
        allow-custom-entity
        @value-changed=${this._tasksChanged}
      ></ha-entity-picker>

      <label class="field">
        <span class="field-label">Max tasks to show</span>
        <input
          class="text-input"
          type="number"
          min="1"
          .value=${String(this._config.max_tasks ?? 5)}
          @change=${this._maxTasksChanged}
        />
      </label>
      <label class="field field-inline">
        <span class="field-label">Show a new task when one is completed</span>
        <input
          type="checkbox"
          .checked=${this._config.refill_tasks_on_complete ?? false}
          @change=${this._refillTasksChanged}
        />
      </label>

      <div class="section-label">Lucarne Family integration</div>
      <label class="field field-inline" style="${this._isIntegrationAvailable() ? '' : 'opacity:0.5;pointer-events:none'}">
        <span class="field-label">Household tasks from integration</span>
        <input
          type="checkbox"
          .checked=${this._config.household_tasks_from_integration ?? false}
          @change=${this._integrationTasksChanged}
          ?disabled=${!this._isIntegrationAvailable()}
        />
        ${this._isIntegrationAvailable() ? '' : html`<small> — install Lucarne Family integration first</small>`}
      </label>
      <label class="field field-inline" style="${this._isIntegrationAvailable() ? '' : 'opacity:0.5;pointer-events:none'}">
        <span class="field-label">Show family ready pill</span>
        <input
          type="checkbox"
          .checked=${this._config.show_family_ready_pill ?? false}
          @change=${this._familyPillChanged}
          ?disabled=${!this._isIntegrationAvailable()}
        />
        ${this._isIntegrationAvailable() ? '' : html`<small> — install Lucarne Family integration first</small>`}
      </label>

      <div class="section-label">Calendars</div>
      ${calendars.map(
        (cal, i) => html`
          <div class="cal-row">
            <ha-entity-picker
              label="Calendar entity"
              .hass=${this.hass}
              .value=${cal.entity}
              .includeDomains=${['calendar']}
              allow-custom-entity
              @value-changed=${(e: CustomEvent) => this._calEntityChanged(i, e)}
            ></ha-entity-picker>
            <input
              type="color"
              class="cal-color"
              .value=${cal.color}
              @input=${(e: Event) => this._calColorChanged(i, e)}
              title="Calendar color"
            />
            <button type="button" class="remove" @click=${() => this._removeCalendar(i)} title="Remove">✕</button>
          </div>
        `,
      )}
      <button type="button" class="add" @click=${this._addCalendar}>+ Add calendar</button>

      <div class="section-label">Presence</div>
      ${presence.map(
        (entry, i) => html`
          <div class="presence-row">
            <div class="row-stack">
              <ha-entity-picker
                label="Entity"
                .hass=${this.hass}
                .value=${entry.entity}
                .includeDomains=${['input_boolean']}
                allow-custom-entity
                @value-changed=${(e: CustomEvent) => this._presenceEntityChanged(i, e)}
              ></ha-entity-picker>
              <input
                class="text-input"
                type="text"
                placeholder="Display name"
                .value=${entry.name}
                @change=${(e: Event) => this._presenceNameChanged(i, e)}
              />
            </div>
            <button type="button" class="remove" @click=${() => this._removePresence(i)} title="Remove">✕</button>
          </div>
        `,
      )}
      <button type="button" class="add" @click=${this._addPresence}>+ Add person</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-today-card-editor': LucarneTodayCardEditor;
  }
}
