// "Saturday", "6:30 AM" — the {day}, {time} of "It's on. {day}, {time}. …",
// in the viewer's own timezone (the device's), never UTC.
export function formatDayTime(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString(undefined, { weekday: 'long' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  };
}
