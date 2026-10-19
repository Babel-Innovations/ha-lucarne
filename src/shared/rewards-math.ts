import type { RewardItem, RewardsState } from './types.js';

/**
 * Mirror of Python `split_shares` (rewards.py): `floor(cost / n)` each, the claimer
 * takes the remainder. `null` where Python raises (more contributors than points).
 */
export function splitShares(cost: number, claimer: string, others: string[]): Map<string, number> | null {
  const contributors = Array.from(new Set([claimer, ...others]));
  const n = contributors.length;
  if (n > cost) return null;
  const base = Math.floor(cost / n);
  const shares = new Map<string, number>();
  for (const slug of contributors) shares.set(slug, base);
  shares.set(claimer, base + (cost % n));
  return shares;
}

function active(rewards: RewardsState['rewards']): RewardItem[] {
  return rewards.filter((r) => !r.archived);
}

/** Active rewards the balance covers alone. A display hint; the server decides. */
export function affordableRewards(rewards: RewardItem[], balance: number): RewardItem[] {
  return active(rewards).filter((r) => r.cost <= balance);
}

/** Active rewards, affordable first, then cheapest, then by name. */
export function sortForModal(rewards: RewardItem[], balance: number): RewardItem[] {
  return active(rewards).sort((a, b) => {
    const aOk = a.cost <= balance ? 0 : 1;
    const bOk = b.cost <= balance ? 0 : 1;
    return aOk - bOk || a.cost - b.cost || a.name.localeCompare(b.name);
  });
}
