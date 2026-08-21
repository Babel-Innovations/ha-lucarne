import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { iconCheck } from '../shared/icons.js';
import { STRINGS } from '../shared/strings.js';
import type { MemberSummary, TodoItem, RenderableTask } from '../shared/types.js';
import {
  admit,
  getWindow,
  markCompleted,
  unmarkCompleted,
  type CompletedEntry,
} from '../shared/completed-window.js';

import './task-row.js';

const HOUSEHOLD_SLUG = 'household';

/**
 * Parse a todo `due` value to a Date. Date-only strings (YYYY-MM-DD) are parsed
 * in LOCAL time so "due today" lines up with the viewer's calendar day instead
 * of shifting across the UTC boundary.
 */
function parseDue(value: string): Date {
  return value.length === 10 ? new Date(value + 'T00:00:00') : new Date(value);
}

/**
 * Sort tasks by urgency for the Today card:
 *   overdue > due today > due within 3 days > no due date > due >3 days.
 * Within a dated bucket, earlier due dates come first; the no-date bucket
 * orders alphabetically. Pure + exported for unit testing.
 */
export function sortByPriority(tasks: RenderableTask[], now: Date): RenderableTask[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  // Start of the 4th day from today — the exclusive end of the "within 3 days" window.
  const beyondThreeDays = new Date(startOfToday);
  beyondThreeDays.setDate(beyondThreeDays.getDate() + 4);

  const bucket = (t: RenderableTask): number => {
    if (!t.due) return 3; // no due date
    const d = parseDue(t.due);
    if (d < startOfToday) return 0; // overdue
    if (d < startOfTomorrow) return 1; // due today
    if (d < beyondThreeDays) return 2; // within the next 3 days
    return 4; // more than 3 days out
  };

  return [...tasks].sort((a, b) => {
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;
    if (ba === 3) return a.summary.localeCompare(b.summary);
    const da = a.due ? parseDue(a.due).getTime() : 0;
    const db = b.due ? parseDue(b.due).getTime() : 0;
    if (da !== db) return da - db;
    return a.summary.localeCompare(b.summary);
  });
}

/** Build a synthetic RenderableTask from a raw todo entity item. */
function toRenderable(item: TodoItem): RenderableTask {
  return {
    uid: item.uid,
    summary: item.summary,
    status: item.status,
    due: item.due ?? null,
    description: item.description ?? '',
    metadata: {
      item_uid: item.uid,
      member_slug: HOUSEHOLD_SLUG,
      assignee_slug: '',
      type: 'chore',
      recurrence: '',
      icon: '',
      source: 'manual',
    },
  };
}

@customElement('lucarne-tasks-summary')
export class LucarneTasksSummary extends LitElement {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
      }
      .header {
        display: flex;
        align-items: baseline;
        gap: var(--lucarne-spacing-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .count-badge {
        background: var(--lucarne-color-ingrid);
        color: #5b3f7e;
        padding: 1px 7px;
        border-radius: var(--lucarne-radius-lg);
        font-size: 0.8em;
        font-weight: 700;
      }
      .task-list {
        display: flex;
        flex-direction: column;
        /* Up to "limit" ACTIVE rows are rendered (backlog beyond it is
           intentionally not shown), plus crossed-out completions — which reuse
           their own slot in no-refill mode, but are extra rows in refill mode,
           themselves capped at "limit". This is a safety cap: if the host card
           sets --lucarne-tasks-max-height and those rows exceed it, they scroll
           rather than overflow. Uncapped (none) by default. */
        max-height: var(--lucarne-tasks-max-height, none);
        overflow-y: auto;
      }
      .task-line {
        display: flex;
        align-items: center;
      }
      .task-line + .task-line {
        border-top: 1px solid rgba(0, 0, 0, 0.05);
      }
      .task-line lucarne-task-row {
        flex: 1;
        min-width: 0;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-lg) 0;
        color: #4caf50;
        font-size: var(--lucarne-fs-md);
      }
      .empty-icon {
        width: 28px;
        height: 28px;
        color: #4caf50;
      }
      /* Everything is done but the crossed-out rows are still on screen — keep
         the celebration without the full-height empty state. */
      .done-banner {
        flex-direction: row;
        padding: 0 0 var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-sm);
      }
      .done-banner .empty-icon {
        width: 18px;
        height: 18px;
      }
    `,
  ];

  @property({ type: Array }) items: TodoItem[] = [];
  @property({ type: String }) todoEntityId?: string;
  /** When true, renders integration household tasks from renderableTasks instead of raw items */
  @property({ type: Boolean }) integrationMode = false;
  @property({ attribute: false }) renderableTasks: RenderableTask[] = [];
  /** Members from the family subscription — used to resolve owner avatars in integration mode. */
  @property({ attribute: false }) members: MemberSummary[] = [];
  /**
   * Max number of ACTIVE tasks to display. Backlog beyond it is hidden, not
   * scrollable. Crossed-out completions occupy the slots they burned in
   * no-refill mode, so the row count is unchanged there; in refill mode they
   * render as extras below, themselves capped at `limit`.
   */
  @property({ type: Number }) limit = 5;
  /**
   * When true, completing a visible task pulls the next backlog task up to refill
   * the slot (rolling list). When false (default), the completed task keeps its
   * slot — rendered crossed out — and no backlog item is promoted to replace it.
   */
  @property({ type: Boolean }) refillOnComplete = false;

  /**
   * Resolve the rows to render: the active tasks in the visible window, plus the
   * tasks completed in this session rendered crossed out rather than vanishing.
   *
   * Window state lives in `shared/completed-window.ts`, not on this element —
   * Lovelace destroys card DOM on a view switch, so element fields cannot
   * survive the very event that is supposed to sink crossed rows to the bottom.
   *
   * Mutates the shared window, so call it once per render.
   */
  private _resolveVisible(source: RenderableTask[]): {
    rows: RenderableTask[];
    totalActive: number;
  } {
    const now = new Date();
    const active = sortByPriority(
      source.filter((t) => t.status === 'needs_action'),
      now,
    );
    const totalActive = active.length;

    const w = getWindow(this.todoEntityId ?? '', this.limit, this.refillOnComplete, now);
    // Completions we only learn about while the user is not looking — the
    // document is hidden, or the card was unmounted by a view switch and is
    // still catching up — are already "from before they looked", so they belong
    // at the bottom rather than spliced into a slot as the user starts tapping.
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const startSunk = hidden || w.away;
    const byUid = new Map(source.map((t) => [t.uid, t]));
    const activeUids = new Set(active.map((t) => t.uid));

    // Reconcile against the authoritative statuses. An admitted task that left
    // the active set has burned its slot: still present and completed → it
    // renders crossed out in that slot; gone entirely → the slot stays empty,
    // as before. Returning to the active set un-crosses it (completion undone).
    for (const uid of w.order) {
      if (activeUids.has(uid)) {
        unmarkCompleted(w, uid);
        continue;
      }
      if (byUid.get(uid)?.status === 'completed') {
        const idx = w.lastOrder.indexOf(uid);
        markCompleted(w, uid, idx === -1 ? w.lastOrder.length : idx, startSunk);
      }
    }

    let visibleActive: RenderableTask[];
    if (this.refillOnComplete) {
      // Rolling list: `limit` applies to active tasks and the backlog still
      // slides up, so a crossed row is an extra row rather than a held slot.
      // It still renders in the slot it occupied until it is sunk.
      visibleActive = active.slice(0, this.limit);
      for (const t of visibleActive) admit(w, t.uid);
    } else {
      // Each completion permanently burns a slot; new tasks only fill slots that
      // were never occupied. The crossed row now occupies the slot it burned, so
      // the row count still never exceeds `limit`.
      const burned = w.order.filter((uid) => !activeUids.has(uid)).length;
      const target = Math.max(0, this.limit - burned);
      const admittedActive = active.filter((t) => w.admitted.has(t.uid));
      let openSlots = target - admittedActive.length;
      for (const t of active) {
        if (openSlots <= 0) break;
        if (!w.admitted.has(t.uid)) {
          admit(w, t.uid);
          openSlots--;
        }
      }
      // Defensive slice: the invariant |admitted| <= limit holds only while the
      // window was built under these exact rules. Keying the window by
      // limit + mode should guarantee that, but a stale admitted set must never
      // be able to render more rows than the card is configured for.
      visibleActive = active.filter((t) => w.admitted.has(t.uid)).slice(0, target);
    }

    // Un-sunk crossed rows go back into the slot they held; sunk ones go last.
    // Both groups are capped so a long day cannot unbound the section — and both
    // cap by dropping the OLDEST completion (`seq`), never the newest. Capping by
    // slot index would discard the most recent tap, which is exactly the mistap
    // the crossed row exists to keep visible and undoable.
    const entries = [...w.completed.entries()].filter(([uid]) => byUid.has(uid));
    const newestFirst = (a: [string, CompletedEntry], b: [string, CompletedEntry]) =>
      b[1].seq - a[1].seq;
    const rows = [...visibleActive];

    const pending = entries
      .filter(([, e]) => !e.sunk)
      .sort(newestFirst)
      .slice(0, this.limit)
      .sort((a, b) => a[1].index - b[1].index);
    for (const [uid, entry] of pending) {
      rows.splice(Math.min(entry.index, rows.length), 0, byUid.get(uid)!);
    }

    const sunkRoom = Math.max(0, this.limit - pending.length);
    const sunk = entries
      .filter(([, e]) => e.sunk)
      .sort(newestFirst)
      .slice(0, sunkRoom)
      .sort((a, b) => a[1].seq - b[1].seq); // oldest first, reads as history
    for (const [uid] of sunk) rows.push(byUid.get(uid)!);

    // Only a render that actually carries tasks is a real snapshot. The card
    // renders once with an empty list while the subscription is still loading
    // (raw mode does not gate on it), and clobbering lastOrder there would make
    // every later completion resolve to index 0 — pinning crossed rows above
    // the active ones.
    if (source.length > 0) {
      w.lastOrder = rows.map((t) => t.uid);
      // Only a render the user can actually see ends the away span. The card's
      // own visibilitychange handler calls requestUpdate(), which renders while
      // visibilityState is still 'hidden' — clearing here would retire `away`
      // before the wake burst it exists to catch ever arrives.
      if (!hidden) w.away = false;
    }
    return { rows, totalActive };
  }

  render() {
    const source = this.integrationMode ? this.renderableTasks : this.items.map(toRenderable);
    const { rows, totalActive } = this._resolveVisible(source);

    if (rows.length === 0) {
      // Nothing left to render at all. "All done for now!" is the no-refill case
      // where the session window is cleared but backlog remains — reward the
      // cleared slate rather than shoving the backlog back into view.
      return html`
        <div class="empty-state">
          <span class="empty-icon">${iconCheck}</span>
          ${totalActive === 0 ? STRINGS.allDone : STRINGS.allDoneForNow}
        </div>
      `;
    }

    return html`
      <div class="header">
        ${STRINGS.tasksTitle}
        <span class="count-badge">${totalActive}</span>
      </div>
      ${totalActive === 0
        ? html`
            <div class="empty-state done-banner">
              <span class="empty-icon">${iconCheck}</span>
              ${STRINGS.allDone}
            </div>
          `
        : ''}
      <div class="task-list">${rows.map((task) => this._renderTaskLine(task))}</div>
    `;
  }

  private _renderTaskLine(task: RenderableTask) {
    const owner = this._ownerFor(task);
    return html`
      <div class="task-line">
        <lucarne-task-row
          compact
          show-notes
          .task=${task}
          .owner=${owner}
          .memberColor=${owner?.color ?? 'var(--primary-color)'}
        ></lucarne-task-row>
      </div>
    `;
  }

  private _ownerFor(task: RenderableTask): MemberSummary | null {
    if (!this.integrationMode) return null;
    const slug = task.metadata.member_slug;
    if (!slug || slug === HOUSEHOLD_SLUG) return null;
    return this.members.find((m) => m.slug === slug) ?? null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-tasks-summary': LucarneTasksSummary;
  }
}
