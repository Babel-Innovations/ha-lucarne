import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneChoresCardEditor } from '../../src/editors/lucarne-chores-card-editor.js';
import type { HomeAssistant } from '../../src/shared/types.js';
import type { LucarneChoresCardConfig } from '../../src/cards/lucarne-chores-card.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

await import('../../src/editors/lucarne-chores-card-editor.js');

const GET_FAMILY_RESPONSE = {
  members: [
    {
      slug: 'anna',
      name: 'Anna',
      color: '#f5c89c',
      avatar: null,
      todo_entity_id: 'todo.anna',
      streak_counter_id: 'counter.anna_streak',
    },
    {
      slug: 'bob',
      name: 'Bob',
      color: '#b8e0d2',
      avatar: null,
      todo_entity_id: 'todo.bob',
      streak_counter_id: 'counter.bob_streak',
    },
  ],
  task_metadata: [],
  reset_time: '03:00',
  streak_check_time: '02:00',
  household_entity_id: 'todo.lucarne_household',
};

function makeFakeHassWithMembers() {
  const base = makeFakeHass();
  const conn = {
    ...base.connection,
    async sendMessagePromise(payload: Record<string, unknown>) {
      if (payload['type'] === 'lucarne_family/get_family') {
        return GET_FAMILY_RESPONSE;
      }
      return { response: {} };
    },
  };
  return { ...base, connection: conn };
}

async function makeEl(
  config: Partial<LucarneChoresCardConfig> = {},
): Promise<LucarneChoresCardEditor> {
  const el = document.createElement('lucarne-chores-card-editor') as LucarneChoresCardEditor;
  el.setConfig({ type: 'custom:lucarne-chores-card', members: [], ...config });
  el.hass = makeFakeHassWithMembers() as unknown as HomeAssistant;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 50));
  await el.updateComplete;
  // Members render inside the nested <lucarne-reorder-list>; await it too.
  const list = el.shadowRoot!.querySelector('lucarne-reorder-list') as
    | (HTMLElement & { updateComplete: Promise<unknown> })
    | null;
  if (list) await list.updateComplete;
  return el;
}

function shadow(el: LucarneChoresCardEditor, sel: string) {
  return el.shadowRoot?.querySelector(sel) ?? null;
}

/** Shadow root of the nested reorder-list, where member rows live. */
function listShadow(el: LucarneChoresCardEditor): ShadowRoot {
  return el.shadowRoot!.querySelector('lucarne-reorder-list')!.shadowRoot!;
}

function rowSlugs(el: LucarneChoresCardEditor): (string | null)[] {
  return Array.from(listShadow(el).querySelectorAll('.reorder-row')).map((r) =>
    r.getAttribute('data-key'),
  );
}

/** The draggable reorder row (carries grab handle + ↑/↓) for a member. */
function reorderRow(el: LucarneChoresCardEditor, slug: string): HTMLElement {
  return listShadow(el).querySelector(`.reorder-row[data-key="${slug}"]`) as HTMLElement;
}

/**
 * The member content cell (avatar, name, eye, pencil) for a member. It is
 * slotted light DOM, so it lives in the editor's own shadow root, not the
 * reorder-list's.
 */
function content(el: LucarneChoresCardEditor, slug: string): HTMLElement {
  return el.shadowRoot!.querySelector(`.member-content[data-slug="${slug}"]`) as HTMLElement;
}

function lastConfig(events: CustomEvent[]): LucarneChoresCardConfig {
  return events[events.length - 1].detail.config as LucarneChoresCardConfig;
}

afterEach(() => {
  document.querySelectorAll('lucarne-chores-card-editor').forEach((el) => el.remove());
});

describe('lucarne-chores-card-editor', () => {
  it('renders General, Members, Display sections', async () => {
    const el = await makeEl();
    const labels = Array.from(el.shadowRoot!.querySelectorAll('.section-label')).map(
      (l) => l.textContent?.trim().toLowerCase(),
    );
    assert.ok(labels.some((l) => l?.includes('general')), 'General section');
    assert.ok(labels.some((l) => l?.includes('member')), 'Members section');
    assert.ok(labels.some((l) => l?.includes('display')), 'Display section');
  });

  it('fires config-changed when title changes', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const titleInput = shadow(el, '#ed-title') as HTMLInputElement;
    titleInput.value = 'My Chores';
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events.length, 1);
    assert.equal(events[0].detail.config.title, 'My Chores');
  });

  it('clears title when input emptied', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const titleInput = shadow(el, '#ed-title') as HTMLInputElement;
    titleInput.value = '';
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events.length, 1);
    assert.equal(events[0].detail.config.title, undefined, 'title cleared when empty');
  });

  // --- Unified members list (shared <lucarne-reorder-list>) ---

  it('renders every family member (incl. household) as one row', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] });
    assert.deepEqual(rowSlugs(el), ['anna', 'bob', 'household']);
  });

  it('places configured members first, then unplaced ones', async () => {
    const el = await makeEl({ members: ['bob'] });
    assert.deepEqual(rowSlugs(el), ['bob', 'anna', 'household']);
  });

  it('every row is draggable with a grab handle (from the shared control)', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] });
    const rows = Array.from(listShadow(el).querySelectorAll('.reorder-row')) as HTMLElement[];
    assert.equal(rows.length, 3);
    rows.forEach((r) => {
      assert.equal(r.getAttribute('draggable'), 'true', 'row draggable');
      assert.ok(r.querySelector('.grab-handle'), 'row has grab handle');
    });
  });

  it('shows an eye-outline for visible members and eye-off for hidden', async () => {
    const el = await makeEl({ members: ['anna'] });
    const annaIcon = content(el, 'anna').querySelector('.visibility-btn ha-icon');
    const houseIcon = content(el, 'household').querySelector('.visibility-btn ha-icon');
    assert.equal(annaIcon?.getAttribute('icon'), 'mdi:eye-outline', 'visible → eye-outline');
    assert.equal(houseIcon?.getAttribute('icon'), 'mdi:eye-off-outline', 'hidden → eye-off-outline');
  });

  it('eye toggle hides a visible member but keeps its slot in members order', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] });
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    (content(el, 'anna').querySelector('.visibility-btn') as HTMLButtonElement).click();

    const cfg = lastConfig(events);
    assert.deepEqual(cfg.members, ['anna', 'bob', 'household'], 'anna keeps slot 0');
    assert.ok(cfg.hidden_members?.includes('anna'), 'anna now hidden');
  });

  it('eye toggle shows a hidden member', async () => {
    const el = await makeEl({ members: [] }); // all hidden by default
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    (content(el, 'anna').querySelector('.visibility-btn') as HTMLButtonElement).click();

    const cfg = lastConfig(events);
    assert.ok(cfg.members.includes('anna'), 'anna placed');
    assert.ok(!(cfg.hidden_members ?? []).includes('anna'), 'anna no longer hidden');
  });

  it('omits hidden_members from config when nothing is left hidden', async () => {
    const el = await makeEl({ members: ['anna', 'bob', 'household'], hidden_members: ['anna'] });
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    (content(el, 'anna').querySelector('.visibility-btn') as HTMLButtonElement).click();

    assert.equal(lastConfig(events).hidden_members, undefined, 'hidden_members dropped when empty');
  });

  it('reorders members via drag-and-drop, preserving hidden state', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] }); // household hidden by default
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: () => {}, getData: () => '2' };
    // Drag household (index 2, hidden) up to index 0
    reorderRow(el, 'household').dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dataTransfer as unknown as DataTransfer }),
    );
    reorderRow(el, 'anna').dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dataTransfer as unknown as DataTransfer }),
    );
    reorderRow(el, 'anna').dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dataTransfer as unknown as DataTransfer }),
    );

    const cfg = lastConfig(events);
    assert.deepEqual(cfg.members, ['household', 'anna', 'bob'], 'household moved to front');
    assert.ok(cfg.hidden_members?.includes('household'), 'household still hidden at its new slot');
  });

  it('move-down reorders the unified list', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] });
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    (reorderRow(el, 'anna').querySelector('.move-down-btn') as HTMLButtonElement).click();

    assert.deepEqual(lastConfig(events).members, ['bob', 'anna', 'household']);
  });

  it('move-up reorders the unified list', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] });
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    (reorderRow(el, 'bob').querySelector('.move-up-btn') as HTMLButtonElement).click();

    assert.deepEqual(lastConfig(events).members, ['bob', 'anna', 'household']);
  });

  it('disables move-up on the first row and move-down on the last', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] }); // [anna, bob, household]
    const firstUp = reorderRow(el, 'anna').querySelector('.move-up-btn') as HTMLButtonElement;
    const lastDown = reorderRow(el, 'household').querySelector('.move-down-btn') as HTMLButtonElement;
    assert.equal(firstUp.disabled, true, 'first row up disabled');
    assert.equal(lastDown.disabled, true, 'last row down disabled');
  });

  it('shows a pencil (edit avatar) for members but not household', async () => {
    const el = await makeEl({ members: ['anna', 'bob'] });
    assert.ok(content(el, 'anna').querySelector('.change-avatar-btn'), 'anna has pencil');
    assert.equal(content(el, 'household').querySelector('.change-avatar-btn'), null, 'household has no pencil');
    const pencil = content(el, 'anna').querySelector('.change-avatar-btn ha-icon');
    assert.equal(pencil?.getAttribute('icon'), 'mdi:pencil-outline', 'uses mdi:pencil-outline');
  });

  it('opens the avatar modal when the pencil is clicked', async () => {
    const el = await makeEl({ members: ['anna'] });
    (content(el, 'anna').querySelector('.change-avatar-btn') as HTMLButtonElement).click();
    await el.updateComplete;
    assert.ok(shadow(el, 'lucarne-avatar-upload-modal'), 'avatar modal shown');
  });

  // --- Display toggles ---

  it('fires config-changed when show_routines toggled off', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const toggle = shadow(el, '#ed-show_routines') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events[0].detail.config.show_routines, false);
  });

  it('fires config-changed when show_tasks toggled off', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const toggle = shadow(el, '#ed-show_tasks') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events[0].detail.config.show_tasks, false);
  });

  it('fires config-changed when show_streak toggled off', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const toggle = shadow(el, '#ed-show_streak') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events[0].detail.config.show_streak, false);
  });

  it('fires config-changed when hide_names toggled on (defaults unchecked)', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const toggle = shadow(el, '#ed-hide_names') as HTMLInputElement;
    assert.equal(toggle.checked, false, 'hide_names unchecked by default');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events[0].detail.config.hide_names, true);
  });

  // --- Auto-scroll section (issue #68) ---

  it('renders an Auto-scroll section with time pickers defaulting to 12:00 / 19:00', async () => {
    const el = await makeEl();
    const labels = Array.from(el.shadowRoot!.querySelectorAll('.section-label')).map(
      (l) => l.textContent?.trim().toLowerCase(),
    );
    assert.ok(labels.some((l) => l?.includes('auto-scroll')), 'Auto-scroll section');

    const toggle = shadow(el, '#ed-auto_scroll') as HTMLInputElement;
    assert.equal(toggle.checked, true, 'auto_scroll on by default');
    const afternoon = shadow(el, '#ed-afternoon_start') as HTMLInputElement;
    const night = shadow(el, '#ed-night_start') as HTMLInputElement;
    assert.equal(afternoon.value, '12:00', 'afternoon default 12:00');
    assert.equal(night.value, '19:00', 'night default 19:00');
  });

  it('fires config-changed when auto_scroll toggled off', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const toggle = shadow(el, '#ed-auto_scroll') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events[0].detail.config.auto_scroll, false);
  });

  it('fires config-changed when afternoon_start changes', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const afternoon = shadow(el, '#ed-afternoon_start') as HTMLInputElement;
    afternoon.value = '13:30';
    afternoon.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events[0].detail.config.afternoon_start, '13:30');
  });

  it('fires config-changed when night_start changes', async () => {
    const el = await makeEl();
    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const night = shadow(el, '#ed-night_start') as HTMLInputElement;
    night.value = '20:15';
    night.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(events[0].detail.config.night_start, '20:15');
  });

  it('disables the time pickers when auto_scroll is off', async () => {
    const el = await makeEl({ auto_scroll: false });
    const afternoon = shadow(el, '#ed-afternoon_start') as HTMLInputElement;
    const night = shadow(el, '#ed-night_start') as HTMLInputElement;
    assert.equal(afternoon.disabled, true, 'afternoon picker disabled');
    assert.equal(night.disabled, true, 'night picker disabled');
  });

  it('renders checkboxes that do not rely on the native (OS color-scheme) appearance', async () => {
    const el = await makeEl();
    const styleText = (el.constructor as unknown as { styles: { cssText: string }[] }).styles;
    const allCss = styleText.map((s) => s.cssText).join('\n');
    assert.match(allCss, /input\[type='checkbox'\][^}]*appearance:\s*none/, 'native appearance removed');
    assert.match(allCss, /:checked[^}]*var\(--primary-color/, 'checked state uses accent color');
  });

  it('pins the time picker to the theme instead of the OS color-scheme', async () => {
    const el = await makeEl();
    const styleText = (el.constructor as unknown as { styles: { cssText: string }[] }).styles;
    const allCss = styleText.map((s) => s.cssText).join('\n');
    const timeRule = allCss.match(/input\[type='time'\]\s*\{[^}]*\}/)?.[0] ?? '';
    assert.match(timeRule, /color-scheme:\s*light/, 'forces light color-scheme (not OS dark)');
    assert.match(timeRule, /background:[^;]*--lucarne-surface/, 'background from theme surface token');
    assert.match(timeRule, /color:[^;]*--lucarne-on-surface/, 'text color from theme token');
  });

  // --- Error + legacy handling ---

  it('shows integration error placeholder when integration not installed', async () => {
    const el = document.createElement('lucarne-chores-card-editor') as LucarneChoresCardEditor;
    el.setConfig({ type: 'custom:lucarne-chores-card', members: [] });

    const base = makeFakeHass();
    const conn = {
      ...base.connection,
      async sendMessagePromise(payload: Record<string, unknown>) {
        if (payload['type'] === 'lucarne_family/get_family') {
          throw new Error('Unknown command');
        }
        return undefined;
      },
    };
    el.hass = { ...base, connection: conn } as unknown as HomeAssistant;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const errorBlock = el.shadowRoot?.querySelector('.error-block');
    assert.ok(errorBlock, 'error block shown');
    assert.ok(
      errorBlock!.textContent!.toLowerCase().includes('install') ||
        errorBlock!.textContent!.toLowerCase().includes('lucarne'),
      'error mentions install or lucarne',
    );

    el.remove();
  });

  it('legacy kids config: emitting config-changed always includes members array', async () => {
    const el = document.createElement('lucarne-chores-card-editor') as LucarneChoresCardEditor;
    el.setConfig({ type: 'custom:lucarne-chores-card', members: [] } as unknown as Parameters<LucarneChoresCardEditor['setConfig']>[0]);
    Object.assign(el as unknown as Record<string, unknown>, {
      _config: { type: 'custom:lucarne-chores-card', kids: [{ name: 'Alice' }], title: 'Chores' },
    });

    const events: CustomEvent[] = [];
    el.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    (el as unknown as { _fire: (c: unknown) => void })._fire({
      type: 'custom:lucarne-chores-card',
      kids: [{ name: 'Alice' }],
      title: 'New Title',
    });

    assert.equal(events.length, 1);
    const emitted = events[0].detail.config;
    assert.ok(Array.isArray(emitted.members), 'members array always present');
    assert.ok(!('kids' in emitted), 'kids stripped from emitted config');
    assert.equal(emitted.title, 'New Title');
  });
});
