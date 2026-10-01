import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { parseAuthLink } from '@/features/auth/link';

// Turns the link in a verification or reset email into a session.
//
// Mounted once, in app/_layout.tsx. It watches the URL the app was opened
// with (cold start) and any that arrives while it is running, and for an auth
// link: creates the session, then routes to the screen that follows.
//
//   verification  ->  You're verified   (app/(auth)/verified.tsx)
//   reset         ->  Set new password  (app/(auth)/reset-password.tsx)
//   expired/used  ->  Link expired      (app/(auth)/link-expired.tsx)
//
// The root auth gate exempts the first two, or it would bounce a freshly
// signed-in person off them before they rendered.
export function AuthLinkHandler() {
  const url = Linking.useURL();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url || handledRef.current === url) return;
    const link = parseAuthLink(url);
    if (link.kind === 'none') return;
    // A link is single-use. Re-running it on a re-render would turn a working
    // sign-in into "expired" the second time round.
    handledRef.current = url;

    const expired = () =>
      router.replace({
        pathname: '/(auth)/link-expired',
        params: { kind: link.purpose === 'reset' ? 'reset' : 'verify' }
      } as never);

    (async () => {
      if (link.kind === 'error') return expired();
      try {
        const { error } =
          link.kind === 'tokens'
            ? await supabase.auth.setSession({
                access_token: link.accessToken,
                refresh_token: link.refreshToken
              })
            : link.kind === 'code'
              ? await supabase.auth.exchangeCodeForSession(link.code)
              : await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.otpType });
        if (error) throw error;
      } catch {
        // Expired and already-used look the same from here, and the screen
        // says so. It asks for the email because the link does not carry one.
        return expired();
      }
      router.replace((link.purpose === 'reset' ? '/(auth)/reset-password' : '/(auth)/verified') as never);
    })();
  }, [url]);

  return null;
}
