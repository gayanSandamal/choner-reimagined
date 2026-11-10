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

export function proposalLabel(field: string, value: any): string {
  if (field === 'cadence') return cadenceLabel(Number(value)) ?? String(value);
  if (field === 'distance' || field === 'mode') return String(value) === 'together'
    ? 'Together'
    : String(value) === 'separate'
    ? 'Separately, together'
    : String(value);
  if (field === 'place') return [value?.name, value?.text].filter(Boolean).join(', ');
  if (field === 'time' || field === 'day_time') {
    const a = formatDayTime(value.starts_at);
    if (field === 'day_time' && value.other_at && value.other_at !== value.starts_at) {
      return `${a.day}, you at ${a.time}, them at ${formatDayTime(value.other_at).time}`;
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
// that ran 5:00 to 21:00. Half hours stay (decided 10 Nov 2026); the limit on
// the hour does not, because a wheel reaches every hour and policing it would
// mean a wheel that refuses to stop where you put it.
export type TimeOfDay = { h: number; m: number };
export type Period = 'AM' | 'PM';
export const WHEEL_HOURS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const WHEEL_MINUTES: readonly number[] = [0, 30];
export const WHEEL_PERIODS: readonly Period[] = ['AM', 'PM'];
// Where the wheel opens: an early-morning run, the commonest plan.
export const DEFAULT_TIME: TimeOfDay = { h: 6, m: 30 };

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
// A wheel that opens on 6:30 AM with today chosen is usually already in the
// past, so the pickers check before they offer it.
export function isPast(day: Date, slot: TimeOfDay, now = new Date()) {
  return new Date(at(day, slot)).getTime() <= now.getTime();
}
