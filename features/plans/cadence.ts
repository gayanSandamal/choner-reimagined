// How often: the shared half of a commitment.
//
// One number for the pair, 1 to 7 sessions a week, where 7 is said as "Daily"
// rather than "7x". It is agreed once, at the pair's first plan, through the
// same suggest / accept exchange as everything else in a plan, and from then
// on it defines the week, the repair debt and how long a streak takes.

export const CADENCES = [1, 2, 3, 4, 5, 6, 7] as const;

// "3x a week", "Daily". Null for anything that is not a cadence.
export function cadenceLabel(n: number | null | undefined): string | null {
  if (n == null || !Number.isInteger(n) || n < 1 || n > 7) return null;
  return n === 7 ? 'Daily' : `${n}x a week`;
}

// "About 5 weeks at 4x a week". An ESTIMATE, computed on screen and never
// stored: misses and repairs move it, which is exactly why it is not a fact.
export function streakEstimate(target: number, cadence: number | null | undefined): string | null {
  const label = cadenceLabel(cadence);
  if (!label || !cadence || target < 1) return null;
  const weeks = Math.max(1, Math.ceil(target / cadence));
  return `About ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ${cadence === 7 ? 'doing it daily' : `at ${label}`}`;
}
