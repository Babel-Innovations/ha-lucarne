import { isoDateKey } from './calendar-layout.js';

/**
 * Session memory of which Today-card tasks were completed while the user was
 * watching, so they can stay on screen crossed out instead of vanishing.
 *
 * Why this lives at module scope rather than on `lucarne-tasks-summary`:
 * Lovelace renders only the active view and destroys the previous view's DOM,
 * so every element field resets on a dashboard view switch. Crossed rows have
 * to outlive that — sinking them to the bottom *on* a view switch is the whole
 * point. Module scope survives a remount within a page load; the local-day key
 * prunes yesterday's rows at midnight.
 *
 * Deliberate reset boundaries: a full dashboard reload or an HA frontend update
 * clears the crossed rows. That is acceptable on an always-on kiosk that
 * reloads rarely, and it is why nothing here is persisted to storage.
 *
 * A completed task only qualifies if it was seen *active first* — a todo entity
 * keeps completed items indefinitely, and nothing in the frontend can date a
 * completion it did not witness: the cards' own TodoItem type
 * (shared/types.ts) does not read the `completed` field. So "show completed"
 * must not mean "show everything ever ticked".
 *
 * Reading that field would be the cheapest way to survive a reload — HA's
 * TodoItem carries `completed` and local_todo, which backs every entity Lucarne
 * creates, populates it — but that is a separate change.
 */
export interface CompletedEntry {
  /** Index the row held in the visible list at the moment it was completed. */
  index: number;
  /** Set once the card went away and came back — render at the bottom. */
  sunk: boolean;
  /**
   * Monotonic completion order. Used to evict the OLDEST crossed row when the
   * cap binds — dropping by slot index instead would discard the most recent
   * tap, which is precisely the mistap this feature exists to keep visible.
   */
  seq: number;
}

export interface TaskWindow {
  entityId: string;
  day: string;
  /** Uids ever admitted to the visible window, in admission order. */
  order: string[];
  admitted: Set<string>;
  completed: Map<string, CompletedEntry>;
  /** Uids of the previous render's rows — the source of a new entry's index. */
  lastOrder: string[];
  /**
   * True while the user is not looking: set when the window is sunk (view
   * switch, display sleep), cleared on the first render that actually carries
   * tasks again. Completions *first observed* during that span belong at the
   * bottom — `sinkCompleted` cannot place them, because it only flips entries
   * that already exist.
   */
  away: boolean;
}

const windows = new Map<string, TaskWindow>();
let seqCounter = 0;

/**
 * The window for this entity + card configuration.
 *
 * `limit` and `refill` are part of the *key*, not merely a re-seed trigger: the
 * admitted set is built under rules that differ between the two modes, so
 * reusing one across a config change can render more rows than `max_tasks`.
 * Keying them apart also stops two cards on the same entity with different
 * settings (dashboard card vs. the visual editor's live preview, which shares
 * this module scope) from wiping each other's crossed rows on every render.
 *
 * Call once per render, before any mutator.
 */
export function getWindow(
  entityId: string,
  limit: number,
  refill: boolean,
  now: Date,
): TaskWindow {
  const day = isoDateKey(now);
  // Drop anything from a previous day, including windows for entities no longer
  // rendered — otherwise a key that stops being looked up is never reclaimed.
  for (const [key, w] of windows) {
    if (w.day !== day) windows.delete(key);
  }

  const key = `${entityId}#${limit}#${refill ? 'refill' : 'burn'}`;
  const existing = windows.get(key);
  if (existing) return existing;

  const fresh: TaskWindow = {
    entityId,
    day,
    order: [],
    admitted: new Set(),
    completed: new Map(),
    lastOrder: [],
    away: false,
  };
  windows.set(key, fresh);
  return fresh;
}

export function admit(w: TaskWindow, uid: string): void {
  if (w.admitted.has(uid)) return;
  w.admitted.add(uid);
  w.order.push(uid);
}

/**
 * Record a completion. Keeps the original index, sunk flag and seq if known.
 *
 * `startSunk` covers completions the card first *observes* while it is hidden —
 * the WKWebView kiosk delivers stalled WS frames in a burst as it wakes, and an
 * entry created un-sunk would splice into its old slot just as the user starts
 * looking. `sinkCompleted` cannot help: it only flips entries that already exist.
 */
export function markCompleted(
  w: TaskWindow,
  uid: string,
  index: number,
  startSunk = false,
): void {
  if (w.completed.has(uid)) return;
  w.completed.set(uid, { index, sunk: startSunk, seq: ++seqCounter });
}

/** Un-cross a task — it returned to the active set (the completion was undone). */
export function unmarkCompleted(w: TaskWindow, uid: string): void {
  w.completed.delete(uid);
}

/**
 * Send every crossed row for this entity to the bottom. Called when the card
 * goes away (view switch, display sleep) so rows are already sunk on return —
 * they never reorder under the user's finger. Matches on the entity, so every
 * window variant for it is sunk regardless of limit/mode.
 */
export function sinkCompleted(entityId?: string): void {
  for (const w of windows.values()) {
    if (entityId !== undefined && w.entityId !== entityId) continue;
    for (const entry of w.completed.values()) entry.sunk = true;
    // A view switch unmounts the card without ever hiding the document, so a
    // completion made elsewhere while it is away would otherwise be discovered
    // on remount as brand new and un-sunk, and splice in above active tasks.
    w.away = true;
  }
}

/**
 * End the away span for this entity because the user just acted on it.
 *
 * `away` is otherwise only cleared by a render that happens while the document
 * is visible — but nothing forces a render on wake, so the rows the user sees
 * after the display comes back may still be the ones painted before it slept.
 * Their very first tap would then be treated as part of the catch-up burst and
 * sink to the bottom, moving the list under their finger: the exact thing the
 * sinking machinery exists to prevent. A tap is proof they are looking.
 */
export function clearAway(entityId?: string): void {
  for (const w of windows.values()) {
    if (entityId !== undefined && w.entityId !== entityId) continue;
    w.away = false;
  }
}

/** Test seam — module-global state would otherwise leak between test cases. */
export function resetWindows(): void {
  windows.clear();
  seqCounter = 0;
}
