import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { useProfile } from '@/features/profile/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

// The same chrome on every tab: wordmark left, your face right.
//
// Profile used to be a fifth item in the bottom bar. Moving it up here is what
// freed that slot for Find — and Profile is somewhere you visit occasionally,
// not one of the four things the app is actually for.
//
// `accessory` sits just left of your face — the pairing's "···" menu, on the
// tabs where a pairing is live. Every other tab passes nothing and the bar is
// unchanged.
// Geometry from the prototype's .topbar: position absolute under the status
// bar, 16 in from each side, 14/16 padding, at least 60 tall, radius 24. The
// page scrolls underneath it and .content.tb starts 82 below the status bar
// (the bar's 60 plus a 22 gap).
// Exported, because six other files were guessing at them. Anything drawing
// this pill, or leaving room below it, reads these rather than its own numbers
// (#121).
export const TOP_BAR_HEIGHT = 60;
export const TOP_BAR_GAP = 22;

const BAR_HEIGHT = TOP_BAR_HEIGHT;
const GAP_BELOW = TOP_BAR_GAP;

// What a tab's scroll view needs so its content starts below the floating bar
// and still scrolls up behind it.
//
// iOS gets a content inset rather than padding, so the pull-to-refresh spinner
// appears below the bar instead of hidden behind it. Android has no content
// inset; it pads the content and moves the spinner down with
// progressViewOffset.
export function useTopBar() {
  const insets = useSafeAreaInsets();
  const clearance = insets.top + BAR_HEIGHT + GAP_BELOW;

  if (Platform.OS === 'ios') {
    return {
      clearance,
      contentTop: 0,
      progressViewOffset: undefined,
      scrollProps: {
        contentInset: { top: clearance },
        contentOffset: { x: 0, y: -clearance },
        scrollIndicatorInsets: { top: clearance - GAP_BELOW },
        automaticallyAdjustContentInsets: false
      }
    };
  }
  return { clearance, contentTop: clearance, progressViewOffset: clearance, scrollProps: {} };
}

// How far below the status bar a page's content has to start to clear the
// floating pill. Named to mirror useTabBarClearance().
export function useTopBarClearance() {
  const insets = useSafeAreaInsets();
  return insets.top + TOP_BAR_HEIGHT + TOP_BAR_GAP;
}

// The same pill, for a screen that needs a back arrow and a title instead of
// the wordmark and your face. Floats exactly as AppTopBar does, so content
// scrolls underneath it rather than stopping at its edge — which is the
// difference the Find form was missing (#121).
export function TopBarPill({
  left,
  title,
  right
}: {
  left?: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { top: insets.top }]}>
      <View style={styles.slot}>{left}</View>
      <AppText style={styles.pillTitle}>{title}</AppText>
      <View style={styles.slot}>{right}</View>
    </View>
  );
}

export function AppTopBar({ accessory }: { accessory?: ReactNode } = {}) {
  const { session } = useSession();
  const profileQ = useProfile(session?.user.id);
  const insets = useSafeAreaInsets();

  return (
    // Floats over the page (#102). It used to sit in the layout as a header,
    // so the page stopped at its lower edge and the strip around it read as
    // white space rather than a bar hovering over content.
    <View style={[styles.bar, { top: insets.top }]}>
      <AppText style={styles.logo}>
        choner<AppText style={styles.dot}>.</AppText>
      </AppText>

      <View style={styles.right}>
        {accessory}
        <PressableScale
          // navigate, not push: Profile is a sibling tab, and pushing it
          // stacked a history entry on every avatar tap (#124).
          onPress={() => router.navigate('/(tabs)/profile')}
          scaleTo="subtle"
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel="Your profile"
        >
          <Avatar uri={profileQ.data?.avatar_url} name={profileQ.data?.full_name} size={32} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A floating navy pill on the paper page — one of only two places the deep
  // navy survives the light-theme switch (the other is the bottom nav).
  // zIndex keeps its shadow drawing over the content scrolling below it, so the
  // bar reads as floating rather than as a header the page is cut off by.
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.navy,
    borderRadius: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...theme.shadow.lg
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slot: { minWidth: 28, alignItems: 'center', justifyContent: 'center' },
  pillTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    color: theme.colors.onNavy
  },
  logo: { fontFamily: theme.fonts.bodyBold, fontSize: 16, color: theme.colors.onNavy },
  dot: { color: theme.colors.primary }
});
