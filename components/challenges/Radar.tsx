import { useEffect } from 'react';
// From expo-router, never @react-navigation/native: expo-router carries its
// own copy of the navigation library, and the separately installed one has no
// navigator around it, so it throws "Couldn't find a navigation object".
import { useIsFocused } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  cancelAnimation
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

// The prototype's .radar: 230x230, margin 10px auto 6px (#136).
const SIZE = 230;
const CENTER = 104;
// The CSS keyframes grow each ring 104px -> 250px. Animating width/height in
// RN re-lays-out every frame; scaling a fixed 250px ring from this factor to 1
// is visually identical and runs entirely on the UI thread.
const MIN_SCALE = CENTER / SIZE;

interface Props {
  searching: boolean;
  onPress?: () => void;
  // A match offer is waiting (#192). The centre says so and opens it. This is
  // the one time the radar stands for a real person, because there is one.
  found?: boolean;
  // Across, in points. The start screen uses a smaller radar so it fits
  // without scrolling (13 Nov 2026); everywhere else keeps 230.
  size?: number;
}

// The Find tab's one object. Three rings expanding outward from a gradient
// centre that doubles as the button.
//
// The radar is a METAPHOR, never a data claim: it animates whether or not
// anyone is actually nearby, and it must never render blips standing in for
// real people. Matching is concierge-paced, and inventing visible activity
// would be a lie the rest of the product doesn't tell.
export function Radar({ searching, onPress, found = false, size = SIZE }: Props) {
  const reduceMotion = useReduceMotion();
  // The rings move only when moving means something (13 Nov 2026): a slow
  // pulse at the start, a faster one while searching, and still once a match
  // is found, since the search has stopped. They also stop while another tab
  // is showing: tabs stay mounted, and nobody needs rings animating unseen.
  const focused = useIsFocused();
  const still = reduceMotion || found || !focused;
  const scale = size / SIZE;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.rings, { transform: [{ scale }] }]} pointerEvents="none">
        <Ring index={0} searching={searching} reduceMotion={still} />
        <Ring index={1} searching={searching} reduceMotion={still} />
        <Ring index={2} searching={searching} reduceMotion={still} />
      </View>

      <PressableScale
        onPress={onPress}
        // Not tappable once the search is already running.
        disabled={(searching && !found) || !onPress}
        scaleTo="subtle"
        haptic="medium"
        accessibilityRole="button"
        accessibilityLabel={
          found ? 'Match found. See your match.' : searching ? 'Searching for your partner' : 'Find a match'
        }
        accessibilityState={{ disabled: searching && !found }}
        style={[styles.centerHit, scale !== 1 && { transform: [{ scale: Math.max(scale, 0.85) }] }]}
      >
        <LinearGradient
          colors={searching ? (['#FD8302', '#FD4E01'] as const) : (['#FDA340', '#FD7A02'] as const)}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.center}
        >
          <AppText style={styles.centerText}>
            {found ? 'Match\nfound' : searching ? 'Searching…' : 'Find a\nMatch'}
          </AppText>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

function Ring({
  index,
  searching,
  reduceMotion
}: {
  index: number;
  searching: boolean;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(0);
  const duration = searching ? 4000 : 5500;
  const stagger = duration / 3;

  useEffect(() => {
    if (reduceMotion) {
      // A permanently pulsing screen is exactly what Reduce Motion exists for,
      // and the same holds for a found match or an unseen tab. The rings still
      // render, they just hold still, at a resting spread.
      cancelAnimation(progress);
      progress.value = 0.35 + index * 0.2;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      index * stagger,
      withRepeat(
        withTiming(1, { duration, easing: Easing.bezier(0.25, 0.5, 0.35, 1) }),
        -1,
        false
      )
    );
  }, [searching, reduceMotion, duration, stagger, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: MIN_SCALE + progress.value * (1 - MIN_SCALE) }],
    opacity: (searching ? 0.85 : 0.55) * (1 - progress.value)
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, searching ? styles.ringSearching : styles.ringRest, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 6
  },
  rings: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2
  },
  ringRest: { borderWidth: 2, borderColor: 'rgba(253,131,2,0.28)' },
  ringSearching: { borderWidth: 2.5, borderColor: 'rgba(253,91,1,0.75)' },
  centerHit: { zIndex: 2 },
  center: {
    width: CENTER,
    height: CENTER,
    borderRadius: CENTER / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // No orange shadow here either. These were two hand-written copies of the
  // retired theme.shadow.glow — same #FD5B01 — which is why grepping the token
  // did not find them. They were applied straight to the LinearGradient, a view
  // with no opaque backgroundColor, so iOS could not build a rounded shadowPath
  // and traced the gradient's rectangle instead: a square haze behind a round
  // button. See DECISIONS_LOG 2026-10-12.
  centerText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center'
  }
});
