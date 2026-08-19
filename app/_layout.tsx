import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/providers/app-provider';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useAcceptInvite } from '@/features/community/hooks';
import { getPendingInviteToken, clearPendingInviteToken } from '@/lib/pending-invite';
import { useCallback, useEffect, useRef } from 'react';
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

// Accepts an invite that was opened while signed out, once the user has an
// account and finished onboarding (so their own partner track exists to light).
function PendingInviteHandler() {
  const { session } = useSession();
  const profileQ = useProfile(session?.user.id);
  const acceptInvite = useAcceptInvite();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!session) {
      handledRef.current = false;
      return;
    }
    if (handledRef.current) return;
    if (!profileQ.data?.onboarding_complete) return;
    handledRef.current = true;
    (async () => {
      const token = await getPendingInviteToken();
      if (!token) return;
      try {
        await acceptInvite.mutateAsync(token);
      } catch {
        // Direct-link flow surfaces errors; here we silently drop a stale token.
      } finally {
        await clearPendingInviteToken();
      }
    })();
  }, [session, profileQ.data?.onboarding_complete]);

  return null;
}

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
    // The invite-accept screen must stay reachable signed-out so it can stash
    // the token and prompt sign-in, rather than bouncing to welcome and
    // dropping the invite.
    // Cast: the typed-routes union regenerates from app/ on the next expo
    // build; until then the new segment literal isn't in the union.
    const inInviteGroup = (segments[0] as string) === 'invite';

    if (!session) {
      if (!inAuthGroup && !inLegalGroup && !inInviteGroup) {
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
    <>
      <PendingInviteHandler />
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
      <Stack.Screen
        name="modals/edit-why"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="group/invite"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="invite/[token]" options={{ animation: 'fade' }} />
      <Stack.Screen name="legal/privacy" />
      <Stack.Screen name="legal/terms" />
      <Stack.Screen name="legal/health-disclaimer" />
      </Stack>
    </>
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
