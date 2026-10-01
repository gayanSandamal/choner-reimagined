// Workouts: up to four exercises.
//
// They are COLOUR, not criteria: shown on the card and on workout rows in the
// directory, and never sent to matching, which reads the activity and the
// duration. "Push-ups" is not a pool: nine exercises would split an already
// small user base nine ways. Decided 1 October.
//
// Workouts are measured in MINUTES. Four exercises on one commitment have no
// single rep count between them.
export const EXERCISES = [
  'Push-ups',
  'Squats',
  'Lunges',
  'Sit-ups',
  'Pull-ups',
  'Plank',
  'Burpees',
  'Jumping jacks',
  'Stretching routine'
] as const;

export const MAX_EXERCISES = 4;

// Adds or removes one, never past the cap. Order is the order picked.
export function toggleExercise(current: string[], exercise: string): string[] {
  if (current.includes(exercise)) return current.filter((e) => e !== exercise);
  if (current.length >= MAX_EXERCISES) return current;
  return [...current, exercise];
}
