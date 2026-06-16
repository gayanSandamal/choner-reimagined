import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motion';

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
    t.value = reduceMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, theme.motion.spring.bouncy);
  }, [focused, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.18 }, { translateY: -2 * t.value }]
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 6 }]
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: t.value }]
  }));

  const [filled, outline] = ICONS[routeName] ?? ['ellipse', 'ellipse-outline'];
  const iconName = focused ? filled : outline;
  const color = focused ? theme.colors.primary : theme.colors.muted;

  return (
    <Pressable onPress={onPress} style={styles.tab} hitSlop={8}>
      <Animated.View style={iconStyle}>
        <Ionicons name={iconName} size={24} color={color} />
      </Animated.View>
      <Animated.Text style={[styles.label, { color: theme.colors.primary }, labelStyle]}>
        {LABELS[routeName] ?? routeName}
      </Animated.Text>
      <Animated.View style={[styles.dot, dotStyle]} />
    </Pressable>
  );
}

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,138,31,0.18)', 'rgba(255,138,31,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topBorder}
      />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
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
    paddingTop: 10,
    backgroundColor: 'rgba(3,26,45,0.78)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    overflow: 'hidden'
  },
  topBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2
  },
  label: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.3
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 2
  }
});
