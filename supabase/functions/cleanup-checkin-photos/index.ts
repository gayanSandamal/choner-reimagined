// Deletes check-in photos from the private checkin-photos bucket and clears
// task_checkins.photo_path for the corresponding rows. Deleting the
// storage.objects row via SQL does not remove the underlying bytes — only the
// Storage API does that — so this is the one place actual deletion happens.
//
// Required secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Invoked by the sweep_checkin_photo_cleanup() cron job via net.http_post, the
// same way sweep_daily_reminders() calls send-push.
//
// Auth: service role only (see ../_shared/internal-auth.ts). It used to trust
// any caller, which let any signed-in user act on any other user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isServiceRoleRequest, unauthorized } from '../_shared/internal-auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CleanupBody {
  paths: string[];
  checkin_ids: string[];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  if (!isServiceRoleRequest(req)) return unauthorized();

  let payload: CleanupBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const paths = payload.paths ?? [];
  const ids = payload.checkin_ids ?? [];
  if (paths.length === 0) return Response.json({ ok: true, removed: 0 });

  const { error: removeError } = await admin.storage.from('checkin-photos').remove(paths);
  if (removeError) {
    console.error('cleanup-checkin-photos: storage remove failed', removeError);
    return new Response(removeError.message, { status: 500 });
  }

  if (ids.length > 0) {
    const { error: updateError } = await admin
      .from('task_checkins')
      .update({ photo_path: null })
      .in('id', ids);
    if (updateError) {
      // The photos are already gone from storage at this point — leaving
      // photo_path stale would make the next sweep try (and fail) to delete
      // them again, but that's a harmless no-op storage.remove() on missing
      // objects, not a repeat failure worth doing anything more here.
      console.error('cleanup-checkin-photos: db update failed', updateError);
      return new Response(updateError.message, { status: 500 });
    }
  }

  return Response.json({ ok: true, removed: paths.length });
});
