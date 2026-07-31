import { supabase } from '@/lib/supabase';
import { decodeBase64 } from '@/lib/base64';

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
  userId: string;
  note?: string;
  // Base64 JPEG straight from the camera. Only supplied for 'photo' habits.
  photoBase64?: string;
}) {
  // Upload BEFORE inserting so the path goes in with the row. Attaching it
  // afterwards would need a second write, and a failed upload would otherwise
  // leave a check-in claiming proof it doesn't have.
  let photoPath: string | undefined;
  if (payload.photoBase64) {
    photoPath = await uploadCheckinPhoto({
      userId: payload.userId,
      base64: payload.photoBase64
    });
  }

  const { data, error } = await supabase.from('task_checkins').insert({
    challenge_task_id: payload.taskId,
    user_challenge_id: payload.userChallengeId,
    note: payload.note,
    photo_path: photoPath,
    status: 'completed'
  }).select().single();

  if (error) {
    // Don't leave the orphaned image behind in a private bucket.
    if (photoPath) await supabase.storage.from('checkin-photos').remove([photoPath]);
    throw error;
  }
  return data;
}

// Path is <user_id>/<unique>.jpg — the leading folder is what the storage RLS
// policy reads to decide owner-vs-partner access, so it must stay the
// uploader's own id.
export async function uploadCheckinPhoto(input: {
  userId: string;
  base64: string;
}) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${input.userId}/${unique}.jpg`;
  const { error } = await supabase.storage
    .from('checkin-photos')
    .upload(path, decodeBase64(input.base64), {
      contentType: 'image/jpeg',
      upsert: true
    });
  if (error) throw error;
  return path;
}

// Private bucket, so reads need a signed URL rather than a public one. Short
// expiry because the app re-signs on each view.
export async function getCheckinPhotoUrl(path: string, expiresInSeconds = 60 * 10) {
  const { data, error } = await supabase.storage
    .from('checkin-photos')
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// "Running late, doing it tonight." Saved against the caller's own local day,
// which the server resolves from their timezone so the client and the
// missed-day sweep can never disagree about which day it is.
export async function setLateNote(userChallengeId: string, note: string) {
  const { error } = await (supabase.rpc as any)('set_late_note', {
    p_user_challenge_id: userChallengeId,
    p_note: note
  });
  if (error) throw error;
}

export type DailyStatus = {
  local_date: string;
  late_note: string | null;
  missed_notified_at: string | null;
};

// Today's row for a challenge, if one exists. Used to show the user their own
// state quietly — never to push guilt at them.
export async function getTodayStatus(userChallengeId: string): Promise<DailyStatus | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await (supabase as any)
    .from('daily_status')
    .select('local_date, late_note, missed_notified_at')
    .eq('user_challenge_id', userChallengeId)
    .eq('local_date', today)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function undoTaskCheckin(checkinId: string, photoPath?: string | null) {
  // Remove the photo first: deleting the row loses the only pointer to it, and
  // an orphaned object in a private bucket is invisible but still stored.
  if (photoPath) {
    await supabase.storage.from('checkin-photos').remove([photoPath]);
  }
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
