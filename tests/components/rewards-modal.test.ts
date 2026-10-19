import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneRewardsModal } from '../../src/components/rewards-modal.js';
import type { HomeAssistant, MemberSummary, RewardClaim, RewardsState } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

await import('../../src/components/rewards-modal.js');

const mk = (slug: string, name: string): MemberSummary => ({
  slug,
  name,
  color: '#ccc',
  avatar: null,
  todo_entity_id: `todo.${slug}`,
  streak_counter_id: `counter.${slug}_streak`,
});
const ALICE = mk('alice', 'Alice');
const BOB = mk('bob', 'Bob');
const CARA = mk('cara', 'Cara');

function state(over: Partial<RewardsState> = {}): RewardsState {
  return {
    is_admin: false,
    balances: { alice: 5, bob: 5, cara: 1 },
    rewards: [
      { id: 1, name: 'Movie', cost: 10, description: 'Pick one', poolable: true, archived: false },
      { id: 2, name: 'Sticker', cost: 3, description: '', poolable: false, archived: false },
    ],
    claims: [],
    settings: { streak_daily_bonus: 0, streak_milestones: [] },
    ...over,
  };
}

type Call = { service: string; data: Record<string, unknown> };

async function mount(opts: { rewards?: RewardsState; reject?: unknown; calls?: Call[] } = {}) {
  const hass = makeFakeHass() as unknown as HomeAssistant & { callService: (...a: unknown[]) => Promise<unknown> };
  hass.callService = async (_d: unknown, service: unknown, data: unknown) => {
    opts.calls?.push({ service: service as string, data: data as Record<string, unknown> });
    if (opts.reject) throw opts.reject;
    return { response: { claim_id: 9, shares: { alice: 10 } } };
  };
  const el = document.createElement('lucarne-rewards-modal') as LucarneRewardsModal;
  el.hass = hass;
  el.member = ALICE;
  el.members = [ALICE, BOB, CARA];
  el.rewards = opts.rewards ?? state();
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const q = (el: HTMLElement, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement | null;
const qa = (el: HTMLElement, sel: string) => Array.from(el.shadowRoot!.querySelectorAll(sel)) as HTMLElement[];
const btn = (el: HTMLElement, text: string) => qa(el, 'button').find((b) => b.textContent!.trim() === text)!;
const settle = async (el: LucarneRewardsModal) => {
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
};

afterEach(() => document.querySelectorAll('lucarne-rewards-modal').forEach((e) => e.remove()));

describe('lucarne-rewards-modal', () => {
  it('lists affordable first and shows progress for the rest', async () => {
    const el = await mount();
    const names = qa(el, '.item .name').map((n) => n.textContent);
    assert.deepEqual(names, ['Sticker', 'Movie']);
    assert.ok(el.shadowRoot!.textContent!.includes('5 more points'));
    const bar = q(el, '[role=progressbar]')!;
    assert.equal(bar.getAttribute('aria-valuenow'), '5');
    assert.equal(bar.getAttribute('aria-valuemax'), '10');
  });

  it('states each cost once: as the Claim button when affordable, a tag otherwise; no heading when nothing is pending', async () => {
    const el = await mount();
    const [sticker, movie] = qa(el, '.item');
    assert.equal(sticker.querySelector('.claim-btn')!.textContent!.replace(/\s+/g, ' ').trim(), 'Claim ⭐ 3');
    assert.equal(sticker.querySelector('.price'), null);
    assert.equal(movie.querySelector('.claim-btn'), null);
    assert.equal(movie.querySelector('.price')!.textContent!.trim(), '⭐ 10');
    assert.equal(el.shadowRoot!.textContent!.match(/10/g)!.length, 1, 'the Movie cost appears only on its tag');
    assert.equal(q(el, 'h3'), null);
  });

  it('an unaffordable, unpoolable reward has no button row, and no empty bar without progress', async () => {
    const el = await mount({
      rewards: state({
        balances: { alice: -2, bob: 5, cara: 1 },
        rewards: [{ id: 2, name: 'Sticker', cost: 3, description: '', poolable: false, archived: false }],
      }),
    });
    const item = q(el, '.item')!;
    assert.equal(item.querySelector('.actions'), null);
    assert.equal(item.querySelector('[role=progressbar]'), null);
    assert.ok(item.textContent!.includes('5 more points'));
  });

  it('shows the empty catalog message', async () => {
    const el = await mount({ rewards: state({ rewards: [] }) });
    assert.ok(el.shadowRoot!.textContent!.includes('No rewards yet'));
  });

  it('claim needs a confirm step, then calls the service and fires reward-claimed', async () => {
    const calls: Call[] = [];
    const el = await mount({ calls });
    let claim: RewardClaim | undefined;
    el.addEventListener('reward-claimed', (e) => (claim = (e as CustomEvent).detail.claim));
    q(el, '.claim-btn')!.click();
    await el.updateComplete;
    assert.equal(calls.length, 0);
    assert.ok(el.shadowRoot!.textContent!.includes('Claim Sticker for 3 points?'));
    btn(el, 'Claim').click();
    await settle(el);
    assert.equal(calls[0].service, 'claim_reward');
    assert.deepEqual(calls[0].data, { member: 'alice', reward_id: 2 });
    assert.equal(claim!.id, 9);
    assert.equal(claim!.status, 'pending');
    assert.equal(claim!.reward_name, 'Sticker');
  });

  it('shows the server rejection verbatim in role=alert and stays open', async () => {
    const el = await mount({ reject: { code: 'service_validation_error', message: 'Not enough points: Alice needs 3 more' } });
    q(el, '.claim-btn')!.click();
    await el.updateComplete;
    btn(el, 'Claim').click();
    await settle(el);
    assert.equal(q(el, '[role=alert]')!.textContent, 'Not enough points: Alice needs 3 more');
    assert.ok(q(el, '[role=dialog]'));
  });

  it('claim together previews shares, gates on affordability and sends pool_with', async () => {
    const calls: Call[] = [];
    const el = await mount({ calls });
    btn(el, 'Claim together').click();
    await el.updateComplete;
    const boxes = qa(el, 'input[type=checkbox]');
    assert.equal(boxes.length, 2);
    assert.equal(btn(el, 'Ask together').hasAttribute('disabled'), true);

    boxes[0].click(); // Bob
    await el.updateComplete;
    assert.ok(el.shadowRoot!.textContent!.includes('You pay 5, Bob pays 5'));
    assert.equal(btn(el, 'Ask together').hasAttribute('disabled'), false);
    btn(el, 'Ask together').click();
    await settle(el);
    assert.deepEqual(calls[0].data, { member: 'alice', reward_id: 1, pool_with: ['bob'] });
  });

  it('sizes picker avatars through the avatar size variable', async () => {
    // member-avatar sizes its own host from --lucarne-avatar-size; a plain width on the
    // element is overridden and the photos render full size over the names.
    const { LucarneRewardsModal } = await import('../../src/components/rewards-modal.js');
    const cssText = (LucarneRewardsModal.styles as Array<{ cssText: string }>).map((c) => c.cssText).join('\n');
    assert.match(cssText, /label\.pick lucarne-member-avatar\s*\{[^}]*--lucarne-avatar-size:\s*32px/);
  });

  it('keeps Ask together disabled while a contributor is short', async () => {
    const el = await mount();
    btn(el, 'Claim together').click();
    await el.updateComplete;
    qa(el, 'input[type=checkbox]')[1].click(); // Cara has 1; shares 5 each
    await el.updateComplete;
    assert.ok(el.shadowRoot!.textContent!.includes('needs 4 more'));
    assert.equal(btn(el, 'Ask together').hasAttribute('disabled'), true);
  });

  it('refuses a pool with more people than points', async () => {
    const rewards = state({ rewards: [{ id: 3, name: 'Tiny', cost: 1, description: '', poolable: true, archived: false }] });
    const el = await mount({ rewards });
    btn(el, 'Claim together').click();
    await el.updateComplete;
    qa(el, 'input[type=checkbox]')[0].click();
    await el.updateComplete;
    assert.ok(el.shadowRoot!.textContent!.includes('Too many people for this reward'));
    assert.equal(btn(el, 'Ask together').hasAttribute('disabled'), true);
  });

  it('cancel shows only for the claimer, with a two-step confirm', async () => {
    const claim: RewardClaim = {
      id: 4,
      reward_id: 1,
      reward_name: 'Movie',
      cost: 10,
      claimer_slug: 'alice',
      status: 'pending',
      created_at: '',
      resolved_at: null,
      contributors: [
        { member_slug: 'alice', share: 5 },
        { member_slug: 'bob', share: 5 },
      ],
    };
    const calls: Call[] = [];
    const el = await mount({ rewards: state({ claims: [claim] }), calls });
    assert.equal(q(el, '.item .sub')!.textContent, '5 points set aside, with Bob');
    assert.deepEqual(qa(el, 'h3').map((h) => h.textContent), ['Waiting for a grown-up', 'Rewards']);
    let cancelled = 0;
    el.addEventListener('claim-cancelled', (e) => (cancelled = (e as CustomEvent).detail.claimId));
    btn(el, 'Cancel').click();
    await el.updateComplete;
    btn(el, 'Yes, cancel').click();
    await settle(el);
    assert.deepEqual(calls[0], { service: 'cancel_claim', data: { claim_id: 4 } });
    assert.equal(cancelled, 4);

    // Bob is a contributor, not the claimer.
    const bobView = await mount({ rewards: state({ claims: [claim] }) });
    bobView.member = BOB;
    await bobView.updateComplete;
    assert.equal(bobView.shadowRoot!.querySelector('.item .sub')!.textContent, "5 points set aside for Alice's claim");
    assert.equal(qa(bobView, 'button').some((b) => b.textContent!.trim() === 'Cancel'), false);
  });

  it('Escape and backdrop close; focus starts on close; Tab wraps', async () => {
    const el = await mount();
    assert.equal(el.shadowRoot!.activeElement, q(el, '.close-btn'));
    let closes = 0;
    el.addEventListener('popover-close', () => closes++);
    q(el, '[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    q(el, '.backdrop')!.click();
    assert.equal(closes, 2);

    const focusables = qa(el, 'button');
    focusables[focusables.length - 1].focus();
    q(el, '[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true, cancelable: true }));
    assert.equal(el.shadowRoot!.activeElement, focusables[0]);
    q(el, '[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, composed: true, cancelable: true }));
    assert.equal(el.shadowRoot!.activeElement, focusables[focusables.length - 1]);
  });

  it('keeps Escape and the Tab trap working after a step change', async () => {
    const el = await mount();
    q(el, '.claim-btn')!.click();
    await settle(el);
    assert.ok(el.shadowRoot!.activeElement, 'focus stays inside the dialog');
    let closes = 0;
    el.addEventListener('popover-close', () => closes++);
    (el.shadowRoot!.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    assert.equal(closes, 1);
  });

  it('says "1 more point" in the singular', async () => {
    const el = await mount({ rewards: state({ balances: { alice: 9, bob: 0, cara: 0 } }) });
    assert.ok(el.shadowRoot!.textContent!.includes('1 more point'));
    assert.ok(!el.shadowRoot!.textContent!.includes('1 more points'));
  });

  it('keeps focus inside the dialog when the pool step opens and after a successful claim', async () => {
    const el = await mount();
    btn(el, 'Claim together').click();
    await settle(el);
    assert.ok(el.shadowRoot!.activeElement, 'pool step');

    btn(el, 'Back').click();
    await settle(el);
    q(el, '.claim-btn')!.click();
    await settle(el);
    btn(el, 'Claim').click();
    await settle(el);
    assert.ok(el.shadowRoot!.activeElement, 'after success');
  });
});
