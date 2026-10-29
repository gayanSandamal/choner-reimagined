// Deleting your account, the whole way: storage files first, then the database.
//
// delete_account() in SQL can only reach what a foreign key reaches, and
// storage objects have no foreign key to auth.users. Deleting the
// storage.objects row via SQL would not remove the bytes either — only the
// Storage API does that, which is why cleanup-checkin-photos exists at all. So
// an account deleted through the RPC alone left its files behind, and at the
// time `avatars` was a public bucket: the avatar URL kept resolving after the
// account was gone.
//
// Required secrets (all provided by the platform):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_ANON_KEY
//
// Auth: the USER's JWT, not the service role — this is someone deleting their
// own account. The token is re-verified against the auth server with getUser()
// rather than decoded here, and the id that comes back is the only id used.
// Nothing is taken from the request body; there is no way to name someone else.
//
// ORDER MATTERS, AND IT IS STORAGE FIRST
//
// The path prefix IS the user id (`<uid>/...`, enforced by the storage RLS
// policies and true of every object in both buckets), so the account row is
// what makes the files findable. Delete the account first and a storage
// failure orphans files nobody can ever identify again. This way round, a
// storage failure aborts with the account intact and the user can retry; and
// if the database step fails after storage succeeded, the retry's remove() is
// a harmless no-op on already-missing objects. It is the same reasoning
// undoTaskCheckin() uses when it removes the photo before the row.
//
// THE CDN, AND WHY IT IS NO LONGER AN OPEN GAP
//
// `avatars` used to be a public bucket served through a CDN, and that beat
// this function. Measured after a verified delete: the object was gone and a
// fresh fetch returned 400, while a URL that had already been fetched kept
// answering 200 with cf-cache-status: HIT — indefinitely, to anyone, because
// the URL was the whole of the grant.
//
// 202610291400 made the bucket private and moved every screen onto signed
// URLs, which closed it. Measured on a signed avatar response afterwards:
// `cache-control: private, no-cache` and `cf-cache-status: DYNAMIC`. The edge
// keeps no copy of a signed object, so once remove() returns there is nothing
// left anywhere to serve — the same as has always been true of
// checkin-photos. "Deleted immediately" is now true of both buckets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Every bucket in the project. A new bucket added later has to be added here
// too — nothing discovers it automatically.
const BUCKETS = ['avatars', 'checkin-photos'] as const;

const PAGE = 100;

// list() is one level deep and paginated, and both of those bite here. Seed
// avatars live at `<uid>/faces/<file>`, so a flat listing returns the folder
// and none of the files; and that folder holds exactly PAGE entries, which is
// indistinguishable from a full page unless we ask for the next one.
async function listPaths(bucket: string, prefix: string): Promise<string[]> {
  const found: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      // Folders come back without an id; only real objects have one.
      if (entry.id === null) found.push(...(await listPaths(bucket, path)));
      else found.push(path);
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return found;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return new Response('unauthorized', { status: 401 });

  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth?.user) return new Response('unauthorized', { status: 401 });
  const uid = auth.user.id;

  // 1. The files.
  let removed = 0;
  for (const bucket of BUCKETS) {
    let paths: string[];
    try {
      paths = await listPaths(bucket, uid);
    } catch (e) {
      console.error('delete-account: list failed', e);
      return new Response('could not list files', { status: 500 });
    }

    for (let i = 0; i < paths.length; i += PAGE) {
      const chunk = paths.slice(i, i + PAGE);
      const { error } = await admin.storage.from(bucket).remove(chunk);
      if (error) {
        // Nothing has been deleted from the database yet, so the account is
        // still intact and still names its own files. Safe to retry.
        console.error(`delete-account: remove failed in ${bucket}`, error);
        return new Response('could not remove files', { status: 500 });
      }
      removed += chunk.length;
    }
  }

  // 2. The database — as the user, so auth.uid() resolves inside the RPC and
  // delete_account() stays the single source of truth for what else goes
  // (invites addressed to them, their waitlist row, and 60 foreign keys).
  // Calling auth.admin.deleteUser() here instead would skip all of it.
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: rpcError } = await asUser.rpc('delete_account');
  if (rpcError) {
    // The files are already gone. The account survives, so the person can try
    // again — the second attempt's remove() finds nothing and moves on.
    console.error('delete-account: rpc failed', rpcError);
    return new Response(rpcError.message, { status: 500 });
  }

  return Response.json({ ok: true, files_removed: removed });
});
