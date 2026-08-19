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
export function AppTopBar() {
  const { session } = useSession();
  const profileQ = useProfile(session?.user.id);

  return (
    <View style={styles.bar}>
      <AppText style={styles.logo}>
        choner<AppText style={styles.dot}>.</AppText>
      </AppText>

      <PressableScale
        onPress={() => router.push('/(tabs)/profile')}
        scaleTo="subtle"
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel="Your profile"
      >
        <Avatar uri={profileQ.data?.avatar_url} name={profileQ.data?.full_name} size={30} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(0.5)
  },
  logo: { fontFamily: theme.fonts.bodyBold, fontSize: 15, color: theme.colors.text },
  dot: { color: theme.colors.primary }
});
