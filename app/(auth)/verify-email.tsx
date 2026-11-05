import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { AuthTopBar } from '@/components/auth/AuthTopBar';
import { AuthCenteredHeader } from '@/components/auth/AuthFormParts';
import { checkVerified, forgetPendingPassword, resendVerification, signOut } from '@/features/auth/api';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// How often to ask. Six seconds is often enough to feel instant when someone
// verifies on the phone, and rare enough not to look like a login attack if
// several people do it at once.
const POLL_MS = 6000;

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);
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
  const look = useCallback(async () => {
    if (!email || done.current) return;
    const state = await checkVerified(email);
    if (state === 'verified') {
      done.current = true;
      // The session now exists, so the root layout sends them onward.
      router.replace('/onboarding');
    }
  }, [email]);

  /* Leaving by a button, not by verifying.

     checkVerified() is not a read: it is signInWithPassword, so a poll that
     lands on a confirmed address SIGNS THIS PERSON IN. Once that has happened
     the root gate (app/_layout.tsx:125) sends any signed-in account with
     onboarding still to do straight to /onboarding, from anywhere outside it.

     That is #160. "Back to sign in" navigated correctly and was then overridden
     a frame later, which read as the button going to the wrong screen. So both
     exits sign out first, and both stop the poll before they do anything, since
     a check already in flight can hand back a session after we have gone. */
  const [leaving, setLeaving] = useState(false);
  const leave = async (to: '/(auth)/sign-in' | '/(auth)/sign-up') => {
    if (leaving) return;
    setLeaving(true);
    done.current = true;
    try {
      await signOut();
    } catch {
      // Already signed out, or offline with nothing to revoke. Either way the
      // destination is still right and trapping them here would be worse.
    }
    router.replace(to);
  };

  useEffect(() => {
    const timer = setInterval(() => void look(), POLL_MS);
    // Coming back from the mail app is the likeliest moment for this to have
    // just become true, so check then rather than waiting out the interval.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void look();
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
      <AuthTopBar title="Create account" onBack={() => void leave('/(auth)/sign-up')} />
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
            variant="outline"
            size="lg"
            loading={loading}
            disabled={loading || !email}
            onPress={onResend}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(360)}>
          <Button
            label="Back to sign in"
            variant="ghost"
            size="lg"
            disabled={leaving}
            onPress={() => void leave('/(auth)/sign-in')}
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
