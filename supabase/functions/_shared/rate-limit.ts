// Fixed-window rate limit, counted in Postgres (public.rate_limit_hit).
//
// Why the database and not a Map in the function: edge functions run as many
// short-lived instances, so an in-memory counter is per instance and resets
// whenever one is recycled. A script spread across instances walks straight
// past it. One counter in one place does not have that problem.
//
// FAILS OPEN. If the RPC is missing (migration not applied yet) or Postgres is
// down, this returns false and the request goes through. A limiter that takes
// the product down when it breaks is worse than the abuse it was meant to stop,
// and it means this can be deployed before the migration without an outage.
//
//   if (await rateLimited(`places:${userId}`, 40, 60)) return 429
export async function rateLimited(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return false;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/rate_limit_hit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ p_key: key, p_max: max, p_window_seconds: windowSeconds })
    });
    if (!res.ok) {
      console.error('rate_limit_hit failed', res.status);
      return false;
    }
    // The function returns true when the caller is OVER the limit.
    return (await res.json()) === true;
  } catch (err) {
    console.error('rate_limit_hit threw', err);
    return false;
  }
}

/** Best-effort caller address for unauthenticated endpoints. */
export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
