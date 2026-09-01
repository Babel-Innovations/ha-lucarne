/**
 * Home Assistant's DOM-event convention, inlined.
 *
 * Replaces `custom-card-helpers`' export of the same name — that package is the
 * sole path to the deprecated `@formatjs/intl-utils` (#130) and we imported two
 * symbols from it, this one and the `HomeAssistant` type (now in `types.ts`).
 *
 * The two defaults are load-bearing, not stylistic: a card editor renders inside
 * its own shadow root while Lovelace listens for `config-changed` on an ancestor,
 * so an event that is not both `bubbles` and `composed` never leaves the editor
 * and the visual editor silently stops saving.
 */
export interface FireEventOptions {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

export function fireEvent<T>(
  node: EventTarget,
  type: string,
  detail?: T,
  options: FireEventOptions = {},
): CustomEvent<T> {
  const event = new CustomEvent<T>(type, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? false,
    composed: options.composed ?? true,
    // Upstream substituted `{}` for a missing detail so listeners reading
    // `ev.detail.<field>` fail a lookup rather than throwing on `undefined`.
    detail: (detail ?? {}) as T,
  });
  node.dispatchEvent(event);
  return event;
}
