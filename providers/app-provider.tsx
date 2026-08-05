import { PropsWithChildren, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { queryClient } from '@/lib/query-client';
import { attachNotificationResponseListener, registerForPushNotificationsAsync } from '@/lib/notifications';
import { configurePurchases } from '@/lib/billing';
import { registerPushToken } from '@/features/notifications/api';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { clearUser, identifyUser, initObservability } from '@/lib/observability';
import { ReduceMotionContext } from '@/lib/motion';

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

    // Realtime subscriptions for in-app notifications and active challenges.
    const notifChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['notifications', userId] });
          qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
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
      qc.invalidateQueries({ queryKey: ['default-challenges', userId] });
      qc.invalidateQueries({ queryKey: ['active-challenge', userId] });
      qc.invalidateQueries({ queryKey: ['pending-invites', userId] });
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
                <SessionWiring />
                {children}
              </SessionProvider>
            </ReduceMotionContext.Provider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
