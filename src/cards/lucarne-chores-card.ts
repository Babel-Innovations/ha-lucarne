import { html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { LucarneCardBase } from '../shared/card-base.js';
import type { HomeAssistant, MemberSummary, RenderableTask } from '../shared/types.js';
import { subscribeFamilyState, SYNTHETIC_HOUSEHOLD } from '../shared/family-subscription.js';
import type { FamilyState } from '../shared/family-subscription.js';
import {
  msUntilNextLocalMidnight,
  currentScrollBucket,
  msUntilNextDailyBoundary,
} from '../shared/date-helpers.js';

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
  /** Auto-scroll each column to the current time-of-day section. Default true. */
  auto_scroll?: boolean;
  /** Local HH:MM at/after which columns scroll to the Afternoon section. Default '12:00'. */
  afternoon_start?: string;
  /** Local HH:MM at/after which columns scroll to the Night section. Default '19:00'. */
  night_start?: string;
  /** When true, forward card errors to a Home Assistant persistent_notification. */
  debug?: boolean;
}

/** Defaults for the auto-scroll thresholds, shared by the card and its editor. */
export const DEFAULT_AFTERNOON_START = '12:00';
export const DEFAULT_NIGHT_START = '19:00';

/**
 * How long an optimistic add lingers before self-clearing if the family-state
 * subscription never delivers the real task (the subscription is slow/unreliable
 * on some clients — e.g. iPad Safari). Bounds a missed reconcile so a phantom
 * row can't stay forever; the task is on the server regardless and reappears on
 * the next refresh/remount.
 */
const OPTIMISTIC_ADD_TTL_MS = 10_000;

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
  /**
   * Optimistic toggle overrides keyed by task uid. A tap flips the row here
   * immediately (the server round-trip + refetch is too slow to feel live on
   * some clients), then `_onFamilyState` drops each entry once the real state
   * catches up. Reverted if the service call fails.
   */
  @state() private _optimistic: Map<string, RenderableTask['status']> = new Map();
  /**
   * Optimistically-added tasks keyed by uid. A successful add injects the new
   * task here immediately (the family-state subscription is too slow to feel
   * live on some clients), then `_onFamilyState` drops each entry once the real
   * task with the same uid arrives. Self-cleared via `_addTimers` as a backstop.
   */
  @state() private _optimisticAdds: Map<string, RenderableTask> = new Map();

  /** Per-uid backstop timers that drop an unreconciled optimistic add. */
  private _addTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private _unsubFamily?: () => void;
  /**
   * Self-rescheduling timer that fires at the next local midnight. `_resolveMembers`
   * computes the "due today" window from `new Date()` at render time, but the card
   * only re-renders on reactive state changes — so a card left open overnight kept
   * showing the previous day's window (issue #68). The midnight `requestUpdate`
   * forces a fresh render and recomputes the window at the day boundary.
   */
  private _midnightTimer?: ReturnType<typeof setTimeout>;
  /**
   * Self-rescheduling timer that fires at the next afternoon/night threshold so a
   * card left open all day re-renders — and re-scrolls each column to the new
   * time-of-day section — when the clock crosses 12:00/19:00 (issue #68). Distinct
   * from the midnight timer, which owns the day-boundary window recompute (and,
   * via its re-render, recomputes the scroll bucket for the new day — typically
   * back to Morning, though custom thresholds like night_start '00:00' can keep it
   * unchanged).
   */
  private _scrollTimer?: ReturnType<typeof setTimeout>;

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
    // Editing the auto-scroll thresholds on an already-connected card must re-arm
    // the timer so the next wakeup uses the new times (connectedCallback won't
    // fire again). Skipped on the initial pre-connect setConfig.
    if (this.isConnected) this._scheduleScrollRefresh();
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
      this._unsubFamily = subscribeFamilyState(this.hass, this._onFamilyState);
    }
    this._scheduleMidnightRefresh();
    this._scheduleScrollRefresh();
  }

  /** Arm (or re-arm) a one-shot timer for the next local midnight that forces a
   *  re-render so the "due today" window recomputes, then reschedules itself. */
  private _scheduleMidnightRefresh() {
    if (this._midnightTimer) clearTimeout(this._midnightTimer);
    this._midnightTimer = setTimeout(() => {
      this._midnightTimer = undefined;
      this.requestUpdate();
      this._scheduleMidnightRefresh();
    }, msUntilNextLocalMidnight(new Date()));
  }

  /** Arm (or re-arm) a one-shot timer for the next afternoon/night threshold that
   *  forces a re-render so each column re-scrolls to the new section, then
   *  reschedules itself. No-op when auto-scroll is disabled. */
  private _scheduleScrollRefresh() {
    if (this._scrollTimer) clearTimeout(this._scrollTimer);
    this._scrollTimer = undefined;
    if (!(this._config?.auto_scroll ?? true)) return;
    const afternoon = this._config?.afternoon_start ?? DEFAULT_AFTERNOON_START;
    const night = this._config?.night_start ?? DEFAULT_NIGHT_START;
    const ms = msUntilNextDailyBoundary(new Date(), [afternoon, night]);
    // Both thresholds malformed → no finite boundary; skip arming rather than
    // feed setTimeout a non-finite delay.
    if (!Number.isFinite(ms)) return;
    this._scrollTimer = setTimeout(() => {
      this._scrollTimer = undefined;
      this.requestUpdate();
      this._scheduleScrollRefresh();
    }, ms);
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('hass') && this.hass && !this._unsubFamily) {
      this._unsubFamily = subscribeFamilyState(this.hass, this._onFamilyState);
    }
  }

  /** Apply a freshly-pushed family state, reconciling optimistic overrides. */
  private _onFamilyState = (state: FamilyState) => {
    if (this._optimistic.size > 0 || this._optimisticAdds.size > 0) {
      const presentUids = new Set<string>();
      const nextToggle = new Map(this._optimistic);
      for (const tasks of state.tasksByMember.values()) {
        for (const t of tasks) {
          presentUids.add(t.uid);
          // Server caught up to the optimistic toggle — stop overriding.
          if (nextToggle.get(t.uid) === t.status) nextToggle.delete(t.uid);
        }
      }
      if (this._optimistic.size > 0) {
        // Drop overrides for tasks that no longer exist (e.g. a completed
        // one-off chore deleted by the daily reset) so the map can't grow stale.
        for (const uid of nextToggle.keys()) {
          if (!presentUids.has(uid)) nextToggle.delete(uid);
        }
        this._optimistic = nextToggle;
      }
      if (this._optimisticAdds.size > 0) {
        // Drop optimistic adds once the real task (same uid) shows up.
        const nextAdds = new Map(this._optimisticAdds);
        let changed = false;
        for (const uid of nextAdds.keys()) {
          if (presentUids.has(uid)) {
            nextAdds.delete(uid);
            this._clearAddTimeout(uid);
            changed = true;
          }
        }
        if (changed) this._optimisticAdds = nextAdds;
      }
    }
    this._familyState = state;
  };

  private _handleTaskAdded = (e: Event) => {
    const { tasks } = (e as CustomEvent<{ tasks: RenderableTask[] }>).detail;
    if (!tasks?.length) return;
    const next = new Map(this._optimisticAdds);
    for (const t of tasks) {
      next.set(t.uid, t);
      this._scheduleAddCleanup(t.uid);
    }
    this._optimisticAdds = next;
  };

  /** Arm a backstop that drops an optimistic add if it's never reconciled. */
  private _scheduleAddCleanup(uid: string) {
    this._clearAddTimeout(uid);
    this._addTimers.set(
      uid,
      setTimeout(() => {
        this._addTimers.delete(uid);
        if (this._optimisticAdds.has(uid)) {
          const next = new Map(this._optimisticAdds);
          next.delete(uid);
          this._optimisticAdds = next;
        }
      }, OPTIMISTIC_ADD_TTL_MS),
    );
  }

  private _clearAddTimeout(uid: string) {
    const timer = this._addTimers.get(uid);
    if (timer !== undefined) {
      clearTimeout(timer);
      this._addTimers.delete(uid);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubFamily?.();
    this._unsubFamily = undefined;
    if (this._midnightTimer) {
      clearTimeout(this._midnightTimer);
      this._midnightTimer = undefined;
    }
    if (this._scrollTimer) {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = undefined;
    }
    for (const timer of this._addTimers.values()) clearTimeout(timer);
    this._addTimers.clear();
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

    // Household bucket is the source for rotating tasks; pulled once and reused.
    const householdTasks = this._familyState.tasksByMember.get('household') ?? [];

    const applyOptimistic = (t: RenderableTask): RenderableTask => {
      const optimistic = this._optimistic.get(t.uid);
      return optimistic && optimistic !== t.status ? { ...t, status: optimistic } : t;
    };

    // Shared predicate for a member's own (non-rotating) tasks: routines gate on
    // showRoutines; chores gate on showTasks and the due-today window. Applied to
    // both real and optimistically-added tasks so they're treated identically.
    const passesOwnFilter = (t: RenderableTask): boolean => {
      if (t.metadata.type === 'routine') return showRoutines;
      if (t.metadata.type === 'chore') {
        if (!showTasks) return false;
        if (t.due === null) return true;
        // Date-only strings (no 'T') must be parsed as local midnight to avoid UTC off-by-one in non-UTC timezones
        const dueDate = t.due.includes('T') ? new Date(t.due) : new Date(t.due + 'T00:00:00');
        return dueDate <= endOfToday;
      }
      // Rotating tasks live in the household bucket — always excluded from a member's own
      // allTasks (their member_slug is 'household', so they only appear in household bucket).
      // For the household column, we explicitly drop them so they don't double-render.
      return false;
    };

    const optimisticAdds = [...this._optimisticAdds.values()];
    const householdUids = new Set(householdTasks.map((t) => t.uid));

    const result: Array<{ member: MemberSummary; tasks: RenderableTask[]; streak: number }> = [];
    for (const slug of slugs) {
      if (hidden.has(slug)) continue;
      const member =
        slug === 'household'
          ? SYNTHETIC_HOUSEHOLD
          : (this._familyState.members.find((m) => m.slug === slug) ?? null);

      if (!member) continue;

      const allTasks = this._familyState.tasksByMember.get(slug) ?? [];
      const existingUids = new Set(allTasks.map((t) => t.uid));
      const ownTasks = allTasks.filter(passesOwnFilter).map(applyOptimistic);

      // Optimistic non-rotating adds for this column, filtered like real tasks and
      // skipped if the real task already arrived (belt-and-suspenders vs `_onFamilyState`).
      const optOwn = optimisticAdds.filter(
        (t) =>
          t.metadata.member_slug === slug &&
          t.metadata.type !== 'rotating' &&
          !existingUids.has(t.uid) &&
          passesOwnFilter(t),
      );

      let tasks: RenderableTask[];
      if (slug === 'household') {
        // Household column: rotating tasks are shown in their owner's column only.
        tasks = [...ownTasks, ...optOwn];
      } else {
        // Non-household column: pull rotating tasks from the household bucket for this owner.
        // Gate by showTasks (same toggle as chores) per spec.
        const rotatingForMember = showTasks
          ? householdTasks
              .filter((t) => t.metadata.type === 'rotating' && t.metadata.current_owner === slug)
              .map(applyOptimistic)
          : [];
        // Optimistic rotating adds owned by this member (live in the household bucket).
        const optRotating = showTasks
          ? optimisticAdds.filter(
              (t) =>
                t.metadata.type === 'rotating' &&
                t.metadata.current_owner === slug &&
                !householdUids.has(t.uid),
            )
          : [];
        tasks = [...ownTasks, ...rotatingForMember, ...optOwn, ...optRotating];
      }

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

    // Flip the row immediately; the subscription reconciles once the server
    // confirms. Revert if the service call fails so the UI stays truthful.
    this._optimistic = new Map(this._optimistic).set(task.uid, newStatus);
    try {
      await this.hass.callService('todo', 'update_item', { item: task.uid, status: newStatus }, { entity_id: ownerEntityId });
    } catch (err) {
      const reverted = new Map(this._optimistic);
      reverted.delete(task.uid);
      this._optimistic = reverted;
      throw err;
    }
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
    const autoScroll = this._config.auto_scroll ?? true;
    const scrollBucket = autoScroll
      ? currentScrollBucket(
          new Date(),
          this._config.afternoon_start ?? DEFAULT_AFTERNOON_START,
          this._config.night_start ?? DEFAULT_NIGHT_START,
        )
      : '';

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
                .members=${allMembers}
                ?show-routines=${showRoutines}
                ?show-tasks=${showTasks}
                ?show-streak=${showStreak}
                ?hide-name=${hideNames}
                scroll-to-bucket=${scrollBucket}
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
              @task-added=${this._handleTaskAdded}
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
