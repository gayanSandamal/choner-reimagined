import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { GoogleGlyph } from './GoogleGlyph';
import { theme } from '@/constants/theme';

type Provider = 'google' | 'facebook' | 'apple';

export function SocialButton({
  provider,
  onPress
}: {
  provider: Provider;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      haptic="light"
      onPress={onPress}
      style={styles.tile}
      accessibilityRole="button"
      accessibilityLabel={`Sign in with ${provider}`}
    >
      {provider === 'google' ? (
        <GoogleGlyph size={28} />
      ) : provider === 'facebook' ? (
        <Ionicons name="logo-facebook" size={30} color={theme.colors.facebook} />
      ) : (
        <Ionicons name="logo-apple" size={30} color="#FFFFFF" />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
