// Relative time, coarse on purpose — an exact timestamp on someone else's
// streak or check-in is noise, "3d" is all the reader needs. Shared by
// MilestoneRow and PairTimeline.
export function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

// The device's own calendar day, as YYYY-MM-DD. `toISOString()` reports UTC, so
// at UTC+5:30 everything logged before 05:30 reads as yesterday — a habit that
// is demonstrably done shows as open. Shifting by the local offset first makes
// the date part of the ISO string the local one. One definition, used by every
// screen that asks "was this today?", so they can never disagree.
export function localDay(value: string | Date = new Date()) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
