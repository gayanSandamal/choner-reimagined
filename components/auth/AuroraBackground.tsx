import { useEffect } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

// Two slow-drifting gradient blobs over a dark backdrop —
// gives auth screens a living "aurora" feel without video or Lottie.
export function AuroraBackground({ style, children }: ViewProps) {
  const reduceMotion = useReduceMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    a.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) }), -1, true);
    b.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduceMotion]);

  const blobA = useAnimatedStyle(() => ({
    transform: [
      { translateX: -120 + a.value * 180 },
      { translateY: -100 + a.value * 220 },
      { scale: 1 + a.value * 0.25 }
    ]
  }));

  const blobB = useAnimatedStyle(() => ({
    transform: [
      { translateX: 140 - b.value * 220 },
      { translateY: 80 + b.value * 160 },
      { scale: 1.1 - b.value * 0.2 }
    ]
  }));

  return (
    <View style={[styles.root, style]}>
      <Animated.View style={[styles.blob, blobA]}>
        <LinearGradient
          colors={['rgba(255,138,31,0.55)', 'rgba(255,78,129,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.blob, blobB]}>
        <LinearGradient
          colors={['rgba(124,92,255,0.45)', 'rgba(51,194,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.tint} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 360,
    height: 360,
    borderRadius: 180,
    opacity: 0.85
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,26,45,0.25)'
  }
});
