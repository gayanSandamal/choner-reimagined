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
  if (field === 'distance' || field === 'mode') return String(value) === 'together'
    ? 'Run together'
    : String(value) === 'separate'
    ? 'Run separately, together'
    : String(value);
  if (field === 'place') return [value?.name, value?.text].filter(Boolean).join(' — ');
  if (field === 'time' || field === 'day_time') {
    const a = formatDayTime(value.starts_at);
    if (field === 'day_time' && value.other_at && value.other_at !== value.starts_at) {
      return `${a.day}, you at ${a.time}, them at ${formatDayTime(value.other_at).time}`;
    }
    return `${a.day}, ${a.time}`;
  }
  return '';
}

// Day chips for the next week and 30-minute time chips, 5:00-21:00 — no
// native date picker, and a real run is never planned at 2am.
export function nextDays(from = new Date(), count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}
export const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const mins = 5 * 60 + i * 30;
  return { h: Math.floor(mins / 60), m: mins % 60 };
});
export function at(day: Date, slot: { h: number; m: number }) {
  const d = new Date(day);
  d.setHours(slot.h, slot.m, 0, 0);
  return d.toISOString();
}
