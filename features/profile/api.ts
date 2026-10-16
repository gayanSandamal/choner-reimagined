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
 * `avatars` Supabase Storage bucket and return the public URL.
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

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  await updateProfile(input.userId, { avatar_url: data.publicUrl });
  return data.publicUrl;
}

/**
 * Upload a photo taken live with the camera and mark it confirmed.
 *
 * Same `avatars` bucket as a gallery upload, but the write goes through
 * set_live_photo(): that RPC is the only thing that can set
 * photo_status = 'photo_confirmed' (202609291200). A plain avatar_url update
 * resets the badge, which is what uploadAvatar() above does on purpose.
 */
export async function uploadLivePhoto(input: { userId: string; base64: string }) {
  const path = `${input.userId}/live-${Date.now()}.jpg`;
  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, decodeBase64(input.base64), { contentType: 'image/jpeg', upsert: true });
  if (uploadErr) throw uploadErr;

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  const { data, error } = await supabase.rpc('set_live_photo', { p_url: pub.publicUrl });
  if (error) throw error;
  return data;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
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
