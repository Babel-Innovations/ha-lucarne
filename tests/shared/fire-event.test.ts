import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fireEvent } from '../../src/shared/fire-event.js';

/**
 * `fireEvent` replaces `custom-card-helpers`' export of the same name (#130).
 * The defaults are not stylistic: card editors live inside a shadow root and
 * Lovelace listens for `config-changed` on an ancestor, so an event that is
 * not both `bubbles` and `composed` never reaches HA and the editor silently
 * stops saving. These tests pin the contract the removed dependency had.
 */
describe('fireEvent', () => {
  it('dispatches an event of the given type on the given node', () => {
    const node = document.createElement('div');
    const seen: Event[] = [];
    node.addEventListener('config-changed', (ev) => seen.push(ev));

    fireEvent(node, 'config-changed');

    assert.equal(seen.length, 1);
    assert.equal(seen[0].type, 'config-changed');
    assert.equal(seen[0].target, node);
  });

  it('carries the detail payload', () => {
    const node = document.createElement('div');
    const config = { type: 'custom:lucarne-today-card', title: 'Today' };
    let detail: unknown;
    node.addEventListener('config-changed', (ev) => {
      detail = (ev as CustomEvent<{ config: unknown }>).detail;
    });

    fireEvent(node, 'config-changed', { config });

    assert.deepEqual(detail, { config });
  });

  it('defaults to bubbles and composed so it escapes the editor shadow root', () => {
    const node = document.createElement('div');
    let seen: Event | undefined;
    node.addEventListener('config-changed', (ev) => {
      seen = ev;
    });

    fireEvent(node, 'config-changed', { config: {} });

    assert.equal(seen?.bubbles, true);
    assert.equal(seen?.composed, true);
  });

  it('defaults to not cancelable', () => {
    const node = document.createElement('div');
    let seen: Event | undefined;
    node.addEventListener('config-changed', (ev) => {
      seen = ev;
    });

    fireEvent(node, 'config-changed', { config: {} });

    assert.equal(seen?.cancelable, false);
  });

  it('reaches a listener outside the shadow root the editor lives in', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    const editor = document.createElement('div');
    root.appendChild(editor);

    const seen: unknown[] = [];
    host.addEventListener('config-changed', (ev) => {
      seen.push((ev as CustomEvent<{ config: unknown }>).detail);
    });

    fireEvent(editor, 'config-changed', { config: { title: 'Chores' } });

    assert.deepEqual(seen, [{ config: { title: 'Chores' } }]);
    host.remove();
  });

  it('honours explicit bubbles, cancelable and composed overrides', () => {
    const node = document.createElement('div');
    let seen: Event | undefined;
    node.addEventListener('ll-rebuild', (ev) => {
      seen = ev;
    });

    fireEvent(node, 'll-rebuild', undefined, {
      bubbles: false,
      cancelable: true,
      composed: false,
    });

    assert.equal(seen?.bubbles, false);
    assert.equal(seen?.cancelable, true);
    assert.equal(seen?.composed, false);
  });

  it('substitutes an empty object when no detail is given', () => {
    const node = document.createElement('div');
    let detail: unknown;
    node.addEventListener('ll-rebuild', (ev) => {
      detail = (ev as CustomEvent<unknown>).detail;
    });

    fireEvent(node, 'll-rebuild');

    assert.deepEqual(detail, {});
  });

  it('returns the dispatched event', () => {
    const node = document.createElement('div');
    let seen: Event | undefined;
    node.addEventListener('config-changed', (ev) => {
      seen = ev;
    });

    const returned = fireEvent(node, 'config-changed', { config: {} });

    assert.equal(returned, seen);
  });

  it('accepts window as the dispatching node', () => {
    let seen: Event | undefined;
    const handler = (ev: Event) => {
      seen = ev;
    };
    window.addEventListener('ll-rebuild', handler);

    fireEvent(window, 'll-rebuild');

    window.removeEventListener('ll-rebuild', handler);
    assert.equal(seen?.type, 'll-rebuild');
  });
});
