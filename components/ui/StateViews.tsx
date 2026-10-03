import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { Button } from './button';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

type GlyphName = keyof typeof Ionicons.glyphMap;

interface BaseProps {
  icon?: GlyphName;
  iconTint?: 'warm' | 'sky' | 'success' | 'calm';
}

function AnimatedIcon({
  name,
  tint = 'warm',
  animation = 'float'
}: {
  name: GlyphName;
  tint?: 'warm' | 'sky' | 'success' | 'calm';
  animation?: 'float' | 'spin' | 'pulse';
}) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    if (animation === 'float') {
      t.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else if (animation === 'spin') {
      t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    } else if (animation === 'pulse') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [animation, reduceMotion]);

  const style = useAnimatedStyle(() => {
    if (animation === 'spin') {
      return { transform: [{ rotate: `${t.value * 360}deg` }] };
    }
    if (animation === 'pulse') {
      return { transform: [{ scale: 1 + pulse.value * 0.08 }] };
    }
    return { transform: [{ translateY: -6 * t.value }] };
  });

  return (
    <Animated.View style={[styles.illustration, style]}>
      <LinearGradient
        colors={theme.gradients[tint] as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name={name} size={44} color="#FFFFFF" />
    </Animated.View>
  );
}

const LOGO = require('../../assets/choner-logo.png');

// The brand mark breathing, not a spinning hourglass on an orange disc. That
// disc was the old loading look and still showed on every tab's first load
// (#114). Reduced motion gets the still mark.
function LoadingMark() {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + t.value * 0.45,
    transform: [{ scale: 0.94 + t.value * 0.06 }]
  }));

  return (
    <Animated.View style={style} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Image source={LOGO} style={styles.loadingMark} resizeMode="contain" />
    </Animated.View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.container}>
      <LoadingMark />
      {label ? (
        <AppText muted variant="caption">
          {label}
        </AppText>
      ) : null}
    </Animated.View>
  );
}

interface ErrorProps extends BaseProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  icon = 'cloud-offline-outline',
  iconTint = 'warm',
  title = "We can't reach that right now",
  message = 'Check your connection and give it another shot. Your data is safe.',
  onRetry
}: ErrorProps) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
      <AnimatedIcon name={icon} tint={iconTint} animation="pulse" />
      <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.text}>
        <AppText variant="subtitle" style={styles.center}>
          {title}
        </AppText>
        <AppText muted variant="caption" style={styles.center}>
          {message}
        </AppText>
      </Animated.View>
      {onRetry ? (
        <Animated.View entering={FadeInDown.delay(120).duration(260)}>
          <Button label="Try again" variant="gradient" onPress={onRetry} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

interface EmptyProps extends BaseProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  icon = 'sparkles-outline',
  iconTint = 'warm',
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary
}: EmptyProps) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
      <AnimatedIcon name={icon} tint={iconTint} animation="float" />
      <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.text}>
        <AppText variant="subtitle" style={styles.center}>
          {title}
        </AppText>
        {body ? (
          <AppText muted variant="caption" style={[styles.center, { maxWidth: 280 }]}>
            {body}
          </AppText>
        ) : null}
      </Animated.View>
      {actionLabel && onAction ? (
        <Animated.View entering={FadeInDown.delay(120).duration(260)}>
          <Button label={actionLabel} variant="gradient" onPress={onAction} />
        </Animated.View>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Animated.View entering={FadeInDown.delay(160).duration(260)}>
          <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing(4),
    gap: theme.spacing(2)
  },
  text: { alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
  illustration: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadow.glow
  },
  // choner-logo.png is 542 x 368.
  loadingMark: { width: 72, height: (72 * 368) / 542 }
});
