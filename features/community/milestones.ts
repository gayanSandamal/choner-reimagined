import { supabase } from '@/lib/supabase';

// Community is opt-in social proof: a pair hits something worth noticing, and
// may choose to share it with their own city. Nothing is ever published
// automatically.

export type MilestoneKind = 'streak' | 'complete' | 'matched';

export interface FeedItem {
  id: string;
  kind: MilestoneKind;
  habit_title: string | null;
  streak_days: number | null;
  created_at: string;
  sharer_name: string;
  partner_name: string | null;
  sharer_avatar: string | null;
  partner_avatar: string | null;
  reactions: number;
  i_reacted: boolean;
}

export interface CityFeed {
  city: string | null;
  items: FeedItem[];
}

// One round trip, and the only way to read other people's milestones — the RPC
// is security definer so it can resolve first names and avatars, which
// profiles won't hand over across users.
export async function getCityFeed(limit = 30): Promise<CityFeed> {
  const { data, error } = await (supabase.rpc as any)('get_city_feed', { p_limit: limit });
  if (error) throw error;
  return (data as CityFeed) ?? { city: null, items: [] };
}

// The user's answer to "Share this with <city>?".
//
// A decline is stored too, as a row with shared=false. That row is what stops
// the prompt asking the same question every time the app opens — so declining
// must write, not just close the sheet.
export async function recordMilestoneDecision(input: {
  userId: string;
  partnerUserId?: string | null;
  userChallengeId?: string | null;
  kind: MilestoneKind;
  habitTitle?: string | null;
  streakDays?: number | null;
  city?: string | null;
  shared: boolean;
}) {
  const { error } = await (supabase as any).from('milestones').upsert(
    {
      shared_by: input.userId,
      partner_user_id: input.partnerUserId ?? null,
      user_challenge_id: input.userChallengeId ?? null,
      kind: input.kind,
      habit_title: input.habitTitle ?? null,
      streak_days: input.streakDays ?? null,
      city: input.city ?? null,
      shared: input.shared
    },
    { onConflict: 'shared_by,user_challenge_id,kind', ignoreDuplicates: true }
  );
  if (error) throw error;
}

// Which milestones this user has already been asked about, so the prompt can
// stay quiet. Returns the kinds already decided for a given challenge.
export async function getDecidedMilestoneKinds(
  userId: string,
  userChallengeId: string | null
): Promise<MilestoneKind[]> {
  let q = (supabase as any)
    .from('milestones')
    .select('kind')
    .eq('shared_by', userId);
  q = userChallengeId ? q.eq('user_challenge_id', userChallengeId) : q.is('user_challenge_id', null);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as { kind: MilestoneKind }[]).map((r) => r.kind);
}

// One tap, one emoji, and tapping again takes it back.
export async function toggleMilestoneReaction(input: {
  milestoneId: string;
  userId: string;
  reacted: boolean;
}) {
  if (input.reacted) {
    const { error } = await (supabase as any)
      .from('milestone_reactions')
      .delete()
      .eq('milestone_id', input.milestoneId)
      .eq('user_id', input.userId);
    if (error) throw error;
    return;
  }
  const { error } = await (supabase as any)
    .from('milestone_reactions')
    .insert({ milestone_id: input.milestoneId, user_id: input.userId });
  if (error) throw error;
}

// 'Asia/Colombo' -> 'Colombo'. Mirrors city_from_timezone() in the database so
// a client can show a sensible city before the profile round trip lands.
export function cityFromTimezone(timezone?: string | null): string | null {
  if (!timezone) return null;
  const last = timezone.split('/').pop();
  return last ? last.replace(/_/g, ' ') : null;
}
