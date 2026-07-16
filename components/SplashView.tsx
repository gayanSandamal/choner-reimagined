import { StyleSheet, View } from 'react-native';
import { BrandLogo } from '@/components/auth/BrandLogo';
import { theme } from '@/constants/theme';

// Mirrors the native OS splash (heart-orbit mark centered on brand navy) so
// the JS-side loading gaps — font loading, session restore, dev reloads —
// show the same frame instead of a blank screen. Uses only SVG, so it can
// render before custom fonts are ready.
export function SplashView() {
  return (
    <View style={styles.root}>
      <BrandLogo size={200} />
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
