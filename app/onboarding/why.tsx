import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/StateViews';
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

// Step 2 of the challenge setup flow. Every user answers this individually,
// including the partner who was invited in — the answers are personal notes,
// stored per person and never shown to the other side.
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

  // Where this screen hands off: the inviter still has a partner to bring in,
  // the invitee already has one.
  const goNext = () => {
    if (isInvitee) router.replace('/(tabs)/home');
    else router.replace('/onboarding/invite');
  };

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
      Alert.alert('Could not save your answers', error.message);
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(360)} style={styles.header}>
          <AppText variant="label" muted>
            {isInvitee ? "You're in" : 'Your first challenge'}
          </AppText>
          <AppText variant="title">Before you start, let's get clear on why.</AppText>
          <AppText muted>
            We'll bring one of these back to you each day — so the reason is there on the days it's
            hard.
          </AppText>
        </Animated.View>

        {habit ? (
          <Animated.View entering={FadeInDown.delay(100).duration(360)}>
            <Card style={styles.habitCard}>
              <AppText variant="subtitle">{habit}</AppText>
              <AppText variant="caption" muted>
                {isInvitee
                  ? "Your partner's challenge — you're doing it together"
                  : '7-day challenge'}
              </AppText>
            </Card>
          </Animated.View>
        ) : null}

        <ReflectionQuestionList draft={value} onChange={setDraft} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          loading={saveReflections.isPending}
          disabled={filledIn === 0}
          onPress={onContinue}
        />
        {/* Skippable as a set: this adds real value but must never stand
            between someone eager and their first day. */}
        <Button label="Skip for now" variant="ghost" onPress={goNext} />
      </View>
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
  habitCard: { gap: theme.spacing(0.5) },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
