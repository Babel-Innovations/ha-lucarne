import type { ClaimStatus, RewardClaim, RewardItem, RewardsSettings, RewardsState } from './types.js';

/**
 * How long an override outlives its mutation if no fetch ever confirms it.
 * Sized above the family-state poll interval (~20s) so one refresh normally
 * lands first; the mutation is on the server regardless.
 */
const OVERRIDE_TTL_MS = 30_000;

type Override =
  | { kind: 'resolveClaim'; claimId: number; status: Exclude<ClaimStatus, 'pending'>; appliedAt: number }
  | { kind: 'addClaim'; claim: RewardClaim; appliedAt: number }
  | { kind: 'tickDelta'; uid: string; member: string; points: number; appliedAt: number }
  | { kind: 'grant'; member: string; points: number; appliedAt: number }
  | { kind: 'addReward'; reward: RewardItem; appliedAt: number }
  | { kind: 'editReward'; id: number; fields: Partial<RewardItem>; appliedAt: number }
  | { kind: 'archiveReward'; id: number; appliedAt: number }
  | { kind: 'settings'; settings: RewardsSettings; appliedAt: number };

/** Statuses that hand the claim's reserved points back to its contributors. */
const RELEASING: ReadonlySet<ClaimStatus> = new Set(['rejected', 'cancelled', 'refunded']);

/**
 * Optimistic overrides for rewards state, applied over the last server payload.
 *
 * A plain class, not Lit state: recording an override re-renders nothing, so the
 * owning card must `requestUpdate()` after every mutation (see Phase 3 spec,
 * "RewardsOverlay"). Record an override only after its service call resolved.
 * Known gap: a fetch sent just before a grant lands can already include it, so
 * the grant shows twice until the next fetch (there is no ledger id to match).
 */
export class RewardsOverlay {
  private overrides: Override[] = [];

  constructor(private readonly now: () => number = Date.now) {}

  resolveClaim(claimId: number, status: Exclude<ClaimStatus, 'pending'>): void {
    this.overrides.push({ kind: 'resolveClaim', claimId, status, appliedAt: this.now() });
  }

  addClaim(claim: RewardClaim): void {
    this.overrides.push({ kind: 'addClaim', claim, appliedAt: this.now() });
  }

  /** A task tick (+points) or untick (-points); each is kept and summed by `apply`. */
  addTickDelta(uid: string, member: string, points: number): void {
    this.overrides.push({ kind: 'tickDelta', uid, member, points, appliedAt: this.now() });
  }

  addGrant(member: string, points: number): void {
    this.overrides.push({ kind: 'grant', member, points, appliedAt: this.now() });
  }

  addReward(reward: RewardItem): void {
    this.overrides.push({ kind: 'addReward', reward, appliedAt: this.now() });
  }

  editReward(id: number, fields: Partial<RewardItem>): void {
    this.overrides.push({ kind: 'editReward', id, fields, appliedAt: this.now() });
  }

  archiveReward(id: number): void {
    this.overrides.push({ kind: 'archiveReward', id, appliedAt: this.now() });
  }

  setSettings(settings: RewardsSettings): void {
    this.overrides.push({ kind: 'settings', settings, appliedAt: this.now() });
  }

  /**
   * Drop every override whose `appliedAt < fetchedAt` (that fetch was sent after
   * the mutation succeeded, so the server state already includes it), plus any
   * override older than 30 s.
   */
  reconcile(fetchedAt: number): void {
    const now = this.now();
    this.overrides = this.overrides.filter(
      (o) => o.appliedAt >= fetchedAt && now - o.appliedAt <= OVERRIDE_TTL_MS,
    );
  }

  /** Server state with the surviving overrides applied. Never mutates `server`. */
  apply(server: RewardsState): RewardsState {
    if (this.overrides.length === 0) return server;
    let claims = [...server.claims];
    const balances = { ...server.balances };
    let rewards = server.rewards.map((r) => ({ ...r }));
    let settings = server.settings;

    for (const o of this.overrides) {
      switch (o.kind) {
        case 'resolveClaim': {
          const claim = claims.find((c) => c.id === o.claimId);
          // A fetch sent mid-mutation can already show the claim resolved (shares
          // refunded); only a claim still in the status this action starts from needs it.
          if (!claim || claim.status !== (o.status === 'refunded' ? 'approved' : 'pending')) break;
          claims = claims.filter((c) => c.id !== o.claimId);
          if (RELEASING.has(o.status)) {
            for (const c of claim.contributors) {
              balances[c.member_slug] = (balances[c.member_slug] ?? 0) + c.share;
            }
          }
          break;
        }
        case 'addClaim':
          if (claims.some((c) => c.id === o.claim.id)) break;
          claims = [o.claim, ...claims];
          for (const c of o.claim.contributors) {
            balances[c.member_slug] = (balances[c.member_slug] ?? 0) - c.share;
          }
          break;
        case 'tickDelta':
        case 'grant':
          balances[o.member] = (balances[o.member] ?? 0) + o.points;
          break;
        case 'addReward':
          if (!rewards.some((r) => r.id === o.reward.id)) rewards = [...rewards, { ...o.reward }];
          break;
        case 'editReward':
          rewards = rewards.map((r) => (r.id === o.id ? { ...r, ...o.fields } : r));
          break;
        case 'archiveReward':
          rewards = rewards.map((r) => (r.id === o.id ? { ...r, archived: true } : r));
          break;
        case 'settings':
          settings = o.settings;
          break;
      }
    }
    return { ...server, claims, balances, rewards, settings };
  }
}
