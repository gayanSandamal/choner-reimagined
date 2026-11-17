import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { planCopy } from '@/features/plans/activity';
import { COPY } from '@/features/plans/copy';
import type { PairPlan } from '@/features/plans/types';
import { useReduceMotion } from '@/lib/motion';
import { theme } from '@/constants/theme';

const SIZE = 96;
// How far each photo travels in before they overlap in the middle.
const TRAVEL = 70;
const OVERLAP = 14;

// "You two are in", redesigned 17 November 2026 (option 1 of 4, without the
// dot). The two photos slide in from either side and overlap, once, then the
// heading rises in. The old shared-session heart belongs to Challenges, where
// it counts sessions together; here it read as the wrong thing. Reduced motion
// shows the finished picture.
export function StepsInIntro({
  plan,
  me,
  onContinue
}: {
  plan: PairPlan;
  me: { name: string; avatarUrl: string | null };
  onContinue: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    t.value = withDelay(150, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion]);

  const left = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateX: -TRAVEL * (1 - t.value) + OVERLAP }]
  }));
  const right = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateX: TRAVEL * (1 - t.value) - OVERLAP }]
  }));

  const them = { name: plan.them.first_name, avatarUrl: plan.them.avatar_url };
  const rise = (delay: number) => (reduceMotion ? undefined : FadeInDown.delay(delay).duration(380));

  return (
    <View style={styles.wrap}>
      <View style={styles.faces} accessible accessibilityLabel={`${me.name} and ${them.name}`}>
        <Animated.View style={[styles.face, styles.front, left]}>
          <Avatar uri={me.avatarUrl} name={me.name} size={SIZE} self />
        </Animated.View>
        <Animated.View style={[styles.face, right]}>
          <Avatar uri={them.avatarUrl} name={them.name} size={SIZE} />
        </Animated.View>
      </View>

      <Animated.View entering={rise(650)} style={styles.text}>
        <AppText style={styles.names}>
          {me.name} and {them.name}
        </AppText>
        <AppText variant="title" style={styles.center}>
          {COPY.stepsInHeading}{' '}
          <AppText variant="title" style={styles.strong}>
            {COPY.stepsInHeadingStrong}
          </AppText>
        </AppText>
        <AppText muted style={styles.center}>
          {planCopy(plan.activity_key).stepsInSub}
        </AppText>
      </Animated.View>

      <Animated.View entering={rise(800)}>
        <Button label={COPY.stepsInButton} onPress={onContinue} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'stretch', gap: theme.spacing(3), paddingTop: theme.spacing(8) },
  faces: { flexDirection: 'row', justifyContent: 'center' },
  // A ring in the page color, so the overlap reads as two separate people.
  face: {
    borderRadius: SIZE / 2 + 5,
    borderWidth: 5,
    borderColor: theme.colors.bg
  },
  front: { zIndex: 2 },
  text: { alignItems: 'center', gap: theme.spacing(1) },
  names: { fontSize: 13, color: theme.colors.muted, textAlign: 'center' },
  center: { textAlign: 'center' },
  strong: { color: theme.colors.primary }
});
