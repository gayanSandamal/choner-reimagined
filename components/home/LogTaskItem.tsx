import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

const SWIPE_THRESHOLD = 56;

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

  const fly = () => {
    'worklet';
    translateY.value = withTiming(-220, { duration: 240 });
    opacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onFeedFire)();
    });
  };

  const complete = () => {
    haptics.bold();
    if (reduceMotion) {
      onFeedFire();
      return;
    }
    fly();
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY < 0 ? e.translationY : e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (e.translationY < -SWIPE_THRESHOLD || e.velocityY < -800) {
        runOnJS(complete)();
      } else {
        translateY.value = withSpring(0, theme.motion.spring.gentle);
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(complete)();
  });

  const gesture = Gesture.Race(pan, tap);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: 1 - Math.min(0.15, -translateY.value / 900) }],
    opacity: opacity.value
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.card, cardStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. Feed the fire.`}
        accessibilityHint="Marks this as done today"
      >
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
        <View style={styles.feedBtn}>
          <Ionicons name="flame" size={16} color={theme.colors.ember} />
          <AppText variant="caption" style={styles.feedLabel}>Feed</AppText>
        </View>
      </Animated.View>
    </GestureDetector>
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
  feedBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: 'rgba(255,138,31,0.12)',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,138,31,0.32)',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  feedLabel: {
    color: theme.colors.primary2,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.3
  }
});
