import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { KeyboardFooterScroll } from '@/components/ui/keyboard';
import { ReflectionQuestionList } from '@/components/challenges/ReflectionQuestionList';
import { useOnboarding } from '@/features/onboarding/context';
import { useIsInvitee } from '@/features/onboarding/invitee';
import {
  ReflectionDraft,
  answeredCount,
  draftFromAnswers,
  draftToAnswers,
  emptyDraft
} from '@/features/challenges/reflections';
import { challengeHabitTitle } from '@/features/challenges/api';
import {
  useMyChallenge,
  useReflections,
  useSaveReflections
} from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// A CHALLENGES screen, not an onboarding one. It moved out of the onboarding
// stack on 2026-09-29: the question is asked once, at the first session, which
// is when it means something. Everyone answers it individually, and the
// answers are private: they are a commitment device for the person who wrote
// them, never something shown to the partner.
export default function WhyScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { chosenChallenge } = useOnboarding();
  const challengesQ = useMyChallenge(userId);
  const reflectionsQ = useReflections(userId);
  const saveReflections = useSaveReflections();
  const { isInvitee, resolving } = useIsInvitee(userId);

  // Null until seeded from whatever is already stored, so re-entering this
  // screen shows the answers back rather than a blank form the user would
  // have to fill in twice.
  const [draft, setDraft] = useState<ReflectionDraft | null>(null);
  useEffect(() => {
    if (draft === null && reflectionsQ.data) setDraft(draftFromAnswers(reflectionsQ.data));
  }, [reflectionsQ.data, draft]);
  const value = draft ?? emptyDraft();

  const challenge = challengesQ.data ?? null;

  // An invitee never saw Step 1, so the habit has to come from the challenge
  // they were just joined to.
  const habit = chosenChallenge?.title ?? challengeHabitTitle(challenge);

  const filledIn = answeredCount(value);

  // Always Home. This is asked once the first session is agreed, so by the
  // time anyone sees it both people already have a partner. The old branch
  // sent non-invitees back into onboarding to go and find one, which made
  // sense while this screen lived in the onboarding stack and does not now.
  const goNext = () => router.replace('/(tabs)/home');

  const onContinue = async () => {
    if (!userId) return;
    try {
      await saveReflections.mutateAsync({
        userId,
        userChallengeId: challenge?.id ?? null,
        answers: draftToAnswers(value)
      });
      goNext();
    } catch (error: any) {
      notify('Could not save your answers', error.message);
    }
  };

  if (resolving || reflectionsQ.isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <LoadingState label="Setting up your challenge…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardFooterScroll
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        footerStyle={styles.footer}
        footer={
          <>
            <Button
              label="Continue"
              loading={saveReflections.isPending}
              disabled={filledIn === 0}
              onPress={onContinue}
            />
            {/* Skippable as a set: this adds real value but must never stand
                between someone eager and their first day. */}
            <Button label="Skip for now" variant="ghost" onPress={goNext} />
          </>
        }
      >
        <Animated.View entering={FadeInDown.duration(360)} style={styles.header}>
          <AppText variant="label" muted style={styles.eyebrow}>
            {isInvitee ? "You're in" : 'Your first challenge'}
          </AppText>
          {/* The house copy ladder (app/find/form.tsx): eyebrow, a title whose
              point carries a bold span, then a muted line. The title used to be
              one flat Light-300 string, which is the "old style" in #135. */}
          <AppText variant="title">
            Before you start, let&apos;s get clear on{' '}
            <AppText style={styles.emphasis}>why</AppText>.
          </AppText>
          <AppText style={styles.sub}>
            We&apos;ll bring one of these back to you each day, so the reason is there on the
            days it&apos;s hard.
          </AppText>
        </Animated.View>

        {habit ? (
          <Animated.View entering={FadeInDown.delay(100).duration(360)}>
            <View style={styles.habitCard}>
              <AppText style={styles.habitTitle}>{habit}</AppText>
              {isInvitee ? (
                <AppText style={styles.habitSub}>
                  Your partner&apos;s challenge, you&apos;re doing it together
                </AppText>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        <ReflectionQuestionList draft={value} onChange={setDraft} />
      </KeyboardFooterScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    padding: 20,
    paddingTop: theme.spacing(3),
    gap: theme.spacing(3),
    flexGrow: 1
  },
  header: { gap: theme.spacing(1) },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  emphasis: { fontFamily: theme.fonts.bodyBold },
  sub: {
    fontFamily: theme.fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.muted
  },
  // The borderless shadow.sm card the current screens use, not Card's
  // bordered default (#135).
  habitCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 3,
    ...theme.shadow.sm
  },
  habitTitle: { fontFamily: theme.fonts.bodyMedium, fontSize: 15, color: theme.colors.text },
  habitSub: {
    fontFamily: theme.fonts.bodyRegular,
    fontSize: 12.5,
    lineHeight: 17,
    color: theme.colors.muted
  },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
