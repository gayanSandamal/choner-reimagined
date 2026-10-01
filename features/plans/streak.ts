import type { Streak, StreakCircle } from './types';

// The preset lengths. Presets only for MVP: no custom entry.
export const STREAK_PRESETS = [10, 20, 30] as const;

// "7 of 12". The score is how many FILLED, so finishing at 11 of 12 reads as
// exactly that.
export function streakScore(s: Pick<Streak, 'done' | 'target'>): string | null {
  if (!s.target) return null;
  return `${s.done} of ${s.target}`;
}

// The streak as one line, for the screen that follows a finished session:
// "3 of 12 in your streak" once a length is picked, "3 sessions done" before.
// Counted in sessions, never days. Null while there is nothing to say.
export function streakLine(s: Pick<Streak, 'done' | 'target'> | null | undefined): string | null {
  if (!s) return null;
  if (s.target) return `${s.done} of ${s.target} in your streak`;
  if (s.done <= 0) return null;
  return `${s.done} ${s.done === 1 ? 'session' : 'sessions'} done`;
}

// The label under one circle: its day, short. A circle is a session and
// carries its own day, which is why there is no separate "this week" card.
export function circleDay(c: StreakCircle, locale?: string): string | null {
  if (c.state === 'ahead' || !c.at) return null;
  const d = new Date(c.at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { weekday: 'short' });
}

// What a screen reader says for one circle.
export function circleLabel(c: StreakCircle, index: number): string {
  const n = `Session ${index + 1}`;
  if (c.state === 'done') return c.repaired ? `${n}, made up` : `${n}, done`;
  if (c.state === 'missed') return c.repairable ? `${n}, missed, can still be made up` : `${n}, missed`;
  if (c.state === 'planned') return `${n}, planned`;
  return `${n}, not planned yet`;
}
