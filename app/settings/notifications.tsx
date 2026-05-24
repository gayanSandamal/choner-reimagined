import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/features/notifications/hooks';
import { theme } from '@/constants/theme';

const PREFS: { key: 'push_enabled' | 'streak_alerts' | 'accountability_alerts' | 'ai_recovery_alerts'; title: string; subtitle: string }[] = [
  { key: 'push_enabled', title: 'Push notifications', subtitle: 'Master switch for all push notifications.' },
  { key: 'streak_alerts', title: 'Streak alerts', subtitle: 'Reminders before your streak is at risk.' },
  { key: 'accountability_alerts', title: 'Accountability', subtitle: 'When a partner or group member checks in.' },
  { key: 'ai_recovery_alerts', title: 'AI suggestions', subtitle: 'Personalized nudges from your coach.' },
];

export default function NotificationPreferencesScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const prefsQ = useNotificationPreferences(userId);
  const updateMut = useUpdateNotificationPreferences();

  return (
    <Screen>
      <ScreenHeader title="Notifications" onBack={() => router.back()} />

      {prefsQ.isLoading ? (
        <LoadingState />
      ) : prefsQ.isError ? (
        <ErrorState onRetry={() => prefsQ.refetch()} />
      ) : (
        <Card style={{ gap: theme.spacing(1) }}>
          {PREFS.map((p) => {
            const value = (prefsQ.data as any)?.[p.key] ?? true;
            return (
              <View
                key={p.key}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: theme.spacing(2) }}
              >
                <View style={{ flex: 1 }}>
                  <AppText>{p.title}</AppText>
                  <AppText muted variant="caption">{p.subtitle}</AppText>
                </View>
                <Switch
                  value={value}
                  onValueChange={(v) => {
                    if (userId) updateMut.mutate({ userId, patch: { [p.key]: v } as any });
                  }}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.surface2 }}
                  thumbColor={theme.colors.text}
                />
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
