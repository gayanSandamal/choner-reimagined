import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export function TermsFooter() {
  return (
    <View style={styles.root}>
      <AppText variant="caption" muted style={styles.center}>
        By creating an account you agree to our
      </AppText>
      <Pressable
        hitSlop={8}
        onPress={() => router.push('/legal/terms')}
        accessibilityRole="link"
      >
        <AppText variant="caption" style={[styles.center, styles.link]}>
          Terms of use, privacy and policy & cookie policy
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 2 },
  center: { textAlign: 'center' },
  link: {
    color: theme.colors.link,
    textDecorationLine: 'underline'
  }
});
