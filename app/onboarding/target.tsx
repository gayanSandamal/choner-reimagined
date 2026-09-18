import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { LoadingState } from '@/components/ui/StateViews';
import { useOnboarding } from '@/features/onboarding/context';
import { useChallengeTemplate, useMyChallenge, useSetChallengeTarget } from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { useIsInvitee } from '@/features/onboarding/invitee';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

const CADENCE_OPTIONS = [
  { value: 7, label: 'Daily' },
  { value: 5, label: '5×/week' },
  { value: 4, label: '4×/week' },
  { value: 3, label: '3×/week' }
] as const;

// Screen 8 (Onboarding & Matching Flow v4) — deliberately light. "How much"
// and "how often", both pre-filled so a user can tap straight through.
// Capability is NOT asked here — that's the Home starting-point prompt
// (Phase 2), the one place beginners are ever asked for a number, and only
// after they've actually done the thing once. Rolls its own shell rather
// than OnboardingScaffold: like challenge.tsx and why.tsx either side of it,
// this sits outside the numbered 6-dot quiz.
export default function TargetScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { chosenChallenge } = useOnboarding();
  const { isInvitee, resolving } = useIsInvitee(userId);
  const templateQ = useChallengeTemplate(chosenChallenge?.templateId);
  const challengeQ = useMyChallenge(userId);
  const setTarget = useSetChallengeTarget();

  const template = templateQ.data as any;
  const unit: string | undefined = template?.unit ?? undefined;
  const defaultTarget: number = template?.default_target ?? 1;
  const step = template?.metric_type === 'reps' ? 5 : unit === 'km' ? 0.5 : 1;

  const [amount, setAmount] = useState(defaultTarget);
  const [cadence, setCadence] = useState<7 | 5 | 4 | 3>(7);

  // Custom habits and invitees skip this screen — a custom habit has no
  // metric_type to build a stepper from, and an invitee's target is set by
  // whoever started the challenge.
  const skip = isInvitee || Boolean(chosenChallenge?.customTitle);
  useEffect(() => {
    if (!resolving && skip) router.replace('/onboarding/why');
  }, [resolving, skip]);

  useEffect(() => {
    if (template?.default_target != null) setAmount(template.default_target);
  }, [template?.id]);

  const userChallengeId = challengeQ.data?.id as string | undefined;

  const onContinue = async () => {
    if (!userChallengeId) return;
    try {
      await setTarget.mutateAsync({
        userChallengeId,
        commitmentValue: amount,
        daysPerWeek: cadence,
        mode: template?.forced_mode
      });
      router.push('/onboarding/why');
    } catch (error: any) {
      notify('Could not save your target', error.message);
    }
  };

  if (resolving || skip) {
    return (
      <SafeAreaView style={styles.root}>
        <LoadingState label="Setting up your target…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <AppText variant="title">
          What are you{' '}
          <AppText variant="title" style={styles.emphasis}>
            starting with?
          </AppText>
        </AppText>
        <AppText muted>Just a rough idea. You'll fine-tune it in a moment.</AppText>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <AppText variant="label" muted>
            How much?
          </AppText>
          <NumberStepper value={amount} onChange={setAmount} unit={unit} step={step} min={step} />
        </View>

        <View style={styles.section}>
          <AppText variant="label" muted>
            How often?
          </AppText>
          <SegmentedToggle
            options={CADENCE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            value={String(cadence)}
            onChange={(v) => setCadence(Number(v) as 7 | 5 | 4 | 3)}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          disabled={!userChallengeId}
          loading={setTarget.isPending}
          onPress={onContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  emphasis: { fontFamily: theme.fonts.bodyBold },
  content: { padding: 20, gap: theme.spacing(3), flexGrow: 1 },
  section: { gap: theme.spacing(1.5) },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
