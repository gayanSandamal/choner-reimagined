// Sends an Expo push notification to all of a user's registered devices,
// records an in-app notification row, and respects the user's preferences.
//
// Required secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Invoke from another edge function or a Postgres trigger via
//   supabase.functions.invoke('send-push', { body: { userId, kind, title, body, data, route } })
//
// Auth: this function uses the service role and trusts its caller — make sure
// it's only reachable via the function key or from inside Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SendPushBody {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  route?: string;
  // If true, also stores an in-app notification row (default: true)
  persist?: boolean;
}

const KIND_PREF_MAP: Record<string, string> = {
  partner_activity: 'accountability_alerts',
  // A nudge is partner accountability by another name, so it honours the same
  // opt-out. Without this entry the kind is unmapped and the check below is
  // skipped entirely — the nudge would reach someone who had turned
  // accountability alerts off.
  partner_nudge: 'accountability_alerts',
  partner_matched: 'accountability_alerts',
  streak_risk: 'streak_alerts',
  ai_suggestion: 'ai_recovery_alerts',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  let payload: SendPushBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  if (!payload.userId || !payload.kind || !payload.title) {
    return new Response('missing fields', { status: 400 });
  }

  // Persist in-app notification row first.
  if (payload.persist !== false) {
    await admin.from('notifications').insert({
      user_id: payload.userId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body ?? null,
      data: { ...(payload.data ?? {}), route: payload.route ?? null },
    });
  }

  // Check user preferences.
  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', payload.userId)
    .maybeSingle();

  if (prefs?.push_enabled === false) {
    return Response.json({ ok: true, skipped: 'push_disabled' });
  }
  const prefKey = KIND_PREF_MAP[payload.kind];
  if (prefKey && prefs && (prefs as Record<string, boolean>)[prefKey] === false) {
    return Response.json({ ok: true, skipped: 'kind_disabled' });
  }

  // Fetch tokens.
  const { data: devices } = await admin
    .from('user_devices')
    .select('expo_push_token')
    .eq('user_id', payload.userId);
  const tokens = (devices ?? []).map((d) => d.expo_push_token).filter(Boolean);
  if (tokens.length === 0) return Response.json({ ok: true, skipped: 'no_tokens' });

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body ?? '',
    data: { ...(payload.data ?? {}), route: payload.route ?? null, kind: payload.kind },
  }));

  // Expo push API accepts arrays in batches of up to 100.
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('expo push failed', text);
    return new Response(text, { status: 500 });
  }
  const json = await res.json();
  return Response.json({ ok: true, expo: json });
});
