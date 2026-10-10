import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { AuthTopBar } from '@/components/auth/AuthTopBar';
import { AuthCenteredHeader } from '@/components/auth/AuthFormParts';
import { resendVerification } from '@/features/auth/api';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);

  const onResend = async () => {
    if (!email) return;
    try {
      setLoading(true);
      await resendVerification(email);
      notify('Sent', 'A new verification email is on its way.');
    } catch (e: any) {
      notify('Could not resend', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Back to the form they just filled in, not the shared
          goBackOrWelcome(): sign-up arrives here with router.replace, so
          there is no history entry and the shared helper would land on
          welcome instead (#127). */}
      {/* "Create account", not "Check your email": the bar names the flow and
          the page heading names the step, as on sign-up, and this is still
          step two of creating an account. */}
      <AuthTopBar title="Create account" onBack={() => router.replace('/(auth)/sign-up')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(80).duration(360)}>
          <AuthCenteredHeader
            title="Check your email"
            helper={`We sent a verification link to ${email ?? 'your inbox'}. Tap it to finish creating your account.`}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(360)}>
          <Button
            label={loading ? 'Sending…' : 'Resend email'}
            variant="gradient"
            size="lg"
            loading={loading}
            disabled={loading || !email}
            onPress={onResend}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(360)}>
          <Button
            label="Back to sign in"
            variant="outline"
            size="lg"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  // No paddingTop: 40 any more, the bar occupies that space now.
  content: { flexGrow: 1, padding: 20, gap: 14 }
});
