import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/auth/BrandMark';
import { theme } from '@/constants/theme';

// The brand name and three ways in, nothing else. The headline and tagline
// moved to the onboarding intro, where the person has already decided to be
// here; on Welcome they were selling to someone who had not chosen yet.
//
// There is no legal line: it is carried by the tick box on Sign up, which is
// the thing that actually records consent. Signing in states no new agreement.
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.spacer} />
      <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.brand}>
        <BrandMark width={168} color={theme.colors.text} dot />
      </Animated.View>
      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Animated.View entering={FadeInDown.delay(200).duration(360)}>
          <Button
            label="Sign in"
            variant="gradient"
            size="lg"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(280).duration(360)}>
          {/* "Create an account" everywhere the account is made, never "Sign up". */}
          <Button
            label="Create an account"
            variant="outline"
            size="lg"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(360).duration(360)}>
          {/* Invitees arrive here when the deep link can't open (no app yet),
              so give them a way in that doesn't depend on the link. */}
          <Button
            label="I have an invite code"
            variant="ghost"
            onPress={() => router.push('/invite/code')}
          />
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
  brand: { alignItems: 'center' },
  actions: {
    gap: 14,
    paddingBottom: theme.spacing(2)
  }
});
