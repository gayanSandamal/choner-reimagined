import { supabase } from '@/lib/supabase';

export type GroupVisibility = 'public' | 'private';

export async function listGroups(opts?: { mineOnly?: boolean; userId?: string }) {
  let query = supabase.from('groups').select('*').order('created_at', { ascending: false });
  if (opts?.mineOnly && opts.userId) {
    const { data: memberships, error: memErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', opts.userId);
    if (memErr) throw memErr;
    const ids = (memberships ?? []).map((m) => m.group_id);
    if (ids.length === 0) return [];
    query = query.in('id', ids);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getGroup(groupId: string) {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createGroup(input: {
  userId: string;
  title: string;
  description?: string;
  visibility?: GroupVisibility;
}) {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility ?? 'public',
      created_by: input.userId,
    })
    .select()
    .single();
  if (error) throw error;
  // creator joins as admin
  const { error: memErr } = await supabase
    .from('group_members')
    .insert({ group_id: data.id, user_id: input.userId, role: 'admin' });
  if (memErr) throw memErr;
  return data;
}

export async function joinGroup(input: { groupId: string; userId: string }) {
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: input.groupId, user_id: input.userId, role: 'member' });
  if (error) throw error;
}

export async function leaveGroup(input: { groupId: string; userId: string }) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', input.groupId)
    .eq('user_id', input.userId);
  if (error) throw error;
}

export async function listGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles!group_members_user_id_fkey(full_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function isGroupMember(groupId: string, userId: string) {
  const { count, error } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function listPosts(opts: { groupId?: string | null; limit?: number; before?: string }) {
  let q = supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 20);
  if (opts.groupId) q = q.eq('group_id', opts.groupId);
  if (opts.before) q = q.lt('created_at', opts.before);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getPost(postId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(full_name, avatar_url)')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPost(input: { userId: string; groupId?: string | null; body: string }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: input.userId, group_id: input.groupId ?? null, body: input.body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function listComments(postId: string) {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, profiles!post_comments_author_id_fkey(full_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createComment(input: { postId: string; userId: string; body: string }) {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: input.postId, author_id: input.userId, body: input.body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reactToPost(input: { postId: string; userId: string; reaction?: string }) {
  const reaction = input.reaction ?? 'cheer';
  const { error } = await supabase
    .from('post_reactions')
    .upsert({ post_id: input.postId, user_id: input.userId, reaction });
  if (error) throw error;
}

export async function unreactToPost(input: { postId: string; userId: string; reaction?: string }) {
  const reaction = input.reaction ?? 'cheer';
  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', input.postId)
    .eq('user_id', input.userId)
    .eq('reaction', reaction);
  if (error) throw error;
}

export async function reportContent(input: {
  reporterId: string;
  targetKind: 'post' | 'comment' | 'profile' | 'group';
  targetId: string;
  reason: string;
  details?: string;
}) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    target_kind: input.targetKind,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw error;
}

// Invitations
export async function createInvite(input: {
  userChallengeId?: string;
  email: string;
  inviterId: string;
  inviterName?: string;
}) {
  // 1. Insert invite row (token auto-generated by DB default)
  const { data: invite, error } = await supabase
    .from('challenge_invites')
    .insert({
      user_challenge_id: input.userChallengeId ?? null,
      email: input.email,
      invited_by: input.inviterId,
    })
    .select()
    .single();
  if (error) throw error;

  // 2. Fire the email edge function (best-effort; the invite row is the source of truth)
  try {
    await supabase.functions.invoke('invite-email', {
      body: {
        email: input.email,
        inviterName: input.inviterName,
        token: invite.token,
        challengeId: input.userChallengeId,
      },
    });
  } catch {
    // swallow — the invite still exists and can be re-sent
  }
  return invite;
}

export async function listMyPendingInvites(userId: string) {
  const { data, error } = await supabase
    .from('challenge_invites')
    .select('*')
    .eq('invited_by', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Re-fires the invite email for an existing pending invite. No new row:
// the token stays valid, so the old link and the resent one both work.
export async function resendInvite(invite: {
  email: string;
  token: string;
  user_challenge_id?: string | null;
  inviterName?: string;
}) {
  const { error } = await supabase.functions.invoke('invite-email', {
    body: {
      email: invite.email,
      inviterName: invite.inviterName,
      token: invite.token,
      challengeId: invite.user_challenge_id ?? undefined,
    },
  });
  if (error) throw error;
}

export async function acceptInvite(token: string) {
  const { data, error } = await supabase.rpc('accept_challenge_invite', { p_token: token });
  if (error) throw error;
  return data as string | null;
}
