import { html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { LucarneCardBase } from '../shared/card-base.js';
import type { HomeAssistant, MemberSummary, RenderableTask } from '../shared/types.js';
import { subscribeFamilyState, SYNTHETIC_HOUSEHOLD } from '../shared/family-subscription.js';
import type { FamilyState } from '../shared/family-subscription.js';

import '../components/member-column.js';
import '../components/add-task-popover.js';
import '../components/edit-task-popover.js';

export interface LucarneChoresCardConfig {
  type: 'custom:lucarne-chores-card';
  title?: string;
  members: string[];
  /** Members hidden from the card; they keep their slot in `members` ordering. */
  hidden_members?: string[];
  show_routines?: boolean;
  show_tasks?: boolean;
  show_streak?: boolean;
  hide_names?: boolean;
  /** When true, forward card errors to a Home Assistant persistent_notification. */
  debug?: boolean;
}

(window as Window & typeof globalThis & { customCards?: object[] }).customCards =
  (window as Window & typeof globalThis & { customCards?: object[] }).customCards || [];
(window as Window & typeof globalThis & { customCards?: object[] }).customCards!.push({
  type: 'lucarne-chores-card',
  name: 'Lucarne Chores',
  description: 'Family chore grid with streaks and celebration',
  preview: true,
});

@customElement('lucarne-chores-card')
export class LucarneChoresCard extends LucarneCardBase {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: block;
        font-family: var(--primary-font-family, sans-serif);
      }
      ha-card {
        padding: 0;
        overflow: hidden;
      }
      .card-header {
        display: flex;
        align-items: center;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .members-grid {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x proximity;
      }
      .member-cell {
        display: flex;
        flex: 1 0 220px;
        min-width: 220px;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        position: relative;
        scroll-snap-align: start;
      }
      .member-cell:last-child {
        border-right: none;
      }
      /* Stretch the column to the cell so equal-height columns pin their
         streaks to the same baseline (see member-column .lists/.streak-area). */
      .member-cell lucarne-member-column {
        flex: 1 1 auto;
        min-width: 0;
      }
      @media (max-width: 600px) {
        .members-grid {
          flex-direction: column;
          overflow-x: visible;
          overflow-y: visible;
          scroll-snap-type: none;
        }
        .member-cell {
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
          border-right: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        }
        .member-cell:last-child {
          border-bottom: none;
        }
      }
      .error-block {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .error-block strong {
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-md);
      }
      .loading {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;

  @state() private _config?: LucarneChoresCardConfig;
  @state() private _familyState: FamilyState | null = null;
  @state() private _addTaskMember: MemberSummary | null = null;
  @state() private _editTask: RenderableTask | null = null;

  private _unsubFamily?: () => void;

  setConfig(config: LucarneChoresCardConfig) {
    // Legacy shape — pass through so render() can show the upgrade banner
    if ('kids' in config) {
      this._config = config;
      return;
    }
    if (!Array.isArray(config.members)) {
      throw new Error('lucarne-chores-card: members must be an array');
    }
    this._config = config;
  }

  static getConfigElement() {
    return document.createElement('lucarne-chores-card-editor');
  }

  getCardSize() {
    return 5;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 6, max_columns: 12 };
  }

  static getStubConfig() {
    return {
      type: 'custom:lucarne-chores-card',
      title: 'Chores',
      members: [],
    };
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.hass && !this._unsubFamily) {
      this._unsubFamily = subscribeFamilyState(this.hass, (state) => {
        this._familyState = state;
      });
    }
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('hass') && this.hass && !this._unsubFamily) {
      this._unsubFamily = subscribeFamilyState(this.hass, (state) => {
        this._familyState = state;
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubFamily?.();
    this._unsubFamily = undefined;
  }

  private _resolveMembers(): Array<{ member: MemberSummary; tasks: RenderableTask[]; streak: number }> {
    if (!this._config || !this._familyState) return [];
    const { members: slugs } = this._config;
    // Hidden members stay in `members` (to keep their slot in the editor's
    // ordering) but are skipped when rendering the card.
    const hidden = new Set(this._config.hidden_members ?? []);
    const showRoutines = this._config.show_routines ?? true;
    const showTasks = this._config.show_tasks ?? true;

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const result: Array<{ member: MemberSummary; tasks: RenderableTask[]; streak: number }> = [];
    for (const slug of slugs) {
      if (hidden.has(slug)) continue;
      const member =
        slug === 'household'
          ? SYNTHETIC_HOUSEHOLD
          : (this._familyState.members.find((m) => m.slug === slug) ?? null);

      if (!member) continue;

      const allTasks = this._familyState.tasksByMember.get(slug) ?? [];
      const tasks = allTasks.filter((t) => {
        if (t.metadata.type === 'routine') return showRoutines;
        if (t.metadata.type === 'chore') {
          if (!showTasks) return false;
          if (t.due === null) return true;
          // Date-only strings (no 'T') must be parsed as local midnight to avoid UTC off-by-one in non-UTC timezones
          const dueDate = t.due.includes('T') ? new Date(t.due) : new Date(t.due + 'T00:00:00');
          return dueDate <= endOfToday;
        }
        return false;
      });

      const streak = this._familyState.streakByMember.get(slug) ?? 0;
      result.push({ member, tasks, streak });
    }
    return result;
  }

  private async _handleTaskToggle(e: Event) {
    const { task } = (e as CustomEvent<{ task: RenderableTask }>).detail;
    if (!this.hass || !this._familyState) return;

    const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';
    const ownerEntityId =
      task.metadata.member_slug === 'household'
        ? 'todo.lucarne_household'
        : (this._familyState.members.find((m) => m.slug === task.metadata.member_slug)?.todo_entity_id ?? '');

    if (!ownerEntityId) return;
    await this.hass.callService('todo', 'update_item', { item: task.uid, status: newStatus }, { entity_id: ownerEntityId });
  }

  private _handleAddTask(e: Event) {
    const { memberSlug } = (e as CustomEvent<{ memberSlug: string }>).detail;
    if (!this._familyState) return;
    const member =
      memberSlug === 'household'
        ? SYNTHETIC_HOUSEHOLD
        : (this._familyState.members.find((m) => m.slug === memberSlug) ?? null);
    if (member) this._addTaskMember = member;
  }

  private _handleLongPress(e: Event) {
    const { task } = (e as CustomEvent<{ task: RenderableTask }>).detail;
    this._editTask = task;
  }

  protected renderContent() {
    if (!this._config) return html``;

    // Old config detection (kids key)
    if ('kids' in this._config) {
      return html`
        <ha-card>
          <div class="error-block">
            <strong>Card upgraded</strong>
            This card was upgraded. Install the Lucarne Family integration and update your YAML.
          </div>
        </ha-card>
      `;
    }

    const title = this._config.title ?? 'Chores';
    const showRoutines = this._config.show_routines ?? true;
    const showTasks = this._config.show_tasks ?? true;
    const showStreak = this._config.show_streak ?? true;
    const hideNames = this._config.hide_names ?? false;

    if (this._familyState === null) {
      return html`<ha-card><div class="loading">Loading…</div></ha-card>`;
    }

    if (this._familyState.integrationError !== null) {
      return html`
        <ha-card>
          <div class="error-block">
            <strong>Lucarne Family integration not set up</strong>
            Install it in Settings → Devices &amp; Services.
          </div>
        </ha-card>
      `;
    }

    const resolvedMembers = this._resolveMembers();
    const allMembers = [...this._familyState.members, SYNTHETIC_HOUSEHOLD];

    return html`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${title}</h2>
        </div>
        <div
          class="members-grid"
          @add-task-clicked=${this._handleAddTask}
          @task-toggle=${this._handleTaskToggle}
          @task-long-press=${this._handleLongPress}
        >
          ${resolvedMembers.map(({ member, tasks, streak }) => html`
            <div class="member-cell">
              <lucarne-member-column
                .member=${member}
                .tasks=${tasks}
                .streak=${streak}
                ?show-routines=${showRoutines}
                ?show-tasks=${showTasks}
                ?show-streak=${showStreak}
                ?hide-name=${hideNames}
              ></lucarne-member-column>
            </div>
          `)}
        </div>
      </ha-card>

      ${this._addTaskMember !== null
        ? html`
            <lucarne-add-task-popover
              .hass=${this.hass}
              .member=${this._addTaskMember}
              .members=${allMembers}
              @popover-close=${() => { this._addTaskMember = null; }}
            ></lucarne-add-task-popover>
          `
        : ''}

      ${this._editTask !== null
        ? html`
            <lucarne-edit-task-popover
              .hass=${this.hass}
              .task=${this._editTask}
              .members=${allMembers}
              @popover-close=${() => { this._editTask = null; }}
            ></lucarne-edit-task-popover>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-chores-card': LucarneChoresCard;
  }
}
