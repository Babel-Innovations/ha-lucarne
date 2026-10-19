import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../shared/types.js';
import type { LucarneRewardsAdminCardConfig } from '../cards/lucarne-rewards-admin-card.js';
import { DEFAULT_HISTORY_LIMIT } from '../cards/lucarne-rewards-admin-card.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { editorBaseStyles } from '../shared/editor-styles.js';
import { fireEvent } from '../shared/fire-event.js';

@customElement('lucarne-rewards-admin-card-editor')
export class LucarneRewardsAdminCardEditor extends LitElement {
  static styles = [lucarneStyles, editorBaseStyles];

  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: LucarneRewardsAdminCardConfig;

  setConfig(config: LucarneRewardsAdminCardConfig) {
    this._config = config;
  }

  private _fire(config: LucarneRewardsAdminCardConfig) {
    fireEvent(this, 'config-changed', { config });
  }

  private _titleChanged(e: Event) {
    const input = e.target as HTMLInputElement;
    this._fire({ ...this._config!, title: input.value || undefined });
  }

  private _historyLimitChanged(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    this._fire({ ...this._config!, history_limit: isNaN(v) ? undefined : v });
  }

  render() {
    if (!this._config) return html``;
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
      <label class="field">
        <span class="field-label">History rows (1–500)</span>
        <input
          class="text-input"
          type="number"
          min="1"
          max="500"
          step="1"
          .value=${String(this._config.history_limit ?? DEFAULT_HISTORY_LIMIT)}
          @change=${this._historyLimitChanged}
        />
      </label>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-admin-card-editor': LucarneRewardsAdminCardEditor;
  }
}
