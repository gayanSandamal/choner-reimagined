import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/auth/BrandLogo';
import { BrandMark } from '@/components/auth/BrandMark';
import { TermsFooter } from '@/components/auth/TermsFooter';
import { theme } from '@/constants/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.spacer} />
      <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.brand}>
        <BrandLogo size={170} />
        <BrandMark width={150} />
      </Animated.View>
      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Animated.View entering={FadeInDown.delay(200).duration(360)}>
          <Button
            label="SIGN IN"
            variant="primary"
            pill
            size="lg"
            leftIcon={<Ionicons name="log-in-outline" size={20} color="#FFF" />}
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(280).duration(360)}>
          <Button
            label="SIGN UP"
            variant="outline"
            pill
            size="lg"
            leftIcon={
              <Ionicons name="person-add-outline" size={18} color={theme.colors.primary} />
            }
            labelStyle={{ fontFamily: theme.fonts.displayItalic }}
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(360).duration(360)}>
          <TermsFooter />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 20
  },
  spacer: { flex: 1 },
  brand: { alignItems: 'center', gap: 20 },
  actions: {
    gap: 18,
    paddingBottom: theme.spacing(2)
  }
});
