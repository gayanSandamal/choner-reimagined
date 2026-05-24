import { Image, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useIsPremium } from '@/features/billing/hooks';
import { useStreak } from '@/features/challenges/hooks';
import { signOut } from '@/features/auth/api';
import { theme } from '@/constants/theme';

export default function ProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const streakQ = useStreak(userId);
  const { isPremium } = useIsPremium();

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <SectionHeader title="Profile" subtitle="Your goals, settings, and account" />

        {profileQ.isLoading ? (
          <LoadingState />
        ) : profileQ.isError ? (
          <ErrorState message={(profileQ.error as Error)?.message} onRetry={() => profileQ.refetch()} />
        ) : (
          <Card style={{ gap: theme.spacing(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
              {profileQ.data?.avatar_url ? (
                <Image
                  source={{ uri: profileQ.data.avatar_url }}
                  style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface2 }}
                />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText variant="title">
                    {(profileQ.data?.full_name ?? session?.user.email ?? '?')[0]?.toUpperCase()}
                  </AppText>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle">{profileQ.data?.full_name ?? 'Your profile'}</AppText>
                <AppText muted variant="caption">{session?.user.email}</AppText>
                {isPremium ? (
                  <AppText variant="caption" style={{ color: theme.colors.primary2, fontWeight: '700' }}>
                    PRO
                  </AppText>
                ) : null}
              </View>
            </View>

            <AppText muted variant="caption">
              Goal: {profileQ.data?.primary_goal ?? '—'} • Mode: {profileQ.data?.accountability_mode ?? 'solo'} • Streak: {streakQ.data ?? 0}d
            </AppText>

            <Button label="Edit profile" variant="secondary" onPress={() => router.push('/profile/edit')} />
          </Card>
        )}

        <Card style={{ gap: theme.spacing(1) }}>
          <Button label="Premium" variant="ghost" onPress={() => router.push('/modals/premium')} />
          <Button label="Notifications" variant="ghost" onPress={() => router.push('/modals/notifications')} />
          <Button label="Settings" variant="ghost" onPress={() => router.push('/settings')} />
          <Button label="Sign out" variant="ghost" onPress={() => signOut()} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
