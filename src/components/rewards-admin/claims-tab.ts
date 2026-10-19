import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { approveClaim, rejectClaim } from '../../shared/integration-services.js';
import { serviceErrorMessage } from '../../shared/service-errors.js';
import { RewardsTabBase, pointsLabel, relativeAge } from './shared.js';

@customElement('lucarne-rewards-claims-tab')
export class LucarneRewardsClaimsTab extends RewardsTabBase {
  @state() private _busy: ReadonlySet<number> = new Set();
  @state() private _errors: ReadonlyMap<number, string> = new Map();

  private async _resolve(claimId: number, action: 'approve' | 'reject') {
    if (this._busy.has(claimId)) return;
    this._busy = new Set(this._busy).add(claimId);
    const nextErrors = new Map(this._errors);
    nextErrors.delete(claimId);
    this._errors = nextErrors;
    try {
      if (action === 'approve') await approveClaim(this.hass, claimId);
      else await rejectClaim(this.hass, claimId);
      this.overlay.resolveClaim(claimId, action === 'approve' ? 'approved' : 'rejected');
      this.notify();
    } catch (err) {
      this._errors = new Map(this._errors).set(
        claimId,
        serviceErrorMessage(err, action === 'approve' ? 'Failed to approve' : 'Failed to reject'),
      );
    } finally {
      const busy = new Set(this._busy);
      busy.delete(claimId);
      this._busy = busy;
    }
  }

  render() {
    const pending = this.rewards.claims
      .filter((c) => c.status === 'pending')
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    if (pending.length === 0) return html`<div class="empty">No claims waiting.</div>`;
    return html`
      <ul class="list">
        ${pending.map((c) => {
          const busy = this._busy.has(c.id);
          const error = this._errors.get(c.id);
          const pooled = c.contributors.length > 1;
          return html`
            <li class="row" data-claim-id=${c.id}>
              <div class="claim-line">
                <span class="chips">
                  ${c.contributors.map((p) =>
                    // A share only means something when the cost is split.
                    this.renderChip(p.member_slug, pooled ? ` (${pointsLabel(p.share)})` : ''),
                  )}
                </span>
                <span class="title">${c.reward_name}</span>
                <span class="muted">${pointsLabel(c.cost)} · ${relativeAge(c.created_at)}</span>
              </div>
              ${this.isAdmin
                ? html`<div class="actions">
                    <button class="primary approve" ?disabled=${busy} @click=${() => this._resolve(c.id, 'approve')}>
                      Approve
                    </button>
                    <button class="reject" ?disabled=${busy} @click=${() => this._resolve(c.id, 'reject')}>
                      Reject
                    </button>
                  </div>`
                : ''}
              ${error ? html`<div class="error" role="alert">${error}</div>` : ''}
            </li>
          `;
        })}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-claims-tab': LucarneRewardsClaimsTab;
  }
}
