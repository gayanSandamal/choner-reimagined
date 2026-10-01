import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { HomePulse } from './hero';

// Counts only: nothing about any one person.
export async function getHomePulse() {
  const { data, error } = await (supabase.rpc as any)('get_home_pulse');
  if (error) throw error;
  return data as HomePulse;
}

// Slow-moving and decorative, so it refreshes on a long interval rather than
// polling, and Home renders perfectly well without it.
export function useHomePulse(userId: string | undefined) {
  return useQuery({
    queryKey: ['home-pulse'],
    queryFn: getHomePulse,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000
  });
}
