import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { AuthTopBar } from '@/components/auth/AuthTopBar';
import { AuthCenteredHeader } from '@/components/auth/AuthFormParts';
import { checkVerified, forgetPendingPassword, resendVerification } from '@/features/auth/api';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// How often to ask. Six seconds is often enough to feel instant when someone
// verifies on the phone, and rare enough not to look like a login attack if
// several people do it at once.
const POLL_MS = 6000;

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const done = useRef(false);

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

  /* This screen used to be a dead end. The only way out was the verification
     link reopening the app, and when that did not happen, and in Expo Go or
     after verifying on a laptop it often does not, the person was stranded on
     "Check your email" for ever with no button that could help them.

     So the screen now finishes the job itself: it asks, quietly and on a
     timer, whether the address has been confirmed yet, and lets itself in the
     moment it has. The deep link still works and is still faster. This is what
     happens when it does not. */
  const look = useCallback(
    async (announce: boolean) => {
      if (!email || done.current) return;
      if (announce) setChecking(true);
      try {
        const state = await checkVerified(email);
        if (state === 'verified') {
          done.current = true;
          // The session now exists, so the root layout sends them onward.
          router.replace('/onboarding');
          return;
        }
        if (announce && state === 'waiting') {
          notify('Not yet', "We can't see it confirmed yet. Tap the link in the email, then try again.");
        }
        if (announce && state === 'unknown') {
          // No password in memory (an app restart) or something we cannot
          // read. Sending them to sign in is honest and always works.
          notify('Almost there', 'Tap the link in the email, then sign in.');
          router.replace({ pathname: '/(auth)/sign-in', params: { email } });
        }
      } finally {
        if (announce) setChecking(false);
      }
    },
    [email]
  );

  useEffect(() => {
    const timer = setInterval(() => void look(false), POLL_MS);
    // Coming back from the mail app is the likeliest moment for this to have
    // just become true, so check then rather than waiting out the interval.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void look(false);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [look]);

  // Leaving by any other door drops the password rather than keeping it alive
  // behind a screen nobody is looking at.
  useEffect(() => () => forgetPendingPassword(), []);

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
            label={checking ? 'Checking…' : "I've tapped the link"}
            variant="gradient"
            size="lg"
            loading={checking}
            disabled={checking || !email}
            onPress={() => void look(true)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(360)}>
          <Button
            label={loading ? 'Sending…' : 'Resend email'}
            variant="outline"
            size="lg"
            loading={loading}
            disabled={loading || !email}
            onPress={onResend}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(360)}>
          <Button
            label="Back to sign in"
            variant="ghost"
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
