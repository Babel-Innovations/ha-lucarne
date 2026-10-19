import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { archiveReward, createReward, updateReward } from '../../shared/integration-services.js';
import { serviceErrorMessage } from '../../shared/service-errors.js';
import type { RewardItem } from '../../shared/types.js';
import { RewardsTabBase, parseIntInRange } from './shared.js';

const NAME_MAX = 60;
const COST_MAX = 100000;
const DESCRIPTION_MAX = 500;

interface RewardForm {
  name: string;
  cost: string;
  description: string;
  poolable: boolean;
}

const EMPTY_FORM: RewardForm = { name: '', cost: '', description: '', poolable: false };

@customElement('lucarne-rewards-catalog-tab')
export class LucarneRewardsCatalogTab extends RewardsTabBase {
  @state() private _showArchived = false;
  /** The reward being edited, `'new'` for the add form, or null when no form is open. */
  @state() private _editing: number | 'new' | null = null;
  @state() private _form: RewardForm = EMPTY_FORM;
  @state() private _confirmArchive: number | null = null;
  @state() private _busy = false;
  /** Error text and the form/row it belongs to. */
  @state() private _error: { text: string; target: number | 'new' } | null = null;

  private _open(target: number | 'new', form: RewardForm) {
    this._editing = target;
    this._form = form;
    this._error = null;
    this._confirmArchive = null;
  }

  private _close() {
    this._editing = null;
    this._error = null;
  }

  private async _save() {
    const target = this._editing;
    if (target === null || this._busy) return;
    const name = this._form.name.trim();
    const description = this._form.description.trim();
    const cost = parseIntInRange(this._form.cost, 1, COST_MAX);
    let problem = '';
    if (name === '') problem = 'Name is required';
    else if (name.length > NAME_MAX) problem = `Name must be ${NAME_MAX} characters or less`;
    else if (cost === null) problem = `Cost must be a whole number from 1 to ${COST_MAX}`;
    else if (description.length > DESCRIPTION_MAX) problem = `Description must be ${DESCRIPTION_MAX} characters or less`;
    if (problem || cost === null) {
      this._error = { text: problem, target };
      return;
    }
    const fields = { name, cost, description, poolable: this._form.poolable };
    this._busy = true;
    this._error = null;
    try {
      if (target === 'new') {
        const { id } = await createReward(this.hass, fields);
        this.overlay.addReward({ id, ...fields, archived: false });
      } else {
        await updateReward(this.hass, target, fields);
        this.overlay.editReward(target, fields);
      }
      this.notify();
      this._close();
    } catch (err) {
      this._error = { text: serviceErrorMessage(err, 'Failed to save reward'), target };
    } finally {
      this._busy = false;
    }
  }

  private async _archive(id: number) {
    if (this._busy) return;
    this._busy = true;
    this._error = null;
    try {
      await archiveReward(this.hass, id);
      this.overlay.archiveReward(id);
      this._confirmArchive = null;
      this.notify();
    } catch (err) {
      this._error = { text: serviceErrorMessage(err, 'Failed to archive reward'), target: id };
    } finally {
      this._busy = false;
    }
  }

  private _renderForm(target: number | 'new') {
    const f = this._form;
    const set = (patch: Partial<RewardForm>) => (this._form = { ...this._form, ...patch });
    return html`
      <div class="form">
        <label class="field">
          <span class="muted">Name</span>
          <input
            class="reward-name"
            type="text"
            maxlength=${NAME_MAX}
            .value=${f.name}
            @input=${(e: Event) => set({ name: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span class="muted">Cost (points)</span>
          <input
            class="reward-cost"
            type="number"
            min="1"
            max=${COST_MAX}
            step="1"
            inputmode="numeric"
            .value=${f.cost}
            @input=${(e: Event) => set({ cost: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span class="muted">Description (${f.description.length}/${DESCRIPTION_MAX})</span>
          <textarea
            class="reward-description"
            maxlength=${DESCRIPTION_MAX}
            .value=${f.description}
            @input=${(e: Event) => set({ description: (e.target as HTMLTextAreaElement).value })}
          ></textarea>
        </label>
        <label class="field field-inline">
          <input
            class="reward-poolable"
            type="checkbox"
            .checked=${f.poolable}
            @change=${(e: Event) => set({ poolable: (e.target as HTMLInputElement).checked })}
          />
          <span>Allow pooling points</span>
        </label>
        ${this._error?.target === target ? html`<div class="error" role="alert">${this._error.text}</div>` : ''}
        <div class="actions">
          <button class="primary save" ?disabled=${this._busy} @click=${() => this._save()}>Save</button>
          <button class="cancel" @click=${() => this._close()}>Cancel</button>
        </div>
      </div>
    `;
  }

  private _renderReward(r: RewardItem) {
    if (this._editing === r.id) return html`<li class="row" data-reward=${r.id}>${this._renderForm(r.id)}</li>`;
    const confirming = this._confirmArchive === r.id;
    return html`
      <li class="row ${r.archived ? 'archived' : ''}" data-reward=${r.id}>
        <div class="grow">
          <div class="title">${r.name}</div>
          <div class="muted">${r.cost} points</div>
          ${r.description ? html`<div class="muted">${r.description}</div>` : ''}
        </div>
        ${r.poolable ? html`<span class="badge">Shareable</span>` : ''}
        ${this.isAdmin && !r.archived
          ? html`<div class="actions">
              ${confirming
                ? html`<span class="muted">Archive?</span>
                    <button class="danger confirm-archive" ?disabled=${this._busy} @click=${() => this._archive(r.id)}>
                      Archive
                    </button>
                    <button class="keep" @click=${() => (this._confirmArchive = null)}>Keep</button>`
                : html`<button
                      class="edit"
                      @click=${() =>
                        this._open(r.id, {
                          name: r.name,
                          cost: String(r.cost),
                          description: r.description,
                          poolable: r.poolable,
                        })}
                    >
                      Edit
                    </button>
                    <button class="archive" @click=${() => (this._confirmArchive = r.id)}>Archive</button>`}
            </div>`
          : ''}
        ${this._error?.target === r.id ? html`<div class="error" role="alert">${this._error.text}</div>` : ''}
      </li>
    `;
  }

  render() {
    const active = this.rewards.rewards.filter((r) => !r.archived);
    const archived = this._showArchived ? this.rewards.rewards.filter((r) => r.archived) : [];
    return html`
      <div class="actions">
        ${this.isAdmin && this._editing !== 'new'
          ? html`<button class="primary add" @click=${() => this._open('new', EMPTY_FORM)}>Add reward</button>`
          : ''}
        <label class="field field-inline">
          <input
            class="show-archived"
            type="checkbox"
            .checked=${this._showArchived}
            @change=${(e: Event) => (this._showArchived = (e.target as HTMLInputElement).checked)}
          />
          <span>Show archived</span>
        </label>
      </div>
      ${this.isAdmin && this._editing === 'new' ? html`<div class="row">${this._renderForm('new')}</div>` : ''}
      ${active.length === 0 && archived.length === 0
        ? html`<div class="empty">No rewards yet.</div>`
        : html`<ul class="list">${[...active, ...archived].map((r) => this._renderReward(r))}</ul>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-rewards-catalog-tab': LucarneRewardsCatalogTab;
  }
}
