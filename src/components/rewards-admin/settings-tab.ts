import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { setRewardsSettings } from '../../shared/integration-services.js';
import { serviceErrorMessage } from '../../shared/service-errors.js';
import { RewardsTabBase, parseIntInRange } from './shared.js';

const MAX_MILESTONES = 20;

interface MilestoneDraft {
  days: string;
  points: string;
}

@customElement('lucarne-rewards-settings-tab')
export class LucarneRewardsSettingsTab extends RewardsTabBase {
  /** Null until the admin edits, so the form tracks the server value until then. */
  @state() private _daily: string | null = null;
  @state() private _milestones: MilestoneDraft[] | null = null;
  @state() private _busy = false;
  @state() private _error = '';

  private get _dailyValue(): string {
    return this._daily ?? String(this.rewards.settings.streak_daily_bonus);
  }

  private get _rows(): MilestoneDraft[] {
    return (
      this._milestones ??
      this.rewards.settings.streak_milestones.map((m) => ({ days: String(m.days), points: String(m.points) }))
    );
  }

  private _setRow(i: number, patch: Partial<MilestoneDraft>) {
    this._milestones = this._rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
  }

  /** Days used by more than one row. */
  private _duplicateDays(rows: MilestoneDraft[]): Set<string> {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const r of rows) {
      const key = r.days.trim();
      if (key === '') continue;
      if (seen.has(key)) dupes.add(key);
      seen.add(key);
    }
    return dupes;
  }

  private _valid(rows: MilestoneDraft[]): boolean {
    return (
      parseIntInRange(this._dailyValue, 0, 1000) !== null &&
      this._duplicateDays(rows).size === 0 &&
      rows.every((r) => parseIntInRange(r.days, 1, 365) !== null && parseIntInRange(r.points, 1, 10000) !== null)
    );
  }

  private async _save() {
    const rows = this._rows;
    if (this._busy || !this._valid(rows)) return;
    const settings = {
      streak_daily_bonus: parseIntInRange(this._dailyValue, 0, 1000) as number,
      streak_milestones: rows
        .map((r) => ({ days: Number(r.days), points: Number(r.points) }))
        .sort((a, b) => a.days - b.days),
    };
    this._busy = true;
    this._error = '';
    try {
      await setRewardsSettings(this.hass, settings);
      this.overlay.setSettings(settings);
      this._daily = null;
      this._milestones = null;
      this.notify();
    } catch (err) {
      this._error = serviceErrorMessage(err, 'Failed to save settings');
    } finally {
      this._busy = false;
    }
  }

  render() {
    const s = this.rewards.settings;
    if (!this.isAdmin) {
      return html`
        <div>Daily streak bonus: ${s.streak_daily_bonus === 0 ? 'off' : `${s.streak_daily_bonus} points`}</div>
        ${s.streak_milestones.length === 0
          ? html`<div class="muted">No streak milestones.</div>`
          : html`<ul class="list">
              ${s.streak_milestones.map((m) => html`<li>${m.days}-day streak: ${m.points} points</li>`)}
            </ul>`}
      `;
    }
    const rows = this._rows;
    const dupes = this._duplicateDays(rows);
    return html`
      <div class="form">
        <label class="field">
          <span class="muted">Daily streak bonus (0 = off)</span>
          <input
            class="daily-bonus"
            type="number"
            min="0"
            max="1000"
            step="1"
            inputmode="numeric"
            .value=${this._dailyValue}
            @input=${(e: Event) => (this._daily = (e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="muted">Streak milestones</div>
        <ul class="list">
          ${rows.map(
            (r, i) => html`
              <li class="row" data-milestone=${i}>
                <label class="field">
                  <span class="muted">Days</span>
                  <input
                    class="milestone-days"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    inputmode="numeric"
                    .value=${r.days}
                    @input=${(e: Event) => this._setRow(i, { days: (e.target as HTMLInputElement).value })}
                  />
                </label>
                <label class="field">
                  <span class="muted">Points</span>
                  <input
                    class="milestone-points"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    inputmode="numeric"
                    .value=${r.points}
                    @input=${(e: Event) => this._setRow(i, { points: (e.target as HTMLInputElement).value })}
                  />
                </label>
                <button class="remove" @click=${() => (this._milestones = rows.filter((_, j) => j !== i))}>
                  Remove
                </button>
                ${dupes.has(r.days.trim()) ? html`<div class="error">Day ${r.days.trim()} is already used</div>` : ''}
              </li>
            `,
          )}
        </ul>
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : ''}
        <div class="actions">
          <button
            class="add"
            ?disabled=${rows.length >= MAX_MILESTONES}
            @click=${() => (this._milestones = [...rows, { days: '', points: '' }])}
          >
            Add milestone
          </button>
          <button class="primary save" ?disabled=${this._busy || !this._valid(rows)} @click=${() => this._save()}>
            Save
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-settings-tab': LucarneRewardsSettingsTab;
  }
}
