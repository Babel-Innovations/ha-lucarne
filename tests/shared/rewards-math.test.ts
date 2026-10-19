import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitShares, affordableRewards, sortForModal } from '../../src/shared/rewards-math.js';
import type { RewardItem } from '../../src/shared/types.js';

const r = (id: number, name: string, cost: number, archived = false): RewardItem => ({
  id,
  name,
  cost,
  description: '',
  poolable: true,
  archived,
});

describe('splitShares', () => {
  it('gives the claimer the remainder', () => {
    const s = splitShares(10, 'a', ['b', 'c'])!;
    assert.deepEqual([...s], [['a', 4], ['b', 3], ['c', 3]]);
  });
  it('dedupes while keeping order', () => {
    const s = splitShares(10, 'a', ['b', 'a', 'b'])!;
    assert.deepEqual([...s], [['a', 5], ['b', 5]]);
  });
  it('solo claim pays everything', () => {
    assert.deepEqual([...splitShares(7, 'a', [])!], [['a', 7]]);
  });
  it('is null when there are more people than points', () => {
    assert.equal(splitShares(2, 'a', ['b', 'c']), null);
  });
});

describe('reward ordering', () => {
  const list = [r(1, 'Zoo', 20), r(2, 'Ice cream', 5), r(3, 'Apple', 5), r(4, 'Old', 1, true), r(5, 'Cheap', 3)];
  it('affordableRewards skips archived and too-expensive', () => {
    assert.deepEqual(affordableRewards(list, 5).map((x) => x.id), [2, 3, 5]);
  });
  it('sortForModal: affordable first, then cost, then name', () => {
    assert.deepEqual(sortForModal(list, 5).map((x) => x.id), [5, 3, 2, 1]);
    assert.deepEqual(sortForModal(list, 0).map((x) => x.id), [5, 3, 2, 1]);
  });
});
