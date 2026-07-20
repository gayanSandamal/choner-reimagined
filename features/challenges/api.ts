import { supabase } from '@/lib/supabase';

export async function getTemplates() {
  const { data, error } = await supabase.from('challenge_templates').select('*').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getTemplateBySlug(slug: string) {
  const { data, error } = await supabase
    .from('challenge_templates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
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
  // Pinned to the solo track: once a partner joins, a user has two 'active'
  // rows, so filtering on status alone would return multiple. The
  // challenge-detail screen only cares about the user's own solo challenge.
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge_templates(*), challenge_tasks(*, task_checkins(*))')
    .eq('user_id', userId)
    .eq('accountability_mode', 'solo')
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type DefaultChallenges = {
  solo: any | null;
  partner: any | null;
};

// Home's two default tracks. Returns the newest live row for each mode so a
// stray abandoned/duplicate challenge can't shadow the current one.
export async function getDefaultChallenges(userId: string): Promise<DefaultChallenges> {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge_templates(*), challenge_tasks(*, task_checkins(*))')
    .eq('user_id', userId)
    .in('accountability_mode', ['solo', 'partner'])
    .in('status', ['active', 'pending', 'paused'])
    .order('started_at', { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  return {
    solo: rows.find((r: any) => r.accountability_mode === 'solo') ?? null,
    partner: rows.find((r: any) => r.accountability_mode === 'partner') ?? null
  };
}

export async function ensureDefaultChallenges(payload: {
  userId: string;
  soloTemplateId?: string;
  partnerTemplateId?: string;
}) {
  const { error } = await supabase.rpc('ensure_default_challenges', {
    p_user_id: payload.userId,
    p_solo_template_id: payload.soloTemplateId ?? undefined,
    p_partner_template_id: payload.partnerTemplateId ?? undefined
  });
  if (error) throw error;
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
