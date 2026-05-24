import { PropsWithChildren, useEffect } from 'react';
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

    const detachNotifTap = attachNotificationResponseListener();

    return () => {
      cancelled = true;
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(subChannel);
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
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <SessionWiring />
              {children}
            </SessionProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
