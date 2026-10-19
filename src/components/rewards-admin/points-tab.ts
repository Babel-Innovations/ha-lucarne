import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { grantPoints } from '../../shared/integration-services.js';
import { serviceErrorMessage } from '../../shared/service-errors.js';
import { RewardsTabBase, formatPoints, parseIntInRange, pointsLabel } from './shared.js';

const REASON_MAX = 200;

const FOCUSABLE = '.dialog button:not([disabled]), .dialog input:not([disabled])';

interface GrantForm {
  slug: string;
  points: string;
  reason: string;
  error: string;
  busy: boolean;
}

@customElement('lucarne-rewards-points-tab')
export class LucarneRewardsPointsTab extends RewardsTabBase {
  static styles = [
    ...RewardsTabBase.styles,
    css`
      .grant-modal {
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
      }
      .dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        width: min(420px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        padding: var(--lucarne-spacing-xl);
        border-radius: var(--lucarne-radius-lg);
        background: var(--lucarne-surface);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      }
      .dialog h2 {
        margin: 0 0 var(--lucarne-spacing-md);
        font-size: var(--lucarne-fs-lg);
      }
      .dialog .actions {
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
    `,
  ];

  @state() private _form: GrantForm | null = null;

  /** The row's Grant button, so focus can return to it when the dialog closes. */
  private _opener: HTMLElement | null = null;

  private _open(slug: string, opener: HTMLElement) {
    this._opener = opener;
    this._form = { slug, points: '', reason: '', error: '', busy: false };
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLInputElement>('.grant-points')?.focus());
  }

  updated() {
    // Disabling the busy buttons, or a click on plain dialog text, drops focus to
    // <body>; pull it back so Escape and the Tab trap keep working (rewards-modal.ts).
    if (!this._form || (this.renderRoot as ShadowRoot).activeElement) return;
    this.renderRoot.querySelector<HTMLInputElement>('.grant-points')?.focus();
  }

  private _close() {
    if (this._form?.busy) return;
    this._form = null;
    this._opener?.focus();
    this._opener = null;
  }

  private _patch(patch: Partial<GrantForm>) {
    if (this._form) this._form = { ...this._form, ...patch };
  }

  private async _grant() {
    const form = this._form;
    if (!form || form.busy) return;
    // Mirrors the server: whole points 1–10000, reason up to 200 characters.
    const points = parseIntInRange(form.points, 1, 10000);
    if (points === null) {
      this._patch({ error: 'Points must be a whole number from 1 to 10000' });
      return;
    }
    if (form.reason.length > REASON_MAX) {
      this._patch({ error: `Reason must be ${REASON_MAX} characters or less` });
      return;
    }
    this._patch({ busy: true, error: '' });
    try {
      await grantPoints(this.hass, form.slug, points, form.reason.trim() || undefined);
      this.overlay.addGrant(form.slug, points);
      this._patch({ busy: false });
      this._close();
      this.notify();
    } catch (err) {
      this._patch({ busy: false, error: serviceErrorMessage(err, 'Failed to grant points') });
    }
  }

  private _onDialogKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this._close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(this.renderRoot.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const active = (this.renderRoot as ShadowRoot).activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active) : -1;
    const next = e.shiftKey ? (idx <= 0 ? items.length - 1 : idx - 1) : idx === items.length - 1 ? 0 : idx + 1;
    e.preventDefault();
    items[next].focus();
  };

  private _renderDialog(form: GrantForm) {
    const name = this.memberName(form.slug);
    const onEnter = (e: KeyboardEvent) => e.key === 'Enter' && this._grant();
    return html`<div class="grant-modal" @keydown=${this._onDialogKeydown}>
      <div class="backdrop" @click=${() => this._close()}></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="grant-title">
        <h2 id="grant-title">Grant points to ${name}</h2>
        <div class="muted">Balance: ${pointsLabel(this.rewards.balances[form.slug] ?? 0)}</div>
        <div class="form">
          <label class="field">
            <span class="muted">Points</span>
            <input
              class="grant-points"
              type="number"
              min="1"
              max="10000"
              step="1"
              inputmode="numeric"
              .value=${form.points}
              @input=${(e: Event) => this._patch({ points: (e.target as HTMLInputElement).value })}
              @keydown=${onEnter}
            />
          </label>
          <label class="field">
            <span class="muted">Reason (${form.reason.length}/${REASON_MAX})</span>
            <input
              class="grant-reason"
              type="text"
              maxlength=${REASON_MAX}
              .value=${form.reason}
              @input=${(e: Event) => this._patch({ reason: (e.target as HTMLInputElement).value })}
              @keydown=${onEnter}
            />
          </label>
          ${form.error ? html`<div class="error" role="alert">${form.error}</div>` : ''}
        </div>
        <div class="actions">
          <button class="cancel" ?disabled=${form.busy} @click=${() => this._close()}>Cancel</button>
          <button class="primary confirm-grant" ?disabled=${form.busy} @click=${() => this._grant()}>Grant</button>
        </div>
      </div>
    </div>`;
  }

  render() {
    const people = this.members.filter((m) => m.slug !== 'household');
    if (people.length === 0) return html`<div class="empty">No family members yet.</div>`;
    return html`
      <ul class="list">
        ${people.map(
          (m) => html`
            <li class="row" data-member=${m.slug}>
              <div class="grow">${this.renderChip(m.slug)}</div>
              <div class="balance" aria-label="${m.name} balance">
                ${formatPoints(this.rewards.balances[m.slug] ?? 0)}
              </div>
              ${this.isAdmin
                ? html`<button
                    class="primary grant"
                    aria-label="Grant points to ${m.name}"
                    @click=${(e: Event) => this._open(m.slug, e.currentTarget as HTMLElement)}
                  >
                    Grant
                  </button>`
                : ''}
            </li>
          `,
        )}
      </ul>
      ${this._form ? this._renderDialog(this._form) : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-points-tab': LucarneRewardsPointsTab;
  }
}
