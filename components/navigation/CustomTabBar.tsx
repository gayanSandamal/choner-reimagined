import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

const LABELS: Record<string, string> = {
  home: 'Home',
  challenges: 'Challenges',
  find: 'Find',
  community: 'Community',
  insights: 'Insights',
  profile: 'Profile'
};

// The only tabs shown in the bar, in this order. Any other registered route
// stays reachable programmatically but is hidden here — `insights` is still
// unfinished, and `profile` now lives in the top bar's avatar instead, which
// is what freed the fourth slot for Find.
const VISIBLE_ORDER = ['home', 'challenges', 'find', 'community'];

// Geometry from the prototype (393pt frame): 14 top + 22 icon + 4 gap + 14
// label line + 12 bottom. The pill floats 16pt above the screen edge.
const ICON_SIZE = 22;
const LABEL_LINE_HEIGHT = 14;
const PILL_HEIGHT = 14 + ICON_SIZE + 4 + LABEL_LINE_HEIGHT + 12;
const FLOAT_MARGIN = 16;

// The pill is an overlay, so every tab's scroll content has to leave room for
// it. iOS' home indicator already sits below the 16pt margin; Android with
// on-screen nav buttons reports an inset the pill has to clear.
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  const offset = Platform.OS === 'ios' ? FLOAT_MARGIN : Math.max(insets.bottom, FLOAT_MARGIN);
  return offset + PILL_HEIGHT + 24;
}

// All glyphs come from one family (MaterialCommunityIcons) so stroke weight
// and optical size match across the bar — mixing families made each icon
// render at a different weight and sit at a different height. Active vs
// inactive is shown by color alone.
const ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: 'home-outline',
  challenges: 'target',
  find: 'account-search-outline',
  community: 'account-multiple-outline',
  profile: 'account-outline'
};

function TabButton({
  routeName,
  focused,
  onPress
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
}) {
  // Reads on navy, not on paper: the nav pill keeps the dark background even
  // though the page around it is light. Inactive icons are white and their
  // labels dimmed, as in the prototype.
  const iconColor = focused ? theme.colors.primary2 : theme.colors.onNavy;
  const labelColor = focused ? theme.colors.primary2 : theme.colors.onNavyMuted;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityLabel={LABELS[routeName] ?? routeName}
      accessibilityState={{ selected: focused }}
    >
      <MaterialCommunityIcons
        name={ICONS[routeName] ?? 'circle-outline'}
        size={ICON_SIZE}
        color={iconColor}
      />
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {LABELS[routeName] ?? routeName}
      </Text>
    </Pressable>
  );
}

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'ios' ? FLOAT_MARGIN : Math.max(insets.bottom, FLOAT_MARGIN);

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
    // box-none: the strip around the pill must not swallow touches meant for
    // the content scrolling underneath it.
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: bottom }]}>
      <View style={styles.pill}>
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
  // Absolute so the navy pill floats over the page instead of reserving a
  // strip of its own; content scrolls behind it.
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.navy,
    borderRadius: 28,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    ...theme.shadow.lg
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4
  },
  label: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 10,
    lineHeight: LABEL_LINE_HEIGHT,
    letterSpacing: 0.2,
    textAlign: 'center'
  }
});
