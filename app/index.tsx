import { Redirect } from 'expo-router';
import { useSession } from '@/providers/session-provider';

export default function IndexScreen() {
  const { session, loading } = useSession();
  if (loading) return null;
  return <Redirect href={session ? '/(tabs)/home' : '/(auth)/welcome'} />;
}
