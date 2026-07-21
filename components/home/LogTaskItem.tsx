import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

type GlyphName = keyof typeof Ionicons.glyphMap;

function typeIcon(taskType: string): GlyphName {
  const t = taskType.toLowerCase();
  if (t.includes('mind') || t.includes('journal')) return 'book-outline';
  if (t.includes('move') || t.includes('exercise') || t.includes('fitness')) return 'walk-outline';
  if (t.includes('sleep') || t.includes('rest')) return 'moon-outline';
  if (t.includes('food') || t.includes('nutrition') || t.includes('water')) return 'nutrition-outline';
  if (t.includes('social') || t.includes('connect')) return 'people-outline';
  return 'flame-outline';
}

function dueMeta(dueWindow: string | null): { label: string; icon: GlyphName } {
  const w = (dueWindow ?? 'anytime').toLowerCase();
  if (w.includes('morning')) return { label: 'Morning', icon: 'sunny-outline' };
  if (w.includes('afternoon')) return { label: 'Afternoon', icon: 'partly-sunny-outline' };
  if (w.includes('evening') || w.includes('night')) return { label: 'Evening', icon: 'moon-outline' };
  return { label: 'Anytime', icon: 'infinite-outline' };
}

interface Props {
  title: string;
  taskType: string;
  dueWindow: string | null;
  onFeedFire: () => void;
}

export function LogTaskItem({ title, taskType, dueWindow, onFeedFire }: Props) {
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const due = dueMeta(dueWindow);

  // Feeding is triggered only by the Feed button — the log flies up into the
  // fire, then commits the check-in once it's gone.
  const onFeed = () => {
    haptics.bold();
    if (reduceMotion) {
      onFeedFire();
      return;
    }
    translateY.value = withTiming(-220, { duration: 240 });
    opacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onFeedFire)();
    });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: 1 - Math.min(0.15, -translateY.value / 900) }],
    opacity: opacity.value
  }));

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.iconChip}>
        <Ionicons name={typeIcon(taskType)} size={16} color={theme.colors.primary2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText>{title}</AppText>
        <View style={styles.dueRow}>
          <Ionicons name={due.icon} size={11} color={theme.colors.muted} />
          <AppText variant="caption" muted>{due.label}</AppText>
        </View>
      </View>
      <PressableScale
        style={styles.feedBtnWrap}
        onPress={onFeed}
        haptic="none"
        scaleTo="bold"
        accessibilityRole="button"
        accessibilityLabel={`Feed the fire with ${title}`}
        accessibilityHint="Marks this as done today"
      >
        <LinearGradient
          colors={theme.gradients.warm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.feedBtn}
        >
          <Ionicons name="flame" size={15} color="#3A1600" />
          <AppText style={styles.feedLabel}>Feed</AppText>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2)
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255,138,31,0.14)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  feedBtnWrap: {
    borderRadius: theme.radius.pill,
    ...theme.shadow.glow
  },
  feedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9
  },
  feedLabel: {
    color: '#3A1600',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.2
  }
});
