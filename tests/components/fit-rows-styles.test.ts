import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

await import('../../src/cards/lucarne-today-card.js');
await import('../../src/cards/lucarne-calendar-card.js');
await import('../../src/cards/lucarne-chores-card.js');

// jsdom resolves neither the sections grid nor percentage heights, so assert
// against the static styles: under fit-rows each card fills HA's fixed-height
// cell (issue #156) rather than the viewport-derived --lucarne-card-fill-height.
function styleText(tag: string): string {
  const ctor = customElements.get(tag) as { styles?: Array<{ cssText?: string }> } | undefined;
  assert.ok(ctor, `${tag} is registered`);
  return (ctor.styles ?? []).map((s) => s.cssText ?? '').join('\n');
}

for (const tag of ['lucarne-today-card', 'lucarne-calendar-card', 'lucarne-chores-card']) {
  describe(`${tag} — fit-rows`, () => {
    it('fills the host and ha-card to the grid cell', () => {
      const css = styleText(tag);
      assert.match(css, /:host\(\[fit-rows\]\)\s*\{[^}]*[^-]height:\s*100%/);
      assert.match(css, /:host\(\[fit-rows\]\)\s+ha-card\s*\{[^}]*[^-]height:\s*100%/);
    });
  });
}

describe('lucarne-chores-card — fit-rows scrolling', () => {
  it('lets the member grid shrink into the cell and scroll', () => {
    // Without this rule ha-card's overflow: hidden clips the columns instead.
    assert.match(
      styleText('lucarne-chores-card'),
      /:host\(\[fit-rows\]\)\s+\.members-grid\s*\{(?=[^}]*min-height:\s*0)(?=[^}]*overflow-y:\s*auto)[^}]*\}/,
    );
  });
});

// Auto height must size to content, not to the viewport: only the opt-in
// fill-viewport attribute may use --lucarne-card-fill-height (issue #156).
for (const tag of ['lucarne-today-card', 'lucarne-calendar-card']) {
  describe(`${tag} — auto height`, () => {
    it('applies the viewport height only under fill-viewport', () => {
      const css = styleText(tag).replace(/\/\*[\s\S]*?\*\//g, '');
      const rules = css.match(/[^{}]+\{[^}]*--lucarne-card-fill-height[^}]*\}/g) ?? [];
      const users = rules.filter((r) => /height:\s*var\(--lucarne-card-fill-height\)/.test(r));
      assert.ok(users.length > 0, 'some rule applies the viewport height');
      for (const rule of users) {
        assert.match(rule.trim(), /^:host\(\[fill-viewport\]\)\s+ha-card\s*\{/);
      }
    });
  });
}
