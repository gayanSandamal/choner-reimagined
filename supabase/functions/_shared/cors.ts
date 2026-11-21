// CORS for the edge functions the app calls from the browser.
//
// Why this exists. On iOS and Android there is no CORS: fetch just goes. On
// web the browser sends a preflight OPTIONS request first, and a function that
// does not answer it never receives the real request at all. supabase-js
// reports that as "Failed to send a request to the Edge Function", which reads
// like the function is missing or the project URL is wrong, and is neither.
//
// That is why account deletion worked perfectly on an iPhone and failed on the
// web build of the same app, against the same project, on the same day.
//
// Two of the five functions the client invokes had no CORS at all
// (delete-account, submit-live-photo) while invite-email and
// places-autocomplete each carried their own inline copy, added the day
// someone happened to hit them from a browser. One shared place instead, so
// the next function is not the next outage.
//
// Not needed by the server-to-server functions (send-email, send-push,
// partner-match, cleanup-checkin-photos) or the revenuecat-webhook: no browser
// calls those, so no preflight is ever sent.

// An allowlist, not '*'. Native apps send no Origin header and never preflight,
// so this only decides which web pages may call these functions from a
// browser. The Expo web build is not deployed anywhere yet; the localhost
// entries are for `expo start --web` (8081) and the Expo dev server (19006).
export const ALLOWED_ORIGINS = new Set([
  'https://choner.io',
  'https://join.choner.io',
  'https://app.choner.io',
  'http://localhost:8081',
  'http://localhost:19006'
]);

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    // A disallowed origin gets the default one back, so the browser blocks it
    // rather than the function failing in some other way.
    'Access-Control-Allow-Origin':
      origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://app.choner.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
}

/**
 * Answers the preflight, and puts the CORS headers on whatever the handler
 * returns.
 *
 * Wrapping rather than editing each `new Response(...)` on purpose: these
 * functions return from a dozen places, most of them error paths, and an
 * error response without the headers is an error the browser replaces with an
 * opaque CORS failure. The client then shows "failed to send a request"
 * instead of the actual reason, which is how a 401 or a 500 becomes an hour
 * of debugging the wrong thing.
 */
export function withCors(
  handler: (req: Request) => Response | Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req.headers.get('origin'));
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [name, value] of Object.entries(cors)) headers.set(name, value);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}
