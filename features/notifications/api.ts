import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type PrefsRow = Database['public']['Tables']['notification_preferences']['Row'];

export async function listNotifications(userId: string, opts?: { limit?: number; before?: string }) {
  let q = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 30);
  if (opts?.before) q = q.lt('created_at', opts.before);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function getUnreadCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

export async function getPreferences(userId: string): Promise<PrefsRow> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  // Auto-create defaults
  const defaults: PrefsRow = {
    user_id: userId,
    push_enabled: true,
    streak_alerts: true,
    accountability_alerts: true,
    ai_recovery_alerts: true,
    updated_at: new Date().toISOString(),
  };
  const { error: insErr } = await supabase.from('notification_preferences').insert(defaults);
  if (insErr) throw insErr;
  return defaults;
}

export async function updatePreferences(userId: string, patch: Partial<PrefsRow>) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function registerPushToken(input: { userId: string; token: string }) {
  const { error } = await supabase
    .from('user_devices')
    .upsert(
      {
        user_id: input.userId,
        expo_push_token: input.token,
        platform: Platform.OS,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' }
    );
  if (error) throw error;
}

export async function unregisterPushToken(token: string) {
  const { error } = await supabase.from('user_devices').delete().eq('expo_push_token', token);
  if (error) throw error;
}
