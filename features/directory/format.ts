// "Running · 5 km, daily", "Yoga · daily", "Gym · 4x a week" — the handover's
// own examples (§2.6), so the shape is fixed by them rather than invented.
export function directoryLine(row: {
  activity: string | null;
  commitment_value: number | null;
  unit: string | null;
  days_per_week: number | null;
}): string {
  const amount =
    row.commitment_value != null ? `${row.commitment_value}${row.unit ? ` ${row.unit}` : ''}` : null;
  const cadence =
    row.days_per_week === 7 ? 'daily' : row.days_per_week ? `${row.days_per_week}x a week` : null;
  const detail = [amount, cadence].filter(Boolean).join(', ');
  return [row.activity ?? 'A challenge', detail || null].filter(Boolean).join(' · ');
}

// Workout rows carry up to four exercises, and this is the only place they
// are shown. The server sends an empty list for every other activity, so an
// empty or missing list means "print nothing", never a placeholder.
export function directoryExercises(row: { exercises?: string[] | null }): string | null {
  const list = (row.exercises ?? []).map((e) => e.trim()).filter(Boolean).slice(0, 4);
  return list.length ? list.join(', ') : null;
}

// Six cards to a screen. The list is revealed a screen at a time as it is
// scrolled, so it reads as a place with people arriving rather than a table.
export const DIRECTORY_PAGE = 6;

export function directoryPage<T>(rows: readonly T[], pages: number): T[] {
  return rows.slice(0, Math.max(1, Math.floor(pages)) * DIRECTORY_PAGE);
}
