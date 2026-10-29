// The only way to earn "Photo confirmed".
//
// The camera-only rule used to live entirely in app/onboarding/photo.tsx, and
// a rule the client enforces is not a rule: uploading a gallery photo to your
// own avatars folder and then calling set_live_photo() on it earned the badge
// in two REST calls, with the anon key that ships in the app binary. See
// 202610291600 for the measurement.
//
// Now the bytes come through here. `<uid>/live/` is a server-only prefix that
// no client can insert into or update, this function writes it with the
// service role, and set_live_photo_for() — granted to service_role alone —
// awards the badge only for a path in that prefix that exists and was written
// seconds ago.
//
// WHAT THIS PROVES, AND WHAT IT DOES NOT
//
// It proves the bytes passed through our server. It does NOT prove a real face
// was in front of a real camera: a modified client can still POST any JPEG
// here. Proving the caller is our unmodified app needs device attestation
// (Play Integrity / App Attest); proving a live human needs liveness
// detection, which is biometric processing and changes the Play Data safety
// declaration. Both are out of scope on purpose. The badge copy still says
// "Photo confirmed", never "verified".
//
// Required secrets (all provided by the platform):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Auth: the USER's JWT, re-verified with getUser(). The id that comes back is
// the only id used — the body carries image bytes and nothing else, so there
// is no way to award the badge to someone else.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'avatars';

// A front-camera JPEG at quality 0.7 is a few hundred KB. The floor rejects a
// truncated or placeholder upload; the ceiling is well clear of a real photo
// and keeps a large body from being written to storage at all.
const MIN_BYTES = 4 * 1024;
const MAX_BYTES = 8 * 1024 * 1024;

// takePictureAsync() returns JPEG. Checking the magic bytes is not a security
// control — the client could send any real JPEG — it just stops junk and
// non-images being stored and served as an avatar.
function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return new Response('unauthorized', { status: 401 });

  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth?.user) return new Response('unauthorized', { status: 401 });
  const uid = auth.user.id;

  let base64: unknown;
  try {
    base64 = (await req.json())?.base64;
  } catch {
    return new Response('bad json', { status: 400 });
  }
  if (typeof base64 !== 'string' || base64.length === 0) {
    return new Response('a live photo needs image bytes', { status: 400 });
  }

  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(base64);
  } catch {
    return new Response('could not decode the image', { status: 400 });
  }

  if (bytes.length < MIN_BYTES || bytes.length > MAX_BYTES) {
    return new Response('that image is the wrong size', { status: 400 });
  }
  if (!isJpeg(bytes)) {
    return new Response('a live photo must be a jpeg', { status: 400 });
  }

  const path = `${uid}/live/${Date.now()}.jpg`;

  // upsert stays off: the path is timestamped, so a collision would mean
  // something unexpected rather than a retake, and overwriting is the thing
  // the server-only prefix exists to prevent.
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) {
    console.error('submit-live-photo: upload failed', uploadError);
    return new Response('could not store the photo', { status: 500 });
  }

  const { error: awardError } = await admin.rpc('set_live_photo_for', {
    p_uid: uid,
    p_path: path,
  });
  if (awardError) {
    // The badge was not awarded, so the object has nothing pointing at it.
    // Remove it rather than leaving an orphan in a bucket nobody lists.
    await admin.storage.from(BUCKET).remove([path]);
    console.error('submit-live-photo: award failed', awardError);
    return new Response(awardError.message, { status: 500 });
  }

  // Only now that the new photo is the live one: a retake should not be able
  // to destroy the previous photo and then fail, leaving no photo at all.
  // Failure here is logged and otherwise ignored — a stale object costs
  // storage, not correctness, and delete-account sweeps the whole prefix.
  const { data: existing } = await admin.storage.from(BUCKET).list(`${uid}/live`, { limit: 100 });
  const stale = (existing ?? [])
    .filter((entry) => entry.id !== null && `${uid}/live/${entry.name}` !== path)
    .map((entry) => `${uid}/live/${entry.name}`);
  if (stale.length > 0) {
    const { error } = await admin.storage.from(BUCKET).remove(stale);
    if (error) console.error('submit-live-photo: could not remove stale photos', error);
  }

  return Response.json({ ok: true, path });
});
