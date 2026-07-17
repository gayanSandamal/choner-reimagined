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
