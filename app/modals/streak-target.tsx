import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { streakEstimate } from '@/features/plans/cadence';
import { useSessionStreak, useSetStreakTarget } from '@/features/plans/hooks';
import { STREAK_PRESETS } from '@/features/plans/streak';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// "How long a streak?"
//
// Asked once, right after the first plan is accepted, and not before: until a
// cadence exists the number means nothing, and the plan itself is a
// negotiation while the streak is PERSONAL. Your partner gets no say in your
// number and picks their own.
//
// Presets only (10 / 20 / 30). The line under each is an estimate worked out
// here from target divided by cadence. It is never stored, because misses and
// repairs move it.
export default function StreakTargetModal() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const streakQ = useSessionStreak(challengeId);
  const setTarget = useSetStreakTarget();
  const [picked, setPicked] = useState<number | null>(null);

  const cadence = streakQ.data?.cadence ?? null;
  // Extending: never offer a length the person has already passed.
  const floor = streakQ.data?.resolved ?? 0;
  const options = STREAK_PRESETS.filter((n) => n > floor);

  const onSave = async () => {
    if (!challengeId || !picked) return;
    try {
      const res = await setTarget.mutateAsync({ userChallengeId: challengeId, target: picked });
      if (res && res.ok === false) {
        notify('Could not save that', 'Please try again.');
        return;
      }
      router.back();
    } catch (error: any) {
      notify('Could not save that', error.message);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="" onClose={() => router.back()} />
      <View style={styles.body}>
        <AppText variant="title">How long a streak?</AppText>
        <AppText muted>
          This one is yours. Every session you both finish fills a circle, and nothing resets if you
          miss one.
        </AppText>

        <View style={styles.options}>
          {options.map((n) => {
            const on = picked === n;
            const estimate = streakEstimate(n, cadence);
            return (
              <PressableScale
                key={n}
                onPress={() => setPicked(n)}
                haptic="selection"
                style={[styles.option, on && styles.optionOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${n} sessions`}
              >
                <AppText style={styles.optionLabel}>{n} sessions</AppText>
                {estimate ? <AppText muted style={styles.optionDetail}>{estimate}</AppText> : null}
              </PressableScale>
            );
          })}
        </View>

        <Button
          label="Set my streak"
          disabled={!picked}
          loading={setTarget.isPending}
          onPress={onSave}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing(2) },
  options: { gap: theme.spacing(1) },
  option: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.75),
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 2
  },
  optionOn: { borderColor: theme.colors.primary },
  optionLabel: { fontSize: 16, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  optionDetail: { fontSize: 12.5 }
});
