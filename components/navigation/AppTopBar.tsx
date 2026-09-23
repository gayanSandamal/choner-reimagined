import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
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
export function AppTopBar({ accessory }: { accessory?: ReactNode } = {}) {
  const { session } = useSession();
  const profileQ = useProfile(session?.user.id);

  return (
    <View style={styles.bar}>
      <AppText style={styles.logo}>
        choner<AppText style={styles.dot}>.</AppText>
      </AppText>

      <View style={styles.right}>
        {accessory}
        <PressableScale
          onPress={() => router.push('/(tabs)/profile')}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.navy,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 6,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...theme.shadow.lg
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { fontFamily: theme.fonts.bodyBold, fontSize: 16, color: theme.colors.onNavy },
  dot: { color: theme.colors.primary }
});
