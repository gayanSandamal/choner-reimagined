import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { PressableScale } from '@/components/ui/PressableScale';
import type { BeginnerOption, StartingPointStatus } from '@/features/challenges/api';
import { theme } from '@/constants/theme';

// Past-tense verb per activity, so the experience question reads naturally:
// "Have you run before?" / "Have you cycled before?".
const PAST_VERB: Record<string, string> = {
  running: 'run',
  walking: 'walked',
  cycling: 'cycled',
  yoga: 'done yoga',
  home_workouts: 'done this',
  badminton: 'played'
};

export interface StartingPointAnswer {
  capability?: number | null;
  beginnerStart?: number | null;
  commitment: number;
}

interface Props {
  status: StartingPointStatus;
  habitTitle: string | null;
  busy?: boolean;
  onSubmit: (answer: StartingPointAnswer) => void;
  onDismiss: () => void;
}

// The Home prompt. Framed as something new and forward-looking — deliberately
// NOT "complete your setup", which reads as unfinished admin and gets
// dismissed.
//
// The whole point is the beginner branch: answering "I'm new to this" never
// asks for a capability number. It says so plainly, collects a starting point
// instead, and the real capability gets backfilled from their first check-in.
export function StartingPointOverlay({ status, habitTitle, busy, onSubmit, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  const unit = status.unit ?? '';
  const defaultTarget = status.default_target ?? 1;
  const step = status.metric_type === 'reps' ? 5 : unit === 'km' ? 0.5 : 1;
  const verb = PAST_VERB[status.activity_key ?? ''] ?? 'done this';
  const beginnerOptions: BeginnerOption[] = status.beginner_options ?? [];

  const [isNew, setIsNew] = useState<boolean | null>(null);
  const [capability, setCapability] = useState(defaultTarget * 2);
  const [beginnerStart, setBeginnerStart] = useState<number | null>(null);
  const [commitment, setCommitment] = useState(status.commitment_value ?? defaultTarget);

  const canSubmit = isNew === false || (isNew === true && beginnerStart !== undefined);

  const submit = () => {
    if (isNew === null) return;
    onSubmit(
      isNew
        ? { capability: null, beginnerStart, commitment }
        : { capability, beginnerStart: null, commitment }
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.scrim} pointerEvents="box-none">
      <Animated.View
        entering={FadeInDown.delay(60).duration(240)}
        style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing(3) }]}
      >
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <AppText variant="label" muted style={styles.eyebrow}>
            20 seconds
          </AppText>
          <AppText variant="subtitle" style={styles.title}>
            Where are you{' '}
            <AppText variant="subtitle" style={styles.emphasis}>
              starting from?
            </AppText>
          </AppText>
          <AppText variant="caption" muted style={styles.sub}>
            Helps us match you well, and keeps your goal honest.
          </AppText>

          {/* Q1 — experience */}
          <AppText style={styles.fieldLabel}>
            Have you {verb} before{habitTitle ? '' : ''}?
          </AppText>
          <View style={styles.pillRow}>
            <Pill label="I'm new to this" active={isNew === true} onPress={() => setIsNew(true)} />
            <Pill label="Yes, before" active={isNew === false} onPress={() => setIsNew(false)} />
          </View>

          {/* Experienced -> capability. Beginners are never asked this. */}
          {isNew === false ? (
            <View style={styles.softCard}>
              <AppText style={styles.fieldLabel}>Most you've managed</AppText>
              <NumberStepper
                value={capability}
                onChange={setCapability}
                unit={unit}
                step={step}
                min={step}
              />
            </View>
          ) : null}

          {/* Beginner -> reassurance + a starting point, no capability. */}
          {isNew === true ? (
            <>
              <View style={styles.reassureCard}>
                <AppText variant="caption" style={styles.reassureText}>
                  That's fine — let's try it first. You can give us your number after you
                  finish today.
                </AppText>
              </View>
              {beginnerOptions.length ? (
                <>
                  <AppText style={styles.fieldLabel}>What would you like to start with?</AppText>
                  <View style={styles.pillRow}>
                    {beginnerOptions.map((option) => (
                      <Pill
                        key={option.label}
                        label={option.label}
                        active={beginnerStart === option.value}
                        onPress={() => {
                          setBeginnerStart(option.value);
                          if (option.value != null) setCommitment(option.value);
                        }}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          {/* Q2 — commitment. Asked of everyone, once experience is answered. */}
          {isNew !== null ? (
            <View style={[styles.softCard, styles.commitCard]}>
              <AppText style={styles.fieldLabel}>Committing to, each time</AppText>
              <NumberStepper
                value={commitment}
                onChange={setCommitment}
                unit={unit}
                step={step}
                min={step}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Set my starting point"
            disabled={isNew === null || !canSubmit}
            loading={busy}
            onPress={submit}
          />
          <Button label="Remind me tomorrow" variant="ghost" onPress={onDismiss} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Pill({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo="subtle"
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.pill, active && styles.pillActive]}
    >
      <AppText style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</AppText>
    </PressableScale>
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
  // Full-width bottom sheet, rounded on the top corners only — the prototype's
  // .sheet. Capped so a long form never swallows the whole screen.
  sheet: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
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
  body: { gap: theme.spacing(1) },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 21 },
  emphasis: { fontFamily: theme.fonts.bodyBold, fontSize: 21 },
  sub: { marginBottom: theme.spacing(1) },
  fieldLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 12.5,
    color: theme.colors.text,
    marginBottom: 2
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing(1) },
  pill: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  pillActive: { borderColor: 'transparent', backgroundColor: theme.colors.primary },
  pillLabel: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  pillLabelActive: { color: '#FFFFFF' },
  softCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5),
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
    ...theme.shadow.sm
  },
  // The commitment card is the one that matters — flagged with the brand rule
  // down its left edge, as in the prototype.
  commitCard: { borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  reassureCard: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1)
  },
  reassureText: { color: theme.colors.text, lineHeight: 19 },
  footer: { gap: theme.spacing(0.5), paddingTop: theme.spacing(1) }
});
