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

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

