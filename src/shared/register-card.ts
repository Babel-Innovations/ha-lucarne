/**
 * Adds a card to Lovelace's "Add card" picker, at most once per tag.
 *
 * `window.customCards` is a plain array shared by every custom card on the page,
 * so a naive `push` duplicates the entry when the bundle is evaluated twice — the
 * same double-load case `define-guard.ts` exists for (a stale hand-added Lovelace
 * resource alongside the integration's own registration). Element registration
 * degrades silently there; the picker does not, it just shows every Lucarne card
 * twice.
 *
 * Deduped on `type` rather than on identity: the two copies are separate builds
 * with separate object literals, and `type` is the tag name, which is what makes
 * an entry meaningful to Lovelace.
 */

/** The subset of Lovelace's card-picker entry that Lucarne fills in. */
export type CustomCardEntry = {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
};

type CustomCardWindow = Window & typeof globalThis & { customCards?: CustomCardEntry[] };

export function registerCustomCard(entry: CustomCardEntry): void {
  const win = window as CustomCardWindow;
  const cards = (win.customCards ??= []);
  if (cards.some((card) => card.type === entry.type)) return;
  cards.push(entry);
}
