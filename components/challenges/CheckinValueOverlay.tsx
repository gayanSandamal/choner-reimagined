import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { theme } from '@/constants/theme';

// Per-activity phrasing, so the question matches what they just did rather
// than asking everyone a generic "how much?".
const PROMPT: Record<string, string> = {
  running: 'How far did you run today?',
  walking: 'How far did you walk today?',
  cycling: 'How far did you ride today?',
  yoga: 'How long was your session?',
  home_workouts: 'How many did you do?',
  badminton: 'How long did you play?'
};

interface Props {
  activityKey?: string | null;
  unit?: string | null;
  metricType?: 'distance' | 'duration' | 'reps' | null;
  // Pre-filled with what they committed to — most days the answer is "exactly
  // what I said I'd do", so that should be one tap.
  initialValue: number;
  // True when this is the number that will become their capability.
  isFirstNumber?: boolean;
  busy?: boolean;
  onSubmit: (value: number) => void;
  onSkip: () => void;
}

export function CheckinValueOverlay({
  activityKey,
  unit,
  metricType,
  initialValue,
  isFirstNumber,
  busy,
  onSubmit,
  onSkip
}: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  const step = metricType === 'reps' ? 5 : unit === 'km' ? 0.5 : 1;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.scrim} pointerEvents="box-none">
      <Animated.View
        entering={FadeInDown.delay(60).duration(240)}
        style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing(3) }]}
      >
        <View style={styles.handle} />

        <AppText variant="label" muted style={styles.eyebrow}>
          Nice one
        </AppText>
        <AppText variant="subtitle" style={styles.title}>
          {PROMPT[activityKey ?? ''] ?? 'What did you reach today?'}
        </AppText>
        {isFirstNumber ? (
          <AppText variant="caption" muted style={styles.sub}>
            This becomes your starting point — we'll measure progress from here.
          </AppText>
        ) : null}

        <View style={styles.stepperCard}>
          <NumberStepper
            value={value}
            onChange={setValue}
            unit={unit ?? undefined}
            step={step}
            min={0}
          />
        </View>

        <Button label="Save it" loading={busy} onPress={() => onSubmit(value)} />
        <Button label="Skip" variant="ghost" onPress={onSkip} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlayDim,
    justifyContent: 'flex-end',
    zIndex: 2000
  },
  sheet: {
    width: '100%',
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: theme.spacing(0.5),
    ...theme.shadow.lg
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: theme.colors.dim,
    alignSelf: 'center',
    marginBottom: 16
  },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 21 },
  sub: { marginBottom: theme.spacing(0.5) },
  stepperCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(2),
    marginVertical: theme.spacing(1.5),
    ...theme.shadow.sm
  }
});
