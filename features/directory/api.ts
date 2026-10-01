import { supabase } from '@/lib/supabase';

export type DirectoryRow = {
  first_name: string;
  avatar_url: string | null;
  activity: string | null;
  commitment_value: number | null;
  unit: string | null;
  days_per_week: number | null;
  // Workout rows only, up to four. Empty for every other activity.
  exercises?: string[];
};

// `visible` is always true since 202610011100, which dropped the five-row
// floor; it stays in the payload so the screen's quiet state still compiles.
// `me_listed` is true unless the person switched themselves off (opt-out).
export type Directory = { visible: boolean; me_listed: boolean; rows: DirectoryRow[] };

export async function getActiveDirectory(): Promise<Directory> {
  const { data, error } = await (supabase.rpc as any)('get_active_directory');
  if (error) throw error;
  return data as Directory;
}

export async function setShowInDirectory(show: boolean) {
  const { error } = await (supabase.rpc as any)('set_show_in_directory', { p_show: show });
  if (error) throw error;
}
