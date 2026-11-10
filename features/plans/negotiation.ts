import { cadenceLabel } from './cadence';
import { DISTANCES } from './copy';
import { formatDayTime } from './format';

// "Meet in the middle" for two different distances: the option halfway
// between them on the handover's own scale. "Not sure yet" has no middle.
export function middleDistance(a: string, b: string): string | null {
  const scale = DISTANCES.filter((d) => d !== 'Not sure yet') as readonly string[];
  const i = scale.indexOf(a);
  const j = scale.indexOf(b);
  if (i < 0 || j < 0 || i === j) return null;
  return scale[Math.round((i + j) / 2)];
}

// "After two rounds with no agreement": each side has had a turn twice.
export const HELP_AFTER_ROUNDS = 3;

// Who is reading a suggestion, for the one label that depends on it: a day
// and time where each person picks their own (#191).
export type ProposalReader = { mine: boolean; them: string };

export function proposalLabel(field: string, value: any, reader?: ProposalReader): string {
  if (field === 'cadence') return cadenceLabel(Number(value)) ?? String(value);
  if (field === 'distance' || field === 'mode') return String(value) === 'together'
    ? 'Together'
    : String(value) === 'separate'
    ? 'Separately, together'
    : String(value);
  if (field === 'place') return [value?.name, value?.text].filter(Boolean).join(', ');
  if (field === 'time' || field === 'day_time') {
    const a = formatDayTime(value.starts_at);
    // "Different times": the one suggesting sets only their own time, and the
    // other adds theirs when they answer.
    if (field === 'day_time' && value.separate_times) {
      if (!reader) return `${a.day}, ${a.time}, and a time of their own`;
      return reader.mine
        ? `${a.day}, you at ${a.time}. ${reader.them} picks their own time.`
        : `${a.day}, ${reader.them} at ${a.time}. You pick your own time.`;
    }
    // Older suggestions, where the one suggesting picked both times. starts_at
    // is always the suggester's, so who "you" is depends on who is reading.
    if (field === 'day_time' && value.other_at && value.other_at !== value.starts_at) {
      const b = formatDayTime(value.other_at).time;
      if (reader && !reader.mine) return `${a.day}, you at ${b}, ${reader.them} at ${a.time}`;
      return `${a.day}, you at ${a.time}, them at ${b}`;
    }
    return `${a.day}, ${a.time}`;
  }
  return '';
}

// Day chips for the next week, and a time wheel beside them (#191).
export function nextDays(from = new Date(), count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// The time wheel: hour, minutes, AM or PM. It replaced 33 half-hour buttons
// that ran 5:00 to 21:00. Half hours stay, and so does that range (both
// decided 10 Nov 2026): a real run is never planned at 2am.
//
// The wheel still turns through every hour. It does not jump back when it is
// left outside the range, because a wheel that refuses to stop where you put
// it is worse than one that tells you why the button is asleep. The hours
// outside are drawn faint, and the pickers say what the range is.
export type TimeOfDay = { h: number; m: number };
export type Period = 'AM' | 'PM';
export const WHEEL_HOURS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const WHEEL_MINUTES: readonly number[] = [0, 30];
export const WHEEL_PERIODS: readonly Period[] = ['AM', 'PM'];
// Where the wheel opens: an early-morning run, the commonest plan.
export const DEFAULT_TIME: TimeOfDay = { h: 6, m: 30 };
// The daytime range, both ends included. Change the hours here and nowhere
// else: the wheel, the pickers and the line they show all read these.
export const DAY_START: TimeOfDay = { h: 5, m: 0 };
export const DAY_END: TimeOfDay = { h: 21, m: 0 };
const minutesOf = (t: TimeOfDay) => t.h * 60 + t.m;
export function inDaytime(t: TimeOfDay) {
  return minutesOf(t) >= minutesOf(DAY_START) && minutesOf(t) <= minutesOf(DAY_END);
}

export function toWheel(t: TimeOfDay): { hour: number; minute: number; period: Period } {
  return { hour: t.h % 12 === 0 ? 12 : t.h % 12, minute: t.m, period: t.h < 12 ? 'AM' : 'PM' };
}
export function fromWheel(hour: number, minute: number, period: Period): TimeOfDay {
  return { h: (hour % 12) + (period === 'PM' ? 12 : 0), m: minute };
}
// "6:30 AM". Always the 12-hour clock, to read the same as the wheel does.
export function timeLabel(t: TimeOfDay): string {
  const w = toWheel(t);
  return `${w.hour}:${String(w.minute).padStart(2, '0')} ${w.period}`;
}

export function at(day: Date, slot: TimeOfDay) {
  const d = new Date(day);
  d.setHours(slot.h, slot.m, 0, 0);
  return d.toISOString();
}
// The day as the wheel writes it: "Today", "Tomorrow", then "Thu 12 Nov".
// Written here, never by the phone's date formatter, and always with the
// month, so a wrong date cannot pass for a right one (#191: a phone showed
// "Mon 18" to "Sun 24" for a week in November).
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dayLabel(day: Date, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
// The wheel always holds a day, so it opens on the first one where the time
// it opens on has not already gone: today, or tomorrow late in the day.
export function firstOpenDay(days: Date[], slot: TimeOfDay, now = new Date()) {
  const i = days.findIndex((d) => !isPast(d, slot, now));
  return i < 0 ? 0 : i;
}

// "Pick a time between 5:00 AM and 9:00 PM."
export function daytimeHint() {
  return `Pick a time between ${timeLabel(DAY_START)} and ${timeLabel(DAY_END)}.`;
}
// Whether an hour on the wheel has any time in range, for the AM or PM it is
// showing. 9 PM does (9:00); 10 PM does not.
export function hourInDaytime(hour: number, period: Period) {
  return WHEEL_MINUTES.some((m) => inDaytime(fromWheel(hour, m, period)));
}

// A wheel that opens on 6:30 AM with today chosen is usually already in the
// past, so the pickers check before they offer it.
export function isPast(day: Date, slot: TimeOfDay, now = new Date()) {
  return new Date(at(day, slot)).getTime() <= now.getTime();
}
