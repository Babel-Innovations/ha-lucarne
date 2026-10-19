import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { themedCheckboxStyles } from '../shared/form-control-styles.js';
import type { HomeAssistant, MemberSummary, RewardClaim, RewardItem, RewardsState } from '../shared/types.js';
import { cancelClaim, claimReward } from '../shared/integration-services.js';
import { serviceErrorMessage } from '../shared/service-errors.js';
import './member-avatar.js';
import { sortForModal, splitShares } from '../shared/rewards-math.js';

type Step =
  | { kind: 'list' }
  | { kind: 'confirm'; rewardId: number }
  | { kind: 'pool'; rewardId: number; selected: string[] }
  | { kind: 'cancelConfirm'; claimId: number };

const plural = (n: number) => (n === 1 ? 'point' : 'points');

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

@customElement('lucarne-rewards-modal')
export class LucarneRewardsModal extends LitElement {
  static styles = [
    lucarneStyles,
    themedCheckboxStyles,
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
        color: var(--lucarne-on-surface);
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h2,
      h3 {
        margin: 0;
      }
      h2 {
        font-size: var(--lucarne-fs-lg);
      }
      h3 {
        font-size: var(--lucarne-fs-md);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin: 20px 0 4px;
      }
      /* The one place the balance is stated, and where ⭐ is taught to mean points. */
      .balance {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin: 8px 0 4px;
      }
      .balance-num {
        font-size: var(--lucarne-fs-xl);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .balance-unit {
        color: var(--lucarne-on-surface-muted);
      }
      /* Each reward's cost, stated once. Filled = you can get it now. */
      .price {
        flex-shrink: 0;
        padding: 2px 10px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 999px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      button {
        font: inherit;
        min-height: 44px;
        min-width: 44px;
        padding: 0 14px;
        border-radius: 22px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        background: var(--lucarne-surface);
        color: var(--lucarne-on-surface);
        cursor: pointer;
      }
      button.primary {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
        font-weight: 600;
      }
      /* Secondary actions that should not compete with Claim; still a 44px target. */
      button.ghost {
        border-color: transparent;
        background: none;
        padding: 0 4px;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-color: rgba(0, 0, 0, 0.25);
      }
      button.pool {
        margin-top: 2px;
        margin-left: -4px;
      }
      .claim-btn {
        flex-shrink: 0;
        white-space: nowrap;
      }
      .claim-btn .cost {
        font-variant-numeric: tabular-nums;
        margin-left: 4px;
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .close-btn {
        border: none;
        background: none;
        font-size: 1.25rem;
      }
      .item {
        padding: 10px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .item:last-child {
        border-bottom: none;
      }
      .item[aria-disabled='true'] .name {
        color: var(--lucarne-on-surface-muted);
      }
      .item-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        min-height: 44px;
      }
      .item-text {
        min-width: 0;
      }
      .name {
        font-weight: 600;
      }
      .desc,
      .sub {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      .confirm {
        margin-top: 8px;
        font-weight: 600;
      }
      .alert {
        margin-top: 8px;
        padding: 8px 10px;
        border-radius: var(--lucarne-radius-sm);
        background: rgba(219, 68, 55, 0.12);
        color: #8c1d13;
      }
      .progress {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 6px;
      }
      .progress .sub {
        white-space: nowrap;
      }
      .bar {
        display: block;
        flex: 1;
        height: 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      .bar > span {
        display: block;
        height: 100%;
        background: var(--primary-color, #03a9f4);
      }
      label.pick {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 44px;
      }
      label.pick lucarne-member-avatar {
        --lucarne-avatar-size: 32px;
        --lucarne-avatar-font: 0.9rem;
        flex-shrink: 0;
      }
      label.pick input {
        width: 22px;
        height: 22px;
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) member!: MemberSummary;
  @property({ attribute: false }) members: MemberSummary[] = [];
  @property({ attribute: false }) rewards!: RewardsState;

  @state() private _step: Step = { kind: 'list' };
  @state() private _busy = false;
  @state() private _error = '';

  constructor() {
    super();
    // On the host, not .popover: a step change replaces the focused button, and
    // focus must still reach this listener once it is pulled back in.
    this.addEventListener('keydown', this._onKeydown);
  }

  firstUpdated() {
    this._closeButton()?.focus();
  }

  updated() {
    // A step, a push or a finished claim can re-template the focused button away;
    // pull focus back inside so Escape and the Tab trap keep working.
    const root = this.renderRoot as ShadowRoot;
    if (root.querySelector(':focus')) return;
    const target =
      root.querySelector<HTMLElement>('.confirm ~ .actions button:not([disabled]), .confirm ~ label.pick input:not([disabled])') ??
      this._closeButton();
    target?.focus();
  }

  private _closeButton(): HTMLElement | null {
    return this.renderRoot.querySelector('.close-btn');
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('popover-close', { bubbles: true, composed: true }));
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
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

  private _go(step: Step) {
    this._step = step;
    this._error = '';
  }

  private _reward(id: number): RewardItem | undefined {
    return this.rewards.rewards.find((r) => r.id === id);
  }

  private _balance(slug: string): number {
    return this.rewards.balances[slug] ?? 0;
  }

  private _name(slug: string): string {
    return this.members.find((m) => m.slug === slug)?.name ?? slug;
  }

  private async _submitClaim(reward: RewardItem, others: string[]) {
    if (this._busy) return;
    this._busy = true;
    this._error = '';
    try {
      const res = await claimReward(this.hass, this.member.slug, reward.id, others.length ? others : undefined);
      const claim: RewardClaim = {
        id: res.claim_id,
        reward_id: reward.id,
        reward_name: reward.name,
        cost: reward.cost,
        claimer_slug: this.member.slug,
        status: 'pending',
        created_at: new Date().toISOString(),
        resolved_at: null,
        contributors: Object.entries(res.shares).map(([member_slug, share]) => ({ member_slug, share })),
      };
      this.dispatchEvent(new CustomEvent('reward-claimed', { detail: { claim }, bubbles: true, composed: true }));
      this._go({ kind: 'list' });
    } catch (err) {
      this._error = serviceErrorMessage(err, 'Could not claim this reward');
    } finally {
      this._busy = false;
    }
  }

  private async _submitCancel(claimId: number) {
    if (this._busy) return;
    this._busy = true;
    this._error = '';
    try {
      await cancelClaim(this.hass, claimId);
      this.dispatchEvent(new CustomEvent('claim-cancelled', { detail: { claimId }, bubbles: true, composed: true }));
      this._go({ kind: 'list' });
    } catch (err) {
      this._error = serviceErrorMessage(err, 'Could not cancel this claim');
    } finally {
      this._busy = false;
    }
  }

  render() {
    if (!this.member || !this.rewards) return nothing;
    const balance = this._balance(this.member.slug);
    const pending = this.rewards.claims.filter(
      (c) =>
        c.status === 'pending' &&
        (c.claimer_slug === this.member.slug || c.contributors.some((x) => x.member_slug === this.member.slug)),
    );
    const list = sortForModal(this.rewards.rewards, balance);
    return html`
      <div class="backdrop" @click=${this._close}></div>
      <div
        class="popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rw-title"
      >
        <div class="popover-header">
          <h2 id="rw-title">${this.member.name}'s rewards</h2>
          <button class="close-btn" type="button" aria-label="Close" @click=${this._close}>✕</button>
        </div>
        <div class="balance">
          <span class="balance-num">⭐ ${balance}</span><span class="balance-unit">${plural(balance)}</span>
        </div>
        ${this._renderPending(pending)}
        ${list.length === 0
          ? html`<p class="sub">No rewards yet — ask a grown-up to add some.</p>`
          : html`${pending.length ? html`<h3>Rewards</h3>` : nothing}${list.map((r) => this._renderReward(r, balance))}`}
        ${this._renderError()}
      </div>
    `;
  }

  private _renderError() {
    return this._error ? html`<div class="alert" role="alert">${this._error}</div>` : nothing;
  }

  private _renderPending(pending: RewardClaim[]) {
    if (pending.length === 0) return nothing;
    return html`
      <h3>Waiting for a grown-up</h3>
      ${pending.map((c) => {
        const mine = c.contributors.find((x) => x.member_slug === this.member.slug);
        const isClaimer = c.claimer_slug === this.member.slug;
        // The claimer is named once, by "for X's claim", so leave them out of "with".
        const others = c.contributors
          .filter((x) => x.member_slug !== this.member.slug && x.member_slug !== c.claimer_slug)
          .map((x) => this._name(x.member_slug));
        const confirming = this._step.kind === 'cancelConfirm' && this._step.claimId === c.id;
        const share = mine?.share ?? 0;
        const status = [
          `${share} ${plural(share)} set aside${isClaimer ? '' : ` for ${this._name(c.claimer_slug)}'s claim`}`,
          others.length ? `with ${others.join(', ')}` : '',
        ].filter(Boolean).join(', ');
        return html`
          <div class="item">
            <div class="item-main">
              <div class="item-text">
                <div class="name">${c.reward_name}</div>
                <div class="sub">${status}</div>
              </div>
              ${isClaimer && !confirming
                ? html`<button type="button" class="ghost" ?disabled=${this._busy} @click=${() => this._go({ kind: 'cancelConfirm', claimId: c.id })}>Cancel</button>`
                : nothing}
            </div>
            ${confirming
              ? html`<div class="confirm">Cancel claim?</div>
                  <div class="actions">
                    <button type="button" class="primary" ?disabled=${this._busy} @click=${() => this._submitCancel(c.id)}>Yes, cancel</button>
                    <button type="button" ?disabled=${this._busy} @click=${() => this._go({ kind: 'list' })}>Keep</button>
                  </div>`
              : nothing}
          </div>
        `;
      })}
    `;
  }

  private _renderReward(r: RewardItem, balance: number) {
    const affordable = r.cost <= balance;
    const step = this._step;
    const others = this.members.filter((m) => m.slug !== this.member.slug && m.slug !== 'household');
    const canPool = r.poolable && others.length > 0;
    let body;
    if (step.kind === 'confirm' && step.rewardId === r.id) {
      body = html`
        <div class="confirm">Claim ${r.name} for ${r.cost} ${plural(r.cost)}?</div>
        <div class="actions">
          <button type="button" class="primary" ?disabled=${this._busy} @click=${() => this._submitClaim(r, [])}>Claim</button>
          <button type="button" ?disabled=${this._busy} @click=${() => this._go({ kind: 'list' })}>Back</button>
        </div>
      `;
    } else if (step.kind === 'pool' && step.rewardId === r.id) {
      body = this._renderPool(r, step.selected, others);
    } else {
      const missing = r.cost - balance;
      const toGo = html`<span class="sub">${missing} more ${plural(missing)}</span>`;
      body = html`
        ${affordable
          ? nothing
          : balance > 0
            ? html`<div class="progress">
                <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax=${r.cost} aria-valuenow=${balance} aria-label="Progress to ${r.name}">
                  <span style="width:${(balance / r.cost) * 100}%"></span>
                </div>
                ${toGo}
              </div>`
            : // An empty track says nothing the count doesn't.
              html`<div class="progress">${toGo}</div>`}
        ${canPool
          ? html`<button type="button" class="ghost pool" ?disabled=${this._busy} @click=${() => this._go({ kind: 'pool', rewardId: r.id, selected: [] })}>Claim together</button>`
          : nothing}
      `;
    }
    // The cost lives in one place: as the Claim button when it is affordable, as a tag otherwise.
    const listing = !('rewardId' in step && step.rewardId === r.id);
    const price =
      affordable && listing
        ? html`<button type="button" class="primary claim-btn" ?disabled=${this._busy} aria-label="Claim ${r.name} for ${r.cost} ${plural(r.cost)}" @click=${() => this._go({ kind: 'confirm', rewardId: r.id })}>Claim <span class="cost">⭐ ${r.cost}</span></button>`
        : html`<span class="price">⭐ ${r.cost}</span>`;
    return html`
      <div class="item" aria-disabled=${affordable ? 'false' : 'true'}>
        <div class="item-main">
          <div class="item-text">
            <div class="name">${r.name}</div>
            ${r.description ? html`<div class="desc">${r.description}</div>` : nothing}
          </div>
          ${price}
        </div>
        ${body}
      </div>
    `;
  }

  private _renderPool(r: RewardItem, selected: string[], others: MemberSummary[]) {
    const shares = splitShares(r.cost, this.member.slug, selected);
    const short: string[] = [];
    if (shares) {
      for (const [slug, share] of shares) {
        if (share > this._balance(slug)) short.push(slug);
      }
    }
    const ready = shares !== null && selected.length > 0 && short.length === 0;
    const preview = shares
      ? [...shares].map(([slug, share]) => `${slug === this.member.slug ? 'You pay' : `${this._name(slug)} pays`} ${share}`).join(', ')
      : '';
    const toggle = (slug: string) => {
      const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];
      this._go({ kind: 'pool', rewardId: r.id, selected: next });
    };
    return html`
      <div class="confirm">Who is chipping in?</div>
      ${others.map((m) => html`
        <label class="pick">
          <input type="checkbox" .checked=${selected.includes(m.slug)} ?disabled=${this._busy} @change=${() => toggle(m.slug)} />
          <lucarne-member-avatar name=${m.name} color=${m.color} .avatar=${m.avatar}></lucarne-member-avatar>
          <span>${m.name} <span class="sub">has ${this._balance(m.slug)}</span></span>
          ${shares?.has(m.slug) && short.includes(m.slug)
            ? html`<span class="sub">needs ${(shares.get(m.slug) ?? 0) - this._balance(m.slug)} more</span>`
            : nothing}
        </label>
      `)}
      ${shares === null ? html`<div class="sub">Too many people for this reward</div>` : html`<div class="sub">${preview}</div>`}
      ${shares && short.includes(this.member.slug)
        ? html`<div class="sub">You need ${(shares.get(this.member.slug) ?? 0) - this._balance(this.member.slug)} more</div>`
        : nothing}
      <div class="actions">
        <button type="button" class="primary" ?disabled=${this._busy || !ready} @click=${() => this._submitClaim(r, selected)}>Ask together</button>
        <button type="button" ?disabled=${this._busy} @click=${() => this._go({ kind: 'list' })}>Back</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-modal': LucarneRewardsModal;
  }
}
