import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

export function BrandMark({ tagline }: { tagline?: string }) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.04 }]
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.badge, style]}>
        <LinearGradient
          colors={theme.gradients.warm as unknown as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="flash" size={32} color="#FFF" />
      </Animated.View>
      <AppText variant="display" style={{ marginTop: 14, fontSize: 36 }}>
        Choner
      </AppText>
      {tagline ? (
        <AppText muted style={{ marginTop: 4, textAlign: 'center' }}>
          {tagline}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow
  }
});
