import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
import { Icon, IconName } from '@/components/ui/Icon';
import { activeTabIndex } from './tab-index';

const LABELS: Record<string, string> = {
  home: 'Home',
  challenges: 'Challenges',
  find: 'Find',
  community: 'Community',
  profile: 'Profile'
};

// The only tabs shown in the bar, in this order (master spec section 2: Home,
// Challenges, Find, Community). `profile` is registered but lives in the top
// bar's avatar instead, which is what freed the fourth slot for Find. There is
// no Insights tab: it reported the daily model, and the numbers that replaced
// it (the streak, sessions together) live on Challenges, Home and Profile.
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

// The prototype's own line icons, drawn as SVG at stroke 2. Not an icon font:
// a font is fetched the first time a glyph renders, and when that fetch failed
// (a dev phone that lost the Metro server, issues #101/#103/#104/#109) the bar
// showed no icons at all until the app was restarted. SVG has nothing to fetch.
// Active vs inactive is shown by color alone.
const ICONS: Record<string, IconName> = {
  home: 'home',
  challenges: 'target',
  find: 'find',
  community: 'community',
  profile: 'user'
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
      <Icon name={ICONS[routeName] ?? 'target'} size={ICON_SIZE} color={iconColor} strokeWidth={2} />
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
  const activeIndex = activeTabIndex(visible.map((v) => v.routeIndex), state.index);

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
