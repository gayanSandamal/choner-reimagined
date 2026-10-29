import { supabase } from '@/lib/supabase';
import { decodeBase64 } from '@/lib/base64';
import { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (data) return data;
  // Profile row missing (e.g. Apple Sign-In before the upsert ran, or a backfill gap).
  // Create one on demand so the UI never hits ErrorState for this.
  const { data: created, error: createErr } = await supabase
    .from('profiles')
    .insert({ id: userId })
    .select()
    .single();
  if (createErr) throw createErr;
  return created;
}

export async function updateProfile(userId: string, payload: Partial<ProfileRow>) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Upload an image (provided as a base64 string from expo-image-picker) to the
 * `avatars` Supabase Storage bucket and return its storage path.
 *
 * The path, not a URL: the bucket is private since 202610291400, so
 * avatar_url holds `<uid>/<file>` and whoever renders it signs it. The
 * leading folder has to be the uploader's own id — that is what
 * avatars_owner_write reads.
 */
export async function uploadAvatar(input: {
  userId: string;
  base64: string;
  contentType?: string;
}) {
  const ext = input.contentType?.split('/')[1] ?? 'jpg';
  const path = `${input.userId}/${Date.now()}.${ext}`;
  const bytes = decodeBase64(input.base64);
  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      contentType: input.contentType ?? 'image/jpeg',
      upsert: true,
    });
  if (uploadErr) throw uploadErr;

  await updateProfile(input.userId, { avatar_url: path });
  return path;
}

/**
 * Send a photo taken live with the camera to the server, which stores it and
 * marks it confirmed.
 *
 * The client does NOT write this one. Uploading here and then claiming the
 * badge was the hole (202610291600): anything you can put in your own folder,
 * you could then pass to set_live_photo(), so a gallery photo earned the
 * badge in two REST calls. Live photos now go to `<uid>/live/`, a prefix no
 * client can insert into, and only the edge function — holding the service
 * role — can write it and award the badge.
 *
 * So the badge means the bytes came through our server. It still does not
 * prove a live human; nothing in the copy claims it does.
 *
 * Unlike uploadAvatar() above, which writes straight to the bucket and
 * therefore resets the badge on purpose.
 */
export async function uploadLivePhoto(input: { userId: string; base64: string }) {
  const { data, error } = await supabase.functions.invoke('submit-live-photo', {
    body: { base64: input.base64 },
  });
  if (error) throw error;
  return data;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Goes through the `delete-account` edge function rather than calling the
 * `delete_account` RPC directly. The RPC is still the whole of the database
 * side, but it cannot touch storage: objects have no foreign key to
 * auth.users, and only the Storage API removes the bytes. The function does
 * the files first and then calls that same RPC.
 *
 * Deliberately no fallback to the RPC on failure — falling back would delete
 * the account and silently leave the photos behind, reachable by anyone still
 * holding a signature for them. Better to fail and be retried.
 */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  await supabase.auth.signOut();
}


/* The First 200 handshake, from the app's side.
 *
 * Most of the 200 never call this. link_first_200() is a trigger on email
 * VERIFICATION: if the address someone signs up with matches the one they
 * registered with, profiles.is_first_200 is already true before they reach
 * any screen, and the code screen hides itself.
 *
 * This is the fallback for someone who signed up with a different address.
 * claim_prelaunch is SECURITY DEFINER and granted to `authenticated` only:
 * needing an account IS the rate limit, because brute-forcing six characters
 * then costs a signup per attempt.
 */
export type ClaimResult =
  | { ok: true; firstName: string | null }
  | { ok: false; reason: 'not_found' | 'already_claimed' | 'not_signed_in' | 'unknown'; message: string };

export async function claimFirstTwoHundred(code: string): Promise<ClaimResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: 'not_found', message: 'Enter your code first.' };

  const { data, error } = await supabase.rpc('claim_prelaunch' as never, { p_code: trimmed } as never);

  if (!error) {
    const row = data as { ok?: boolean; first_name?: string | null } | null;
    return { ok: true, firstName: row?.first_name ?? null };
  }

  // The function raises named exceptions; Postgres hands them back in the
  // message. Each one gets a sentence that blames the code, never the person.
  const raw = (error.message ?? '').toLowerCase();
  if (raw.includes('code_not_found')) {
    return {
      ok: false,
      reason: 'not_found',
      message: "We don't recognise that code. Check it against the email we sent."
    };
  }
  if (raw.includes('already_claimed')) {
    return {
      ok: false,
      reason: 'already_claimed',
      message: 'That code has already been used. If that was you on another account, sign in with it instead.'
    };
  }
  if (raw.includes('not_authenticated')) {
    return { ok: false, reason: 'not_signed_in', message: 'Sign in first, then try your code again.' };
  }
  return { ok: false, reason: 'unknown', message: "That didn't work. Check your connection and try again." };
}
