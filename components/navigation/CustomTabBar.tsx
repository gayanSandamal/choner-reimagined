import { useEffect } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// expo-router supplies bottom-tabs internally; we don't import its types
// here to avoid a hard dep on @react-navigation/bottom-tabs. The shape we
// rely on is small and stable.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: string; target?: string; canPreventDefault?: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: never) => void;
  };
};
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motion';

// A readonly-ish shared value; both useSharedValue and useDerivedValue satisfy it.
type ReadableValue = { value: number };

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  home: ['home', 'home-outline'],
  challenges: ['flash', 'flash-outline'],
  community: ['people', 'people-outline'],
  insights: ['analytics', 'analytics-outline'],
  profile: ['person', 'person-outline']
};

const LABELS: Record<string, string> = {
  home: 'Home',
  challenges: 'Quests',
  community: 'Community',
  insights: 'Insights',
  profile: 'Profile'
};

// The only tabs shown in the bar, in this order. Any other registered route
// (e.g. `insights`) stays reachable programmatically but is hidden here.
const VISIBLE_ORDER = ['home', 'challenges', 'community', 'profile'];

// --- Layout constants (tuned so the liquid blob hugs the active icon and the
// label sits cleanly below it) ---
const BAR_HEIGHT = 66;
const PAD_TOP = 11; // space above the icon inside the bar
const ICON_SIZE = 24;
const ICON_BOX = 28; // crossfade stack height
const ICON_CENTER_Y = PAD_TOP + ICON_BOX / 2; // vertical center of the icon row
const BLOB_SIZE = 42; // resting diameter of the liquid indicator
const GLOW_SIZE = 92; // soft radial halo around the blob
const GAP = 8; // icon -> label gap (keeps the label clear of the blob)

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * A single tab. Its "focus" (0..1) is derived continuously from the shared
 * blob position, so the icon fills and its label fades in as the liquid blob
 * flows underneath it — a smooth hand-off rather than a toggle.
 */
function TabItem({
  index,
  routeName,
  pos,
  onPress
}: {
  index: number;
  routeName: string;
  pos: ReadableValue;
  onPress: () => void;
}) {
  const press = useSharedValue(0);

  const iconWrapStyle = useAnimatedStyle(() => {
    const f = interpolate(Math.abs(pos.value - index), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { transform: [{ scale: (1 + f * 0.12) * (1 - press.value * 0.14) }] };
  });
  const outlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(pos.value - index), [0, 1], [0, 1], Extrapolation.CLAMP)
  }));
  const filledStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(pos.value - index), [0, 1], [1, 0], Extrapolation.CLAMP)
  }));
  const labelStyle = useAnimatedStyle(() => {
    const f = interpolate(Math.abs(pos.value - index), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { opacity: f, transform: [{ translateY: (1 - f) * 4 }] };
  });

  const [filled, outline] = ICONS[routeName] ?? ['ellipse', 'ellipse-outline'];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, theme.motion.spring.bouncy);
      }}
      style={styles.tab}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityLabel={LABELS[routeName] ?? routeName}
    >
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, outlineStyle]}>
          <Ionicons name={outline} size={ICON_SIZE} color={theme.colors.muted} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, filledStyle]}>
          <Ionicons name={filled} size={ICON_SIZE} color={theme.colors.bg} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {LABELS[routeName] ?? routeName}
      </Animated.Text>
    </Pressable>
  );
}

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // Show only VISIBLE_ORDER, preserving each route's original key/index so
  // navigation and the active highlight stay correct after filtering.
  const visible = VISIBLE_ORDER.flatMap((name) => {
    const routeIndex = state.routes.findIndex((r) => r.name === name);
    return routeIndex === -1 ? [] : [{ name, key: state.routes[routeIndex].key, routeIndex }];
  });
  const count = visible.length;
  const activeIndex = Math.max(
    0,
    visible.findIndex((v) => v.routeIndex === state.index)
  );

  // Two springs chase the active index at different stiffness. `lead` snaps
  // ahead, `lag` trails — their gap peaks mid-travel and is exactly zero at
  // rest, which drives the liquid squash-and-stretch without a free-running
  // frame loop (so it always settles to a clean circle on web and native).
  const lead = useSharedValue(activeIndex);
  const lag = useSharedValue(activeIndex);
  const rowW = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      lead.value = activeIndex;
      lag.value = activeIndex;
    } else {
      lead.value = withSpring(activeIndex, { damping: 18, stiffness: 200, mass: 0.9 });
      lag.value = withSpring(activeIndex, { damping: 16, stiffness: 90, mass: 1 });
    }
  }, [activeIndex, reduceMotion]);

  // Position the blob/icons follow (smooth average of the two springs).
  const pos = useDerivedValue(() => (lead.value + lag.value) / 2);
  // Liquid stretch: proportional to how far the two springs have diverged.
  const stretch = useDerivedValue(() => Math.min(Math.abs(lead.value - lag.value) * 0.9, 0.55));

  const blobStyle = useAnimatedStyle(() => {
    const slot = rowW.value / count;
    const cx = slot * (pos.value + 0.5);
    return {
      transform: [
        { translateX: cx - BLOB_SIZE / 2 },
        { scaleX: 1 + stretch.value },
        { scaleY: 1 - stretch.value * 0.42 }
      ]
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const slot = rowW.value / count;
    const cx = slot * (pos.value + 0.5);
    return {
      opacity: 0.6 + stretch.value * 0.5,
      transform: [
        { translateX: cx - GLOW_SIZE / 2 },
        { scaleX: 1 + stretch.value * 1.3 },
        { scaleY: 1 - stretch.value * 0.2 }
      ]
    };
  });

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.card}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
        {/* Top sheen for the glass edge */}
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sheen}
        />

        {/* Liquid glow halo — soft radial falloff */}
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
          <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
            <Defs>
              <RadialGradient id="tabGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.5} />
                <Stop offset="45%" stopColor={theme.colors.primary2} stopOpacity={0.2} />
                <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#tabGlow)" />
          </Svg>
        </Animated.View>

        {/* Liquid indicator blob */}
        <Animated.View style={[styles.blob, blobStyle]} pointerEvents="none">
          <AnimatedLinearGradient
            colors={theme.gradients.warm}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.9 }}
            style={styles.blobSheen}
          />
        </Animated.View>

        <View
          style={styles.row}
          onLayout={(e: LayoutChangeEvent) => {
            rowW.value = e.nativeEvent.layout.width;
          }}
        >
          {visible.map((route, index) => {
            const focused = index === activeIndex;
            return (
              <TabItem
                key={route.key}
                index={index}
                routeName={route.name}
                pos={pos}
                onPress={() => {
                  haptics.selection();
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name as never);
                  }
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    backgroundColor: 'transparent'
  },
  card: {
    height: BAR_HEIGHT,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.glassBorder,
    backgroundColor: 'rgba(6,29,52,0.55)',
    ...theme.shadow.lg
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,26,45,0.35)'
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BAR_HEIGHT / 2
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: PAD_TOP,
    gap: GAP
  },
  iconWrap: {
    width: ICON_SIZE + 8,
    height: ICON_BOX
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.2,
    color: theme.colors.accent
  },
  blob: {
    position: 'absolute',
    top: ICON_CENTER_Y - BLOB_SIZE / 2,
    left: 0,
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
    overflow: 'hidden',
    transformOrigin: 'center'
  },
  blobSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BLOB_SIZE * 0.55
  },
  glow: {
    position: 'absolute',
    top: ICON_CENTER_Y - GLOW_SIZE / 2,
    left: 0,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    transformOrigin: 'center'
  }
});
