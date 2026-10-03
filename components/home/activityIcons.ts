import type { IconName } from '@/components/ui/Icon';

// One icon per activity, shared by the Home hero, the Pulse tiles and Find.
export const ACTIVITY_ICONS: Record<string, IconName> = {
  running: 'run',
  jogging: 'run',
  walking: 'walk',
  cycling: 'bike',
  yoga: 'leaf',
  home_workouts: 'dumb'
};

export function activityIcon(key: string | null | undefined): IconName | null {
  return key ? ACTIVITY_ICONS[key] ?? null : null;
}
