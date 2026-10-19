import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lucarne-streak-display')
export class LucarneStreakDisplay extends LitElement {
  static styles = css`
    :host {
      display: block;
      text-align: center;
      padding: 8px 4px;
      font-family: var(--primary-font-family, sans-serif);
    }
    .streak-row {
      min-height: var(--lucarne-streak-row-min-height, 0);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .flame {
      font-size: clamp(1.1rem, 1.8vw, 1.5rem);
      line-height: 1;
      transition: font-size 0.2s;
    }
    .flame.milestone-1 { font-size: clamp(1.2rem, 2vw, 1.6rem); }
    .flame.milestone-2 { font-size: clamp(1.3rem, 2.2vw, 1.75rem); }
    .flame.milestone-3 { font-size: clamp(1.4rem, 2.4vw, 1.9rem); }
    .flame.milestone-4 { font-size: clamp(1.5rem, 2.6vw, 2rem); }
    .flame.milestone-5 { font-size: clamp(1.6rem, 2.8vw, 2.2rem); }
    .count {
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      color: var(--primary-text-color, #212121);
    }
    ::slotted([slot='aside']) {
      margin-left: 12px;
    }
    .label {
      font-size: clamp(0.7rem, 0.9vw, 0.8rem);
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }
  `;

  @property({ type: Number }) streak = 0;

  private _milestoneClass(s: number): string {
    if (s >= 30) return 'milestone-5';
    if (s >= 14) return 'milestone-4';
    if (s >= 7) return 'milestone-3';
    if (s >= 3) return 'milestone-2';
    if (s >= 1) return 'milestone-1';
    return '';
  }

  render() {
    const s = isNaN(this.streak) ? 0 : this.streak;
    const label = s > 0 ? 'day streak' : 'start a streak today';
    return html`
      <div class="streak-row">
        <span class="flame ${this._milestoneClass(s)}">🔥</span>
        <span class="count">${s}</span>
        <slot name="aside"></slot>
      </div>
      <div class="label">${label}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-streak-display': LucarneStreakDisplay;
  }
}
