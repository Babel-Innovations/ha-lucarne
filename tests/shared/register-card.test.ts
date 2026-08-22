import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerCustomCard } from '../../src/shared/register-card.js';

type CustomCardWindow = Window & { customCards?: { type: string }[] };

const TODAY = {
  type: 'lucarne-today-card',
  name: 'Lucarne Today',
  description: 'Family agenda + weather + tasks + presence',
  preview: true,
};

describe('registerCustomCard', () => {
  let previous: unknown;

  beforeEach(() => {
    previous = (window as CustomCardWindow).customCards;
    delete (window as CustomCardWindow).customCards;
  });

  afterEach(() => {
    // window.customCards is shared with every other custom card on the page, so
    // restore whatever was there rather than leaving it deleted.
    (window as CustomCardWindow).customCards = previous as { type: string }[] | undefined;
  });

  it('creates the shared array when no card has registered yet', () => {
    registerCustomCard(TODAY);
    assert.deepEqual((window as CustomCardWindow).customCards, [TODAY]);
  });

  it('appends to an array another card already created', () => {
    const foreign = { type: 'some-other-card', name: 'Other', description: '' };
    (window as CustomCardWindow).customCards = [foreign];

    registerCustomCard(TODAY);

    // Same array object, not a replacement — cards that registered before us must
    // survive, and Lovelace holds a reference to it.
    assert.deepEqual((window as CustomCardWindow).customCards, [foreign, TODAY]);
  });

  it('ignores a repeat registration of the same type', () => {
    // The double-load case define-guard.ts exists for: without this the Lovelace
    // "Add card" picker lists every Lucarne card twice.
    registerCustomCard(TODAY);
    registerCustomCard({ ...TODAY, name: 'Lucarne Today (second copy)' });

    const cards = (window as CustomCardWindow).customCards ?? [];
    assert.equal(cards.length, 1);
    assert.equal(cards[0].name, 'Lucarne Today', 'the first registration must win');
  });

  it('still registers a different card type', () => {
    registerCustomCard(TODAY);
    registerCustomCard({ type: 'lucarne-chores-card', name: 'Lucarne Chores', description: '' });

    assert.deepEqual(
      ((window as CustomCardWindow).customCards ?? []).map((card) => card.type),
      ['lucarne-today-card', 'lucarne-chores-card'],
    );
  });
});
