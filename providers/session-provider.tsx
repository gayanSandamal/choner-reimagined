import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({ session: null, loading: true });

// A stored session outlives the account it belongs to: getSession() only reads
// local storage, so after the user is deleted server-side (or the DB is reset)
// the app happily stays "logged in" as a ghost — signed in, but every query
// comes back empty. Ask the server who we are and drop the session when it
// says nobody.
//
// Returns true when the session is still good, false when it was cleared.
async function validateStoredSession(): Promise<boolean> {
  const { error } = await supabase.auth.getUser();
  if (!error) return true;

  // Only act on a definitive answer from the server. A network failure has no
  // HTTP status, and signing someone out because their wifi dropped would be
  // far worse than leaving the session alone until we can actually check.
  const status = (error as { status?: number }).status;
  if (status !== 401 && status !== 403 && status !== 404) return true;

  // Local scope on purpose: the server cannot validate a session whose user no
  // longer exists, so a normal (global) sign-out request would fail and leave
  // the ghost session sitting in storage.
  await supabase.auth.signOut({ scope: 'local' });
  queryClient.clear();
  return false;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const { data } = await supabase.auth.getSession();
      const stored = data.session ?? null;
      // Nothing stored: normal signed-out boot, no server round trip needed.
      if (!stored) {
        if (!cancelled) {
          setSession(null);
          setLoading(false);
        }
        return;
      }
      const stillValid = await validateStoredSession();
      if (cancelled) return;
      setSession(stillValid ? stored : null);
      setLoading(false);
    };

    restore();

    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    // The account can disappear while the app is backgrounded, which is exactly
    // how a ghost session survives a DB reset. Re-check on the way back in.
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      supabase.auth.getSession().then(({ data: current }) => {
        if (current.session) validateStoredSession();
      });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
