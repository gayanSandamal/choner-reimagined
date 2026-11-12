import { supabase } from '@/lib/supabase';
import { decodeBase64 } from '@/lib/base64';
import type { PostBackground, PostKind } from './post-rules';

// The Community feed (202611121000). One person's own post: a photo from the
// session or just words, up at once, with their first name only.

export interface CommunityPost {
  id: string;
  kind: PostKind;
  photo_path: string | null;
  body: string;
  background: PostBackground;
  activity_key: string | null;
  sessions_together: number | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  is_mine: boolean;
  is_partner: boolean;
  claps: number;
  i_clapped: boolean;
  // Filled in here, not by the server: a short-lived signed URL.
  photo_url?: string | null;
}

export type PostResult = { ok: true; [k: string]: unknown } | { ok: false; reason: string };

const BUCKET = 'community-photos';

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) throw error;
  return data as T;
}

// The feed, with every photo signed in one call.
export async function getCommunityFeed(before?: string | null): Promise<CommunityPost[]> {
  const rows = (await rpc<CommunityPost[]>('get_community_feed', { p_before: before ?? null, p_limit: 20 })) ?? [];
  const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];
  if (!paths.length) return rows;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const urls = new Map((data ?? []).map((d: any) => [d.path, d.signedUrl as string | null]));
  return rows.map((r) => ({ ...r, photo_url: r.photo_path ? urls.get(r.photo_path) ?? null : null }));
}

export const createCommunityPost = (input: {
  kind: PostKind;
  body: string;
  background: PostBackground;
  photoPath: string | null;
  activityKey: string | null;
}) =>
  rpc<PostResult>('create_community_post', {
    p_kind: input.kind,
    p_body: input.body,
    p_background: input.background,
    p_photo_path: input.photoPath,
    p_activity_key: input.activityKey
  });

export const toggleCommunityClap = (postId: string) => rpc<PostResult>('toggle_community_clap', { p_post_id: postId });
export const hideCommunityPost = (postId: string) => rpc<PostResult>('hide_community_post', { p_post_id: postId });
export const reportCommunityPost = (postId: string) => rpc<PostResult>('report_community_post', { p_post_id: postId });
export const blockCommunityAuthor = (postId: string) => rpc<PostResult>('block_community_author', { p_post_id: postId });
export const removeCommunityPost = (postId: string) => rpc<PostResult>('remove_community_post', { p_post_id: postId });

// <user_id>/<unique>.jpg: the folder is what the storage policy checks.
function newPath(userId: string) {
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

// A new photo, just taken with the live camera.
export async function uploadCommunityPhoto(userId: string, base64: string) {
  const path = newPath(userId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decodeBase64(base64), { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

// The check-in photo from this session, if you took one today. Check-in
// photos are partner-only and deleted within days, so sharing one makes a
// copy in the community bucket rather than pointing at the original.
export async function latestCheckinPhoto(userChallengeId: string): Promise<{ path: string; url: string } | null> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('task_checkins')
    .select('photo_path, created_at')
    .eq('user_challenge_id', userChallengeId)
    .not('photo_path', 'is', null)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data?.[0]?.photo_path) return null;
  const path = data[0].photo_path as string;
  const signed = await supabase.storage.from('checkin-photos').createSignedUrl(path, 60 * 10);
  if (signed.error || !signed.data?.signedUrl) return null;
  return { path, url: signed.data.signedUrl };
}

export async function copyCheckinPhoto(userId: string, signedUrl: string) {
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error('Could not read your check-in photo.');
  const bytes = new Uint8Array(await res.arrayBuffer());
  const path = newPath(userId);
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}
