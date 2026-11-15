import type { IconName } from '@/components/ui/Icon';

// One icon per activity, shared by the Home hero, the Pulse tiles, Find and
// the challenge picker. Each activity has its own shape (#207).
export const ACTIVITY_ICONS: Record<string, IconName> = {
  running: 'run',
  jogging: 'jog',
  walking: 'walk',
  cycling: 'bike',
  yoga: 'yoga',
  home_workouts: 'dumb'
};

export function activityIcon(key: string | null | undefined): IconName | null {
  return key ? ACTIVITY_ICONS[key] ?? null : null;
}
