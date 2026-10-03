import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Icon, IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppTopBar, useTopBar } from '@/components/navigation/AppTopBar';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useReflections } from '@/features/challenges/hooks';
import { isAnswered, reminderFor } from '@/features/challenges/reflections';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/features/notifications/hooks';
import { signOut } from '@/features/auth/api';
import { theme } from '@/constants/theme';

// Profile, as the prototype's T4 (#111): who you are, then one card per thing
// you can change. Your photo, your details, your why, the two reminders as
// switches right here, and the rest of settings.
//
// What it no longer carries: the three stat tiles, the tone badge and the
// "Goal · Style" line. The numbers that matter live on Home and Challenges,
// and the tone is an Edit profile answer, not a title.
export default function ProfileScreen() {
  const { session } = useSession();
  const tabBarClearance = useTabBarClearance();
  const topBar = useTopBar();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const reflectionsQ = useReflections(userId);
  const prefsQ = useNotificationPreferences(userId);
  const updatePrefs = useUpdateNotificationPreferences();

  // "Photo confirmed", never "verified": Choner checks the photo was taken
  // live, not who is in it.
  const photoConfirmed = profileQ.data?.photo_status === 'photo_confirmed';
  const why = (reflectionsQ.data ?? []).find(isAnswered);
  const whyLine = why ? reminderFor(why) : null;
  const prefs = (prefsQ.data ?? {}) as Record<string, boolean | undefined>;
  const setPref = (key: 'streak_alerts' | 'accountability_alerts', value: boolean) => {
    if (userId) updatePrefs.mutate({ userId, patch: { [key]: value } as any });
  };

  return (
    <View style={styles.root}>
      <AppTopBar />
      <ScrollView
        {...topBar.scrollProps}
        contentContainerStyle={[styles.content, { paddingTop: topBar.contentTop, paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
      >
        {profileQ.isLoading ? (
          <LoadingState />
        ) : profileQ.isError ? (
          <ErrorState message={(profileQ.error as Error)?.message} onRetry={() => profileQ.refetch()} />
        ) : (
          <>
            <View style={styles.hero}>
              <Avatar
                name={profileQ.data?.full_name ?? session?.user.email}
                uri={profileQ.data?.avatar_url}
                size={76}
              />
              <AppText style={styles.name}>{profileQ.data?.full_name ?? 'Your profile'}</AppText>
              <AppText style={styles.email}>{session?.user.email}</AppText>
              <AppText style={[styles.photoState, photoConfirmed && styles.photoOk]}>
                {photoConfirmed ? 'Photo confirmed' : 'No photo yet'}
              </AppText>
            </View>

            {/* Live camera only, the same screen onboarding uses. A gallery
                upload from Edit profile drops the badge on purpose. */}
            <Row
              icon="camera"
              label={photoConfirmed ? 'Retake your photo' : 'Add your photo'}
              sub="Live camera only"
              onPress={() => router.push({ pathname: '/onboarding/photo', params: { from: 'profile' } } as never)}
            />
            <Row
              icon="user"
              label="Edit profile"
              sub="Name, goal, struggle, style, age and gender"
              onPress={() => router.push('/profile/edit')}
            />
            {/* The only place a why can be read back: the answers are private. */}
            <Row
              icon="heart"
              label="Why you're doing this"
              sub={whyLine ?? 'Not answered yet'}
              onPress={() => router.push('/modals/edit-why')}
            />
            <Toggle
              icon="bell"
              label="Session reminders"
              sub="Before a session you planned"
              value={prefs.streak_alerts ?? true}
              onChange={(v) => setPref('streak_alerts', v)}
            />
            <Toggle
              icon="community"
              label="Partner updates"
              value={prefs.accountability_alerts ?? true}
              onChange={(v) => setPref('accountability_alerts', v)}
            />
            {/* Settings keeps Delete account, so it stays reachable. */}
            <Row
              icon="doc"
              label="Terms, privacy, health"
              sub="And your account settings"
              onPress={() => router.push('/settings')}
            />
            <Row icon="logout" label="Sign out" danger onPress={() => signOut()} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  onPress,
  danger = false
}: {
  icon: IconName;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      scaleTo="subtle"
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      style={styles.row}
    >
      <Icon name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.muted} />
      <View style={styles.rowText}>
        <AppText style={[styles.rowLabel, danger && { color: theme.colors.danger }]}>{label}</AppText>
        {sub ? (
          <AppText style={styles.rowSub} numberOfLines={2}>
            {sub}
          </AppText>
        ) : null}
      </View>
      {danger ? null : <Icon name="chev" size={16} color={theme.colors.dim} strokeWidth={2} />}
    </PressableScale>
  );
}

function Toggle({
  icon,
  label,
  sub,
  value,
  onChange
}: {
  icon: IconName;
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={20} color={theme.colors.muted} />
      <View style={styles.rowText}>
        <AppText style={styles.rowLabel}>{label}</AppText>
        {sub ? <AppText style={styles.rowSub}>{sub}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary2, false: theme.colors.dim }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 22, gap: 10 },
  hero: { alignItems: 'center', gap: 4, paddingVertical: theme.spacing(2) },
  name: { marginTop: theme.spacing(1), fontSize: 18, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  email: { fontSize: 12.5, color: theme.colors.muted },
  photoState: { fontSize: 12, color: theme.colors.muted, marginTop: 4 },
  photoOk: { color: theme.colors.success },
  // One white card per row, standing apart, as in the prototype.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...theme.shadow.sm
  },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 14, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  rowSub: { fontSize: 11.5, lineHeight: 16, color: theme.colors.muted }
});
