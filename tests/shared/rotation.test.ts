import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextOwner } from '../../src/shared/rotation.js';

describe('nextOwner', () => {
  const known = new Set(['alice', 'bob', 'cara']);

  it('advances cyclically', () => {
    assert.equal(nextOwner(['alice', 'bob', 'cara'], 'alice', known), 'bob');
    assert.equal(nextOwner(['alice', 'bob', 'cara'], 'bob', known), 'cara');
    assert.equal(nextOwner(['alice', 'bob', 'cara'], 'cara', known), 'alice');
  });

  it('wraps from last to first', () => {
    assert.equal(nextOwner(['alice', 'bob'], 'bob', known), 'alice');
  });

  it('returns first owner when current is not in list', () => {
    assert.equal(nextOwner(['alice', 'bob', 'cara'], 'dave', known), 'alice');
  });

  it('skips removed owners (unknown slugs)', () => {
    // 'dave' is not in knownSlugs, so sanitized list is [alice, cara]
    assert.equal(nextOwner(['alice', 'dave', 'cara'], 'alice', known), 'cara');
  });

  it('returns null for empty owners', () => {
    assert.equal(nextOwner([], 'alice', known), null);
  });

  it('returns null when all owners unknown', () => {
    assert.equal(nextOwner(['dave', 'eve'], 'dave', known), null);
  });

  it('single owner wraps to itself', () => {
    assert.equal(nextOwner(['alice'], 'alice', known), 'alice');
  });

  it('current removed → returns first valid owner', () => {
    // bob was removed from known
    const smallKnown = new Set(['alice', 'cara']);
    assert.equal(nextOwner(['alice', 'bob', 'cara'], 'bob', smallKnown), 'alice');
  });
});
