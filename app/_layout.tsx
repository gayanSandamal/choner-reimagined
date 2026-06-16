import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/providers/app-provider';
import { useSession } from '@/providers/session-provider';
import { useCallback, useEffect } from 'react';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts
} from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { theme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="modals/ai-coach"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="modals/notifications"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="modals/premium"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="group/new" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="group/invite"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="legal/privacy" />
      <Stack.Screen name="legal/terms" />
      <Stack.Screen name="legal/health-disclaimer" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }} onLayout={onLayoutRootView}>
      <AppProvider>
        <StatusBar style="light" />
        <RootLayoutNav />
      </AppProvider>
    </View>
  );
}
