import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { refundClaim } from '../../shared/integration-services.js';
import { serviceErrorMessage } from '../../shared/service-errors.js';
import type { LedgerRow } from '../../shared/types.js';
import { RewardsTabBase, formatSigned, formatWhen } from './shared.js';

/** What a ledger row says it was for; `summary` carries the task or reward name. */
export function ledgerLabel(row: LedgerRow): string {
  switch (row.kind) {
    case 'earn':
      return row.summary;
    case 'revoke':
      return `Un-ticked: ${row.summary}`;
    case 'grant':
      return row.reason || 'Points granted';
    case 'streak_daily':
      return 'Streak bonus';
    case 'streak_milestone':
      return row.reason;
    case 'claim_reserve':
      return `Claimed ${row.summary}`;
    case 'claim_release':
      return `Returned: ${row.summary}`;
    default:
      return row.summary || row.reason || row.kind;
  }
}

@customElement('lucarne-rewards-history-tab')
export class LucarneRewardsHistoryTab extends RewardsTabBase {
  @state() private _member = '';
  @state() private _confirmRefund: number | null = null;
  @state() private _busy = false;
  @state() private _error: { claimId: number; text: string } | null = null;

  private async _refund(claimId: number) {
    if (this._busy) return;
    this._busy = true;
    this._error = null;
    try {
      await refundClaim(this.hass, claimId);
      this.overlay.resolveClaim(claimId, 'refunded');
      this._confirmRefund = null;
      this.notify();
    } catch (err) {
      this._error = { claimId, text: serviceErrorMessage(err, 'Failed to refund') };
    } finally {
      this._busy = false;
    }
  }

  render() {
    const approved = new Set(this.rewards.claims.filter((c) => c.status === 'approved').map((c) => c.id));
    const rows = [...(this.rewards.history ?? [])]
      .filter((r) => this._member === '' || r.member_slug === this._member)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
    // A pooled claim writes one reserve row per contributor; offer Refund once.
    const refundable = new Set<number>();
    return html`
      <label class="field">
        <span class="muted">Member</span>
        <select
          class="member-filter"
          .value=${this._member}
          @change=${(e: Event) => (this._member = (e.target as HTMLSelectElement).value)}
        >
          <option value="">Everyone</option>
          ${this.members.map((m) => html`<option value=${m.slug}>${m.name}</option>`)}
        </select>
      </label>
      ${rows.length === 0
        ? html`<div class="empty">No history yet.</div>`
        : html`<ul class="list">
            ${rows.map((r) => {
              const canRefund =
                this.isAdmin &&
                r.kind === 'claim_reserve' &&
                r.claim_id !== null &&
                approved.has(r.claim_id) &&
                !refundable.has(r.claim_id);
              if (canRefund) refundable.add(r.claim_id as number);
              const confirming = canRefund && this._confirmRefund === r.claim_id;
              return html`
                <li class="row" data-ledger=${r.id}>
                  <div class="grow">
                    <div class="title">${ledgerLabel(r)}</div>
                    <div class="muted">
                      ${formatWhen(r.created_at)} · ${this.memberName(r.member_slug)}${r.actor_name
                        ? html` · by ${r.actor_name}`
                        : ''}
                    </div>
                  </div>
                  <div class="balance delta">${formatSigned(r.delta)}</div>
                  ${canRefund
                    ? html`<div class="actions">
                        ${confirming
                          ? html`<span class="muted">Refund?</span>
                              <button
                                class="danger confirm-refund"
                                ?disabled=${this._busy}
                                @click=${() => this._refund(r.claim_id as number)}
                              >
                                Refund
                              </button>
                              <button class="keep" @click=${() => (this._confirmRefund = null)}>Keep</button>`
                          : html`<button class="refund" @click=${() => (this._confirmRefund = r.claim_id)}>
                              Refund
                            </button>`}
                      </div>`
                    : ''}
                  ${this._error && this._error.claimId === r.claim_id && canRefund
                    ? html`<div class="error" role="alert">${this._error.text}</div>`
                    : ''}
                </li>
              `;
            })}
          </ul>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-history-tab': LucarneRewardsHistoryTab;
  }
}
