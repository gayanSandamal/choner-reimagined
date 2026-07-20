import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Pill segmented control with a sliding gradient-free thumb. Sized off the
// measured track width so it works regardless of how many options.
export function SegmentedToggle<T extends string>({ options, value, onChange }: Props<T>) {
  const reduceMotion = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segWidth = trackWidth > 0 ? (trackWidth - PADDING * 2) / options.length : 0;

  const x = useSharedValue(0);
  useEffect(() => {
    const target = PADDING + index * segWidth;
    x.value = reduceMotion ? target : withSpring(target, theme.motion.spring.gentle);
  }, [index, segWidth, reduceMotion]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: segWidth
  }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.track} onLayout={onLayout}>
      {segWidth > 0 ? <Animated.View style={[styles.thumb, thumbStyle]} /> : null}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            style={styles.segment}
            scaleTo="subtle"
            haptic="selection"
            onPress={() => onChange(opt.value)}
          >
            <View style={styles.segmentInner}>
              {opt.icon ? (
                <Ionicons
                  name={opt.icon}
                  size={15}
                  color={active ? theme.colors.text : theme.colors.muted}
                />
              ) : null}
              <AppText
                variant="caption"
                style={{
                  color: active ? theme.colors.text : theme.colors.muted,
                  fontFamily: theme.fonts.bodyBold
                }}
              >
                {opt.label}
              </AppText>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const PADDING = 4;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: PADDING
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: 0,
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.pill
  },
  segment: { flex: 1 },
  segmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8
  }
});
