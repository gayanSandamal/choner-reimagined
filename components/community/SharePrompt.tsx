import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import {
  useDecidedMilestones,
  useRecordMilestoneDecision
} from '@/features/community/hooks';
import { usePartnerStatus } from '@/features/community/hooks';
import { challengeHabitTitle, partnerStateOf } from '@/features/challenges/api';
import { useProfile } from '@/features/profile/hooks';
import type { MilestoneKind } from '@/features/community/milestones';
import { theme } from '@/constants/theme';

const ORANGE = '#FE8C00';

// A streak only becomes worth mentioning once it's a real run.
const STREAK_THRESHOLD = 7;

interface Props {
  userId: string | undefined;
  challenge: any;
  streak: number;
}

// "Share this with Colombo?" — the only way anything reaches the Community
// feed.
//
// It lives on Home and Challenges rather than in Community on purpose: it
// fires right after a real milestone, while the moment still means something,
// and Community itself has no post button at all. Ignoring it shares nothing.
export function SharePrompt({ userId, challenge, streak }: Props) {
  const profileQ = useProfile(userId);
  const partnerStatusQ = usePartnerStatus(userId);
  const decidedQ = useDecidedMilestones(userId, challenge?.id ?? null);
  const record = useRecordMilestoneDecision();

  const city = profileQ.data?.city ?? null;
  const decided = decidedQ.data ?? [];

  // Which milestone, if any, is true right now. Order matters: finishing is a
  // bigger moment than the streak that got you there.
  let kind: MilestoneKind | null = null;
  if (challenge?.status === 'completed') kind = 'complete';
  else if (partnerStateOf(challenge) === 'partnered' && streak >= STREAK_THRESHOLD) kind = 'streak';

  // Nothing to celebrate, nowhere to send it, or they've already answered this
  // exact question once.
  if (!kind || !userId || !city || decided.includes(kind) || decidedQ.isLoading) return null;

  const answer = (shared: boolean) => {
    record.mutate({
      userId,
      partnerUserId: partnerStatusQ.data?.partner_id ?? null,
      userChallengeId: challenge?.id ?? null,
      kind: kind!,
      habitTitle: challengeHabitTitle(challenge),
      streakDays: kind === 'streak' ? streak : null,
      city,
      shared
    });
  };

  return (
    <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOut} style={styles.card}>
      <View style={styles.body}>
        <AppText style={styles.title}>
          {kind === 'complete' ? 'You finished it.' : `${streak} days straight.`}
        </AppText>
        <AppText style={styles.sub}>Share this with {city}?</AppText>
      </View>
      <View style={styles.actions}>
        {/* "No" writes too — that record is what stops us asking again. */}
        <PressableScale onPress={() => answer(false)} haptic="selection" style={styles.no}>
          <AppText style={styles.noText}>No</AppText>
        </PressableScale>
        <PressableScale onPress={() => answer(true)} haptic="light" style={styles.yes}>
          <AppText style={styles.yesText}>Share</AppText>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(254,140,0,0.28)',
    backgroundColor: 'rgba(254,140,0,0.07)',
    padding: 14
  },
  body: { flexShrink: 1, flexGrow: 1, gap: 2 },
  title: { color: theme.colors.text, fontSize: 13.5, fontFamily: theme.fonts.bodyBold },
  sub: { color: theme.colors.muted, fontSize: 11.5 },
  actions: { flexDirection: 'row', gap: 8 },
  no: { paddingHorizontal: 12, paddingVertical: 8 },
  noText: { color: theme.colors.muted, fontSize: 12 },
  yes: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: ORANGE
  },
  yesText: { color: '#2a1400', fontSize: 12, fontFamily: theme.fonts.bodyBold }
});
