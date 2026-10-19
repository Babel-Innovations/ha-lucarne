import { html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { LucarneCardBase, LucarneConfigError } from '../shared/card-base.js';
import type { HomeAssistant } from '../shared/types.js';
import { subscribeFamilyState } from '../shared/family-subscription.js';
import type { FamilyState } from '../shared/family-subscription.js';
import { RewardsOverlay } from '../shared/rewards-optimistic.js';
import '../components/rewards-admin/claims-tab.js';
import '../components/rewards-admin/points-tab.js';
import '../components/rewards-admin/catalog-tab.js';
import '../components/rewards-admin/history-tab.js';
import '../components/rewards-admin/settings-tab.js';
import { markBoot } from '../shared/boot-marks.js';

export interface LucarneRewardsAdminCardConfig {
  type: 'custom:lucarne-rewards-admin-card';
  title?: string;
  /** Ledger rows requested for the History tab, 1–500. Default 200. */
  history_limit?: number;
  /** When true, forward card errors to a Home Assistant persistent_notification. */
  debug?: boolean;
}

export const DEFAULT_HISTORY_LIMIT = 200;

type TabId = 'claims' | 'points' | 'rewards' | 'history' | 'settings';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'claims', label: 'Claims' },
  { id: 'points', label: 'Points' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

const PANEL_ID = 'rewards-panel';

(window as Window & typeof globalThis & { customCards?: object[] }).customCards =
  (window as Window & typeof globalThis & { customCards?: object[] }).customCards || [];
(window as Window & typeof globalThis & { customCards?: object[] }).customCards!.push({
  type: 'lucarne-rewards-admin-card',
  name: 'Lucarne Rewards Admin',
  description: 'Approve reward claims, grant points and manage the reward catalog',
  preview: false,
});
// Breadcrumb, not a registration: see the matching mark in lucarne-chores-card.ts (issue #101).
markBoot('evaluating:lucarne-rewards-admin-card');

@customElement('lucarne-rewards-admin-card')
export class LucarneRewardsAdminCard extends LucarneCardBase<LucarneRewardsAdminCardConfig> {
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
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) 0;
      }
      .note {
        margin: var(--lucarne-spacing-md) var(--lucarne-spacing-xl) 0;
        padding: var(--lucarne-spacing-md);
        border-radius: var(--lucarne-radius-md);
        background: var(--lucarne-skeleton-base);
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-sm);
      }
      .tabs {
        display: flex;
        overflow-x: auto;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-xl) 0;
        gap: var(--lucarne-spacing-xs);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }
      .tab {
        min-height: 44px;
        padding: 0 var(--lucarne-spacing-lg);
        border: none;
        border-bottom: 3px solid transparent;
        background: transparent;
        color: var(--lucarne-on-surface-muted);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .tab[aria-selected='true'] {
        color: var(--lucarne-on-surface);
        border-bottom-color: var(--primary-color, #03a9f4);
      }
      .panel {
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-xl);
      }
      .skeleton {
        height: 16px;
        margin: var(--lucarne-spacing-xl);
        border-radius: var(--lucarne-radius-sm);
        background: var(--lucarne-skeleton-base);
      }
      .message {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;

  @state() private _config?: LucarneRewardsAdminCardConfig;
  @state() private _familyState: FamilyState | null = null;
  @state() private _tab: TabId = 'claims';

  /** Plain object: tabs record overrides, then fire OVERLAY_CHANGED to re-render us. */
  private _overlay = new RewardsOverlay();
  private _unsubFamily?: () => void;

  static getConfigElement() {
    return document.createElement('lucarne-rewards-admin-card-editor');
  }

  static getStubConfig() {
    return { type: 'custom:lucarne-rewards-admin-card' };
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 6 };
  }

  /** Invoked by LucarneCardBase.setConfig(), which owns the error boundary. */
  protected applyConfig(config: LucarneRewardsAdminCardConfig) {
    const limit = config.history_limit;
    if (limit !== undefined && !(Number.isInteger(limit) && limit >= 1 && limit <= 500)) {
      throw new LucarneConfigError('lucarne-rewards-admin-card: history_limit must be an integer from 1 to 500');
    }
    const changed = this._historyLimit(this._config) !== this._historyLimit(config);
    this._config = config;
    // The limit is fixed when the subscription is created, so a new one needs a new subscription.
    if (changed && this._unsubFamily) {
      this._unsubFamily();
      this._unsubFamily = undefined;
      this._subscribe();
    }
  }

  private _historyLimit(config: LucarneRewardsAdminCardConfig | undefined): number {
    return config?.history_limit ?? DEFAULT_HISTORY_LIMIT;
  }

  private _subscribe() {
    if (!this.hass || this._unsubFamily || !this.isConnected) return;
    this._unsubFamily = subscribeFamilyState(this.hass, this._onFamilyState, {
      rewards: true,
      rewardsHistory: this._historyLimit(this._config),
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this._subscribe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubFamily?.();
    this._unsubFamily = undefined;
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('hass')) this._subscribe();
  }

  private _onFamilyState = (state: FamilyState) => {
    this._overlay.reconcile(state.rewardsFetchedAt);
    this._familyState = state;
  };

  private _onTabKeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === this._tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    this._tab = next.id;
    // Roving tabindex: focus follows selection once the new tab has rendered.
    void this.updateComplete.then(() =>
      this.shadowRoot?.querySelector<HTMLElement>(`#tab-${next.id}`)?.focus(),
    );
  }

  private _renderPanel(tab: TabId, rewards: NonNullable<FamilyState['rewards']>, state: FamilyState) {
    const { hass, _overlay: overlay } = this;
    const members = state.members;
    switch (tab) {
      case 'claims':
        return html`<lucarne-rewards-claims-tab .hass=${hass} .rewards=${rewards} .members=${members} .overlay=${overlay}></lucarne-rewards-claims-tab>`;
      case 'points':
        return html`<lucarne-rewards-points-tab .hass=${hass} .rewards=${rewards} .members=${members} .overlay=${overlay}></lucarne-rewards-points-tab>`;
      case 'rewards':
        return html`<lucarne-rewards-catalog-tab .hass=${hass} .rewards=${rewards} .members=${members} .overlay=${overlay}></lucarne-rewards-catalog-tab>`;
      case 'history':
        return html`<lucarne-rewards-history-tab .hass=${hass} .rewards=${rewards} .members=${members} .overlay=${overlay}></lucarne-rewards-history-tab>`;
      case 'settings':
        return html`<lucarne-rewards-settings-tab .hass=${hass} .rewards=${rewards} .members=${members} .overlay=${overlay}></lucarne-rewards-settings-tab>`;
    }
  }

  protected renderContent() {
    const state = this._familyState;
    const title = this._config?.title;
    const header = title ? html`<div class="card-title">${title}</div>` : '';
    const rewards = state?.rewards ? this._overlay.apply(state.rewards) : null;

    if (!state || !rewards) {
      // Null after a push that did load the family means the command is missing.
      const outdated = state !== null && state.rewards === null && state.members.length > 0;
      return html`<ha-card>
        ${header}
        ${outdated
          ? html`<div class="message">Rewards need the Lucarne integration to be updated.</div>`
          : html`<div class="skeleton" aria-hidden="true"></div>`}
      </ha-card>`;
    }

    const pending = rewards.claims.filter((c) => c.status === 'pending').length;
    return html`<ha-card @rewards-overlay-changed=${() => this.requestUpdate()}>
      ${header}
      ${rewards.is_admin
        ? ''
        : html`<div class="note" role="note">
            You can view rewards, but approving claims and granting points needs a Home Assistant administrator.
          </div>`}
      <div class="tabs" role="tablist" aria-label="Rewards" @keydown=${this._onTabKeydown}>
        ${TABS.map((t) => {
          const selected = t.id === this._tab;
          return html`<button
            class="tab"
            id="tab-${t.id}"
            role="tab"
            aria-selected=${selected ? 'true' : 'false'}
            aria-controls=${PANEL_ID}
            tabindex=${selected ? '0' : '-1'}
            @click=${() => (this._tab = t.id)}
          >
            ${t.id === 'claims' && pending > 0 ? `${t.label} (${pending})` : t.label}
          </button>`;
        })}
      </div>
      <div class="panel" id=${PANEL_ID} role="tabpanel" aria-labelledby="tab-${this._tab}">
        ${this._renderPanel(this._tab, rewards, state)}
      </div>
    </ha-card>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-admin-card': LucarneRewardsAdminCard;
  }
}
