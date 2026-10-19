import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneRewardsAdminCard } from '../../src/cards/lucarne-rewards-admin-card.js';
import { LucarneConfigError } from '../../src/shared/card-base.js';
import type { GetRewardsResponse, HomeAssistant, MemberSummary } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

await import('../../src/cards/lucarne-rewards-admin-card.js');
await import('../../src/editors/lucarne-rewards-admin-card-editor.js');

const ANNA: MemberSummary = {
  slug: 'anna', name: 'Anna', color: '#f5c89c', avatar: null,
  todo_entity_id: 'todo.anna', streak_counter_id: 'counter.anna_streak',
};
const BOB: MemberSummary = {
  slug: 'bob', name: 'Bob', color: '#b8e0d2', avatar: null,
  todo_entity_id: 'todo.bob', streak_counter_id: 'counter.bob_streak',
};

const CLAIM = {
  id: 7, reward_id: 1, reward_name: 'Movie night', cost: 10, claimer_slug: 'anna',
  status: 'pending' as const, created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  resolved_at: null,
  contributors: [{ member_slug: 'anna', share: 6 }, { member_slug: 'bob', share: 4 }],
};

function rewardsPayload(over: Partial<GetRewardsResponse> = {}): GetRewardsResponse {
  return {
    is_admin: true,
    balances: { anna: 4, bob: -3 },
    rewards: [{ id: 1, name: 'Movie night', cost: 10, description: '', poolable: true, archived: false }],
    claims: [CLAIM],
    settings: { streak_daily_bonus: 0, streak_milestones: [] },
    history: [],
    ...over,
  };
}

interface Opts {
  rewards?: GetRewardsResponse | null;
  serviceError?: unknown;
  serviceResponse?: (service: string) => unknown;
}

function makeHass(opts: Opts = {}) {
  const base = makeFakeHass();
  const hass = {
    ...base,
    connection: {
      ...base.connection,
      async sendMessagePromise(payload: Record<string, unknown>) {
        if (payload['type'] === 'lucarne_family/get_family') {
          return {
            members: [ANNA, BOB], task_metadata: [], reset_time: '04:00',
            streak_check_time: '21:00', household_entity_id: 'todo.lucarne_household',
          };
        }
        if (payload['type'] === 'lucarne_family/get_rewards') {
          if (opts.rewards === null) throw new Error('Unknown command');
          return opts.rewards ?? rewardsPayload();
        }
        if (payload['type'] === 'call_service') return { response: { items: [] } };
        return undefined;
      },
    },
    async callService(domain: string, service: string, payload: unknown, target: unknown) {
      base.calls.callService.push({ domain, service, payload, target });
      if (opts.serviceError !== undefined) throw opts.serviceError;
      return opts.serviceResponse ? { context: {}, response: opts.serviceResponse(service) } : undefined;
    },
  };
  return hass;
}

async function makeCard(
  opts: Opts = {},
  config: Record<string, unknown> = {},
): Promise<{ el: LucarneRewardsAdminCard; hass: ReturnType<typeof makeHass> }> {
  const hass = makeHass(opts);
  const el = document.createElement('lucarne-rewards-admin-card') as LucarneRewardsAdminCard;
  el.setConfig({ type: 'custom:lucarne-rewards-admin-card', ...config });
  el.hass = hass as unknown as HomeAssistant;
  document.body.appendChild(el);
  await settle(el);
  return { el, hass };
}

async function settle(el: LucarneRewardsAdminCard) {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 30));
    await el.updateComplete;
  }
}

/** The active tab element inside the panel. */
function activeTab(el: LucarneRewardsAdminCard): HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } {
  return el.shadowRoot!.querySelector('[role=tabpanel]')!.firstElementChild as never;
}

async function selectTab(el: LucarneRewardsAdminCard, id: string) {
  (el.shadowRoot!.querySelector(`#tab-${id}`) as HTMLElement).click();
  await el.updateComplete;
  await activeTab(el).updateComplete;
}

afterEach(() => {
  document.querySelectorAll('lucarne-rewards-admin-card').forEach((el) => el.remove());
});

describe('lucarne-rewards-admin-card shell', () => {
  it('rejects a history_limit outside 1-500', () => {
    const el = document.createElement('lucarne-rewards-admin-card') as LucarneRewardsAdminCard;
    for (const bad of [0, 501, 1.5, '5']) {
      assert.throws(
        () => el.setConfig({ type: 'custom:lucarne-rewards-admin-card', history_limit: bad as number }),
        LucarneConfigError,
      );
    }
    assert.doesNotThrow(() => el.setConfig({ type: 'custom:lucarne-rewards-admin-card', history_limit: 500 }));
  });

  it('requests history with the configured limit, defaulting to 200', async () => {
    const seen: Record<string, unknown>[] = [];
    const hass = makeHass();
    const orig = hass.connection.sendMessagePromise;
    hass.connection.sendMessagePromise = async (p: Record<string, unknown>) => {
      seen.push(p);
      return orig(p);
    };
    const el = document.createElement('lucarne-rewards-admin-card') as LucarneRewardsAdminCard;
    el.setConfig({ type: 'custom:lucarne-rewards-admin-card' });
    el.hass = hass as unknown as HomeAssistant;
    document.body.appendChild(el);
    await settle(el);
    const msg = seen.find((m) => m['type'] === 'lucarne_family/get_rewards')!;
    assert.equal(msg['history_limit'], 200);
    assert.equal(msg['include_archived'], true);
  });

  it('renders five ordered tabs with the pending count on Claims', async () => {
    const { el } = await makeCard();
    const tabs = [...el.shadowRoot!.querySelectorAll('[role=tab]')];
    assert.deepEqual(
      tabs.map((t) => t.textContent!.trim()),
      ['Claims (1)', 'Points', 'Rewards', 'History', 'Settings'],
    );
    assert.equal(el.shadowRoot!.querySelector('[role=tablist]')!.getAttribute('role'), 'tablist');
    for (const t of tabs) {
      assert.ok(t.getAttribute('aria-controls'));
      assert.ok(t.getAttribute('aria-selected'));
    }
    assert.ok(el.shadowRoot!.querySelector('[role=tabpanel]'));
  });

  it('drops the count from Claims when nothing is pending', async () => {
    const { el } = await makeCard({ rewards: rewardsPayload({ claims: [] }) });
    assert.equal(el.shadowRoot!.querySelector('#tab-claims')!.textContent!.trim(), 'Claims');
  });

  it('arrow keys move aria-selected between tabs', async () => {
    const { el } = await makeCard();
    const list = el.shadowRoot!.querySelector('[role=tablist]')!;
    const selected = () =>
      [...el.shadowRoot!.querySelectorAll('[role=tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true');
    assert.equal(selected(), 0);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await el.updateComplete;
    assert.equal(selected(), 1);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await el.updateComplete;
    assert.equal(selected(), 4, 'wraps from the first to the last tab');
  });

  it('shows the update message when the integration lacks get_rewards', async () => {
    const { el } = await makeCard({ rewards: null });
    assert.match(el.shadowRoot!.textContent!, /Rewards need the Lucarne integration to be updated\./);
    assert.equal(el.shadowRoot!.querySelector('[role=tab]'), null);
  });

  it('non-admin sees the note and no buttons in any tab panel', async () => {
    const { el } = await makeCard({ rewards: rewardsPayload({ is_admin: false }) });
    assert.ok(el.shadowRoot!.querySelector('[role=note]'));
    for (const id of ['claims', 'points', 'rewards', 'history', 'settings']) {
      await selectTab(el, id);
      const tab = activeTab(el);
      assert.equal(tab.shadowRoot.querySelectorAll('button').length, 0, `${id}: no buttons`);
      assert.equal(tab.shadowRoot.querySelectorAll('textarea').length, 0, `${id}: no textareas`);
      // The Show archived toggle is view-only, so it is the one input allowed.
      assert.equal(tab.shadowRoot.querySelectorAll('input:not(.show-archived)').length, 0, `${id}: no inputs`);
    }
  });

  it('admin sees no read-only note', async () => {
    const { el } = await makeCard();
    assert.equal(el.shadowRoot!.querySelector('[role=note]'), null);
  });
});

describe('claims tab', () => {
  const rowCount = (el: LucarneRewardsAdminCard) => activeTab(el).shadowRoot.querySelectorAll('.row').length;

  it('Approve calls approve_claim and the row disappears immediately', async () => {
    const { el, hass } = await makeCard();
    assert.equal(rowCount(el), 1);
    const tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.approve') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 30));
    await el.updateComplete;
    await activeTab(el).updateComplete;
    const call = hass.calls.callService.find((c: any) => c.service === 'approve_claim') as any;
    assert.deepEqual([call.domain, call.payload], ['lucarne_family', { claim_id: 7 }]);
    assert.equal(rowCount(el), 0);
    assert.match(activeTab(el).shadowRoot.textContent!, /No claims waiting\./);
  });

  it('a rejecting service shows an alert and keeps the row', async () => {
    const { el } = await makeCard({ serviceError: { code: 'service_validation_error', message: 'This claim was already approved' } });
    const tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.reject') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 30));
    await tab.updateComplete;
    assert.equal(tab.shadowRoot.querySelector('[role=alert]')!.textContent, 'This claim was already approved');
    assert.equal(rowCount(el), 1);
    assert.equal((tab.shadowRoot.querySelector('button.approve') as HTMLButtonElement).disabled, false, 'busy flag cleared');
  });

  it('lists pooled contributors with their shares', async () => {
    const { el } = await makeCard();
    const text = activeTab(el).shadowRoot.textContent!.replace(/\s+/g, ' ');
    assert.match(text, /Movie night/);
    assert.match(text, /10 points/);
    assert.match(text, /Anna \(6 points\)/);
    assert.match(text, /Bob \(4 points\)/);
  });

  it('a solo claim shows the claimer without a share', async () => {
    const solo = { ...CLAIM, cost: 1, contributors: [{ member_slug: 'anna', share: 1 }] };
    const { el } = await makeCard({ rewards: rewardsPayload({ claims: [solo] }) });
    const line = activeTab(el).shadowRoot.querySelector('.claim-line')!;
    assert.equal(line.querySelector('.chip')!.textContent!.trim(), 'Anna');
    assert.match(line.textContent!.replace(/\s+/g, ' '), /1 point ·/);
  });
});

describe('points tab', () => {
  it('shows balances with a real minus sign', async () => {
    const { el } = await makeCard();
    await selectTab(el, 'points');
    const text = activeTab(el).shadowRoot.textContent!;
    assert.match(text, /−3/);
  });

  async function openGrant(el: LucarneRewardsAdminCard, slug: string) {
    await selectTab(el, 'points');
    const tab = activeTab(el);
    assert.equal(tab.shadowRoot.querySelector('[role=dialog]'), null, 'no dialog until Grant is pressed');
    (tab.shadowRoot.querySelector(`[data-member=${slug}] button.grant`) as HTMLButtonElement).click();
    await tab.updateComplete;
    const dialog = tab.shadowRoot.querySelector('[role=dialog]') as HTMLElement;
    assert.ok(dialog);
    return { tab, dialog };
  }

  function fill(dialog: HTMLElement, selector: string, value: string) {
    const input = dialog.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('Grant opens a dialog for that member; granting updates the balance and closes it', async () => {
    const { el, hass } = await makeCard();
    const { tab, dialog } = await openGrant(el, 'anna');
    assert.match(dialog.textContent!, /Grant points to Anna/);
    fill(dialog, '.grant-points', '5');
    fill(dialog, '.grant-reason', 'Helped out');
    await tab.updateComplete;
    (tab.shadowRoot.querySelector('button.confirm-grant') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 30));
    await el.updateComplete;
    await activeTab(el).updateComplete;
    const call = hass.calls.callService.find((c: any) => c.service === 'grant_points') as any;
    assert.deepEqual(call.payload, { member: 'anna', points: 5, reason: 'Helped out' });
    const root = activeTab(el).shadowRoot;
    assert.equal(root.querySelector('[data-member=anna] .balance')!.textContent!.trim(), '9');
    assert.equal(root.querySelector('[role=dialog]'), null);
  });

  it('rejects out-of-range points client-side with no service call', async () => {
    const { el, hass } = await makeCard();
    const { tab, dialog } = await openGrant(el, 'anna');
    fill(dialog, '.grant-points', '10001');
    await tab.updateComplete;
    (tab.shadowRoot.querySelector('button.confirm-grant') as HTMLButtonElement).click();
    await tab.updateComplete;
    assert.equal(hass.calls.callService.length, 0);
    assert.match(tab.shadowRoot.querySelector('[role=alert]')!.textContent!, /1 to 10000/);
  });

  it('after a failed grant the dialog keeps focus, so Escape still closes it', async () => {
    const { el } = await makeCard({ serviceError: { code: 'service_validation_error', message: 'Nope' } });
    const { tab, dialog } = await openGrant(el, 'anna');
    fill(dialog, '.grant-points', '5');
    await tab.updateComplete;
    (tab.shadowRoot.querySelector('button.confirm-grant') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 30));
    await tab.updateComplete;
    assert.equal(tab.shadowRoot.querySelector('[role=alert]')!.textContent, 'Nope');
    // A browser drops focus to <body> when the busy flag disables the focused button;
    // the test DOM does not, so drop it by hand and let the next render recover it.
    (tab.shadowRoot.activeElement as HTMLElement | null)?.blur();
    tab.requestUpdate();
    await tab.updateComplete;
    const focused = tab.shadowRoot.activeElement as HTMLElement;
    assert.ok(focused && tab.shadowRoot.querySelector('.dialog')!.contains(focused), 'focus is inside the dialog');
    focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await tab.updateComplete;
    assert.equal(tab.shadowRoot.querySelector('[role=dialog]'), null);
    assert.equal(tab.shadowRoot.activeElement, tab.shadowRoot.querySelector('[data-member=anna] button.grant'), 'focus returns to Grant');
  });

  it('Tab from the last dialog button wraps to the points field', async () => {
    const { el } = await makeCard();
    const { tab } = await openGrant(el, 'anna');
    const last = tab.shadowRoot.querySelector('button.confirm-grant') as HTMLButtonElement;
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true }));
    assert.equal(tab.shadowRoot.activeElement, tab.shadowRoot.querySelector('.grant-points'));
  });

  it('Cancel and Escape close the dialog without granting', async () => {
    const { el, hass } = await makeCard();
    const { tab } = await openGrant(el, 'bob');
    (tab.shadowRoot.querySelector('button.cancel') as HTMLButtonElement).click();
    await tab.updateComplete;
    assert.equal(tab.shadowRoot.querySelector('[role=dialog]'), null);
    (tab.shadowRoot.querySelector('[data-member=bob] button.grant') as HTMLButtonElement).click();
    await tab.updateComplete;
    tab.shadowRoot.querySelector('.grant-points')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await tab.updateComplete;
    assert.equal(tab.shadowRoot.querySelector('[role=dialog]'), null);
    assert.equal(hass.calls.callService.length, 0);
  });
});

describe('rewards (catalog) tab', () => {
  async function openCatalog(opts: Opts = {}) {
    const made = await makeCard(opts);
    await selectTab(made.el, 'rewards');
    return made;
  }

  async function flushTab(el: LucarneRewardsAdminCard) {
    await new Promise((r) => setTimeout(r, 30));
    await el.updateComplete;
    await activeTab(el).updateComplete;
  }

  function fill(root: ParentNode, sel: string, value: string) {
    const input = root.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('creating a reward shows it at once, using the id the service returns', async () => {
    const { el, hass } = await openCatalog({ serviceResponse: () => ({ id: 42 }) });
    let tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.add') as HTMLButtonElement).click();
    await tab.updateComplete;
    fill(tab.shadowRoot, '.reward-name', '  Ice cream ');
    fill(tab.shadowRoot, '.reward-cost', '3');
    fill(tab.shadowRoot, '.reward-description', 'One scoop');
    (tab.shadowRoot.querySelector('.reward-poolable') as HTMLInputElement).click();
    await tab.updateComplete;
    (tab.shadowRoot.querySelector('button.save') as HTMLButtonElement).click();
    await flushTab(el);
    const call = hass.calls.callService.find((c: any) => c.service === 'create_reward') as any;
    assert.deepEqual(call.payload, { name: 'Ice cream', cost: 3, description: 'One scoop', poolable: true });
    tab = activeTab(el);
    const row = tab.shadowRoot.querySelector('[data-reward="42"]')!;
    assert.ok(row, 'new reward listed immediately');
    assert.match(row.textContent!, /Ice cream/);
    assert.match(row.textContent!, /Shareable/);
  });

  it('a blank name shows an inline error and makes no service call', async () => {
    const { el, hass } = await openCatalog();
    const tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.add') as HTMLButtonElement).click();
    await tab.updateComplete;
    fill(tab.shadowRoot, '.reward-name', '  ');
    fill(tab.shadowRoot, '.reward-cost', '3');
    (tab.shadowRoot.querySelector('button.save') as HTMLButtonElement).click();
    await tab.updateComplete;
    assert.equal(hass.calls.callService.length, 0);
    assert.match(tab.shadowRoot.querySelector('[role=alert]')!.textContent!, /Name is required/);
  });

  it('archiving needs the second click, and the reward then leaves the active list', async () => {
    const { el, hass } = await openCatalog();
    const tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.archive') as HTMLButtonElement).click();
    await tab.updateComplete;
    assert.equal(hass.calls.callService.length, 0, 'first click only asks');
    assert.match(tab.shadowRoot.textContent!, /Archive\?/);
    (tab.shadowRoot.querySelector('button.confirm-archive') as HTMLButtonElement).click();
    await flushTab(el);
    const call = hass.calls.callService.find((c: any) => c.service === 'archive_reward') as any;
    assert.deepEqual(call.payload, { reward_id: 1 });
    assert.equal(activeTab(el).shadowRoot.querySelector('[data-reward="1"]'), null);
  });

  it('Keep cancels the archive confirmation', async () => {
    const { el, hass } = await openCatalog();
    const tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.archive') as HTMLButtonElement).click();
    await tab.updateComplete;
    (tab.shadowRoot.querySelector('button.keep') as HTMLButtonElement).click();
    await tab.updateComplete;
    assert.equal(hass.calls.callService.length, 0);
    assert.ok(tab.shadowRoot.querySelector('button.archive'));
  });

  it('editing sends the changed fields and shows them at once', async () => {
    const { el, hass } = await openCatalog();
    const tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.edit') as HTMLButtonElement).click();
    await tab.updateComplete;
    fill(tab.shadowRoot, '.reward-name', 'Cinema');
    (tab.shadowRoot.querySelector('button.save') as HTMLButtonElement).click();
    await flushTab(el);
    const call = hass.calls.callService.find((c: any) => c.service === 'update_reward') as any;
    assert.equal(call.payload.reward_id, 1);
    assert.equal(call.payload.name, 'Cinema');
    assert.match(activeTab(el).shadowRoot.querySelector('[data-reward="1"]')!.textContent!, /Cinema/);
  });

  it('an archived reward appears only under Show archived, greyed and without actions', async () => {
    const archived = { id: 2, name: 'Old toy', cost: 5, description: '', poolable: false, archived: true };
    const base = rewardsPayload();
    const { el } = await openCatalog({ rewards: { ...base, rewards: [...base.rewards, archived] } });
    const tab = activeTab(el);
    assert.equal(tab.shadowRoot.querySelector('[data-reward="2"]'), null);
    const toggle = tab.shadowRoot.querySelector('.show-archived') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await tab.updateComplete;
    const row = tab.shadowRoot.querySelector('[data-reward="2"]')!;
    assert.ok(row.classList.contains('archived'));
    assert.equal(row.querySelectorAll('button').length, 0);
  });
});

describe('history tab', () => {
  const ROWS = [
    { id: 3, created_at: '2026-10-03T10:00:00+00:00', member_slug: 'anna', delta: -10, kind: 'claim_reserve', summary: 'Movie night', reason: '', claim_id: 7, actor_name: null },
    { id: 2, created_at: '2026-10-02T10:00:00+00:00', member_slug: 'bob', delta: 5, kind: 'grant', summary: '', reason: 'Great week', claim_id: null, actor_name: 'Dad' },
    { id: 1, created_at: '2026-10-01T10:00:00+00:00', member_slug: 'anna', delta: 2, kind: 'revoke', summary: 'Make bed', reason: '', claim_id: null, actor_name: null },
  ];
  const approvedClaim = { ...CLAIM, status: 'approved' as const };

  async function openHistory(over: Partial<GetRewardsResponse> = {}) {
    const made = await makeCard({ rewards: rewardsPayload({ history: ROWS, claims: [approvedClaim], ...over }) });
    await selectTab(made.el, 'history');
    return made;
  }

  it('lists rows newest first with labels, signed deltas and the actor', async () => {
    const { el } = await openHistory();
    const text = activeTab(el).shadowRoot.textContent!.replace(/\s+/g, ' ');
    assert.ok(text.indexOf('Claimed Movie night') < text.indexOf('Great week'));
    assert.ok(text.indexOf('Great week') < text.indexOf('Un-ticked: Make bed'));
    assert.match(text, /−10/);
    assert.match(text, /\+5/);
    assert.match(text, /by Dad/);
  });

  it('Refund appears only on the approved claim row and calls refund_claim after a confirm', async () => {
    const { el, hass } = await openHistory();
    const tab = activeTab(el);
    assert.equal(tab.shadowRoot.querySelectorAll('button').length, 1, 'only the approved-claim row');
    (tab.shadowRoot.querySelector('button.refund') as HTMLButtonElement).click();
    await tab.updateComplete;
    assert.equal(hass.calls.callService.length, 0, 'first click only asks');
    (tab.shadowRoot.querySelector('button.confirm-refund') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 30));
    await el.updateComplete;
    await activeTab(el).updateComplete;
    const call = hass.calls.callService.find((c: any) => c.service === 'refund_claim') as any;
    assert.deepEqual(call.payload, { claim_id: 7 });
    assert.equal(activeTab(el).shadowRoot.querySelectorAll('button').length, 0, 'Refund gone once refunded');
  });

  it('no Refund for a pending claim', async () => {
    const { el } = await openHistory({ claims: [CLAIM] });
    assert.equal(activeTab(el).shadowRoot.querySelectorAll('button').length, 0);
  });

  it('the member filter narrows the rows', async () => {
    const { el } = await openHistory();
    const tab = activeTab(el);
    const select = tab.shadowRoot.querySelector('select.member-filter') as HTMLSelectElement;
    select.value = 'bob';
    select.dispatchEvent(new Event('change'));
    await tab.updateComplete;
    assert.equal(tab.shadowRoot.querySelectorAll('[data-ledger]').length, 1);
  });
});

describe('settings tab', () => {
  async function openSettings(settings = { streak_daily_bonus: 1, streak_milestones: [{ days: 7, points: 10 }] }) {
    const made = await makeCard({ rewards: rewardsPayload({ settings }) });
    await selectTab(made.el, 'settings');
    return made;
  }

  function fill(root: ParentNode, sel: string, value: string) {
    const input = root.querySelector(sel) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('duplicate days flag the row and block Save', async () => {
    const { el, hass } = await openSettings();
    const tab = activeTab(el);
    (tab.shadowRoot.querySelector('button.add') as HTMLButtonElement).click();
    await tab.updateComplete;
    const rows = tab.shadowRoot.querySelectorAll('[data-milestone]');
    fill(rows[1], '.milestone-days', '7');
    fill(rows[1], '.milestone-points', '5');
    await tab.updateComplete;
    assert.match(tab.shadowRoot.textContent!, /already used/);
    const save = tab.shadowRoot.querySelector('button.save') as HTMLButtonElement;
    assert.equal(save.disabled, true);
    save.click();
    await tab.updateComplete;
    assert.equal(hass.calls.callService.length, 0);
  });

  it('Save sends both keys with milestones sorted by days, and shows them at once', async () => {
    const { el, hass } = await openSettings();
    const tab = activeTab(el);
    fill(tab.shadowRoot, '.daily-bonus', '2');
    (tab.shadowRoot.querySelector('button.add') as HTMLButtonElement).click();
    await tab.updateComplete;
    const rows = tab.shadowRoot.querySelectorAll('[data-milestone]');
    fill(rows[1], '.milestone-days', '3');
    fill(rows[1], '.milestone-points', '5');
    await tab.updateComplete;
    (tab.shadowRoot.querySelector('button.save') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 30));
    await el.updateComplete;
    await activeTab(el).updateComplete;
    const call = hass.calls.callService.find((c: any) => c.service === 'set_rewards_settings') as any;
    assert.deepEqual(call.payload, {
      streak_daily_bonus: 2,
      streak_milestones: [{ days: 3, points: 5 }, { days: 7, points: 10 }],
    });
    const days = [...activeTab(el).shadowRoot.querySelectorAll<HTMLInputElement>('.milestone-days')].map((i) => i.value);
    assert.deepEqual(days, ['3', '7']);
  });

  it('caps milestones at 20 rows', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ days: i + 1, points: 1 }));
    const { el } = await openSettings({ streak_daily_bonus: 0, streak_milestones: many });
    const add = activeTab(el).shadowRoot.querySelector('button.add') as HTMLButtonElement;
    assert.equal(add.disabled, true);
  });

  it('non-admins see the values as text', async () => {
    const made = await makeCard({
      rewards: rewardsPayload({ is_admin: false, settings: { streak_daily_bonus: 1, streak_milestones: [{ days: 7, points: 10 }] } }),
    });
    await selectTab(made.el, 'settings');
    const tab = activeTab(made.el);
    assert.equal(tab.shadowRoot.querySelectorAll('input, button').length, 0);
    assert.match(tab.shadowRoot.textContent!, /7-day streak: 10 points/);
  });
});
