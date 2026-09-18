import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import type { MissReason } from '@/features/challenges/api';
import { theme } from '@/constants/theme';

const REASONS: Array<{ value: MissReason; label: string }> = [
  { value: 'too_busy', label: 'Too busy' },
  { value: 'too_tired', label: 'Too tired' },
  { value: 'forgot', label: 'Forgot' },
  { value: 'didnt_feel_like_it', label: "Didn't feel like it" },
  { value: 'something_came_up', label: 'Something came up' }
];

// A blocking, one-time prompt — unlike the toast banner, this does not
// auto-dismiss. It captures a single tap, then the gate hides it for the
// session; there is no follow-up logic here, just capture and move on.
export function MissReasonOverlay({
  onSelect,
  onDismiss
}: {
  onSelect: (reason: MissReason) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.scrim} pointerEvents="box-none">
      <Animated.View
        entering={FadeInDown.delay(60).duration(240)}
        style={[styles.card, { marginBottom: insets.bottom + theme.spacing(2) }]}
      >
        <View style={styles.header}>
          <AppText variant="subtitle" style={styles.title}>
            You missed yesterday. What got in the way?
          </AppText>
          <PressableScale
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={18} color={theme.colors.muted} />
          </PressableScale>
        </View>

        <View style={styles.options}>
          {REASONS.map((reason) => (
            <PressableScale
              key={reason.value}
              onPress={() => onSelect(reason.value)}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel={reason.label}
              style={styles.option}
            >
              <AppText style={styles.optionLabel}>{reason.label}</AppText>
            </PressableScale>
          ))}
        </View>
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
  card: {
    marginHorizontal: theme.spacing(1.5),
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    gap: theme.spacing(1.5),
    ...theme.shadow.lg
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(1) },
  title: { flex: 1 },
  options: { gap: theme.spacing(1) },
  option: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.5)
  },
  optionLabel: { color: theme.colors.text, fontSize: 14 }
});
