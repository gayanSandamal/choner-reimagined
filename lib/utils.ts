export function titleCase(value: string) {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}
