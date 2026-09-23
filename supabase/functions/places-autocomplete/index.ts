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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: CORS });

  // Signed-in users only (same check as ai-coach).
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  if (!auth?.user) return new Response('unauthorized', { status: 401, headers: CORS });

  let body: { input?: string; sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400, headers: CORS });
  }
  const input = String(body.input ?? '').trim().slice(0, 100);
  if (input.length < 2 || !KEY) {
    return Response.json({ suggestions: [] }, { headers: CORS });
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
    return Response.json({ suggestions: [] }, { headers: CORS });
  }
  const json = await res.json();
  const suggestions = (json.suggestions ?? [])
    .map((s: any) => s.placePrediction?.structuredFormat)
    .filter(Boolean)
    .slice(0, 5)
    .map((f: any) => ({ name: f.mainText?.text ?? '', detail: f.secondaryText?.text ?? null }))
    .filter((s: { name: string }) => s.name);
  return Response.json({ suggestions }, { headers: CORS });
});
