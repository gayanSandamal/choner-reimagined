import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

const SIZE = 250;
const CENTER = 104;
// The CSS keyframes grow each ring 104px -> 250px. Animating width/height in
// RN re-lays-out every frame; scaling a fixed 250px ring from this factor to 1
// is visually identical and runs entirely on the UI thread.
const MIN_SCALE = CENTER / SIZE;

interface Props {
  searching: boolean;
  onPress?: () => void;
}

// The Find tab's one object. Three rings expanding outward from a gradient
// centre that doubles as the button.
//
// The radar is a METAPHOR, never a data claim: it animates whether or not
// anyone is actually nearby, and it must never render blips standing in for
// real people. Matching is concierge-paced, and inventing visible activity
// would be a lie the rest of the product doesn't tell.
export function Radar({ searching, onPress }: Props) {
  const reduceMotion = useReduceMotion();

  return (
    <View style={styles.wrap}>
      <Ring index={0} searching={searching} reduceMotion={reduceMotion} />
      <Ring index={1} searching={searching} reduceMotion={reduceMotion} />
      <Ring index={2} searching={searching} reduceMotion={reduceMotion} />

      <PressableScale
        onPress={onPress}
        // Not tappable once the search is already running.
        disabled={searching || !onPress}
        scaleTo="subtle"
        haptic="medium"
        accessibilityRole="button"
        accessibilityLabel={searching ? 'Looking for your partner' : 'Find a match'}
        accessibilityState={{ disabled: searching }}
        style={styles.centerHit}
      >
        <LinearGradient
          colors={searching ? (['#FD8302', '#FD4E01'] as const) : (['#FDA340', '#FD7A02'] as const)}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.center, searching ? styles.centerSearching : styles.centerRest]}
        >
          <AppText style={styles.centerText}>
            {searching ? 'Looking…' : 'Find a\nMatch'}
          </AppText>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

function Ring({
  index,
  searching,
  reduceMotion
}: {
  index: number;
  searching: boolean;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(0);
  const duration = searching ? 4000 : 5500;
  const stagger = duration / 3;

  useEffect(() => {
    if (reduceMotion) {
      // A permanently pulsing screen is exactly what Reduce Motion exists for.
      // The rings still render, they just hold still.
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      index * stagger,
      withRepeat(
        withTiming(1, { duration, easing: Easing.bezier(0.25, 0.5, 0.35, 1) }),
        -1,
        false
      )
    );
  }, [searching, reduceMotion, duration, stagger, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: MIN_SCALE + progress.value * (1 - MIN_SCALE) }],
    opacity: (searching ? 0.85 : 0.55) * (1 - progress.value)
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, searching ? styles.ringSearching : styles.ringRest, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2
  },
  ringRest: { borderWidth: 2, borderColor: 'rgba(253,131,2,0.28)' },
  ringSearching: { borderWidth: 2.5, borderColor: 'rgba(253,91,1,0.75)' },
  centerHit: { zIndex: 2 },
  center: {
    width: CENTER,
    height: CENTER,
    borderRadius: CENTER / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerRest: {
    shadowColor: '#FD5B01',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  centerSearching: {
    shadowColor: '#FD5B01',
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12
  },
  centerText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center'
  }
});
