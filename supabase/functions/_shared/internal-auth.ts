// Internal-only edge functions (send-push, partner-match, cleanup-checkin-photos)
// act with the service role, so they must only ever be called by the backend:
// pg_net from SQL (app_config.service_role_key) or the concierge script.
//
// They used to "trust their caller". The gateway's default verify_jwt accepts
// ANY valid JWT, and every signed-in user holds one — so any user could push a
// notification to any other user, or run the matcher. This closes that.
//
// Two accepted shapes, because the key in app_config is not guaranteed to be
// byte-identical to this function's env var:
//   - the exact service role key from the environment, or
//   - a JWT whose `role` claim is service_role. The gateway has already
//     verified the signature before this code runs, so the claim is trusted.
export function isServiceRoleRequest(req: Request): boolean {
  const header = req.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey && token === serviceKey) return true;

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '='))
    );
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

export function unauthorized(): Response {
  return new Response('unauthorized', { status: 401 });
}
