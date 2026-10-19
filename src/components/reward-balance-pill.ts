import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lucarne-reward-balance-pill')
export class LucarneRewardBalancePill extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      font-family: var(--primary-font-family, sans-serif);
    }
    button {
      position: relative;
      min-width: 44px;
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 22px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      cursor: pointer;
    }
    /* Filled = a reward is within reach; the rewards modal's Claim buttons use the same fill. */
    button.ready {
      background: var(--primary-color, #03a9f4);
      border-color: transparent;
      color: var(--text-primary-color, #fff);
    }
  `;

  @property({ type: Number }) balance = 0;
  @property({ type: Boolean }) affordable = false;
  @property({ attribute: 'member-name' }) memberName = '';
  @property({ attribute: 'member-slug' }) memberSlug = '';

  render() {
    const shown = this.balance < 0 ? `−${Math.abs(this.balance)}` : String(this.balance);
    const label = `${this.memberName}: ${this.balance} ${this.balance === 1 ? 'point' : 'points'}${this.affordable ? ', a reward is ready' : ''}`;
    return html`
      <button type="button" class=${this.affordable ? 'ready' : ''} aria-label=${label} @click=${this._onClick}>
        <span aria-hidden="true">⭐ ${shown}</span>
      </button>
    `;
  }

  private _onClick() {
    this.dispatchEvent(
      new CustomEvent('rewards-open', {
        detail: { memberSlug: this.memberSlug },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-reward-balance-pill': LucarneRewardBalancePill;
  }
}
