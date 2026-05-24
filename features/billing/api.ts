import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function isPremium(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_premium', { p_user_id: userId });
  if (error) throw error;
  return Boolean(data);
}
