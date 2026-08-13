import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motion';

const LABELS: Record<string, string> = {
  home: 'Home',
  challenges: 'Challenges',
  community: 'Community',
  insights: 'Insights',
  profile: 'Profile'
};

// The only tabs shown in the bar, in this order. Any other registered route
// (e.g. `insights`) stays reachable programmatically but is hidden here.
const VISIBLE_ORDER = ['home', 'challenges', 'community', 'profile'];

// Fixed geometry so every tab is laid out identically regardless of which
// glyph it draws: each icon is centered in the same box, and the label and
// dot slots always reserve the same height.
const ICON_SIZE = 26;
const ICON_BOX = 30;
const LABEL_LINE_HEIGHT = 16;
const DOT_SLOT = 10;

// All glyphs come from one family (MaterialCommunityIcons) so stroke weight
// and optical size match across the bar — mixing families made each icon
// render at a different weight and sit at a different height. Active vs
// inactive is shown by color alone.
const ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: 'home-outline',
  challenges: 'target',
  community: 'account-multiple-outline',
  profile: 'account-outline'
};

function TabIcon({ routeName, color }: { routeName: string; color: string }) {
  return (
    <MaterialCommunityIcons
      name={ICONS[routeName] ?? 'circle-outline'}
      size={ICON_SIZE}
      color={color}
    />
  );
}

function TabButton({
  routeName,
  focused,
  onPress
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    t.value = reduceMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, theme.motion.spring.gentle);
  }, [focused, reduceMotion]);

  // No scale/lift on the active tab — every icon must render at the same size
  // and on the same baseline; color alone marks the active one.
  const dotStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: t.value }]
  }));

  const color = focused ? theme.colors.primary : theme.colors.muted;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityLabel={LABELS[routeName] ?? routeName}
      accessibilityState={{ selected: focused }}
    >
      <View style={styles.iconBox}>
        <TabIcon routeName={routeName} color={color} />
      </View>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {LABELS[routeName] ?? routeName}
      </Text>
      <View style={styles.dotSlot}>
        <Animated.View style={[styles.dot, dotStyle]} />
      </View>
    </Pressable>
  );
}

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  // Show only VISIBLE_ORDER, preserving each route's original key/index so
  // navigation and the active highlight stay correct after filtering.
  const visible = VISIBLE_ORDER.flatMap((name) => {
    const routeIndex = state.routes.findIndex((r) => r.name === name);
    return routeIndex === -1 ? [] : [{ name, key: state.routes[routeIndex].key, routeIndex }];
  });
  const activeIndex = Math.max(
    0,
    visible.findIndex((v) => v.routeIndex === state.index)
  );

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.row}>
        {visible.map((route, index) => {
          const focused = index === activeIndex;
          return (
            <TabButton
              key={route.key}
              routeName={route.name}
              focused={focused}
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 12,
    lineHeight: LABEL_LINE_HEIGHT,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 2
  },
  dotSlot: {
    height: DOT_SLOT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.primary
  }
});
