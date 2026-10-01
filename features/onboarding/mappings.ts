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

// The six activities, in the order they are listed everywhere. The picker
// shows these and nothing else (decided 26 September; the templates are
// supabase/migrations/202610020900).
export const ACTIVITY_SLUGS = [
  'activity-running',
  'activity-jogging',
  'activity-walking',
  'activity-cycling',
  'activity-yoga',
  'activity-workouts'
] as const;

export const WORKOUTS_SLUG = 'activity-workouts';

export const DEFAULT_TEMPLATE_SLUG = 'activity-walking';

// What each goal points at first (DECISIONS_LOG, 26 September). The goal is
// the motivation, not a filter: every list below is completed with the rest of
// the six, so nobody is shown fewer than six because of what they answered.
//
// "Stretching routine" was in the Sleep better list. It is an exercise inside
// Workouts now, not an activity of its own, so it is not here.
const GOAL_FIRST_SLUGS: Record<GoalValue, string[]> = {
  move_more: ['activity-running', 'activity-jogging', 'activity-cycling', 'activity-walking'],
  sleep_better: ['activity-walking', 'activity-yoga'],
  reduce_stress: ['activity-yoga', 'activity-walking'],
  improve_energy: ['activity-workouts', 'activity-running']
};

const ACTIVITY_TITLES: Record<string, string> = {
  'activity-running': 'Running',
  'activity-jogging': 'Jogging',
  'activity-walking': 'Walking',
  'activity-cycling': 'Cycling',
  'activity-yoga': 'Yoga',
  'activity-workouts': 'Workouts'
};

// Exactly one recommendation per goal: the first of its list. It carries the
// badge, and it is the activity a new account is provisioned with before the
// picker runs.
export function goalToTemplateSlug(goal: GoalValue | null): string {
  return goal ? GOAL_FIRST_SLUGS[goal][0] : DEFAULT_TEMPLATE_SLUG;
}

// Always all six: the goal's own first, then the rest in the standard order.
// A skipped goal leads with walking.
export function challengeOptionSlugs(goal: GoalValue | null): string[] {
  const first = goal ? GOAL_FIRST_SLUGS[goal] : [DEFAULT_TEMPLATE_SLUG];
  return Array.from(new Set([...first, ...ACTIVITY_SLUGS]));
}

// Must stay in step with goalToTemplateSlug.
export function suggestedHabitTitle(goal: GoalValue | null): string {
  return ACTIVITY_TITLES[goalToTemplateSlug(goal)];
}

const FIRST_WEEK: Record<EnergyValue, string> = {
  // No daily framing: a commitment is a weekly number the pair agree, so
  // "a day" and "daily" described a product that no longer exists.
  low: 'A gentle start: one small win at a time',
  medium: 'A steady pace: build the habit as you go',
  high: 'A strong start: momentum from day one'
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
    'Pressure has never worked on you. Support does. Choner keeps things warm, steady, and on your side.',
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
