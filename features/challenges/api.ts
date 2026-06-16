import { supabase } from '@/lib/supabase';

export async function getTemplates() {
  const { data, error } = await supabase.from('challenge_templates').select('*').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getTemplate(templateId: string) {
  const { data, error } = await supabase
    .from('challenge_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getActiveChallenge(userId: string) {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge_templates(*), challenge_tasks(*, task_checkins(*))')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getChallengeHistory(userId: string) {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge_templates(*)')
    .eq('user_id', userId)
    .in('status', ['completed', 'abandoned'])
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function startChallenge(payload: {
  userId: string;
  templateId: string;
  accountabilityMode: 'solo' | 'partner' | 'group' | 'public';
}) {
  const { data, error } = await supabase.rpc('start_user_challenge', {
    p_user_id: payload.userId,
    p_template_id: payload.templateId,
    p_accountability_mode: payload.accountabilityMode
  });
  if (error) throw error;
  return data;
}

export async function completeTask(payload: {
  taskId: string;
  userChallengeId: string;
  note?: string;
}) {
  const { data, error } = await supabase.from('task_checkins').insert({
    challenge_task_id: payload.taskId,
    user_challenge_id: payload.userChallengeId,
    note: payload.note,
    status: 'completed'
  }).select().single();

  if (error) throw error;
  return data;
}

export async function undoTaskCheckin(checkinId: string) {
  const { error } = await supabase.from('task_checkins').delete().eq('id', checkinId);
  if (error) throw error;
}

export async function setChallengeStatus(userChallengeId: string, status: 'active' | 'paused' | 'completed' | 'abandoned') {
  const patch: { status: typeof status; completed_at?: string } = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_challenges')
    .update(patch)
    .eq('id', userChallengeId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function pauseChallenge(userChallengeId: string) {
  return setChallengeStatus(userChallengeId, 'paused');
}

export async function resumeChallenge(userChallengeId: string) {
  return setChallengeStatus(userChallengeId, 'active');
}

export async function abandonChallenge(userChallengeId: string) {
  return setChallengeStatus(userChallengeId, 'abandoned');
}

export async function getStreak(userId: string) {
  const { data, error } = await supabase.rpc('get_user_insights', { p_user_id: userId });
  if (error) throw error;
  const insights = data as { streak_days?: number } | null;
  return insights?.streak_days ?? 0;
}
