import { LitElement, html, css, PropertyValues } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, MemberSummary } from '../shared/types.js';
import type { LucarneChoresCardConfig } from '../cards/lucarne-chores-card.js';
import { DEFAULT_AFTERNOON_START, DEFAULT_NIGHT_START } from '../cards/lucarne-chores-card.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { subscribeFamilyState, SYNTHETIC_HOUSEHOLD } from '../shared/family-subscription.js';
import type { FamilyState } from '../shared/family-subscription.js';
import { fireEvent } from '../shared/fire-event.js';
import '../components/avatar-upload-modal.js';
import '../components/reorder-list.js';
import type { ReorderItem } from '../components/reorder-list.js';

@customElement('lucarne-chores-card-editor')
export class LucarneChoresCardEditor extends LitElement {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-lg);
        box-sizing: border-box;
        width: 100%;
      }
      .section-label {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin: var(--lucarne-spacing-md) 0 var(--lucarne-spacing-xs);
      }
      .section-label:first-of-type {
        margin-top: 0;
      }
      /* Row content rendered inside the shared <lucarne-reorder-list>. */
      .member-content {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        min-width: 0;
      }
      .member-content.hidden-member .member-avatar,
      .member-content.hidden-member .member-name {
        opacity: 0.45;
      }
      .member-name {
        flex: 1;
        min-width: 0;
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .member-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
        flex-shrink: 0;
      }
      .icon-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--lucarne-on-surface);
      }
      .icon-btn ha-icon {
        --mdc-icon-size: 20px;
        width: 20px;
        height: 20px;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .toggle-row label {
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        cursor: pointer;
        flex: 1;
      }
      /* Custom checkbox: the native control follows the OS color-scheme and
         renders as a black box on a light HA theme when the OS is dark. Render
         it ourselves from theme tokens so it matches the card surface + accent. */
      input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        margin: 0;
        flex-shrink: 0;
        position: relative;
        cursor: pointer;
        border: 2px solid var(--lucarne-on-surface-muted, #727272);
        border-radius: 4px;
        background: var(--lucarne-surface, var(--ha-card-background, #fff));
      }
      input[type='checkbox']:checked {
        background: var(--primary-color, #03a9f4);
        border-color: var(--primary-color, #03a9f4);
      }
      input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      input[type='text'] {
        width: 100%;
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: var(--lucarne-radius-sm);
        font-size: var(--lucarne-fs-md);
        box-sizing: border-box;
      }
      .time-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .time-row label {
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        flex: 1;
      }
      /* Without an explicit color-scheme the native time control paints itself in
         the OS scheme — a dark box on the (light) lucarne theme. Pin it to the
         theme surface + tokens so the field, its digits, and the clock glyph match
         the rest of the editor instead of following the OS. */
      input[type='time'] {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: var(--lucarne-radius-sm);
        font-size: var(--lucarne-fs-md);
        box-sizing: border-box;
        color-scheme: light;
        background: var(--lucarne-surface, var(--ha-card-background, #fff));
        color: var(--lucarne-on-surface, #212121);
      }
      input[type='time']:disabled {
        opacity: 0.5;
      }
      .loading {
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
        padding: var(--lucarne-spacing-lg);
      }
      .error-block {
        padding: var(--lucarne-spacing-md);
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-xs);
      }
      .error-block a {
        color: var(--primary-color);
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: LucarneChoresCardConfig;
  @state() private _familyState: FamilyState | null = null;
  @state() private _avatarModalMember: MemberSummary | null = null;

  private _unsubFamily?: () => void;

  setConfig(config: LucarneChoresCardConfig) {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.hass && !this._unsubFamily) {
      this._unsubFamily = subscribeFamilyState(this.hass, (s) => {
        this._familyState = s;
      });
    }
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('hass') && this.hass && !this._unsubFamily) {
      this._unsubFamily = subscribeFamilyState(this.hass, (s) => {
        this._familyState = s;
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubFamily?.();
    this._unsubFamily = undefined;
  }

  private _fire(config: LucarneChoresCardConfig) {
    // Strip legacy 'kids' property and ensure members array exists (normalizes legacy configs)
    const out = { ...config } as Record<string, unknown>;
    delete out['kids'];
    if (!Array.isArray(out['members'])) out['members'] = [];
    fireEvent(this, 'config-changed', { config: out as unknown as LucarneChoresCardConfig });
  }

  /**
   * Resolve the editor's unified members list from config + family state.
   *
   * `members` is the full display order (visible AND hidden); a member not yet
   * placed is appended (in family order) and treated as hidden-by-default. The
   * card renders `members` minus `hidden`, so a hidden member keeps its slot.
   */
  private _membersModel(): { ordered: MemberSummary[]; hidden: Set<string> } {
    const family = [...(this._familyState?.members ?? []), SYNTHETIC_HOUSEHOLD];
    const slugToMember = new Map(family.map((m) => [m.slug, m]));
    const placed = this._config?.members ?? [];
    const inPlaced = new Set(placed);
    const orderedSlugs = [
      ...placed.filter((s) => slugToMember.has(s)),
      ...family.filter((m) => !inPlaced.has(m.slug)).map((m) => m.slug),
    ];
    const explicitHidden = new Set(this._config?.hidden_members ?? []);
    const hidden = new Set<string>();
    for (const s of orderedSlugs) {
      if (explicitHidden.has(s) || !inPlaced.has(s)) hidden.add(s);
    }
    return { ordered: orderedSlugs.map((s) => slugToMember.get(s)!), hidden };
  }

  /** Persist the full order + hidden set (omitting hidden_members when empty). */
  private _commitMembers(orderedSlugs: string[], hidden: Set<string>) {
    const out = { ...this._config! } as Record<string, unknown>;
    out['members'] = orderedSlugs;
    if (hidden.size) out['hidden_members'] = [...hidden];
    else delete out['hidden_members'];
    this._fire(out as unknown as LucarneChoresCardConfig);
  }

  private _titleChanged(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this._fire({ ...this._config!, title: v || undefined });
  }

  private _toggleVisibility(slug: string) {
    const { ordered, hidden } = this._membersModel();
    const next = new Set(hidden);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    this._commitMembers(ordered.map((m) => m.slug), next);
  }

  // Reorder never changes a member's hidden state, so a hidden member can be
  // dragged into any slot and still stay off the card.
  private _onMembersReorder(order: string[]) {
    const { hidden } = this._membersModel();
    this._commitMembers(order, hidden);
  }

  private _toggleChanged(
    field: 'show_routines' | 'show_tasks' | 'show_streak' | 'hide_names',
    e: Event,
  ) {
    const v = (e.target as HTMLInputElement).checked;
    this._fire({ ...this._config!, [field]: v });
  }

  private _autoScrollChanged(e: Event) {
    const v = (e.target as HTMLInputElement).checked;
    this._fire({ ...this._config!, auto_scroll: v });
  }

  private _scrollTimeChanged(field: 'afternoon_start' | 'night_start', e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this._fire({ ...this._config!, [field]: v || undefined });
  }

  private _renderMemberContent(m: MemberSummary, isHidden: boolean): TemplateResult {
    return html`
      <div class="member-content ${isHidden ? 'hidden-member' : ''}" slot=${m.slug} data-slug=${m.slug}>
        <div class="member-avatar">
          ${m.avatar && m.avatar.startsWith('/local/')
            ? html`<img src=${m.avatar} alt=${m.name} style="width:100%;height:100%;object-fit:cover;" />`
            : html`${m.avatar ?? m.name[0]}`}
        </div>
        <span class="member-name">${m.name}</span>
        <button
          class="icon-btn visibility-btn"
          type="button"
          aria-label="${isHidden ? 'Show' : 'Hide'} ${m.name} on the card"
          title="${isHidden ? 'Show on card' : 'Hide from card'}"
          @click=${() => this._toggleVisibility(m.slug)}
        >
          <ha-icon icon=${isHidden ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}></ha-icon>
        </button>
        ${m.slug !== 'household'
          ? html`<button
              class="icon-btn change-avatar-btn"
              type="button"
              title="Edit avatar"
              aria-label="Edit avatar for ${m.name}"
              @click=${() => { this._avatarModalMember = m; }}
            >
              <ha-icon icon="mdi:pencil-outline"></ha-icon>
            </button>`
          : ''}
      </div>
    `;
  }

  render() {
    if (!this._config) return html``;

    if (this._familyState !== null && this._familyState.integrationError !== null) {
      return html`
        <div class="error-block">
          Install the Lucarne Family integration first.
          <a href="/config/integrations/dashboard#search=lucarne" target="_blank"
            >Open Integrations</a
          >
        </div>
      `;
    }

    if (this._familyState === null) {
      return html`<div class="loading">Loading members…</div>`;
    }

    const { ordered, hidden } = this._membersModel();
    const items: ReorderItem[] = ordered.map((m) => ({ key: m.slug, label: m.name }));

    return html`
      <div class="section-label">General</div>
      <input
        id="ed-title"
        type="text"
        placeholder="Card title (default: Chores)"
        .value=${this._config.title ?? ''}
        @change=${this._titleChanged}
      />

      <div class="section-label">Members</div>
      <lucarne-reorder-list
        label="Members (drag to reorder, eye to show or hide)"
        .items=${items}
        @reorder=${(e: CustomEvent) => this._onMembersReorder(e.detail.order as string[])}
      >
        ${ordered.map((m) => this._renderMemberContent(m, hidden.has(m.slug)))}
      </lucarne-reorder-list>

      ${this._avatarModalMember
        ? html`<lucarne-avatar-upload-modal
            .hass=${this.hass}
            .memberSlug=${this._avatarModalMember.slug}
            .memberName=${this._avatarModalMember.name}
            @close=${() => { this._avatarModalMember = null; }}
            @avatar-changed=${() => { this._avatarModalMember = null; }}
          ></lucarne-avatar-upload-modal>`
        : ''}

      <div class="section-label">Display</div>
      ${(
        [
          ['show_routines', 'Show routines'],
          ['show_tasks', 'Show tasks'],
          ['show_streak', 'Show streak'],
          ['hide_names', 'Hide names'],
        ] as const
      ).map(
        ([field, label]) => html`
          <div class="toggle-row">
            <input
              type="checkbox"
              id="ed-${field}"
              .checked=${this._config![field] ?? (field === 'hide_names' ? false : true)}
              @change=${(e: Event) => this._toggleChanged(field, e)}
            />
            <label for="ed-${field}">${label}</label>
          </div>
        `,
      )}

      <div class="section-label">Auto-scroll</div>
      <div class="toggle-row">
        <input
          type="checkbox"
          id="ed-auto_scroll"
          .checked=${this._config.auto_scroll ?? true}
          @change=${this._autoScrollChanged}
        />
        <label for="ed-auto_scroll">Scroll columns to the current time of day</label>
      </div>
      <div class="time-row">
        <label for="ed-afternoon_start">Afternoon starts at</label>
        <input
          type="time"
          id="ed-afternoon_start"
          ?disabled=${!(this._config.auto_scroll ?? true)}
          .value=${this._config.afternoon_start ?? DEFAULT_AFTERNOON_START}
          @change=${(e: Event) => this._scrollTimeChanged('afternoon_start', e)}
        />
      </div>
      <div class="time-row">
        <label for="ed-night_start">Night starts at</label>
        <input
          type="time"
          id="ed-night_start"
          ?disabled=${!(this._config.auto_scroll ?? true)}
          .value=${this._config.night_start ?? DEFAULT_NIGHT_START}
          @change=${(e: Event) => this._scrollTimeChanged('night_start', e)}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-chores-card-editor': LucarneChoresCardEditor;
  }
}
