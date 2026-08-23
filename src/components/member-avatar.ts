import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// Match a string composed entirely of emoji-related codepoints (with at
// least one pictographic glyph). Includes ZWJ (U+200D) and variation
// selector U+FE0F so multi-codepoint sequences — ZWJ families,
// skin-tone modifiers, and the `❤️` heart-with-VS16 — are recognised.
//
// Deliberately built with `new RegExp` rather than written as a regex literal.
// A regex literal is an *early error*: an engine that rejects anything inside it
// fails to parse the enclosing script, so the entire bundle dies before a
// single statement runs, no custom element registers, and Home Assistant shows
// its generic red "Configuration error" panel with nothing to click into — the
// exact signature of issue #101, and indistinguishable from the class-static-block
// failure `build.target` guards against. `\p{...}` property *names* are validated
// against whatever Unicode tables the engine was built with, not against its ES
// version, so `build.target` and the acorn check in tests/build/bundle-syntax.test.ts
// (which validates names against the latest spec) both wave it through.
// `new RegExp` turns that fatal parse error into a catchable runtime one.
// This module is the 3rd evaluated in the bundle — ahead of every registration.

/** Preferred: expresses intent, but leans on the engine's Unicode property tables. */
export const EMOJI_PATTERN_PREFERRED =
  '^(?=.*[\\p{Extended_Pictographic}\\p{Regional_Indicator}])' +
  '[\\p{Extended_Pictographic}\\p{Emoji_Component}\\p{Emoji_Modifier}' +
  '\\p{Regional_Indicator}\u200D\uFE0F]+$';

/**
 * Fallback: explicit codepoint ranges, no property tables involved. Runs only on
 * an engine that rejects one of the property names above.
 *
 * The *ranges* mirror `_BASE_EMOJI` / `_EMOJI_MOD` in
 * custom_components/lucarne_family/member_service.py — keep those in step. The
 * *grammar* deliberately does not: Python enforces `BASE MOD* (ZWJ BASE MOD*)*`
 * and rejects unjoined back-to-back emoji, while both patterns here are a flat
 * character class and accept `"😀😀"`. That asymmetry is intentional and
 * pre-dates this change — Python is the validator, this is display-only.
 *
 * Nor is it set-equivalent to the preferred pattern: it drops pictographics
 * outside the four ranges (`©®™`, `‼⁉`, `Ⓜ`, `▶◀`, `〽`, `㊗`, keycap bases) and
 * admits non-emoji inside U+2300–U+27FF (box drawing, misc technical). Both are
 * acceptable because it only runs where the preferred pattern cannot compile at
 * all, and every miss degrades to rendering the member's initial.
 */
export const EMOJI_PATTERN_FALLBACK =
  '^(?=.*[\\u{1F000}-\\u{1FAFF}\\u{2300}-\\u{27FF}\\u{2B00}-\\u{2BFF}\\u{1F1E0}-\\u{1F1FF}])' +
  '[\\u{1F000}-\\u{1FAFF}\\u{2300}-\\u{27FF}\\u{2B00}-\\u{2BFF}\\u{1F1E0}-\\u{1F1FF}' +
  '\\u{FE00}-\\u{FE0F}\\u{200D}\\u{20E3}\\u{1F3FB}-\\u{1F3FF}]+$';

/** Matches nothing. Last resort so avatars degrade to initials, never to a crash. */
const NEVER_MATCHES = /(?!)/;

/**
 * First pattern the engine will actually compile, or a never-matching regex.
 * Exported (with the patterns) so the fallback path is reachable from tests —
 * on a modern engine the preferred pattern always wins, and an untested
 * fallback is a fallback that does not work when it finally runs.
 */
export function buildEmojiRe(
  patterns: readonly string[] = [EMOJI_PATTERN_PREFERRED, EMOJI_PATTERN_FALLBACK],
): RegExp {
  for (const pattern of patterns) {
    try {
      return new RegExp(pattern, 'u');
    } catch {
      // Unknown property name, or no /u support at all — try the next one.
    }
  }
  return NEVER_MATCHES;
}

export const EMOJI_RE = buildEmojiRe();

@customElement('lucarne-member-avatar')
export class LucarneMemberAvatar extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .avatar {
      width: clamp(48px, 6vw, 72px);
      height: clamp(48px, 6vw, 72px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .initial {
      font-size: clamp(1.25rem, 2.5vw, 2rem);
      font-weight: 700;
      color: rgba(0, 0, 0, 0.7);
      line-height: 1;
      text-transform: uppercase;
      font-family: var(--primary-font-family, sans-serif);
    }
    .emoji {
      font-size: clamp(1.5rem, 3vw, 2.25rem);
      line-height: 1;
    }
  `;

  @property() name = '';
  @property() color = '#a8d8b9';
  @property() avatar: string | null = null;

  render() {
    const av = this.avatar;
    if (av && av.startsWith('/local/')) {
      return html`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <img src="${av}" alt="${this.name}" />
        </div>
      `;
    }
    if (av && EMOJI_RE.test(av)) {
      return html`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <span class="emoji">${av}</span>
        </div>
      `;
    }
    const initial = this.name.trim().charAt(0) || '?';
    return html`
      <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
        <span class="initial">${initial}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-member-avatar': LucarneMemberAvatar;
  }
}
