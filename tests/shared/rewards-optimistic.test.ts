import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RewardsOverlay } from '../../src/shared/rewards-optimistic.js';
import type { RewardClaim, RewardsState } from '../../src/shared/types.js';

const CLAIM: RewardClaim = {
  id: 7,
  reward_id: 1,
  reward_name: 'Movie night',
  cost: 10,
  claimer_slug: 'anna',
  status: 'pending',
  created_at: '2026-10-01T10:00:00+00:00',
  resolved_at: null,
  contributors: [
    { member_slug: 'anna', share: 6 },
    { member_slug: 'bob', share: 4 },
  ],
};

function server(): RewardsState {
  return {
    is_admin: true,
    balances: { anna: 1, bob: 2 },
    rewards: [{ id: 1, name: 'Movie night', cost: 10, description: '', poolable: true, archived: false }],
    claims: [CLAIM],
    settings: { streak_daily_bonus: 0, streak_milestones: [] },
  };
}

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, set: (v: number) => (t = v) };
}

describe('RewardsOverlay', () => {
  it('returns the server object untouched when nothing is overridden', () => {
    const s = server();
    assert.equal(new RewardsOverlay().apply(s), s);
  });

  it('resolveClaim removes the claim until a newer fetch, and never mutates the server state', () => {
    const c = clock();
    const o = new RewardsOverlay(c.now);
    const s = server();
    o.resolveClaim(7, 'approved');
    assert.deepEqual(o.apply(s).claims, []);
    assert.equal(s.claims.length, 1, 'server state is not mutated');

    o.reconcile(c.now() - 1);
    assert.deepEqual(o.apply(s).claims, [], 'older fetch keeps the override');

    c.set(c.now() + 5);
    o.reconcile(c.now());
    assert.equal(o.apply(s), s, 'newer fetch drops it; server state is shown as is');
  });

  it('approving leaves balances alone; rejecting and cancelling return each share', () => {
    const o = new RewardsOverlay();
    o.resolveClaim(7, 'approved');
    assert.deepEqual(o.apply(server()).balances, { anna: 1, bob: 2 });

    for (const status of ['rejected', 'cancelled'] as const) {
      const r = new RewardsOverlay();
      r.resolveClaim(7, status);
      assert.deepEqual(r.apply(server()).balances, { anna: 7, bob: 6 }, status);
    }
  });

  it('addGrant raises the balance until a newer fetch, without double counting afterwards', () => {
    const c = clock();
    const o = new RewardsOverlay(c.now);
    o.addGrant('anna', 5);
    assert.equal(o.apply(server()).balances.anna, 6);

    c.set(c.now() + 1);
    o.reconcile(c.now());
    // The fetch already includes the grant: the server balance is shown as is.
    const afterFetch = { ...server(), balances: { anna: 6, bob: 2 } };
    assert.equal(o.apply(afterFetch).balances.anna, 6);
  });

  it('drops overrides older than 30 s on reconcile regardless of fetchedAt', () => {
    const c = clock();
    const o = new RewardsOverlay(c.now);
    o.addGrant('anna', 5);
    c.set(c.now() + 30_001);
    o.reconcile(0);
    assert.equal(o.apply(server()).balances.anna, 1);
  });

  it('keeps an override of exactly 30 s', () => {
    const c = clock();
    const o = new RewardsOverlay(c.now);
    o.addGrant('anna', 5);
    c.set(c.now() + 30_000);
    o.reconcile(0);
    assert.equal(o.apply(server()).balances.anna, 6);
  });

  it('addClaim prepends the claim and reserves each share', () => {
    const o = new RewardsOverlay();
    const mine = { ...CLAIM, id: 8, contributors: [{ member_slug: 'bob', share: 2 }] };
    o.addClaim(mine);
    o.addClaim(mine);
    const out = o.apply(server());
    assert.equal(out.claims[0].id, 8);
    assert.equal(out.claims.length, 2, 'a duplicate addClaim is ignored');
    assert.equal(out.balances.bob, 0);
  });

  it('reward overrides add, edit, archive and replace settings', () => {
    const o = new RewardsOverlay();
    o.addReward({ id: 2, name: 'Ice cream', cost: 3, description: '', poolable: false, archived: false });
    o.addReward({ id: 2, name: 'dup', cost: 3, description: '', poolable: false, archived: false });
    o.editReward(1, { name: 'Cinema', cost: 12 });
    o.archiveReward(2);
    o.setSettings({ streak_daily_bonus: 2, streak_milestones: [{ days: 7, points: 10 }] });
    const out = o.apply(server());
    assert.deepEqual(
      out.rewards.map((r) => [r.id, r.name, r.cost, r.archived]),
      [
        [1, 'Cinema', 12, false],
        [2, 'Ice cream', 3, true],
      ],
    );
    assert.equal(out.settings.streak_daily_bonus, 2);
  });

  it('does not hand shares back twice when the server already shows the claim rejected', () => {
    const o = new RewardsOverlay();
    o.resolveClaim(7, 'rejected');
    const s = server();
    s.claims = [{ ...CLAIM, status: 'rejected' }];
    s.balances = { anna: 7, bob: 6 };
    assert.deepEqual(o.apply(s).balances, { anna: 7, bob: 6 });
  });

  it('a refund applies to an approved claim and returns its shares', () => {
    const o = new RewardsOverlay();
    o.resolveClaim(7, 'refunded');
    const s = server();
    s.claims = [{ ...CLAIM, status: 'approved' }];
    const out = o.apply(s);
    assert.deepEqual(out.claims, []);
    assert.deepEqual(out.balances, { anna: 7, bob: 6 });
  });

  it('ignores a resolveClaim for a claim the server no longer lists', () => {
    const o = new RewardsOverlay();
    o.resolveClaim(99, 'rejected');
    assert.deepEqual(o.apply(server()).balances, { anna: 1, bob: 2 });
  });
});

describe('RewardsOverlay tickDelta', () => {
  it('adds, then reconciles away once a newer fetch lands', () => {
    const c = clock();
    const o = new RewardsOverlay(c.now);
    o.addTickDelta('u1', 'anna', 2);
    assert.equal(o.apply(server()).balances.anna, 3);
    o.reconcile(c.now() + 1);
    assert.equal(o.apply(server()).balances.anna, 1);
  });
  it('tick then untick nets to zero; tick, untick, tick nets +points', () => {
    const c = clock();
    const o = new RewardsOverlay(c.now);
    o.addTickDelta('u1', 'anna', 2);
    o.addTickDelta('u1', 'anna', -2);
    assert.equal(o.apply(server()).balances.anna, 1);
    o.addTickDelta('u1', 'anna', 2);
    assert.equal(o.apply(server()).balances.anna, 3);
  });
  it('does not double-count once the server balance includes the earn', () => {
    const c = clock();
    const o = new RewardsOverlay(c.now);
    o.addTickDelta('u1', 'anna', 2);
    c.set(c.now() + 100);
    o.reconcile(c.now());
    const s = server();
    s.balances.anna = 3;
    assert.equal(o.apply(s).balances.anna, 3);
  });
});
