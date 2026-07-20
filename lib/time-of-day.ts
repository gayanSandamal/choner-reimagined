import { useEffect, useState } from 'react';
import { theme } from '@/constants/theme';

export type DayPeriod = 'dawn' | 'day' | 'dusk' | 'night';

function periodFor(hour: number): DayPeriod {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

const GRADIENT_BY_PERIOD: Record<DayPeriod, readonly [string, string, ...string[]]> = {
  dawn: theme.gradients.skyDawn,
  day: theme.gradients.skyDay,
  dusk: theme.gradients.skyDusk,
  night: theme.gradients.skyNight
};

function snapshot() {
  const now = new Date();
  const hour = now.getHours();
  const period = periodFor(hour);

  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msLeft = midnight.getTime() - now.getTime();
  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

  return {
    period,
    gradient: GRADIENT_BY_PERIOD[period],
    // Urgency window — countdown copy only kicks in once evening's underway.
    isEvening: hour >= 18,
    timeLeftLabel: `${hoursLeft}h ${minutesLeft}m left`
  };
}

// Drives the home hero's backdrop + urgency copy. Recomputes on an interval
// so a session spanning a period boundary (or midnight) doesn't go stale.
export function useTimeOfDay() {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    const id = setInterval(() => setState(snapshot()), 60_000);
    return () => clearInterval(id);
  }, []);

  return state;
}
