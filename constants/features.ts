// Feature gates. Each key hides an in-progress surface app-wide until it's
// ready to ship. Flip the fallback here, or override per-build without a code
// change via the matching EXPO_PUBLIC_FEATURE_* env key (e.g.
// EXPO_PUBLIC_FEATURE_PRO=true). Default off = hidden.

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return value === 'true' || value === '1';
}

export const features = {
  // Premium / Pro: paywall, upsells, subscription management, premium quests.
  pro: envFlag(process.env.EXPO_PUBLIC_FEATURE_PRO, false),
  // AI coach modal and its entry points.
  aiCoach: envFlag(process.env.EXPO_PUBLIC_FEATURE_AI_COACH, false)
};
