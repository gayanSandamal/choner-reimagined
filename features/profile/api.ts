import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, payload: Partial<ProfileRow>) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}
