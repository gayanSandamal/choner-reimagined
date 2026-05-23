import { supabase } from '@/lib/supabase';

export async function getInsights(userId: string) {
  const { data, error } = await supabase.rpc('get_user_insights', { p_user_id: userId });
  if (error) throw error;
  return data ?? {
    consistency_score: 0,
    best_time_of_day: 'morning',
    streak_days: 0,
    completion_rate: 0
  };
}
