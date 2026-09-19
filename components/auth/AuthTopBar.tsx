import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { goBackOrWelcome } from '@/components/auth/AuthBackButton';
import { theme } from '@/constants/theme';

// The floating navy bar the sign-in and sign-up prototypes open with: back
// arrow left, screen title centred, a spacer right so the title stays centred.
export function AuthTopBar({ title }: { title: string }) {
  return (
    <View style={styles.bar}>
      <PressableScale
        haptic="light"
        onPress={goBackOrWelcome}
        style={styles.slot}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.onNavy} />
      </PressableScale>
      <AppText style={styles.title}>{title}</AppText>
      <View style={styles.slot} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.navy,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 16,
    minHeight: 64,
    ...theme.shadow.lg
  },
  slot: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    color: theme.colors.onNavy
  }
});
