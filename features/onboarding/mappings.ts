// Pure rule-based personalisation for onboarding (no AI — spec forbids
// referencing "BIE"/learning). Everything here is a lookup so the copy can
// be swapped without touching screens.

import {
  ENERGY_LEVELS,
  EnergyValue,
  GOALS,
  GoalValue,
  STRUGGLES,
  StruggleValue,
  TONES,
  ToneValue
} from './constants';

export const DEFAULT_TEMPLATE_SLUG = 'onboarding-walk-10min';

// The curated Step 1 list per goal (Challenge Setup Flow spec, Aug 2026), in
// display order. One list per goal serves all three user types: someone who
// knows what they want writes their own, someone with a rough idea browses,
// and someone with no idea taps the pre-flagged recommendation below.
const GOAL_OPTION_SLUGS: Record<GoalValue, string[]> = {
  move_more: [
    'onboarding-walk-10min',
    'onboarding-run-1-mile',
    'onboarding-pushups-20',
    'onboarding-yoga-15min'
  ],
  // Deliberately short: the spec cut the screen-time and bedtime habits
  // because neither a photo nor an honest tap can actually verify them.
  sleep_better: ['onboarding-winddown-walk', 'onboarding-stretch-before-bed'],
  reduce_stress: [
    'onboarding-deep-breathing',
    'onboarding-journaling',
    'onboarding-walk-outside'
  ],
  improve_energy: [
    'onboarding-morning-water',
    'onboarding-morning-stretch',
    'onboarding-no-caffeine-2pm'
  ]
};

// Exactly one recommendation per goal — the option that carries the badge and
// the habit both default tracks are provisioned with before Step 1 runs.
const GOAL_TEMPLATE_SLUGS: Record<GoalValue, string> = {
  move_more: 'onboarding-run-1-mile',
  sleep_better: 'onboarding-winddown-walk',
  reduce_stress: 'onboarding-deep-breathing',
  improve_energy: 'onboarding-morning-water'
};

const DEFAULT_HABIT_TITLE = 'Walk for 10 minutes every day';

const GOAL_HABIT_TITLES: Record<GoalValue, string> = {
  move_more: 'Run 1 mile',
  sleep_better: '10-min wind-down walk',
  reduce_stress: '5 minutes of deep breathing each morning',
  improve_energy: 'Drink a glass of water first thing every morning'
};

export function goalToTemplateSlug(goal: GoalValue | null): string {
  return goal ? GOAL_TEMPLATE_SLUGS[goal] : DEFAULT_TEMPLATE_SLUG;
}

// Skipping the goal question can't mean "no options" — it shows the whole
// curated set instead, deduped, with the walking habit recommended.
export function challengeOptionSlugs(goal: GoalValue | null): string[] {
  if (goal) return GOAL_OPTION_SLUGS[goal];
  const all = Object.values(GOAL_OPTION_SLUGS).flat();
  return Array.from(new Set([DEFAULT_TEMPLATE_SLUG, ...all]));
}

// Must stay in step with goalToTemplateSlug — a skipped goal falls back to the
// walking template, so its title has to be the walking one too.
export function suggestedHabitTitle(goal: GoalValue | null): string {
  return goal ? GOAL_HABIT_TITLES[goal] : DEFAULT_HABIT_TITLE;
}

const FIRST_WEEK: Record<EnergyValue, string> = {
  low: 'A gentle start — one small win a day',
  medium: 'A steady pace — build the habit daily',
  high: 'A strong start — momentum from day one'
};

export function energyToFirstWeek(energy: EnergyValue): string {
  return FIRST_WEEK[energy];
}

// Screen 6 personality summary. The full 16-combination table is still an
// open item on Dinesh's side (only the team example is final); specific
// struggle+tone entries drop into COMBO_SUMMARIES as they arrive and win
// over the per-tone fallbacks with no structural change.
const COMBO_SUMMARIES: Partial<Record<`${StruggleValue}|${ToneValue}`, string>> = {};

const TONE_SUMMARIES: Record<ToneValue, string> = {
  competitive:
    'You push harder when someone is keeping score. Choner turns your challenge into a friendly rivalry worth winning.',
  momentum:
    'Once you get going, you hate to stop. Choner protects your streak so one hard day never undoes your progress.',
  encouraging:
    'Pressure has never worked on you — support does. Choner keeps things warm, steady, and on your side.',
  team:
    'You show up for others more than yourself. Choner pairs you with someone who needs you as much as you need them.'
};

export function personalitySummary(struggle: StruggleValue | null, tone: ToneValue): string {
  if (struggle) {
    const combo = COMBO_SUMMARIES[`${struggle}|${tone}`];
    if (combo) return combo;
  }
  return TONE_SUMMARIES[tone];
}

// Label lookups fall back to the raw stored string so rows written by the
// old onboarding ('solo', 'Move more', ...) never render blank.
function labelFor(options: { value: string; label: string }[], value: string | null | undefined) {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

export function goalLabel(value: string | null | undefined): string | null {
  return labelFor(GOALS, value);
}

export function struggleLabel(value: string | null | undefined): string | null {
  return labelFor(STRUGGLES, value);
}

export function toneLabel(value: string | null | undefined): string | null {
  return labelFor(TONES, value);
}

export function energyLabel(value: string | null | undefined): string | null {
  return labelFor(ENERGY_LEVELS, value);
}

export function firstNameFrom(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || null;
}
