import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { MemberSummary, RenderableTask, TimeOfDay } from '../shared/types.js';
import { coerceTimeOfDay } from '../shared/types.js';
import { iconTimeMorning, iconTimeAfternoon, iconTimeNight } from '../shared/icons.js';

import './member-avatar.js';
import './task-row.js';
import './streak-display.js';
import './celebration-overlay.js';

// Display order for the time-of-day bucket sections (routines + one-off
// chores share these buckets). Anytime is last so dated buckets surface first.
const TIME_OF_DAY_ORDER: readonly TimeOfDay[] = ['morning', 'afternoon', 'night', 'anytime'];
const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
  anytime: 'Anytime',
};

// Weather-style glyph per dated bucket; 'anytime' stays icon-less.
const TIME_OF_DAY_ICONS: Partial<Record<TimeOfDay, typeof iconTimeMorning>> = {
  morning: iconTimeMorning,
  afternoon: iconTimeAfternoon,
  night: iconTimeNight,
};

function choreCompare(a: RenderableTask, b: RenderableTask): number {
  if (a.due && b.due) return a.due.localeCompare(b.due);
  if (a.due) return -1;
  if (b.due) return 1;
  return a.summary.localeCompare(b.summary);
}

// Within a time-of-day bucket, routines list first (alpha) then one-off chores
// (by due date, then alpha), so recurring items stay above ad-hoc tasks.
function sortWithinBucket(tasks: RenderableTask[]): RenderableTask[] {
  const routines = tasks
    .filter((t) => t.metadata.type === 'routine')
    .sort((a, b) => a.summary.localeCompare(b.summary));
  const chores = tasks.filter((t) => t.metadata.type === 'chore').sort(choreCompare);
  return [...routines, ...chores];
}

// Bucket every task — routines AND one-off chores — by its time_of_day, so a
// chore tagged "morning" sits in the Morning section alongside routines instead
// of a separate "Tasks" pile.
function bucketTasks(tasks: RenderableTask[]): Array<{ bucket: TimeOfDay; tasks: RenderableTask[] }> {
  const byBucket = new Map<TimeOfDay, RenderableTask[]>();
  for (const t of tasks) {
    // coerceTimeOfDay collapses unrecognized values (typos, future enum
    // extensions, legacy imports that bypassed the voluptuous validator)
    // into 'anytime', so a stray value never silently drops the task.
    const bucket = coerceTimeOfDay(t.metadata.time_of_day);
    const arr = byBucket.get(bucket) ?? [];
    arr.push(t);
    byBucket.set(bucket, arr);
  }
  const result: Array<{ bucket: TimeOfDay; tasks: RenderableTask[] }> = [];
  for (const bucket of TIME_OF_DAY_ORDER) {
    const bucketTasks = byBucket.get(bucket);
    if (!bucketTasks || bucketTasks.length === 0) continue;
    result.push({ bucket, tasks: sortWithinBucket(bucketTasks) });
  }
  return result;
}

@customElement('lucarne-member-column')
export class LucarneMemberColumn extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      height: 100%;
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 12px;
      position: relative;
      height: 100%;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      margin-bottom: 8px;
      flex: 0 0 auto;
    }
    .member-name {
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      font-family: var(--primary-font-family, sans-serif);
      text-align: center;
    }
    .add-task-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px dashed rgba(0, 0, 0, 0.25);
      border-radius: 50%;
      font-size: 1.35rem;
      line-height: 1;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
    }
    .add-task-btn:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    /* Scrollable list region: flex:1 pushes the streak to the bottom of every
       column (so streaks align across equal-height columns), and the cap makes
       an overlong list scroll internally instead of stretching the card. */
    .lists {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      max-height: var(--lucarne-chores-list-max-height, 420px);
    }
    .section {
      display: flex;
      flex-direction: column;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--secondary-text-color, #727272);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 4px 2px;
    }
    .section-icon {
      display: inline-flex;
      flex-shrink: 0;
    }
    .section-icon svg {
      width: 14px;
      height: 14px;
    }
    .streak-area {
      padding-top: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.07);
      margin-top: 8px;
      flex: 0 0 auto;
    }
  `;

  @property({ attribute: false }) member!: MemberSummary;
  @property({ attribute: false }) tasks: RenderableTask[] = [];
  @property({ type: Number }) streak = 0;
  @property({ type: Boolean, attribute: 'show-routines' }) showRoutines = true;
  @property({ type: Boolean, attribute: 'show-tasks' }) showTasks = true;
  @property({ type: Boolean, attribute: 'show-streak' }) showStreak = true;
  @property({ type: Boolean, attribute: 'hide-name' }) hideName = false;
  /** Time-of-day bucket to auto-scroll the list to ('morning' | 'afternoon' |
   *  'night'); empty disables auto-scroll. The card recomputes this from the
   *  clock + configured thresholds and only changes it when the bucket changes,
   *  so a routine/task re-render never yanks a manually-scrolled column. */
  @property({ attribute: 'scroll-to-bucket' }) scrollToBucket = '';

  @state() private _celebrating = false;
  private _celebrationTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastAllRoutinesDone: boolean | null = null;

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    // Auto-scroll only when the target bucket actually changes (initial set or a
    // time-boundary crossing) — never on a plain task/state re-render, so tapping
    // a row doesn't jerk a manually-scrolled column back.
    if (changed.has('scrollToBucket')) this._applyScroll();
    if (!changed.has('tasks')) return;
    const routines = this.tasks.filter((t) => t.metadata.type === 'routine');
    if (routines.length === 0) return;
    const allDone = routines.every((t) => t.status === 'completed');
    if (this._lastAllRoutinesDone === null) {
      // First observation — record baseline without triggering celebration
      this._lastAllRoutinesDone = allDone;
      return;
    }
    if (!this._lastAllRoutinesDone && allDone) {
      this._triggerCelebration();
    }
    this._lastAllRoutinesDone = allDone;
  }

  private _triggerCelebration() {
    this._celebrating = true;
    if (this._celebrationTimer) clearTimeout(this._celebrationTimer);
    this._celebrationTimer = setTimeout(() => {
      this._celebrating = false;
      this._celebrationTimer = null;
      this.requestUpdate();
    }, 2200);
    this.requestUpdate();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._celebrationTimer) clearTimeout(this._celebrationTimer);
  }

  /** Scroll the `.lists` container so the section for `scrollToBucket` sits at the
   *  top. If that bucket has no tasks (no section rendered) fall through to the
   *  next non-empty section in display order. When no section at or after the
   *  target exists, leave the scroll position untouched (a 'morning' target with a
   *  morning section present naturally lands at the top). */
  private _applyScroll() {
    if (!this.scrollToBucket) return;
    const lists = this.renderRoot.querySelector('.lists') as HTMLElement | null;
    if (!lists) return;
    const target = this._sectionForBucket(lists);
    if (target) lists.scrollTop = target.offsetTop - lists.offsetTop;
  }

  /** First rendered `.section` at or after `scrollToBucket` in display order. */
  private _sectionForBucket(lists: HTMLElement): HTMLElement | null {
    const start = TIME_OF_DAY_ORDER.indexOf(this.scrollToBucket as TimeOfDay);
    if (start < 0) return null;
    for (const bucket of TIME_OF_DAY_ORDER.slice(start)) {
      const el = lists.querySelector(`.section[data-bucket="${bucket}"]`) as HTMLElement | null;
      if (el) return el;
    }
    return null;
  }

  render() {
    if (!this.member) return html``;

    // Honor the per-type visibility toggles, then bucket the survivors by
    // time-of-day. The card already pre-filters, but keeping the gate here
    // means the component stays correct when driven directly (and in tests).
    const visibleTasks = this.tasks.filter((t) => {
      if (t.metadata.type === 'routine') return this.showRoutines;
      if (t.metadata.type === 'chore') return this.showTasks;
      return false;
    });
    const buckets = bucketTasks(visibleTasks);

    return html`
      <div class="column" style="--member-color:${this.member.color}">
        <lucarne-celebration-overlay
          kid-slug=${this.member.slug}
          ?active=${this._celebrating}
        ></lucarne-celebration-overlay>

        <button
          class="add-task-btn"
          @click=${this._onAddTask}
          aria-label="Add task for ${this.member.name}"
        ><span aria-hidden="true">+</span></button>

        <div class="header">
          <lucarne-member-avatar
            name=${this.member.name}
            color=${this.member.color}
            .avatar=${this.member.avatar}
          ></lucarne-member-avatar>
          ${this.hideName
            ? ''
            : html`<div class="member-name">${this.member.name}</div>`}
        </div>

        <div class="lists">
          ${buckets.map(({ bucket, tasks }) => html`
            <div class="section" data-bucket=${bucket}>
              <div class="section-header">
                ${TIME_OF_DAY_ICONS[bucket]
                  ? html`<span class="section-icon">${TIME_OF_DAY_ICONS[bucket]}</span>`
                  : ''}
                ${TIME_OF_DAY_LABELS[bucket]}
              </div>
              ${tasks.map((t) => html`
                <lucarne-task-row
                  .task=${t}
                  .memberColor=${this.member.color}
                ></lucarne-task-row>
              `)}
            </div>
          `)}
        </div>

        ${this.showStreak
          ? html`
              <div class="streak-area">
                <lucarne-streak-display .streak=${this.streak}></lucarne-streak-display>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private _onAddTask() {
    this.dispatchEvent(
      new CustomEvent('add-task-clicked', {
        detail: { memberSlug: this.member.slug },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-member-column': LucarneMemberColumn;
  }
}
