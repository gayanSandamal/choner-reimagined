import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { PairSafetyMenu } from '@/components/safety/PairSafetyMenu';
import { SayHiStep } from '@/components/plans/steps/SayHiStep';
import { StepsInIntro } from '@/components/plans/steps/StepsInIntro';
import { PlanStepBody } from '@/components/plans/PlanStepBody';
import { usePairPlan } from '@/features/plans/hooks';
import { planStep } from '@/features/plans/steps';
import { useProfile } from '@/features/profile/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

// The session flow for one pairing (handover §3). Which screen shows is
// derived from the plan by planStep(), never tracked separately, so the two
// people can't drift out of step with the server or each other.
export default function PlanScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const { session } = useSession();
  const profileQ = useProfile(session?.user.id);
  const planQ = usePairPlan(challengeId);
  // "Choner steps in" is a moment, not a state: shown once between Say Hi and
  // planning, then dismissed for this visit.
  const [introDone, setIntroDone] = useState(false);

  const plan = planQ.data;
  const me = {
    name: ((profileQ.data?.full_name ?? '').trim().split(/\s+/)[0] || 'You') as string,
    avatarUrl: profileQ.data?.avatar_url ?? null
  };

  let body: React.ReactNode;
  if (planQ.isLoading) body = <LoadingState />;
  else if (planQ.isError) body = <ErrorState message={(planQ.error as Error).message} onRetry={() => planQ.refetch()} />;
  else if (!plan) body = <AppText muted>Nothing to plan right now.</AppText>;
  else {
    const step = planStep(plan);
    if (step === 'say_hi') body = <SayHiStep plan={plan} />;
    else if (step === 'how_much' && plan.kind === 'first_run' && !introDone && !plan.me.distance_answer)
      body = <StepsInIntro plan={plan} me={me} onContinue={() => setIntroDone(true)} />;
    else body = <PlanStepBody plan={plan} step={step} me={me} challengeId={challengeId!} />;
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader
        title=""
        onBack={() => router.back()}
        rightElement={
          plan && plan.status !== 'ended' && challengeId ? (
            <PairSafetyMenu userChallengeId={challengeId} partnerFirstName={plan.them.first_name} tone="ink" />
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 0 },
  content: { paddingBottom: theme.spacing(4), gap: theme.spacing(1.5) }
});
