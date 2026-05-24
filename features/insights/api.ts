import { supabase } from '@/lib/supabase';

export interface UserInsights {
  consistency_score: number;
  best_time_of_day: string;
  streak_days: number;
  completion_rate: number;
}

const FALLBACK: UserInsights = {
  consistency_score: 0,
  best_time_of_day: 'morning',
  streak_days: 0,
  completion_rate: 0,
};

export async function getInsights(userId: string): Promise<UserInsights> {
  const { data, error } = await supabase.rpc('get_user_insights', { p_user_id: userId });
  if (error) throw error;
  return (data as UserInsights | null) ?? FALLBACK;
}

export interface InsightsDay {
  day: string;
  completions: number;
}

export async function getInsightsSeries(userId: string, days = 30): Promise<InsightsDay[]> {
  const { data, error } = await supabase.rpc('get_user_insights_series', {
    p_user_id: userId,
    p_days: days,
  });
  if (error) throw error;
  return (data as InsightsDay[] | null) ?? [];
}
