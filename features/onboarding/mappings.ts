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

const GOAL_TEMPLATE_SLUGS: Record<GoalValue, string> = {
  move_more: 'onboarding-walk-10min',
  sleep_better: 'onboarding-no-screens',
  reduce_stress: 'onboarding-deep-breathing',
  improve_energy: 'onboarding-morning-water'
};

const GOAL_HABIT_TITLES: Record<GoalValue, string> = {
  move_more: 'Walk for 10 minutes every day',
  sleep_better: 'No screens 30 minutes before bed',
  reduce_stress: '5 minutes of deep breathing each morning',
  improve_energy: 'Drink a glass of water first thing every morning'
};

export function goalToTemplateSlug(goal: GoalValue | null): string {
  return goal ? GOAL_TEMPLATE_SLUGS[goal] : DEFAULT_TEMPLATE_SLUG;
}

export function suggestedHabitTitle(goal: GoalValue | null): string {
  return goal ? GOAL_HABIT_TITLES[goal] : GOAL_HABIT_TITLES.move_more;
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
