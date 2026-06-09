/**
 * Frontend mirror of the Python rotation.py helpers.
 * Used only for display (the ↻ "next" hint); the backend is authoritative for
 * actual owner advancement.
 */

function sanitizeOwners(owners: string[], knownSlugs: Set<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const slug of owners) {
    if (knownSlugs.has(slug) && !seen.has(slug)) {
      seen.add(slug);
      result.push(slug);
    }
  }
  return result;
}

/**
 * Compute the next owner after `current`, sanitizing against knownSlugs.
 * Returns null if the sanitized list is empty.
 * If current is no longer in the list, returns the first owner.
 * Otherwise advances cyclically.
 */
export function nextOwner(
  owners: string[],
  current: string,
  knownSlugs: Set<string>,
): string | null {
  const valid = sanitizeOwners(owners, knownSlugs);
  if (valid.length === 0) return null;
  if (!valid.includes(current)) return valid[0];
  const idx = valid.indexOf(current);
  return valid[(idx + 1) % valid.length];
}
