import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/providers/app-provider';
import { useSession } from '@/providers/session-provider';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else if (session) {
      if (inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#031A2D' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modals/ai-coach" options={{ presentation: 'modal' }} />
      <Stack.Screen name="modals/notifications" options={{ presentation: 'modal' }} />
      <Stack.Screen name="modals/premium" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings/index" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <RootLayoutNav />
    </AppProvider>
  );
}
