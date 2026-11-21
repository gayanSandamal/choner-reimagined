// Place suggestions for "Where" (handover §3.7), via Google Places
// Autocomplete (New). Called through this function — never from the app — so
// the API key never ships in the bundle.
//
// Restricted to the Colombo area and Sri Lanka, not the whole world. There is
// no map and no GPS anywhere in this flow: a place is text the pair agree on.
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (to validate the caller)
//   GOOGLE_PLACES_API_KEY                    (unset = empty suggestions;
//                                             free text still works)
//
// Body: { input: string, sessionToken?: string }
// Returns: { suggestions: { name: string, detail: string | null }[] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCors } from '../_shared/cors.ts';
import { rateLimited } from '../_shared/rate-limit.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
const KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';

// Greater Colombo, generously — Kotte, Dehiwala, Moratuwa, Kaduwela, Wattala.
const COLOMBO = {
  rectangle: {
    low: { latitude: 6.75, longitude: 79.8 },
    high: { latitude: 7.05, longitude: 80.05 }
  }
};

Deno.serve(withCors(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  // Signed-in users only (same check as delete-account).
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  if (!auth?.user) return new Response('unauthorized', { status: 401 });

  // Every call here is billed by Google. Typing a place is a burst of calls, so
  // the cap is per minute and generous for a person, tight for a script. Over
  // the cap the answer is the same empty list a failure gives: typing a place
  // still works, it just stops suggesting.
  if (await rateLimited(`places:${auth.user.id}`, 40, 60)) {
    return Response.json({ suggestions: [] }, { status: 429 });
  }

  let body: { input?: string; sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const input = String(body.input ?? '').trim().slice(0, 100);
  if (input.length < 2 || !KEY) {
    return Response.json({ suggestions: [] });
  }

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ['lk'],
      locationRestriction: COLOMBO,
      // Groups the keystrokes of one search into one billed session.
      sessionToken: body.sessionToken
    })
  });
  if (!res.ok) {
    console.error('places autocomplete failed', res.status, await res.text());
    // Suggestions are a convenience; a failure must not block typing a place.
    return Response.json({ suggestions: [] });
  }
  const json = await res.json();
  const suggestions = (json.suggestions ?? [])
    .map((s: any) => s.placePrediction?.structuredFormat)
    .filter(Boolean)
    .slice(0, 5)
    .map((f: any) => ({ name: f.mainText?.text ?? '', detail: f.secondaryText?.text ?? null }))
    .filter((s: { name: string }) => s.name);
  return Response.json({ suggestions });
}));
