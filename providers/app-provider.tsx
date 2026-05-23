import { PropsWithChildren, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider } from '@/providers/session-provider';
import { queryClient } from '@/lib/query-client';
import { registerForPushNotificationsAsync } from '@/lib/notifications';

export function AppProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    registerForPushNotificationsAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
