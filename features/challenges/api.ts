import { supabase } from '@/lib/supabase';
import { decodeBase64 } from '@/lib/base64';
import { ReflectionAnswer, isAnswered } from './reflections';

// Retired templates (is_active=false) stay in the table because live
// challenges still point at them, but they must never be offered again — not
// in the Quests list and not in the onboarding picker.
export async function getTemplates() {
  const { data, error } = await supabase
    .from('challenge_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
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


// How the partner half of the heart is currently filled.
//   solo      — no partner, not looking. Dashed half.
//   invited   — invite sent, waiting on a specific person.
//   finding   — in the matching pool. Pulsing half.
//   matched   — paired, waiting on one or both to confirm.
//   partnered — confirmed and live. Filled half.
export type PartnerState = 'solo' | 'invited' | 'finding' | 'matched' | 'partnered';

// The user's single live challenge.
//
// Replaces the old solo+partner pair: the Challenges tab is built on one heart
// whose left half is you and right half is your partner, which is one challenge
// with an optional partner rather than two parallel ones.
export async function getMyChallenge(userId: string) {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge_templates(*), challenge_tasks(*, task_checkins(*))')
    .eq('user_id', userId)
    .in('status', ['active', 'pending', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function partnerStateOf(challenge: any): PartnerState {
  return (challenge?.partner_state as PartnerState) ?? 'solo';
}

// Idempotent: returns the existing challenge's id when there already is one, so
// this can be called freely without risking a second row.
export async function ensureUserChallenge(payload: {
  userId: string;
  templateId?: string;
  customHabitTitle?: string | null;
}): Promise<string | null> {
  const { data, error } = await (supabase.rpc as any)('ensure_user_challenge', {
    p_user_id: payload.userId,
    p_template_id: payload.templateId ?? undefined,
    p_custom_habit_title: payload.customHabitTitle ?? null
  });
  if (error) throw error;
  return (data as string) ?? null;
}

// The habit a challenge is actually running, which is the user's own text
// when they wrote their own at Step 1. Everything user-facing should read the
// habit through here rather than reaching for the template title directly.
export function challengeHabitTitle(challenge: any): string | null {
  const custom = challenge?.custom_habit_title?.trim();
  if (custom) return custom;
  return challenge?.challenge_templates?.title ?? null;
}

// Point an existing track at the habit chosen in Step 1. Onboarding
// provisions both tracks before the picker runs, so by this point the rows
// exist and re-provisioning would be a no-op — this repoints them instead.
export async function setChallengeHabit(payload: {
  userChallengeId: string;
  templateId: string;
  customHabitTitle?: string | null;
}) {
  const { error } = await (supabase.rpc as any)('set_challenge_habit', {
    p_user_challenge_id: payload.userChallengeId,
    p_template_id: payload.templateId,
    p_custom_habit_title: payload.customHabitTitle ?? null
  });
  if (error) throw error;
}

// Apply the Step 1 choice to the user's challenge, provisioning it first if
// the best-effort call on Screen 5 didn't manage to.
export async function setMyChallengeHabit(payload: {
  userId: string;
  templateId: string;
  customHabitTitle?: string | null;
}) {
  const existing = await getMyChallenge(payload.userId);
  if (!existing?.id) {
    await ensureUserChallenge({
      userId: payload.userId,
      templateId: payload.templateId,
      customHabitTitle: payload.customHabitTitle
    });
    return;
  }
  await setChallengeHabit({
    userChallengeId: existing.id,
    templateId: payload.templateId,
    customHabitTitle: payload.customHabitTitle
  });
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
  reminded_at: string | null;
};

// Today's row for a challenge, if one exists. Used to show the user their own
// state quietly — never to push guilt at them.
//
// Goes through an RPC rather than selecting on local_date directly: this date
// has to be the user's own, and the client can only offer UTC. Those disagree
// for five and a half hours a night in Asia/Colombo, which was long enough for
// someone's "running late" note to disappear off their own screen right after
// they wrote it.
export async function getTodayStatus(userChallengeId: string): Promise<DailyStatus | null> {
  const { data, error } = await (supabase.rpc as any)('get_today_status', {
    p_user_challenge_id: userChallengeId
  });
  if (error) throw error;
  return (data as DailyStatus) ?? null;
}

// The user's four "Why" answers. Owner-only under RLS by design — these are
// personal motivation notes, never shown to the partner, so there is
// deliberately no way to read someone else's.
export async function getReflections(userId: string): Promise<ReflectionAnswer[]> {
  const { data, error } = await (supabase as any)
    .from('challenge_reflections')
    .select('question_key, choice_key, custom_text')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as ReflectionAnswer[];
}

// Replaces the whole set: an answer the user cleared has to actually
// disappear, or the daily rotation would keep resurfacing a line they removed.
export async function saveReflections(payload: {
  userId: string;
  userChallengeId?: string | null;
  answers: ReflectionAnswer[];
}) {
  // "Something else" with an empty field isn't an answer — storing it would
  // give the rotation a row it can render nothing from.
  const rows = payload.answers.filter(isAnswered);
  const keptKeys = rows.map((r) => r.question_key);

  let del = (supabase as any)
    .from('challenge_reflections')
    .delete()
    .eq('user_id', payload.userId);
  if (keptKeys.length) del = del.not('question_key', 'in', `(${keptKeys.join(',')})`);
  const { error: deleteError } = await del;
  if (deleteError) throw deleteError;

  if (!rows.length) return;

  const { error } = await (supabase as any).from('challenge_reflections').upsert(
    rows.map((r) => ({
      user_id: payload.userId,
      user_challenge_id: payload.userChallengeId ?? null,
      question_key: r.question_key,
      choice_key: r.choice_key,
      custom_text: r.custom_text?.trim() || null,
      updated_at: new Date().toISOString()
    })),
    { onConflict: 'user_id,question_key' }
  );
  if (error) throw error;
}

// A confirmed partner's reasons. Readable because the pairing opens a SELECT
// policy on challenge_reflections — a pending match or someone still in the
// pool gets nothing back, which is the point.
export async function getPartnerReflections(partnerId: string): Promise<ReflectionAnswer[]> {
  const { data, error } = await (supabase as any)
    .from('challenge_reflections')
    .select('question_key, choice_key, custom_text')
    .eq('user_id', partnerId);
  if (error) throw error;
  return (data ?? []) as ReflectionAnswer[];
}

// ============================================================
// Finding a partner
//
// Manual/concierge at this stage: joining the pool means "I'm waiting", and a
// human does the pairing. Nothing here auto-matches.
// ============================================================

// Move the partner half of the heart. Owner-only via RLS on user_challenges.
export async function setPartnerState(userChallengeId: string, state: PartnerState) {
  const { error } = await (supabase as any)
    .from('user_challenges')
    .update({ partner_state: state })
    .eq('id', userChallengeId);
  if (error) throw error;
}

export async function joinMatchPool(payload: { userChallengeId: string; timezone?: string }) {
  const { data, error } = await (supabase.rpc as any)('join_match_pool', {
    p_user_challenge_id: payload.userChallengeId,
    p_timezone:
      payload.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
  });
  if (error) throw error;
  return data as string;
}

export async function leaveMatchPool(userChallengeId: string) {
  const { error } = await (supabase.rpc as any)('leave_match_pool', {
    p_user_challenge_id: userChallengeId
  });
  if (error) throw error;
}

export type MyMatch =
  | {
      matched: false;
      // Still in the pool.
      searching?: boolean;
      // We looked and nobody cleared the bar. Distinct from `searching` alone,
      // which cannot tell "give it a moment" apart from "there is nobody",
      // and the second can be permanent rather than slow.
      no_match?: boolean;
      searches_left?: number;
      daily_limit?: number;
    }
  | {
      matched: true;
      match_id: string;
      partner_first_name: string;
      // The one curated line written at pairing time — never the other
      // person's raw reflections, who are strangers until both confirm.
      blurb: string | null;
      habit: string;
      duration_days: number;
      i_confirmed: boolean;
      they_confirmed: boolean;
      // Whether this user's own tap produced the pairing. Decides which
      // question they are asked: "keep them?" versus "will you take them on?".
      i_requested: boolean;
      searches_left: number;
      daily_limit: number;
    };

export async function getMyMatch(): Promise<MyMatch> {
  const { data, error } = await (supabase.rpc as any)('get_my_match');
  if (error) throw error;
  return (data as MyMatch) ?? { matched: false };
}

export async function confirmMatch(matchId: string): Promise<{ confirmed: boolean; both: boolean }> {
  const { data, error } = await (supabase.rpc as any)('confirm_match', { p_match_id: matchId });
  if (error) throw error;
  return data as { confirmed: boolean; both: boolean };
}

export async function declineMatch(matchId: string) {
  const { error } = await (supabase.rpc as any)('decline_match', { p_match_id: matchId });
  if (error) throw error;
}

export type FindAnotherResult =
  | { ok: true; searches_left: number }
  | { ok: false; reason: 'daily_limit' | 'match_not_found'; daily_limit?: number };

// "Not this one." Different from declineMatch, which is the symmetric
// "neither of us wants this" — this declines and immediately looks again for
// the caller, and spends one of their three daily searches to do it.
export async function findAnotherMatch(matchId: string): Promise<FindAnotherResult> {
  const { data, error } = await (supabase.rpc as any)('find_another_match', {
    p_match_id: matchId
  });
  if (error) throw error;
  return data as FindAnotherResult;
}

// join_match_pool raises this when the day's three searches are gone. Postgres
// gives us the raw exception text, which is not something to put on screen.
export function isDailySearchLimit(error: unknown): boolean {
  return String((error as { message?: string })?.message ?? '').includes(
    'daily_search_limit_reached'
  );
}

// ============================================================
// Nudging
// ============================================================

// Why the refusals are values and not exceptions: four of these five are
// ordinary states the UI has something specific to say about, not failures.
export type NudgeResult =
  | { sent: true }
  | {
      sent: false;
      reason:
        | 'no_partner'
        | 'already_logged'
        | 'already_nudged'
        | 'quiet_hours'
        | 'not_configured';
    };

// Takes no arguments on purpose. The partner, both timezones and the once-a-day
// limit are all resolved server-side — a client that got to name its recipient
// would be a way to nudge strangers.
export async function nudgePartner(): Promise<NudgeResult> {
  const { data, error } = await (supabase.rpc as any)('nudge_partner');
  if (error) throw error;
  return data as NudgeResult;
}

export function nudgeRefusalMessage(reason: string, partnerName?: string | null): string {
  const who = (partnerName ?? '').trim().split(/\s+/)[0] || 'They';
  switch (reason) {
    case 'already_logged':
      return `${who} already logged today.`;
    case 'already_nudged':
      return `You've already nudged ${who} today.`;
    case 'quiet_hours':
      return `It's late where ${who} is — try in the morning.`;
    case 'no_partner':
      return 'No partner to nudge yet.';
    default:
      return "Couldn't send that nudge.";
  }
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
