import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { ToastProvider, useToast } from '@/providers/toast-provider';
import { queryClient } from '@/lib/query-client';
import { attachNotificationResponseListener, registerForPushNotificationsAsync } from '@/lib/notifications';
import { configurePurchases } from '@/lib/billing';
import { registerPushToken, listNotifications } from '@/features/notifications/api';
import { getProfile, updateProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { clearUser, identifyUser, initObservability } from '@/lib/observability';
import { ReduceMotionContext } from '@/lib/motion';

// Raises the in-app banner for anything new that lands in notifications.
//
// Deliberately poll-driven rather than realtime-driven. Realtime delivery to a
// device isn't guaranteed — the socket can be asleep, the network can have
// changed, RLS has to authorise the socket — and a missed socket frame would
// mean the user is simply never told. Polling always converges; the realtime
// handler above just invalidates this query so the banner is instant wherever
// the socket does work.
function NotificationWatcher({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const seen = useRef<Set<string> | null>(null);

  const q = useQuery({
    queryKey: ['notification-watch', userId],
    queryFn: () => listNotifications(userId, { limit: 10 }),
    enabled: Boolean(userId),
    // Foreground only — react-query pauses this while the app is backgrounded,
    // which is exactly when a push notification takes over instead.
    refetchInterval: 15_000,
    staleTime: 0
  });

  useEffect(() => {
    const rows = q.data;
    if (!rows) return;

    // First load establishes the baseline, so opening the app doesn't replay
    // every notification the user already has.
    if (seen.current === null) {
      seen.current = new Set(rows.map((r) => r.id));
      return;
    }

    const fresh = rows.filter((r) => !seen.current!.has(r.id));
    if (fresh.length === 0) return;
    fresh.forEach((r) => seen.current!.add(r.id));

    // Oldest first, so the newest ends up being the one left on screen.
    [...fresh].reverse().forEach((r) =>
      showToast({
        title: r.title,
        body: r.body,
        route: (r.data as { route?: string } | null)?.route ?? null
      })
    );
  }, [q.data, showToast]);

  // Reset the baseline when the account changes.
  useEffect(() => {
    seen.current = null;
  }, [userId]);

  return null;
}

function SessionWiring() {
  const { session } = useSession();
  const qc = useQueryClient();
  const userId = session?.user.id;
  const userEmail = session?.user.email;

  useEffect(() => {
    if (!userId) {
      clearUser();
      return;
    }
    let cancelled = false;

    identifyUser(userId, userEmail ? { email: userEmail } : undefined);

    // Configure RevenueCat with the signed-in user id so server-side
    // entitlements are associated with the right account.
    configurePurchases(userId).catch(() => undefined);

    // Register Expo push token to user_devices.
    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && !cancelled) {
          await registerPushToken({ userId, token });
        }
      } catch {
        // ignore — push isn't required to use the app
      }
    })();

    // profiles.timezone is what every deadline, reminder and nudge is measured
    // against, and the only thing that has ever written it is the daily
    // deadline settings screen. Anyone who never opened that screen keeps the
    // 'UTC' default — so their 8pm deadline fires at 8pm UTC, which is 1:30am
    // in Colombo, where most of the current users are. One of three live
    // profiles was sitting in exactly that state.
    //
    // Read-then-write rather than a blind upsert: this runs on every sign-in,
    // and a timezone that hasn't changed shouldn't cost a round trip.
    (async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!tz) return;
        const profile = await getProfile(userId);
        if (cancelled || (profile as { timezone?: string | null })?.timezone === tz) return;
        await updateProfile(userId, { timezone: tz } as never);
      } catch {
        // A stale timezone is a bad reminder; a throw here is a broken launch.
      }
    })();

    // Realtime subscriptions for in-app notifications and active challenges.
    const notifChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          // Realtime is the accelerator, not the source of truth: it makes the
          // banner appear instantly where it's delivered, but NotificationWatcher
          // is what actually raises it, so a device realtime never reaches still
          // gets the toast on its next poll. Invalidating here (rather than
          // toasting here) also means an event can't produce a duplicate.
          qc.invalidateQueries({ queryKey: ['notification-watch', userId] });
          qc.invalidateQueries({ queryKey: ['notifications', userId] });
          qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
          // A partner joining OR logging today changes the heart, not just
          // the bell. These keys were renamed to 'my-challenge' when the
          // two-track model collapsed, and this handler was never updated —
          // so realtime fired and the UI still showed yesterday's state.
          qc.invalidateQueries({ queryKey: ['partner-status', userId] });
          qc.invalidateQueries({ queryKey: ['my-challenge', userId] });
          qc.invalidateQueries({ queryKey: ['streak', userId] });
        }
      )
      .subscribe();

    const subChannel = supabase
      .channel(`subscriptions:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['subscription', userId] });
          qc.invalidateQueries({ queryKey: ['is-premium', userId] });
        }
      )
      .subscribe();

    // The moment a partner accepts, the invite row flips to 'accepted' and both
    // partner tracks go active. Without this the inviter's Home kept showing
    // "waiting for a partner" until they manually pulled to refresh.
    const refreshPairing = () => {
      qc.invalidateQueries({ queryKey: ['partner-status', userId] });
      qc.invalidateQueries({ queryKey: ['my-challenge', userId] });
      qc.invalidateQueries({ queryKey: ['pending-invites', userId] });
      // The match itself, which this handler used to leave stale. partner_matches
      // is not in the realtime publication, but a match always flips
      // user_challenges.partner_state to 'matched' — which IS published and is
      // what fires this. On Find that was survivable because MatchCard only
      // mounts once the state flips and so fetches fresh; on Challenges the card
      // is always mounted (it renders null with no match), so the banner stayed
      // invisible until the app was backgrounded and reopened.
      qc.invalidateQueries({ queryKey: ['my-match', userId] });
    };

    const pairingChannel = supabase
      .channel(`pairing:${userId}`)
      .on(
        'postgres_changes',
        // Invites I sent — this is the one that fires on acceptance.
        { event: '*', schema: 'public', table: 'challenge_invites', filter: `invited_by=eq.${userId}` },
        refreshPairing
      )
      .on(
        'postgres_changes',
        // My own tracks, which acceptance flips pending -> active. Covers the
        // accepter's side too, where no invite row is theirs to watch.
        { event: '*', schema: 'public', table: 'user_challenges', filter: `user_id=eq.${userId}` },
        refreshPairing
      )
      .subscribe();

    const detachNotifTap = attachNotificationResponseListener();

    return () => {
      cancelled = true;
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(subChannel);
      supabase.removeChannel(pairingChannel);
      detachNotifTap();
    };
  }, [userId, userEmail, qc]);

  return null;
}

let observabilityInitialized = false;

export function AppProvider({ children }: PropsWithChildren) {
  if (!observabilityInitialized) {
    initObservability();
    observabilityInitialized = true;
  }

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduceMotion(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (mounted) setReduceMotion(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ReduceMotionContext.Provider value={reduceMotion}>
              <SessionProvider>
                {/* Wraps SessionWiring so the realtime handler can raise an
                    in-app banner, and sits above children so it draws over
                    whatever screen is showing. */}
                <ToastProvider>
                  <SessionWiring />
                  <NotificationGate />
                  {children}
                </ToastProvider>
              </SessionProvider>
            </ReduceMotionContext.Provider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Small gate so the watcher only mounts with a signed-in user.
function NotificationGate() {
  const { session } = useSession();
  const userId = session?.user.id;
  if (!userId) return null;
  return <NotificationWatcher userId={userId} />;
}
