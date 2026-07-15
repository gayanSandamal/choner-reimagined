import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { theme } from '@/constants/theme';

export function AuthBackButton() {
  return (
    <PressableScale
      haptic="light"
      onPress={() => {
        // Guards cold deep-links straight into a form screen.
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(auth)/welcome');
        }
      }}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start'
  }
});
