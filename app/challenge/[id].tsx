import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { SessionDetails } from '@/components/plans/SessionDetails';
import { useEndChallengeAction } from '@/features/challenges/end-action';
import { useMyPartner } from '@/features/challenges/hooks';
import { activityNoun } from '@/features/plans/activity';
import { usePairPlan, useSessionStreak } from '@/features/plans/hooks';
import { isPlanned } from '@/features/plans/session';
import { useProfile } from '@/features/profile/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { usePullRefresh } from '@/lib/use-pull-refresh';

// Session details: the one screen about a single planned session.
//
// `id` is the user's own challenge, the same id the plan flow takes. A plan
// that is still being agreed has no details yet, so this hands back to the
// plan flow; a session that is under way (both scanned in) belongs there too.
export default function SessionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const partnerQ = useMyPartner(userId);
  const planQ = usePairPlan(id);
  const pull = usePullRefresh(() => planQ.refetch());
  const streakQ = useSessionStreak(id);
  const endAction = useEndChallengeAction();
  const [menuOpen, setMenuOpen] = useState(false);

  const plan = planQ.data ?? null;
  const partnerName = partnerQ.data?.partnered ? partnerQ.data.first_name : null;
  const me = {
    name: ((profileQ.data?.full_name ?? '').trim().split(/\s+/)[0] || 'You') as string,
    avatarUrl: profileQ.data?.avatar_url ?? null
  };

  const openPlan = () =>
    router.replace({ pathname: '/plan/[challengeId]', params: { challengeId: id! } });

  const onEnd = async () => {
    setMenuOpen(false);
    // iOS drops a system alert presented while a Modal is still animating
    // out. Let the sheet close first.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const ended = await endAction.end({ challengeId: id, streak: streakQ.data, partnerName });
    if (ended) router.replace('/(tabs)/challenges');
  };

  let body: React.ReactNode;
  if (planQ.isLoading) body = <LoadingState />;
  else if (planQ.isError)
    body = <ErrorState message={(planQ.error as Error).message} onRetry={() => planQ.refetch()} />;
  else if (!plan) {
    body = (
      <View style={styles.empty}>
        <AppText variant="title">Nothing planned yet.</AppText>
        <AppText muted>Sessions are planned one at a time, and you both agree each one.</AppText>
        <Button label="See your challenge" onPress={() => router.replace('/(tabs)/challenges')} />
      </View>
    );
  } else if (!isPlanned(plan)) {
    // Still being agreed, or already under way: the plan flow owns both.
    const noun = activityNoun(plan.activity_key);
    body = (
      <View style={styles.empty}>
        <AppText variant="title">
          {plan.status === 'planning' ? `This ${noun} is still being planned.` : `This ${noun} is under way.`}
        </AppText>
        <AppText muted>
          {plan.status === 'planning'
            ? 'There are details to see once you have both agreed it.'
            : 'Finish it from the session itself.'}
        </AppText>
        <Button label={plan.status === 'planning' ? 'Carry on planning' : `Open your ${noun}`} onPress={openPlan} />
      </View>
    );
  } else {
    body = <SessionDetails plan={plan} challengeId={id!} me={me} />;
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader
        title=""
        onBack={() => router.back()}
        rightElement={
          <PressableScale
            onPress={() => setMenuOpen(true)}
            hitSlop={10}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel="More options"
            style={styles.trigger}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text} />
          </PressableScale>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pull.refreshing}
            onRefresh={pull.onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {body}
      </ScrollView>

      {/* The "···" menu. One thing in it: ending the CHALLENGE. Ending the
          match, Report and Block are on Find, which owns every partner path. */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          style={styles.scrim}
          onPress={() => setMenuOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Pressable style={[styles.sheet, { marginBottom: insets.bottom + theme.spacing(2) }]}>
            <PressableScale
              onPress={onEnd}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel="End this challenge"
              style={styles.sheetRow}
            >
              <View style={styles.sheetRowInner}>
                <Ionicons name="flag-outline" size={17} color={theme.colors.text} />
                <AppText style={styles.sheetLabel}>End this challenge</AppText>
              </View>
            </PressableScale>
            <PressableScale
              onPress={() => setMenuOpen(false)}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={[styles.sheetRow, styles.sheetRowQuiet]}
            >
              <AppText style={styles.sheetLabelQuiet}>Cancel</AppText>
            </PressableScale>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 0 },
  content: { paddingBottom: theme.spacing(4), gap: theme.spacing(1.5) },
  empty: { gap: theme.spacing(1.5), paddingTop: theme.spacing(2) },
  trigger: { paddingHorizontal: 6, paddingVertical: 4 },
  scrim: { flex: 1, backgroundColor: theme.colors.overlayDim, justifyContent: 'flex-end' },
  sheet: {
    marginHorizontal: theme.spacing(1.5),
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(1.5),
    gap: theme.spacing(1),
    ...theme.shadow.lg
  },
  sheetRow: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1.5)
  },
  sheetRowQuiet: { backgroundColor: 'transparent' },
  sheetRowInner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  sheetLabel: { color: theme.colors.text, fontSize: 14 },
  sheetLabelQuiet: { color: theme.colors.muted, fontSize: 14, textAlign: 'center' }
});
