// Reading the link in a verification or password-reset email.
//
// lib/supabase.ts sets detectSessionInUrl: false, which is right for a native
// app (there is no browser URL to watch) but means NOTHING creates a session
// from an email link unless the app does it. Until this existed the link
// verified the account on Supabase and dropped the person back on "Check your
// email", not signed in, and a reset could never complete because
// updateUser() had no session to act on.
//
// Supabase can hand the credentials back in three shapes depending on the flow
// and the email template, plus an error shape. All four are handled so that a
// change of auth settings does not silently bring the dead end back:
//
//   implicit    choner://verify-email#access_token=..&refresh_token=..&type=signup
//   pkce        choner://verify-email?code=..
//   token hash  choner://verify-email?token_hash=..&type=email
//   error       choner://verify-email#error=access_denied&error_code=otp_expired
//
// Pure on purpose: no supabase, no router, so it can be unit-tested. The
// component that acts on the result is components/auth/AuthLinkHandler.tsx.

export type AuthLinkPurpose = 'verify' | 'reset';

export type AuthLink =
  | { kind: 'none' }
  | { kind: 'tokens'; purpose: AuthLinkPurpose; accessToken: string; refreshToken: string }
  | { kind: 'code'; purpose: AuthLinkPurpose; code: string }
  | { kind: 'token_hash'; purpose: AuthLinkPurpose; tokenHash: string; otpType: 'recovery' | 'email' }
  | { kind: 'error'; purpose: AuthLinkPurpose; description: string };

function parseParams(part: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!part) return out;
  for (const pair of part.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      out[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      // A malformed escape is not worth failing the whole link over.
      out[rawKey] = rawValue;
    }
  }
  return out;
}

export function parseAuthLink(url: string | null | undefined): AuthLink {
  if (!url) return { kind: 'none' };

  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  // The fragment wins where both carry a key: Supabase repeats an error in
  // the query and the fragment, and puts tokens only in the fragment.
  const params = {
    ...parseParams(queryAt === -1 ? undefined : beforeHash.slice(queryAt + 1)),
    ...parseParams(hashAt === -1 ? undefined : url.slice(hashAt + 1))
  };

  // The route is the better signal: `type` is absent from a PKCE link, and an
  // error link carries no type at all.
  const purpose: AuthLinkPurpose =
    params.type === 'recovery' || /reset-password/.test(path) ? 'reset' : 'verify';

  if (params.error || params.error_code) {
    return {
      kind: 'error',
      purpose,
      description: params.error_description || params.error_code || params.error || 'link failed'
    };
  }
  if (params.access_token && params.refresh_token) {
    return {
      kind: 'tokens',
      purpose,
      accessToken: params.access_token,
      refreshToken: params.refresh_token
    };
  }
  if (params.token_hash) {
    return {
      kind: 'token_hash',
      purpose,
      tokenHash: params.token_hash,
      otpType: purpose === 'reset' ? 'recovery' : 'email'
    };
  }
  // `code` alone is also what an OAuth provider returns, so only treat it as
  // ours on the two routes these emails redirect to. An invite link
  // (choner://invite/<token>) must never be mistaken for an auth link.
  if (params.code && /(verify-email|reset-password)/.test(path)) {
    return { kind: 'code', purpose, code: params.code };
  }
  return { kind: 'none' };
}
