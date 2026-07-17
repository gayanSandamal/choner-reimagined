import { Redirect } from 'expo-router';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { SplashView } from '@/components/SplashView';
import { useSplashHoldElapsed } from '@/lib/splash-hold';

export default function IndexScreen() {
  const { session, loading } = useSession();
  const splashHoldElapsed = useSplashHoldElapsed();
  const profileQ = useProfile(session?.user.id);
  // Branded splash while the stored session is restored and for the minimum
  // splash display time, instead of a blank frame. The auth gate in
  // app/_layout.tsx respects the same hold, so nothing routes away early.
  // Signed-in users also wait for the profile: onboarding_complete decides
  // whether they land on home or in the onboarding flow.
  if (loading || !splashHoldElapsed) return <SplashView />;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (profileQ.isLoading) return <SplashView />;
  // Fail open to home on profile errors — never trap on the splash.
  const needsOnboarding = profileQ.data ? !profileQ.data.onboarding_complete : false;
  return <Redirect href={needsOnboarding ? '/onboarding' : '/(tabs)/home'} />;
}
