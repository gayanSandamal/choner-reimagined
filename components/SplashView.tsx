import { StyleSheet, View } from 'react-native';
import { BrandMark } from '@/components/auth/BrandMark';
import { theme } from '@/constants/theme';

// The JS-side splash: just the "choner." wordmark on paper, nothing else.
// Uses only SVG, so it can render before custom fonts are ready — it is what
// shows through font loading, session restore and dev reloads.
export function SplashView() {
  return (
    <View style={styles.root}>
      <BrandMark width={150} color={theme.colors.text} dot />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg
  }
});
