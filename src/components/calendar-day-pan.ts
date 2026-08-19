import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { snapToDay, rubberBand } from '../shared/pan-math.js';

/**
 * Wraps a <lucarne-calendar-grid> slot with horizontal pan-to-day gestures.
 *
 * Sign convention:
 *   - deltaPx (raw pointer displacement): positive = finger moved right.
 *   - snapToDay returns px-direction count (positive = dragged right = past).
 *   - The card's pan-snap handler inverts the sign before calling controller.pan()
 *     (positive controller.pan() = advance into the future).
 *
 * `pan-snap` is dispatched after the snap CSS transition completes (via
 * `transitionend`), not synchronously on pointerup. This lets the OLD day
 * content animate smoothly to the snap target before Lit replaces it with new
 * content. When `prefers-reduced-motion: reduce` is active, the dispatch is
 * immediate (no animation).
 */
@customElement('lucarne-calendar-day-pan')
export class LucarneCalendarDayPan extends LitElement {
  static styles = css`
    :host {
      display: block;
      overflow: hidden;
      position: relative;
    }
    .pan-wrapper {
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      position: relative;
    }
    ::slotted(*) {
      display: block;
    }
  `;

  /** Width of one day column, supplied by the card's ResizeObserver. */
  @property({ type: Number }) dayWidthPx = 0;
  /**
   * Off-screen render buffer (days drawn on each side of the visible window).
   * The grid's CSS baseline transform shifts the track by `-bufferDays * dayWidthPx`
   * so visible day 0 lands at the container's left edge. Pan during a gesture
   * overrides that transform via inline style, accounting for the same baseline.
   */
  @property({ type: Number }) bufferDays = 0;
  /** Whether the user can pan backwards into the past. */
  @property({ type: Boolean }) canPanBack = true;
  /** Whether the user can pan forwards into the future. */
  @property({ type: Boolean }) canPanForward = true;

  @query('slot') private _slot!: HTMLSlotElement;

  private _pointerId?: number;
  private _startX = 0;
  private _startY = 0;
  private _startTime = 0;
  private _isDragging = false;
  private _cachedTargets: HTMLElement[] = [];
  private _pendingSnapTarget?: HTMLElement;
  private _pendingTransitionEnd?: (e: Event) => void;
  /** rAF handle for the post-snap "clear inline transform so CSS baseline takes
   *  over" callback. Cancelled by _cancelPendingSnap so a new gesture's
   *  inline transform isn't wiped by a stale clear from the previous snap. */
  private _pendingClearRaf?: number;

  /** All .day-cols-track elements inside the slotted calendar-grid's shadow root. */
  private get _panTargets(): HTMLElement[] {
    const grid = this._slot?.assignedElements()[0];
    if (!grid) return [];
    return Array.from(
      (grid as Element).shadowRoot?.querySelectorAll('.day-cols-track') ?? []
    ) as HTMLElement[];
  }

  /** Cache targets on gesture start so pointermove does not re-query every frame. */
  private _cachePanTargets(): void {
    this._cachedTargets = this._panTargets;
  }

  private _applyRubberBand(dx: number): number {
    if (dx > 0 && !this.canPanBack) {
      return rubberBand(dx, 0);
    }
    if (dx < 0 && !this.canPanForward) {
      return rubberBand(dx, 0);
    }
    return dx;
  }

  /** Baseline transform in px (negative). Matches the CSS `--lucarne-day-baseline-px`. */
  private _baselinePx(): number {
    return -this.bufferDays * this.dayWidthPx;
  }

  private _setTranslate(effective: number) {
    const tx = this._baselinePx() + effective;
    for (const el of this._cachedTargets) {
      el.style.transition = '';
      el.style.transform = `translateX(${tx}px)`;
    }
  }

  /**
   * Clear inline transform on all current `.day-cols-track` elements so the
   * grid's CSS baseline (`transform: translateX(var(--lucarne-day-baseline-px))`)
   * takes over. Re-queries via `_panTargets` because Lit may have replaced
   * track nodes during a re-render.
   */
  private _clearInlineTransform() {
    for (const el of this._panTargets) {
      el.style.transition = '';
      el.style.transform = '';
    }
  }

  private _cancelPendingSnap() {
    if (this._pendingTransitionEnd && this._pendingSnapTarget) {
      this._pendingSnapTarget.removeEventListener('transitionend', this._pendingTransitionEnd);
    }
    this._pendingTransitionEnd = undefined;
    this._pendingSnapTarget = undefined;
    if (this._pendingClearRaf !== undefined) {
      cancelAnimationFrame(this._pendingClearRaf);
      this._pendingClearRaf = undefined;
    }
  }

  /** Schedule the post-snap inline-transform clear, replacing any pending one. */
  private _scheduleClearInline() {
    if (this._pendingClearRaf !== undefined) {
      cancelAnimationFrame(this._pendingClearRaf);
    }
    this._pendingClearRaf = requestAnimationFrame(() => {
      this._pendingClearRaf = undefined;
      this._clearInlineTransform();
    });
  }

  private _snapAndCommit(deltaDays: number) {
    const targets = this._cachedTargets;
    if (targets.length === 0) {
      if (deltaDays !== 0) {
        this._dispatchPanSnap(deltaDays);
        this._scheduleClearInline();
      }
      return;
    }
    this._cancelPendingSnap();

    const baseline = this._baselinePx();
    // matchMedia is absent in some embedded WebViews (and in the test DOM);
    // treat a missing implementation as "motion is fine" and keep the animation.
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Snap to baseline immediately. Dispatch first so new days render before
      // we clear inline transform; rAF guarantees ordering relative to Lit's
      // microtask update.
      for (const el of targets) {
        el.style.transition = '';
        el.style.transform = `translateX(${baseline}px)`;
      }
      if (deltaDays !== 0) this._dispatchPanSnap(deltaDays);
      // Clear inline unconditionally so a stale `translateX(baseline)` doesn't
      // override a later CSS baseline change (resize, bufferDays edit). Matches
      // the animated branch's symmetry.
      this._scheduleClearInline();
      return;
    }

    const duration = getComputedStyle(this).getPropertyValue('--lucarne-pan-duration').trim() || '240ms';
    const easing = getComputedStyle(this).getPropertyValue('--lucarne-pan-easing').trim() || 'cubic-bezier(0.32, 0.72, 0, 1)';
    const transition = `transform ${duration} ${easing}`;

    // Animate OLD content to the screen position where the NEW content will
    // sit at baseline after the offset commit. Old + `(deltaDays - 0)` days
    // visually equals new + 0 days, both at translateX = baseline + 0.
    // With baseline included: target = baseline + deltaDays * dayWidthPx.
    const targetPx = baseline + deltaDays * this.dayWidthPx;

    for (const el of targets) {
      el.style.transition = transition;
      el.style.transform = `translateX(${targetPx}px)`;
    }

    const onEnd = (e: Event) => {
      // transitionend bubbles. Ignore events from descendants (e.g. an
      // event block's `filter` transition) and any non-transform property
      // on targets[0] itself — only the track's own transform completion
      // should commit the snap. Without this guard, an unrelated bubbled
      // event could trigger pan-snap mid-animation. We manage removal
      // manually (no `{ once: true }`) so a stray event doesn't consume the
      // single-fire listener before the real transform finishes.
      const te = e as TransitionEvent;
      if (te.target !== targets[0]) return;
      if (te.propertyName && te.propertyName !== 'transform') return;
      this._pendingTransitionEnd = undefined;
      targets[0].removeEventListener('transitionend', onEnd);
      // Dispatch first → card updates dayOffset → Lit schedules a microtask
      // re-render of the grid with NEW days. rAF fires AFTER the microtask
      // flushes, so by the time we clear inline transform, the new days are
      // in place; CSS baseline applies, and the new content lands at exactly
      // the screen position the OLD content occupied at targetPx (invisible swap).
      if (deltaDays !== 0) this._dispatchPanSnap(deltaDays);
      this._scheduleClearInline();
    };
    this._pendingSnapTarget = targets[0];
    this._pendingTransitionEnd = onEnd;
    targets[0].addEventListener('transitionend', onEnd);
  }

  private _dispatchPanSnap(deltaDays: number) {
    this.dispatchEvent(
      new CustomEvent('pan-snap', {
        detail: { deltaDays },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Ignore second pointer while a gesture is in progress
    if (this._pointerId !== undefined) return;
    this._cancelPendingSnap();
    this._pointerId = e.pointerId;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._startTime = performance.now();
    this._isDragging = false;
    this._cachePanTargets();
    // NOTE: setPointerCapture is intentionally deferred to _onPointerMove.
    // Capturing on pointerdown would steal the synthesized click event on
    // Chrome desktop, preventing event-pill clicks from opening the detail modal.
  }

  private _onPointerMove(e: PointerEvent) {
    if (e.pointerId !== this._pointerId) return;
    const dx = e.clientX - this._startX;
    const dy = e.clientY - this._startY;

    if (!this._isDragging) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical scroll wins — abort horizontal gesture and release capture
        try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* already released */ }
        this._pointerId = undefined;
        return;
      }
      this._isDragging = true;
      // Defer capture to here: first horizontal drag event past the threshold.
      // This allows a click (pointerdown→pointerup with no drag) to reach
      // descendant elements normally.
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        /* capture failed; events will still arrive on the wrapper */
      }
    }

    const effective = this._applyRubberBand(dx);
    this._setTranslate(effective);
  }

  private _onPointerUp(e: PointerEvent) {
    // Guard covers both pointerup and pointercancel bound to this handler.
    // Clearing _pointerId after the first fires ensures the second (rare duplicate
    // from some Safari scroll-interception scenarios) is dropped here.
    if (e.pointerId !== this._pointerId) return;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* already released */ }

    if (this._isDragging) {
      const dx = e.clientX - this._startX;
      const dt = performance.now() - this._startTime;
      const velocity = dt > 0 ? (dx / dt) * 1000 : 0;
      // Use rubber-banded dx so snap math sees the same magnitude as the visual
      const effective = this._applyRubberBand(dx);
      let deltaDays = snapToDay(effective, this.dayWidthPx, velocity);
      // At a pan bound, rubberBand reduces the displacement to ~1/3 but the
      // residual combined with flick velocity can still make snapToDay return
      // ±1. Force snap-to-baseline so we don't dispatch a pan-snap the
      // controller would just clamp away.
      if ((deltaDays > 0 && !this.canPanBack) || (deltaDays < 0 && !this.canPanForward)) {
        deltaDays = 0;
      }
      this._snapAndCommit(deltaDays);
    }
    this._pointerId = undefined;
    this._isDragging = false;
    this._cachedTargets = [];
  }

  render() {
    return html`
      <div
        class="pan-wrapper"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-calendar-day-pan': LucarneCalendarDayPan;
  }
}
