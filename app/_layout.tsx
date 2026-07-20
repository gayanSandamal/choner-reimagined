import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/providers/app-provider';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useCallback, useEffect } from 'react';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_800ExtraBold_Italic,
  Nunito_900Black,
  useFonts
} from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SplashView } from '@/components/SplashView';
import { useSplashHoldElapsed } from '@/lib/splash-hold';
import { theme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootLayoutNav() {
  const { session, loading } = useSession();
  const splashHoldElapsed = useSplashHoldElapsed();
  const segments = useSegments();
  const router = useRouter();
  const profileQ = useProfile(session?.user.id);

  useEffect(() => {
    // Hold all boot-time routing until the branded splash has had its
    // minimum display time; app/index.tsx keeps rendering it meanwhile.
    if (loading || !splashHoldElapsed) return;

    const inAuthGroup = segments[0] === '(auth)';
    // Legal pages are static content and must stay reachable from the
    // welcome/sign-up terms links before an account exists.
    const inLegalGroup = segments[0] === 'legal';

    if (!session) {
      if (!inAuthGroup && !inLegalGroup) {
        router.replace('/(auth)/welcome');
      }
    } else if (session) {
      // Hold routing until the profile is known; index.tsx keeps showing
      // the branded splash for this same window.
      if (profileQ.isLoading) return;
      // Fail open on profile errors — never trap the user on the splash.
      // The gate only ever pushes users INTO onboarding: screens 6-7 run
      // with onboarding_complete already true, and exits are explicit.
      const needsOnboarding = profileQ.data ? !profileQ.data.onboarding_complete : false;
      const inOnboarding = segments[0] === 'onboarding';
      if (needsOnboarding && !inOnboarding && !inLegalGroup) {
        router.replace('/onboarding');
      } else if (!needsOnboarding && inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, loading, splashHoldElapsed, segments, profileQ.isLoading, profileQ.data]);

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
    Nunito_800ExtraBold_Italic,
    Nunito_900Black
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  // On a native cold start the OS splash still covers this (it hides via
  // onLayout below, after fonts resolve); on JS reloads and in Expo Go it
  // fills what would otherwise be a blank frame.
  if (!fontsLoaded && !fontError) {
    return <SplashView />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }} onLayout={onLayoutRootView}>
        <AppProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </AppProvider>
      </View>
    </GestureHandlerRootView>
  );
}
