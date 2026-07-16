import { Redirect } from 'expo-router';
import { useSession } from '@/providers/session-provider';
import { SplashView } from '@/components/SplashView';
import { useSplashHoldElapsed } from '@/lib/splash-hold';

export default function IndexScreen() {
  const { session, loading } = useSession();
  const splashHoldElapsed = useSplashHoldElapsed();
  // Branded splash while the stored session is restored and for the minimum
  // splash display time, instead of a blank frame. The auth gate in
  // app/_layout.tsx respects the same hold, so nothing routes away early.
  if (loading || !splashHoldElapsed) return <SplashView />;
  return <Redirect href={session ? '/(tabs)/home' : '/(auth)/welcome'} />;
}
