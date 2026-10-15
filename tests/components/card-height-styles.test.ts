import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/cards/lucarne-today-card.js');
await import('../../src/cards/lucarne-calendar-card.js');
await import('../../src/cards/lucarne-chores-card.js');
await import('../../src/components/member-column.js');

// jsdom resolves neither the sections grid nor percentage heights, so assert
// against the element's own stylesheet — the last entry, after the shared
// tokens, when `styles` is an array (issue #156).
function styleText(tag: string): string {
  type Sheet = { cssText?: string };
  const ctor = customElements.get(tag) as { styles?: Sheet | Sheet[] } | undefined;
  assert.ok(ctor?.styles, `${tag} is registered with styles`);
  const own = Array.isArray(ctor.styles) ? ctor.styles.at(-1) : ctor.styles;
  return (own?.cssText ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Body of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `has a "${selector}" rule`);
  return m[1];
}

const CARDS = ['lucarne-today-card', 'lucarne-calendar-card', 'lucarne-chores-card'];
const MIN_ROWS: Record<string, number> = {
  'lucarne-today-card': 3,
  'lucarne-calendar-card': 4,
  'lucarne-chores-card': 7,
};

for (const tag of CARDS) {
  describe(`${tag} — card height`, () => {
    // A block host breaks the percentage chain from HA's grid cell to ha-card,
    // so both must say 100%: a fixed row count then fills the cell, and at Auto
    // height 100% resolves to auto, sizing the card to its content.
    it('fills the grid cell unconditionally', () => {
      const css = styleText(tag);
      assert.match(rule(css, ':host'), /(?:^|[^-])height:\s*100%/);
      assert.match(rule(css, 'ha-card'), /(?:^|[^-])height:\s*100%/);
    });

    it('never sizes to the viewport outside fill-viewport', () => {
      const css = styleText(tag);
      const users = css.match(/[^{}]+\{[^}]*height:\s*var\(--lucarne-card-fill-height\)[^}]*\}/g) ?? [];
      for (const r of users) {
        assert.match(r.trim(), /^:host\(\[fill-viewport\]\)\s+ha-card\s*\{/);
      }
    });

    // HA clamps a YAML row count to max_rows, and max_rows cannot raise the
    // Layout tab slider past its fixed 8 rows anyway.
    it('leaves max_rows unset so a YAML row count is not capped', () => {
      const el = document.createElement(tag) as HTMLElement & {
        getGridOptions(): { max_rows?: number };
      };
      assert.equal(el.getGridOptions().max_rows, undefined);
    });

    // HA clamps a fixed row count up to min_rows, so the card is never too
    // short to show its content without scrolling the whole card.
    it('sets min_rows', () => {
      const el = document.createElement(tag) as HTMLElement & {
        getGridOptions(): { min_rows?: number };
      };
      assert.equal(el.getGridOptions().min_rows, MIN_ROWS[tag]);
    });
  });
}

for (const tag of ['lucarne-today-card', 'lucarne-calendar-card']) {
  describe(`${tag} — fill_viewport`, () => {
    it('fills the viewport, capped by a fixed-height cell', () => {
      const body = rule(styleText(tag), ':host([fill-viewport]) ha-card');
      assert.match(body, /(?:^|[^-])height:\s*var\(--lucarne-card-fill-height\)/);
      assert.match(body, /max-height:\s*100%/);
    });
  });
}

describe('lucarne-chores-card — member grid', () => {
  it('shrinks into a fixed-height cell and scrolls', () => {
    // Without this ha-card's overflow: hidden clips the columns instead.
    const body = rule(styleText('lucarne-chores-card'), '.members-grid');
    assert.match(body, /flex:\s*1 1 auto/);
    assert.match(body, /min-height:\s*0/);
    assert.match(body, /overflow-y:\s*auto/);
  });
});

describe('lucarne-member-column — task list', () => {
  // Auto height shows every task; a fixed-height cell shrinks the list and it
  // scrolls, but never to nothing (issue #156).
  it('has no height cap, a floor, and scrolls', () => {
    const body = rule(styleText('lucarne-member-column'), '.lists');
    assert.doesNotMatch(body, /max-height/);
    assert.match(body, /min-height:\s*[1-9]\d*px/);
    assert.match(body, /overflow-y:\s*auto/);
  });
});
