import { LitElement, html, css } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { lucarneStyles } from '../../shared/design-tokens.js';
import { themedCheckboxStyles, themedSelectStyles } from '../../shared/form-control-styles.js';
import { fireEvent } from '../../shared/fire-event.js';
import type { HomeAssistant, MemberSummary, RewardsState } from '../../shared/types.js';
import type { RewardsOverlay } from '../../shared/rewards-optimistic.js';
import '../member-avatar.js';

/** Fired (bubbling, composed) after a tab records an override so the card re-renders. */
export const OVERLAY_CHANGED = 'rewards-overlay-changed';

/** A balance or delta as text; negatives use a real minus sign ("−3"). */
export function formatPoints(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

export function pointsLabel(n: number): string {
  return `${formatPoints(n)} ${Math.abs(n) === 1 ? 'point' : 'points'}`;
}

export function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : formatPoints(n);
}

export function relativeAge(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((now - t) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Whole number in [min, max] from raw input text, else null. */
export function parseIntInRange(raw: string, min: number, max: number): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export const tabStyles = css`
  :host {
    display: block;
    color: var(--lucarne-on-surface);
    font-size: var(--lucarne-fs-md);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-sm);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--lucarne-spacing-md);
    padding: var(--lucarne-spacing-md);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--lucarne-radius-md);
  }
  .row.archived {
    opacity: 0.55;
  }
  .grow {
    flex: 1 1 160px;
    min-width: 0;
  }
  .title {
    font-weight: 600;
  }
  .muted {
    color: var(--lucarne-on-surface-muted);
    font-size: var(--lucarne-fs-sm);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--lucarne-spacing-sm);
    margin-top: var(--lucarne-spacing-xs);
  }
  .claim-line {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
    min-width: 0;
  }
  .claim-line .chips {
    margin-top: 0;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--lucarne-spacing-xs);
    font-size: var(--lucarne-fs-sm);
  }
  .chip lucarne-member-avatar {
    --lucarne-avatar-size: 24px;
    --lucarne-avatar-font: 0.8rem;
  }
  .badge {
    font-size: var(--lucarne-fs-sm);
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--lucarne-success-bg);
    color: var(--lucarne-success-fg);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--lucarne-spacing-sm);
  }
  button {
    min-height: 44px;
    min-width: 44px;
    padding: 0 var(--lucarne-spacing-lg);
    border-radius: var(--lucarne-radius-md);
    border: 1px solid rgba(0, 0, 0, 0.2);
    background: transparent;
    color: var(--lucarne-on-surface);
    font: inherit;
    cursor: pointer;
  }
  button.primary {
    background: var(--primary-color, #03a9f4);
    border-color: transparent;
    color: var(--text-primary-color, #fff);
  }
  button.danger {
    color: var(--error-color, #db4437);
    border-color: var(--error-color, #db4437);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  input[type='text'],
  input[type='number'],
  textarea,
  select {
    box-sizing: border-box;
    min-height: 44px;
    padding: 0 var(--lucarne-spacing-md);
    border: 1px solid rgba(0, 0, 0, 0.25);
    border-radius: var(--lucarne-radius-md);
    background: var(--lucarne-surface);
    color: var(--lucarne-on-surface);
    font: inherit;
  }
  textarea {
    padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
    width: 100%;
    min-height: 72px;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-sm);
    width: 100%;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-xs);
  }
  .field-inline {
    flex-direction: row;
    align-items: center;
    gap: var(--lucarne-spacing-sm);
    min-height: 44px;
  }
  .error {
    color: var(--error-color, #db4437);
    font-size: var(--lucarne-fs-sm);
    width: 100%;
  }
  .empty {
    color: var(--lucarne-on-surface-muted);
    padding: var(--lucarne-spacing-lg) 0;
  }
  .balance {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`;

/**
 * Common shape of the five admin tabs.
 *
 * Tabs never mutate the server state they are handed: they call a service, record
 * an override on the shared overlay once it resolves, and `notify()` so the card
 * (which computes `overlay.apply(...)`) re-renders. `isAdmin` is the server's
 * answer, not a gate — the server enforces admin on every write regardless.
 */
export abstract class RewardsTabBase extends LitElement {
  static styles = [lucarneStyles, tabStyles, themedCheckboxStyles, themedSelectStyles];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) rewards!: RewardsState;
  @property({ attribute: false }) members: MemberSummary[] = [];
  @property({ attribute: false }) overlay!: RewardsOverlay;

  protected get isAdmin(): boolean {
    return this.rewards?.is_admin === true;
  }

  protected notify(): void {
    fireEvent(this, OVERLAY_CHANGED);
  }

  protected memberFor(slug: string): MemberSummary | undefined {
    return this.members.find((m) => m.slug === slug);
  }

  protected memberName(slug: string): string {
    return this.memberFor(slug)?.name ?? slug;
  }

  protected renderChip(slug: string, suffix = ''): TemplateResult {
    const m = this.memberFor(slug);
    return html`<span class="chip">
      <lucarne-member-avatar
        .name=${m?.name ?? slug}
        .color=${m?.color ?? '#a8d8b9'}
        .avatar=${m?.avatar ?? null}
      ></lucarne-member-avatar>
      ${m?.name ?? slug}${suffix}
    </span>`;
  }
}
