import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneMemberAvatar } from '../../src/components/member-avatar.js';
// This value import is what evaluates the module, and evaluating it is what runs
// `@customElement('lucarne-member-avatar')`. The `import type` above is erased at
// compile time, so before these bindings existed a dynamic import was needed here
// to force registration — it is redundant now. If these named imports ever go
// away, the element stops registering and the DOM tests below fail confusingly:
// keep a side-effect import in that case.
import {
  EMOJI_PATTERN_FALLBACK,
  EMOJI_PATTERN_PREFERRED,
  EMOJI_RE,
  buildEmojiRe,
} from '../../src/components/member-avatar.js';

function makeEl(opts: { name?: string; color?: string; avatar?: string | null } = {}): LucarneMemberAvatar {
  const el = document.createElement('lucarne-member-avatar') as LucarneMemberAvatar;
  el.name = opts.name ?? 'Anna';
  el.color = opts.color ?? '#f5c89c';
  el.avatar = opts.avatar !== undefined ? opts.avatar : null;
  document.body.appendChild(el);
  return el;
}

function shadow(el: LucarneMemberAvatar, sel: string) {
  return el.shadowRoot?.querySelector(sel) ?? null;
}

afterEach(() => {
  document.querySelectorAll('lucarne-member-avatar').forEach((el) => el.remove());
});

describe('lucarne-member-avatar', () => {
  it('renders colored initial circle when avatar is null', async () => {
    const el = makeEl({ name: 'Anna', avatar: null });
    await el.updateComplete;

    const avatarDiv = shadow(el, '.avatar');
    assert.ok(avatarDiv, '.avatar div rendered');
    assert.ok((avatarDiv as HTMLElement).style.background.length > 0);

    const initialSpan = shadow(el, '.initial');
    assert.ok(initialSpan, '.initial span rendered');
    assert.equal(initialSpan!.textContent, 'A');

    const img = shadow(el, 'img');
    assert.equal(img, null, 'no img for null avatar');

    const emojiSpan = shadow(el, '.emoji');
    assert.equal(emojiSpan, null, 'no emoji for null avatar');
  });

  it('renders colored initial circle when avatar is empty string', async () => {
    const el = makeEl({ name: 'Bob', avatar: '' });
    await el.updateComplete;

    const initialSpan = shadow(el, '.initial');
    assert.ok(initialSpan, '.initial rendered for empty avatar');
    assert.equal(initialSpan!.textContent, 'B');
  });

  it('renders emoji in circle when avatar is a single emoji', async () => {
    const el = makeEl({ name: 'Anna', avatar: '🪥' });
    await el.updateComplete;

    const emojiSpan = shadow(el, '.emoji');
    assert.ok(emojiSpan, '.emoji span rendered');
    assert.equal(emojiSpan!.textContent, '🪥');

    const img = shadow(el, 'img');
    assert.equal(img, null, 'no img for emoji avatar');

    const initialSpan = shadow(el, '.initial');
    assert.equal(initialSpan, null, 'no initial for emoji avatar');
  });

  it('renders img tag when avatar starts with /local/', async () => {
    const el = makeEl({ name: 'Anna', avatar: '/local/lucarne/avatars/anna.png' });
    await el.updateComplete;

    const img = shadow(el, 'img') as HTMLImageElement | null;
    assert.ok(img, 'img element rendered');
    assert.equal(img!.getAttribute('src'), '/local/lucarne/avatars/anna.png');

    const emojiSpan = shadow(el, '.emoji');
    assert.equal(emojiSpan, null, 'no emoji for /local/ avatar');
  });

  it('renders emoji for ZWJ family sequence', async () => {
    const el = makeEl({ name: 'Anna', avatar: '👨‍👩‍👧' });
    await el.updateComplete;

    const emojiSpan = shadow(el, '.emoji');
    assert.ok(emojiSpan, '.emoji span rendered for ZWJ family');
    assert.equal(emojiSpan!.textContent, '👨‍👩‍👧');

    const initialSpan = shadow(el, '.initial');
    assert.equal(initialSpan, null, 'no initial fallback for ZWJ family');
  });

  it('renders emoji for skin-tone-modified glyph', async () => {
    const el = makeEl({ name: 'Anna', avatar: '👋🏻' });
    await el.updateComplete;

    const emojiSpan = shadow(el, '.emoji');
    assert.ok(emojiSpan, '.emoji span rendered for modifier sequence');
    assert.equal(emojiSpan!.textContent, '👋🏻');
  });

  it('renders emoji for variation-selector heart', async () => {
    const el = makeEl({ name: 'Anna', avatar: '❤️' });
    await el.updateComplete;

    const emojiSpan = shadow(el, '.emoji');
    assert.ok(emojiSpan, '.emoji span rendered for ❤️ (with VS16)');
    assert.equal(emojiSpan!.textContent, '❤️');
  });

  it('renders emoji for regional-indicator flag', async () => {
    const el = makeEl({ name: 'Anna', avatar: '🇺🇸' });
    await el.updateComplete;

    const emojiSpan = shadow(el, '.emoji');
    assert.ok(emojiSpan, '.emoji span rendered for flag');
    assert.equal(emojiSpan!.textContent, '🇺🇸');
  });

  it('falls back to initial for plain text avatar', async () => {
    const el = makeEl({ name: 'Anna', avatar: 'hello' });
    await el.updateComplete;

    const initialSpan = shadow(el, '.initial');
    assert.ok(initialSpan, '.initial rendered for plain text');
    assert.equal(initialSpan!.textContent, 'A');
  });

  it('has aria-label on the avatar div', async () => {
    const el = makeEl({ name: 'Charlie', avatar: null });
    await el.updateComplete;

    const avatarDiv = shadow(el, '.avatar');
    assert.ok(avatarDiv, '.avatar div present');
    assert.equal((avatarDiv as HTMLElement).getAttribute('aria-label'), "Charlie's avatar");
  });
});

/**
 * `EMOJI_RE` is built at module scope from a string, not written as a regex
 * literal, because a literal is an early error and would take the whole bundle
 * down on an engine that does not know one of the `\p{...}` property names
 * (issue #101 — see the comment on EMOJI_PATTERN_PREFERRED). That safety net is
 * dead weight unless the fallback it falls back *to* is known to behave the
 * same, so exercise both compiled forms against the same corpus.
 */
describe('EMOJI_RE construction', () => {
  const ACCEPTED: [string, string][] = [
    ['single emoji', '🪥'],
    ['ZWJ family', '👨‍👩‍👧'],
    ['skin-tone modifier', '👋🏻'],
    ['heart with VS16', '❤️'],
    ['regional-indicator flag', '🇺🇸'],
    ['dingbat star', '⭐'],
  ];
  const REJECTED: [string, string][] = [
    ['plain ASCII', 'hello'],
    ['empty string', ''],
    ['bare ZWJ', '‍'],
    ['bare VS16', '️'],
    ['emoji with trailing text', '🪥x'],
  ];

  for (const [label, source] of [
    ['preferred (property escapes)', EMOJI_PATTERN_PREFERRED],
    ['fallback (codepoint ranges)', EMOJI_PATTERN_FALLBACK],
  ] as [string, string][]) {
    describe(label, () => {
      const re = buildEmojiRe([source]);
      for (const [name, value] of ACCEPTED) {
        it(`accepts ${name}`, () => assert.equal(re.test(value), true, JSON.stringify(value)));
      }
      for (const [name, value] of REJECTED) {
        it(`rejects ${name}`, () => assert.equal(re.test(value), false, JSON.stringify(value)));
      }
    });
  }

  it('falls through to the next pattern when the engine rejects one', () => {
    // Stands in for an old WebKit that knows \p{...} syntax but not this name.
    const re = buildEmojiRe(['\\p{DefinitelyNotAUnicodeProperty}', EMOJI_PATTERN_FALLBACK]);
    assert.equal(re.test('🪥'), true, 'fell through to the codepoint fallback');
    assert.equal(re.test('hello'), false);
  });

  it('returns a never-matching regex rather than throwing when every pattern fails', () => {
    // The point is that avatars degrade to initials; nothing may propagate out
    // of module scope, where there is no error boundary and no reporter yet.
    const re = buildEmojiRe(['(((', '\\p{AlsoNotReal}']);
    assert.equal(re.test('🪥'), false);
    assert.equal(re.test(''), false);
  });

  it('compiles the preferred pattern on this engine', () => {
    // Guards the ordering: if EMOJI_RE ever silently degraded to the fallback on
    // a modern engine, the tests above would still pass and nobody would notice.
    assert.equal(EMOJI_RE.source, buildEmojiRe([EMOJI_PATTERN_PREFERRED]).source);
  });
});
