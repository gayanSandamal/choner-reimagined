// Step 5 — daily resurfacing of the "Why" answers.
//
// One answer per day, rotating so the reminder never reads like the same
// notification pasted seven times. Everything here is pure and derived from
// the day index, so the same day always resurfaces the same line no matter how
// many times Home re-renders — and so none of it needs a server.

import {
  ReflectionAnswer,
  ReflectionQuestionKey,
  isAnswered,
  reminderFor
} from './reflections';

// The regular cycle. 'lose' is deliberately absent: loss-framed copy motivates
// in the moment but reads as nagging on a daily loop, which is the opposite of
// how Choner is meant to sound.
const ROTATION: ReflectionQuestionKey[] = ['purpose', 'matters', 'gain'];

// How often the loss answer breaks into the rotation on an ordinary day. The
// spec asks for "once every 4-5 days"; 5 keeps it rare enough to still land.
const LOSS_INTERVAL_DAYS = 5;

// Hours before the daily deadline at which an un-logged day starts counting as
// at risk. Matches the spirit of the missed-day sweep's grace window without
// waiting for the deadline to actually pass — by then the nudge is too late to
// change anything.
const AT_RISK_LEAD_HOURS = 3;

const DEFAULT_DEADLINE_HOUR = 20;

// 1-based day of the challenge in the viewer's own local time. Compared as
// calendar dates, not elapsed hours, so a challenge started at 23:50 rolls to
// day 2 ten minutes later — the same way the user counts days.
export function challengeDayIndex(
  startedAt: string | null | undefined,
  now: Date = new Date()
): number {
  if (!startedAt) return 1;
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return 1;

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - startDay.getTime()) / 86_400_000);
  return Math.max(1, days + 1);
}

// "Late in the day and still nothing logged." Never true once they've checked
// in — the whole point is to catch the day before it slips.
export function isAtRisk(input: {
  completedToday: boolean;
  deadlineHour?: number | null;
  now?: Date;
}): boolean {
  if (input.completedToday) return false;
  const hour = (input.now ?? new Date()).getHours();
  const deadline = input.deadlineHour ?? DEFAULT_DEADLINE_HOUR;
  return hour >= deadline - AT_RISK_LEAD_HOURS;
}

// Which question to resurface today, before checking whether it was answered.
export function scheduledQuestionKey(input: {
  dayIndex: number;
  atRisk: boolean;
}): ReflectionQuestionKey {
  // At risk wins outright: this is the one moment loss framing genuinely helps.
  if (input.atRisk) return 'lose';
  // Otherwise it surfaces on its own slow cadence, displacing that day's
  // rotation slot rather than adding a second line.
  if (input.dayIndex > 0 && input.dayIndex % LOSS_INTERVAL_DAYS === 0) return 'lose';
  return ROTATION[(Math.max(1, input.dayIndex) - 1) % ROTATION.length];
}

// The answer to show today. Falls forward through the rotation when the
// scheduled question was skipped, so a half-filled reflection still resurfaces
// something instead of going blank.
export function pickReflection(input: {
  dayIndex: number;
  atRisk: boolean;
  answers: ReflectionAnswer[];
}): ReflectionAnswer | null {
  const byKey = new Map(input.answers.map((a) => [a.question_key, a]));
  const scheduled = scheduledQuestionKey(input);

  const order: ReflectionQuestionKey[] = [scheduled];
  // Start the fallback walk at today's rotation slot so consecutive days still
  // differ when one of the three is missing.
  const start = (Math.max(1, input.dayIndex) - 1) % ROTATION.length;
  for (let i = 0; i < ROTATION.length; i += 1) {
    order.push(ROTATION[(start + i) % ROTATION.length]);
  }
  // Last resort: 'lose' is better than nothing when it is all they filled in.
  order.push('lose');

  for (const key of order) {
    const answer = byKey.get(key);
    if (isAnswered(answer)) return answer!;
  }
  return null;
}

// The line Home renders, or null when there is nothing worth saying.
export function dailyReminder(input: {
  dayIndex: number;
  atRisk: boolean;
  answers: ReflectionAnswer[];
}): string | null {
  return reminderFor(pickReflection(input));
}
