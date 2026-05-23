import { supabase } from '@/lib/supabase';

export async function getCommunityGroups() {
  const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInvite(input: {
  challengeId: string;
  email: string;
  inviterName: string;
}) {
  const { data, error } = await supabase.functions.invoke('invite-email', { body: input });
  if (error) throw error;
  return data;
}
