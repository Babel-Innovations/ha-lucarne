import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { MemberSummary, RenderableTask } from '../shared/types.js';
import { nextOwner } from '../shared/rotation.js';
import { noteSegments, taskNote } from '../shared/task-notes.js';
import { EMOJI_RE } from './member-avatar.js';

const LONG_PRESS_MS = 500;

/** Note expand/collapse. Short enough to feel instant, long enough to read as motion. */
const NOTE_ANIM_MS = 180;

/**
 * Whether a pointer/mouse event started on a link inside the note.
 *
 * `closest` is optional-called for headless DOMs that omit it, and the event
 * target and the handler share a shadow root, so no retargeting is in play.
 */
function isLinkEvent(e: Event): boolean {
  const target = e.target as HTMLElement | null;
  return !!target?.closest?.('a');
}

@customElement('lucarne-task-row')
export class LucarneTaskRow extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 4px;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.1s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    /* compact tightens visual spacing while preserving the 44px hit area —
       per a11y guidelines the interactive role="checkbox" must keep that
       minimum touch target. Density comes from the smaller circle + gap. */
    :host([compact]) .row {
      gap: 8px;
      padding: 4px 2px;
    }
    .row:hover,
    .row:active {
      background: rgba(0, 0, 0, 0.04);
    }
    /* The owner avatar lives INSIDE .row so .row's align-items:center keeps it on
       the check circle's centre line at any row height — a wrapped label growing
       the row, or a note line below it, can no longer drift the two apart. It
       used to be a sibling in tasks-summary, which had to model .row's geometry
       with a magic offset and got it wrong twice. */
    .owner-avatar {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-size: 13px;
      line-height: 1;
      color: rgba(0, 0, 0, 0.75);
    }
    .owner-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .owner-avatar .initial {
      font-weight: 700;
      text-transform: uppercase;
      font-family: var(--primary-font-family, sans-serif);
      font-size: 11px;
    }
    .check {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
    }
    :host([compact]) .check {
      width: 20px;
      height: 20px;
      border-width: 2px;
    }
    :host([compact]) .check svg {
      width: 12px;
      height: 12px;
    }
    .check.done {
      background: var(--member-color, #a8d8b9);
      border-color: var(--member-color, #a8d8b9);
    }
    .check svg {
      width: 14px;
      height: 14px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .check.done svg {
      opacity: 1;
    }
    .icon {
      font-size: 1.1rem;
      line-height: 1;
      flex-shrink: 0;
    }
    .middle {
      flex: 1;
      min-width: 0;
    }
    .label {
      font-size: clamp(0.95rem, 1.2vw, 1.05rem);
      color: var(--primary-text-color, #212121);
      font-family: var(--primary-font-family, sans-serif);
      transition: text-decoration 0.15s, color 0.15s;
      /* Wrap long task text instead of overflowing the column. The label is an
         inline span, so overflow/text-overflow never clipped it — nowrap just
         pushed the column wide and forced a horizontal scrollbar (issue #69).
         overflow-wrap: anywhere breaks single overlong words too. */
      overflow-wrap: anywhere;
    }
    .label.done {
      text-decoration: line-through;
      color: var(--secondary-text-color, #727272);
      opacity: 0.6;
    }
    .due {
      font-size: 0.75rem;
      color: var(--secondary-text-color, #727272);
      flex-shrink: 0;
    }
    .rotation-badge {
      font-size: 0.9rem;
      opacity: 0.55;
      flex-shrink: 0;
    }
    .rotation-next {
      font-size: 0.7rem;
      color: var(--secondary-text-color, #727272);
      display: block;
    }
    /* The note lives inside .middle, alongside .label — so it starts where the
       summary starts, automatically, whatever leads the row (check circle,
       emoji icon, owner avatar) and at any density. It previously sat outside
       .row with a hard-coded left margin that reproduced the leading width; the
       moment the avatar moved into .row that constant was wrong. Being inside
       .row means it DOES bubble into the row's toggle and long-press handlers,
       so its pointer handlers stop propagation — see _renderNote. */
    .note {
      display: block;
      margin: 2px 0 0;
      /* .row sets user-select: none for the tap target; note text is content, so
         let it be selected and copied. */
      user-select: text;
      -webkit-user-select: text;
      font-size: 0.75rem;
      line-height: 1.35;
      color: var(--secondary-text-color, #727272);
      font-family: var(--primary-font-family, sans-serif);
      cursor: pointer;
      border-radius: 6px;
      -webkit-tap-highlight-color: transparent;
      /* Match .label so a single overlong word — a URL, typically — wraps
         instead of overflowing. On the base rule, not just the wrapped states,
         so measuring one shape never depends on the class of the other. */
      overflow-wrap: anywhere;
      /* Collapsed: one line, ellipsised. Deliberately NOT -webkit-line-clamp —
         plain text-overflow is unambiguously safe at the safari15/chrome85
         floor pinned in vite.config.ts. */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .note.expanded {
      white-space: normal;
      overflow: visible;
    }
    /* Held for the length of the expand/collapse animation, in BOTH directions:
       the note is laid out wrapped (its expanded shape) while an inline height
       animates between the one-line and full heights, and the overflow clip is
       what turns that into a reveal. Must come after .note.expanded — same
       specificity — so a collapsing note keeps clipping instead of spilling.
       See _startNoteAnimation. */
    .note.animating {
      white-space: normal;
      overflow: hidden;
      text-overflow: clip;
    }
    .note a {
      /* Same fallback as every other accent in the cards — HA's own default
         primary colour, overridden by the active theme. */
      color: var(--primary-color, #03a9f4);
      text-decoration: underline;
    }
    .note.done {
      opacity: 0.6;
    }
    :host([compact]) .note {
      font-size: 0.7rem;
    }
  `;

  @property({ attribute: false }) task!: RenderableTask;
  @property() memberColor = '#a8d8b9';
  /** Tighter geometry (smaller circle, less padding) for summary contexts. */
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ attribute: false }) members: MemberSummary[] = [];
  /**
   * Render the task's description as an expandable note line. Off by default so
   * the chores card's narrow member columns keep their current density; only
   * the Today card's tasks summary opts in.
   */
  @property({ type: Boolean, attribute: 'show-notes' }) showNotes = false;
  /** Owner shown as a small avatar leading the row; null renders none. */
  @property({ attribute: false }) owner: MemberSummary | null = null;

  @state() private _noteExpanded = false;
  /** True only while the expand/collapse height animation is running. */
  @state() private _noteAnimating = false;

  private _noteAnim: Animation | null = null;

  private _pressTimer: ReturnType<typeof setTimeout> | null = null;
  private _longPressed = false;
  /**
   * A press that began on the note. The note stops its own pointerdown, but a
   * press that starts there and is released over the row still fires a click on
   * .row — their common ancestor since the note moved inside it. Swallow that
   * one click so dragging off a note cannot complete the task.
   *
   * The note captures the pointer, so a press that wanders anywhere — including
   * onto a different row — still delivers its pointerup and click back to the
   * note, which clears the flag. The flag is the fallback for engines that do
   * not retarget the click under capture; there it is cleared by the row's next
   * pointerdown, or by pointercancel (a scroll of the task list), which bubbles
   * from the note to the row's own handler.
   *
   * Note the flag is deliberately NOT cleared on pointerup: the order is
   * pointerdown -> pointerup -> click, so clearing there would disarm it just
   * before the click it exists to swallow.
   */
  private _notePress = false;

  private _onPointerDown(e: PointerEvent) {
    this._longPressed = false;
    this._notePress = false;
    this._pressTimer = setTimeout(() => {
      this._longPressed = true;
      this.dispatchEvent(
        new CustomEvent('task-long-press', {
          detail: { task: this.task },
          bubbles: true,
          composed: true,
        }),
      );
    }, LONG_PRESS_MS);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  private _onPointerUp() {
    if (this._pressTimer !== null) {
      clearTimeout(this._pressTimer);
      this._pressTimer = null;
    }
  }

  private _onPointerCancel() {
    this._notePress = false;
    if (this._pressTimer !== null) {
      clearTimeout(this._pressTimer);
      this._pressTimer = null;
    }
  }

  protected willUpdate(changed: PropertyValues) {
    // The tasks summary renders rows with a plain .map(), so Lit reuses row
    // elements BY INDEX. When the list reorders — a completion sinking to the
    // bottom, a backlog task sliding up — this element can be handed a
    // different task while keeping its state. Collapse so an expanded note
    // never carries over onto someone else's row.
    if (changed.has('task')) {
      const previous = changed.get('task') as RenderableTask | undefined;
      if (previous && previous.uid !== this.task?.uid) {
        this._noteExpanded = false;
        // A recycle mid-animation would otherwise keep animating the outgoing
        // note's height over the incoming task's.
        this._noteAnim?.cancel();
        this._noteAnim = null;
        this._noteAnimating = false;
      }
    }
  }

  private _toggleNote() {
    const expand = !this._noteExpanded;
    this._noteExpanded = expand;
    // The animation is started here rather than from `updated`, so nothing sets
    // reactive state inside an update cycle — and so a note collapsed by row
    // recycling (see willUpdate) never animates on someone else's task. It runs
    // against the pre-toggle layout for one microtask, which is fine: it drives
    // an explicit height, and Lit's re-render lands before the next paint.
    this._noteAnimating = this._startNoteAnimation(expand);
  }

  /**
   * Animate the note's height between its one-line and full-text shapes.
   *
   * Expansion is a `white-space` flip, which is not animatable, so the height
   * has to be animated explicitly — and `auto` is not an animatable endpoint
   * either, so both ends are measured in px first. Returns whether an animation
   * is now running, i.e. whether `.animating` should render: it keeps the text
   * laid out wrapped and clipped for the whole run in either direction, so a
   * collapse shrinks the real paragraph instead of snapping to one line first
   * and then shrinking an empty box.
   */
  private _startNoteAnimation(expand: boolean): boolean {
    const el = this.renderRoot.querySelector('.note') as HTMLElement | null;
    // matchMedia is absent in some embedded WebViews (and in the test DOM);
    // treat a missing implementation as "motion is fine" and keep the animation.
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Element.animate is inside the browser floor pinned in vite.config.ts, but
    // not every headless DOM implements it.
    if (!el || reduced || typeof el.animate !== 'function') return false;

    // Before measuring, not after: a running animation with `fill: forwards`
    // outranks inline style in the cascade, so _measureNote would read the
    // height being animated for BOTH shapes and this method would conclude
    // there is nothing to animate.
    this._noteAnim?.cancel();
    this._noteAnim = null;

    const collapsed = this._measureNote(el, false);
    const expanded = this._measureNote(el, true);
    const from = expand ? collapsed : expanded;
    const to = expand ? expanded : collapsed;
    // Nothing to reveal (a note that already fits on one line), or a DOM that
    // reports no geometry at all.
    if (from === to) return false;

    const anim = el.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: NOTE_ANIM_MS,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      // Hold the end height until `.animating` is off the element, or a collapse
      // flashes back to the full height for a frame in between.
      fill: 'forwards',
    });
    this._noteAnim = anim;
    anim.onfinish = () => {
      if (this._noteAnim !== anim) return;
      this._noteAnim = null;
      this._noteAnimating = false;
      void this.updateComplete.then(() => anim.cancel());
    };
    // A cancel from the next toggle re-enters this method, which owns the class
    // from there on; only a cancel we still track needs cleaning up here.
    anim.oncancel = () => {
      if (this._noteAnim !== anim) return;
      this._noteAnim = null;
      this._noteAnimating = false;
    };
    return true;
  }

  /**
   * The note's height in its wrapped or one-line shape, without disturbing what
   * is on screen. Forces a reflow, so it is only ever called on a user toggle.
   */
  private _measureNote(el: HTMLElement, wrapped: boolean): number {
    const previousWhiteSpace = el.style.whiteSpace;
    const previousHeight = el.style.height;
    el.style.whiteSpace = wrapped ? 'normal' : 'nowrap';
    el.style.height = 'auto';
    const height = el.offsetHeight;
    el.style.whiteSpace = previousWhiteSpace;
    el.style.height = previousHeight;
    return height;
  }

  private _onClick() {
    if (this._longPressed) return;
    if (this._notePress) {
      this._notePress = false;
      return;
    }
    this.dispatchEvent(
      new CustomEvent('task-toggle', {
        detail: { task: this.task },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.task) return html``;
    const done = this.task.status === 'completed';
    const icon = this.task.metadata.icon;
    const due = this.task.due;
    const isRotating = this.task.metadata.type === 'rotating';
    const note = this.showNotes ? taskNote(this.task.description) : '';

    let nextName: string | null = null;
    if (isRotating) {
      const owners = this.task.metadata.rotation_owners ?? [];
      const current = this.task.metadata.current_owner ?? '';
      if (owners.length > 1) {
        const knownSlugs = new Set(this.members.filter((m) => m.slug !== 'household').map((m) => m.slug));
        const slug = nextOwner(owners, current, knownSlugs);
        if (slug) {
          const m = this.members.find((mb) => mb.slug === slug);
          nextName = m?.name ?? slug;
        }
      }
    }

    return html`
      <div
        class="row"
        style="--member-color:${this.memberColor}"
        role="checkbox"
        aria-checked=${done}
        aria-label=${this._rowLabel(due, nextName)}
        aria-describedby=${note ? 'task-note' : nothing}
        tabindex="0"
        @click=${this._onClick}
        @keydown=${(e: KeyboardEvent) => {
          // A note link is a real tab stop inside this row. Without this guard
          // the row's own preventDefault cancels the anchor's activation and
          // completes the task instead of opening the link.
          if (isLinkEvent(e)) return;
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
            e.preventDefault();
            this._onClick();
          }
        }}
        @pointerdown=${this._onPointerDown}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        ${this.owner ? this._renderOwnerAvatar(this.owner) : ''}
        <div class="check ${done ? 'done' : ''}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="rgba(0,0,0,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        ${icon ? html`<span class="icon" aria-hidden="true">${icon}</span>` : ''}
        <div class="middle">
          <span class="label ${done ? 'done' : ''}">${this.task.summary}</span>
          ${nextName ? html`<span class="rotation-next">next: ${nextName}</span>` : ''}
          ${note ? this._renderNote(note, done) : ''}
        </div>
        ${isRotating ? html`<span class="rotation-badge" aria-hidden="true">↻</span>` : ''}
        ${due ? html`<span class="due">${this._formatDue(due)}</span>` : ''}
      </div>
    `;
  }

  /**
   * Accessible name for the row. Explicit because the note now lives inside
   * .row: without it the checkbox's name would be computed from contents and
   * swallow the whole note. That means anything else worth announcing has to be
   * listed here — the rotation hint used to come along for free via contents.
   * The note itself is exposed separately, through aria-describedby, and the
   * emoji icon is deliberately left out as decorative (it is aria-hidden, so it
   * no longer announces "broom" ahead of the task's actual name).
   */
  private _rowLabel(due: string | null, nextName: string | null): string {
    let label = this.task.summary;
    if (due) label += `, due ${this._formatDue(due)}`;
    if (nextName) label += `, next: ${nextName}`;
    return label;
  }

  private _renderOwnerAvatar(member: MemberSummary) {
    // Mirror lucarne-member-avatar's branching so non-emoji strings (URL, plain
    // text, accidentally-stored markup) don't end up rendered verbatim in the
    // tiny pill — fall back to the initial instead. aria-hidden so the owner
    // does not pollute the row checkbox's accessible name.
    const av = member.avatar;
    let inner;
    if (av && av.startsWith('/local/')) {
      inner = html`<img src="${av}" alt="" draggable="false" />`;
    } else if (av && EMOJI_RE.test(av)) {
      inner = html`<span>${av}</span>`;
    } else {
      inner = html`<span class="initial">${member.name.trim().charAt(0) || '?'}</span>`;
    }
    return html`
      <div
        class="owner-avatar"
        style="background:${member.color}"
        title="${member.name}"
        aria-hidden="true"
      >
        ${inner}
      </div>
    `;
  }

  private _renderNote(note: string, done: boolean) {
    // Deliberately NOT a focusable role="button". The note sits inside .row so
    // its indent tracks the row's leading content automatically, and .row is a
    // role="checkbox" — whose children ARIA treats as presentational. A
    // focusable control in there announces nothing actionable, and its text
    // would be absorbed into the checkbox's own accessible name.
    //
    // So assistive tech gets the note through the row's aria-describedby, in
    // full and regardless of expansion, while expanding stays a pointer
    // affordance for sighted users who see it ellipsised. Its pointer handlers
    // stop propagation, or reading a note would complete the task.
    //
    // The link anchors below are the deliberate exception: they are natively
    // focusable, so they are tab stops inside that presentational subtree and
    // AT may announce them as part of the checkbox rather than as links. That
    // is accepted because the alternative — tabindex="-1" — takes the URL away
    // from keyboard users entirely, and the note text (URL included) is already
    // announced through aria-describedby either way. It does mean the row's own
    // keydown handler has to skip events coming from a link; see .row.
    //
    // Always toggleable, even when the note already fits on one line: expanding
    // a short note is a harmless no-op and avoids a scrollWidth/clientWidth
    // layout read on every render.
    return html`
      <div
        id="task-note"
        class="note ${done ? 'done' : ''} ${this._noteExpanded ? 'expanded' : ''} ${this
          ._noteAnimating
          ? 'animating'
          : ''}"
        @click=${(e: Event) => {
          e.stopPropagation();
          this._notePress = false;
          // A tap on a link navigates; it must not also toggle the note.
          if (isLinkEvent(e)) return;
          this._toggleNote();
        }}
        @pointerdown=${(e: PointerEvent) => {
          e.stopPropagation();
          // Capturing the pointer for a press that started on a link retargets
          // the click to the note, so the link would never open. Let the anchor
          // own its own press; propagation is still stopped, so the row's
          // long-press timer stays out of it.
          if (isLinkEvent(e)) return;
          this._notePress = true;
          // Capture so a press that drifts off the note — onto another row, or
          // off the card entirely — still reports back here. Without it the
          // pointerup and click land elsewhere, stranding _notePress set and
          // swallowing this row's next keyboard activation.
          // Optional-call for happy-dom and friends, which may not implement it;
          // a real engine always does (.row calls it unguarded at _onPointerDown).
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
      >
        ${noteSegments(note).map((segment) =>
          segment.href
            ? html`<a
                href=${segment.href}
                target="_blank"
                rel="noopener noreferrer"
                >${segment.text}</a
              >`
            : segment.text,
        )}
      </div>
    `;
  }

  private _formatDue(due: string): string {
    // ISO datetime → time of day
    if (due.includes('T')) {
      const d = new Date(due);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return due;
    }
    // Date-only YYYY-MM-DD → "May 30" (parsed as local midnight to avoid UTC drift).
    if (due.length === 10) {
      const d = new Date(due + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      }
    }
    return due;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-task-row': LucarneTaskRow;
  }
}
