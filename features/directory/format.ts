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
