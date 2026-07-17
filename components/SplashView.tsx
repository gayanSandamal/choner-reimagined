import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { BrandLogo } from '@/components/auth/BrandLogo';
import { useReduceMotion } from '@/lib/motion';
import { theme } from '@/constants/theme';

// Mirrors the native OS splash (heart-orbit mark centered on brand navy) so
// the JS-side loading gaps — font loading, session restore, dev reloads —
// show the same frame instead of a blank screen. Uses only SVG, so it can
// render before custom fonts are ready. While the splash holds, the whole
// mark pulses in a heartbeat rhythm (lub-dub, then rest) — a pure scale
// transform on the exact artwork, so the mark itself is never redrawn.
// First frame is at rest (scale 1), matching the native splash image.
const BEAT_IN = { duration: 130, easing: Easing.out(Easing.quad) };
const BEAT_OUT = { duration: 170, easing: Easing.in(Easing.quad) };
const REST_MS = 900;

export function SplashView() {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, BEAT_IN),
        withTiming(1, BEAT_OUT),
        withTiming(1.04, BEAT_IN),
        withTiming(1, BEAT_OUT),
        withDelay(REST_MS, withTiming(1, { duration: 0 }))
      ),
      -1,
      false
    );
    return () => cancelAnimation(scale);
  }, [reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={pulseStyle}>
        <BrandLogo size={200} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg
  }
});
