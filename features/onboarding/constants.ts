// Single source of truth for the onboarding quiz vocabulary
// (docs/Choner_Onboarding_Screens_1-7_FINAL.md). Stored values are
// snake_case; display copy lives alongside so onboarding, profile edit,
// and profile display never drift apart.

export interface QuizOption<V extends string = string> {
  value: V;
  label: string;
  description: string;
  icon: string;
}

export type GoalValue = 'move_more' | 'sleep_better' | 'reduce_stress' | 'improve_energy';
export type StruggleValue = 'start_but_stop' | 'lack_accountability' | 'too_busy' | 'overwhelmed';
export type ToneValue = 'competitive' | 'momentum' | 'encouraging' | 'team';
export type EnergyValue = 'low' | 'medium' | 'high';
export type AgeRangeValue = '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type GenderValue = 'male' | 'female' | 'prefer_not_to_say';

export const GOALS: QuizOption<GoalValue>[] = [
  { value: 'move_more', label: 'Move more', description: 'Build an active routine', icon: '🏃' },
  { value: 'sleep_better', label: 'Sleep better', description: 'Rest and recover well', icon: '🌙' },
  { value: 'reduce_stress', label: 'Reduce stress', description: 'Feel calmer day to day', icon: '🌱' },
  { value: 'improve_energy', label: 'Improve energy', description: 'Stay sharp and focused', icon: '⚡' }
];

export const STRUGGLES: QuizOption<StruggleValue>[] = [
  { value: 'start_but_stop', label: 'I start but stop', description: 'Good intentions, hard to stay consistent', icon: '🔄' },
  { value: 'lack_accountability', label: 'I lack accountability', description: 'No one keeping me on track', icon: '👥' },
  { value: 'too_busy', label: "I'm too busy", description: 'Life gets in the way every time', icon: '⏰' },
  { value: 'overwhelmed', label: 'I feel overwhelmed', description: "Don't even know where to begin", icon: '😔' }
];

export const TONES: QuizOption<ToneValue>[] = [
  { value: 'competitive', label: 'Competitive', description: 'I like a friendly rivalry', icon: '🏆' },
  { value: 'momentum', label: 'Momentum-driven', description: 'I hate breaking a streak', icon: '🔥' },
  { value: 'encouraging', label: 'Encouraging', description: 'I need warmth, not pressure', icon: '💬' },
  { value: 'team', label: 'Team-minded', description: 'I show up for others', icon: '🤝' }
];

export const ENERGY_LEVELS: QuizOption<EnergyValue>[] = [
  { value: 'low', label: 'Low', description: 'Running on empty', icon: '😴' },
  { value: 'medium', label: 'Medium', description: 'Getting by', icon: '⚡' },
  { value: 'high', label: 'High', description: 'Firing on all cylinders', icon: '🔥' }
];

// Reduces friction and keeps the data clean vs. free text. Used behind the
// scenes for age-group matching (Choner_Matching_Algorithm_v2) — adjacent
// bands still score well there, so the boundaries here don't need to be
// exact.
export const AGE_BANDS: QuizOption<AgeRangeValue>[] = [
  { value: '18-24', label: '18–24', description: '', icon: '🌱' },
  { value: '25-34', label: '25–34', description: '', icon: '🌿' },
  { value: '35-44', label: '35–44', description: '', icon: '🌳' },
  { value: '45-54', label: '45–54', description: '', icon: '🍃' },
  { value: '55+', label: '55+', description: '', icon: '🍂' }
];

// Separate from the Find form's "gender preference" filter — this is the
// user's own gender, captured once here.
export const GENDERS: QuizOption<GenderValue>[] = [
  { value: 'male', label: 'Male', description: '', icon: '♂️' },
  { value: 'female', label: 'Female', description: '', icon: '♀️' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', description: '', icon: '🤍' }
];
