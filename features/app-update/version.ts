// Comparing the version this build calls itself with the version the store is
// serving.
//
// Pure on purpose: no expo-constants, no supabase, no react. The decision that
// decides whether to nag every user in the app is worth being able to test
// directly, and the inputs are two strings.
//
// Everything here fails SILENT rather than loud. A version string we cannot
// parse means no notice — never a notice we cannot justify. Nagging somebody
// to update because a row was fat-fingered is worse than missing a release.

/**
 * The numeric segments of a version string, or null when it is not one.
 *
 * Stores and app.json both use plain dotted numbers ('0.2.0'), so anything
 * else — a pre-release suffix, a blank, a word — is treated as unreadable
 * rather than guessed at.
 */
export function versionSegments(version: string | null | undefined): number[] | null {
  if (typeof version !== 'string') return null;
  const trimmed = version.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('.');
  const segments: number[] = [];
  for (const part of parts) {
    // Deliberately strict: parseInt('2beta') is 2, which is exactly the kind
    // of quiet reinterpretation that produces a notice nobody can explain.
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isSafeInteger(n)) return null;
    segments.push(n);
  }
  return segments.length > 0 ? segments : null;
}

/**
 * -1, 0 or 1 as `a` is older than, the same as, or newer than `b`.
 * Null when either side cannot be read.
 *
 * Missing segments count as zero, so '1.2' and '1.2.0' are the same version,
 * and segments compare as numbers, so 0.10.0 is newer than 0.9.0 — which
 * string comparison gets backwards.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number | null {
  const left = versionSegments(a);
  const right = versionSegments(b);
  if (!left || !right) return null;

  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}

/**
 * Is the store serving something newer than what is installed?
 *
 * Only strictly newer counts. Equal is the normal state of the world and a
 * store that somehow reports OLDER than the running build is a mistake
 * somewhere, not a reason to send anyone to a listing.
 */
export function updateAvailable(
  installed: string | null | undefined,
  latest: string | null | undefined
): boolean {
  return compareVersions(installed, latest) === -1;
}
