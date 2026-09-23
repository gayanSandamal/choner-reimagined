import { supabase } from '@/lib/supabase';

export type DirectoryRow = {
  first_name: string;
  avatar_url: string | null;
  activity: string | null;
  commitment_value: number | null;
  unit: string | null;
  days_per_week: number | null;
};

// visible=false means fewer than five people have opted in; the server
// withholds the rows entirely rather than letting the client hide them.
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
