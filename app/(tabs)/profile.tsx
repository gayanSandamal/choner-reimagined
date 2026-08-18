import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { goalLabel, toneLabel } from '@/features/onboarding/mappings';
import { TONES } from '@/features/onboarding/constants';
import { useIsPremium } from '@/features/billing/hooks';
import { useMyChallenge, useStreak } from '@/features/challenges/hooks';
import { signOut } from '@/features/auth/api';
import { features } from '@/constants/features';
import { theme } from '@/constants/theme';

type GlyphName = keyof typeof Ionicons.glyphMap;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function logsToday(challenge: any): number {
  const today = todayString();
  const tasks = (challenge?.challenge_tasks ?? []) as any[];
  return tasks.filter((t) =>
    (t.task_checkins ?? []).some((c: any) => (c.completed_at ?? '').slice(0, 10) === today)
  ).length;
}

export default function ProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const streakQ = useStreak(userId);
  const challengesQ = useMyChallenge(userId);
  const { isPremium } = useIsPremium();

  const challenge = challengesQ.data ?? null;
  const firesLit = challenge && challenge.status === 'active' ? 1 : 0;
  const fedToday = logsToday(challenge);

  const hasTone = TONES.some((t) => t.value === profileQ.data?.accountability_mode);

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {profileQ.isLoading ? (
          <LoadingState />
        ) : profileQ.isError ? (
          <ErrorState message={(profileQ.error as Error)?.message} onRetry={() => profileQ.refetch()} />
        ) : (
          <>
            <View style={styles.hero}>
              {/* Wrapper isolates Avatar's ring alignSelf:'flex-start' so the
                  hero's alignItems:'center' still centers it. */}
              <View>
                <Avatar name={profileQ.data?.full_name ?? session?.user.email} uri={profileQ.data?.avatar_url} size={82} ring />
              </View>
              <AppText variant="title" style={styles.name}>
                {profileQ.data?.full_name ?? 'Your profile'}
              </AppText>
              <AppText variant="caption" muted>{session?.user.email}</AppText>
              <View style={styles.badgeRow}>
                {hasTone ? <Badge label={toneLabel(profileQ.data?.accountability_mode) ?? ''} /> : null}
                {features.pro && isPremium ? <Badge label="Pro" tone="warning" /> : null}
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatTile value={`${streakQ.data ?? 0}`} label="day streak" icon="flame" tint={theme.colors.primary2} />
              <StatTile value={`${fedToday}`} label="logs today" />
              <StatTile value={`${firesLit}`} label={firesLit === 1 ? 'fire lit' : 'fires lit'} />
            </View>

            <AppText variant="caption" muted style={styles.goalLine}>
              Goal: {goalLabel(profileQ.data?.primary_goal) ?? '—'} · Style:{' '}
              {toneLabel(profileQ.data?.accountability_mode) ?? '—'}
            </AppText>

            {features.pro && !isPremium ? (
              <PressableScale style={styles.upsell} onPress={() => router.push('/modals/premium')} haptic="light">
                <View style={styles.upsellIcon}>
                  <Ionicons name="star" size={18} color={theme.colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: theme.fonts.bodyBold }}>Go Pro</AppText>
                  <AppText variant="caption" muted>Unlock every quest and deeper coaching</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </PressableScale>
            ) : null}

            <View style={styles.group}>
              <SettingsRow
                icon="create-outline"
                label="Edit profile"
                onPress={() => router.push('/profile/edit')}
              />
              {features.aiCoach ? (
                <SettingsRow
                  icon="sparkles-outline"
                  label="AI coach"
                  sublabel="Talk through today's fire"
                  onPress={() => router.push('/modals/ai-coach')}
                />
              ) : null}
              <SettingsRow
                icon="notifications-outline"
                label="Notifications"
                onPress={() => router.push('/modals/notifications')}
              />
              {features.pro ? (
                <SettingsRow
                  icon="star-outline"
                  label="Premium"
                  onPress={() => router.push('/modals/premium')}
                />
              ) : null}
              <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
              <SettingsRow icon="log-out-outline" label="Sign out" danger onPress={() => signOut()} last />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatTile({
  value,
  label,
  icon,
  tint
}: {
  value: string;
  label: string;
  icon?: GlyphName;
  tint?: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statValueRow}>
        {icon ? <Ionicons name={icon} size={15} color={tint ?? theme.colors.text} /> : null}
        <AppText variant="subtitle" style={{ color: tint ?? theme.colors.text }}>{value}</AppText>
      </View>
      <AppText variant="caption" muted style={{ marginTop: 2 }}>{label}</AppText>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger = false,
  last = false
}: {
  icon: GlyphName;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const color = danger ? theme.colors.danger : theme.colors.text;
  return (
    <PressableScale onPress={onPress} haptic="light" scaleTo="subtle" style={[styles.row, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={19} color={danger ? theme.colors.danger : theme.colors.primary2} style={{ width: 24 }} />
      <View style={{ flex: 1 }}>
        <AppText style={{ color }}>{label}</AppText>
        {sublabel ? <AppText variant="caption" muted>{sublabel}</AppText> : null}
      </View>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Screen already applies padding: 20; only add bottom clearance + rhythm here.
  content: { paddingBottom: theme.spacing(4), gap: theme.spacing(2) },
  hero: { alignItems: 'center', gap: 4, paddingTop: theme.spacing(1) },
  name: { marginTop: theme.spacing(1) },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing(1) },
  statsRow: { flexDirection: 'row', gap: theme.spacing(1) },
  statTile: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center'
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalLine: { textAlign: 'center' },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing(1.75),
    ...theme.shadow.glow
  },
  upsellIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,138,31,0.16)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  group: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.75)
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }
});
